import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAllowedUser, getTokenFromRequest, AuthError } from "../_shared/auth.ts";
import { getUserClient } from "../_shared/supabase.ts";
import { parseMoxfieldCsv, parseTextList } from "../_shared/collection_parser.ts";
import { getCardsByNames } from "../_shared/scryfall.ts";
import { analyzeCollection, analyzeArchetypes, analyzeEfficiency, CollectionCard } from "../_shared/collection_analyzer.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const corsHeaders = getCorsHeaders(req);

  try {
    const user = await requireAllowedUser(req);
    const token = getTokenFromRequest(req);
    const sb = getUserClient(token);
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop() || "";

    // POST /collection/upload
    if (req.method === "POST" && path === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return new Response(JSON.stringify({ detail: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const content = await file.text();
      const collection = file.name?.endsWith(".csv")
        ? parseMoxfieldCsv(content)
        : parseTextList(content);

      if (collection.cards.length === 0) {
        return new Response(
          JSON.stringify({ detail: "No cards parsed from file. Check the format." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Enrich cards with Scryfall data using batch endpoint
      const cardNames = collection.cards.map((c) => c.name);
      const scryfallMap = await getCardsByNames(cardNames);

      const enriched = collection.cards.map((card) => {
        const scryfallCard = scryfallMap.get(card.name.toLowerCase());
        if (scryfallCard) {
          // Create a new object to avoid mutating the cached Scryfall data
          return {
            ...scryfallCard,
            quantity: card.quantity
          };
        }
        return card;
      });

      const cardsData = enriched.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        cmc: c.cmc,
        type_line: c.type_line,
        oracle_text: c.oracle_text,
        color_identity: c.color_identity,
        keywords: c.keywords || [],
        card_faces: c.card_faces || null,
        prices: c.prices || null, // Add price data for efficiency metrics
      }));

      console.log(`[collection/upload] Parsed ${cardsData.length} card entries from CSV`);

      // Consolidate duplicate card entries by name (sum quantities)
      const consolidatedMap = new Map<string, typeof cardsData[0]>();
      for (const card of cardsData) {
        const existing = consolidatedMap.get(card.name);
        if (existing) {
          existing.quantity += card.quantity;
        } else {
          consolidatedMap.set(card.name, { ...card });
        }
      }
      const consolidatedCards = Array.from(consolidatedMap.values());

      console.log(`[collection/upload] Consolidated to ${consolidatedCards.length} unique cards`);
      
      // Log a sample to verify quantities
      const sampleCard = consolidatedCards.find(c => c.name.toLowerCase().includes('smoldering'));
      if (sampleCard) {
        console.log(`[collection/upload] Sample - ${sampleCard.name}: quantity ${sampleCard.quantity}`);
      }

      await sb.from("collections").upsert(
        { 
          user_id: user.userId, 
          cards_json: consolidatedCards,
          updated_at: new Date().toISOString() // Explicitly set timestamp on update
        },
        { onConflict: "user_id" }
      );

      console.log(`[collection/upload] Imported ${consolidatedCards.length} unique cards (${cardsData.length} total entries) for user ${user.userId}`);

      return new Response(JSON.stringify({ cards_imported: cardsData.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /collection/summary
    if (req.method === "GET" && path === "summary") {
      const { data, error } = await sb
        .from("collections")
        .select("cards_json, updated_at")
        .eq("user_id", user.userId)
        .maybeSingle();

      if (error) {
        console.error("[collection/summary] Query error:", error);
        return new Response(JSON.stringify({ detail: "Failed to load collection summary" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data) {
        return new Response(JSON.stringify({ count: 0, last_updated: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Consolidate any duplicate card entries (in case of legacy data)
      const cards = (data.cards_json || []) as { name: string; quantity?: number }[];
      const cardMap = new Map<string, { name: string; quantity: number }>();
      for (const card of cards) {
        const existing = cardMap.get(card.name);
        if (existing) {
          existing.quantity += (card.quantity || 1);
        } else {
          cardMap.set(card.name, { name: card.name, quantity: card.quantity || 1 });
        }
      }
      const consolidatedCards = Array.from(cardMap.values());
      const count = consolidatedCards.reduce((sum, c) => sum + c.quantity, 0);
      
      return new Response(JSON.stringify({ count, last_updated: data.updated_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /collection/analyze
    if (req.method === "GET" && path === "analyze") {
      const { data, error } = await sb
        .from("collections")
        .select("cards_json, updated_at")
        .eq("user_id", user.userId)
        .maybeSingle();

      if (error) {
        console.error("[collection/analyze] Query error:", error);
        return new Response(JSON.stringify({ detail: "Failed to load collection for analysis" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data || !data.cards_json) {
        return new Response(JSON.stringify({ detail: "No collection found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Query user's decks to calculate card usage
      const { data: userDecks } = await sb
        .from("user_decks")
        .select("moxfield_id, deck_name")
        .eq("user_id", user.userId);

      // Build usage map: card name -> { total: number, decks: Array<{deck_name, quantity}> }
      const usageMap = new Map<string, { total: number; decks: Array<{ deck_name: string; quantity: number }> }>();
      if (userDecks && userDecks.length > 0) {
        const moxfieldIds = userDecks.map(d => d.moxfield_id);
        
        // Fetch actual deck data from decks table
        const { data: deckData } = await sb
          .from("decks")
          .select("moxfield_id, data_json")
          .in("moxfield_id", moxfieldIds);
        
        if (deckData) {
          for (const deck of deckData) {
            const deckInfo = userDecks.find(ud => ud.moxfield_id === deck.moxfield_id);
            const deckName = deckInfo?.deck_name || "Unnamed Deck";
            const data = deck.data_json as { mainboard?: { name: string; quantity?: number }[] };
            const mainboard = data.mainboard || [];
            
            for (const card of mainboard) {
              const current = usageMap.get(card.name);
              const cardQty = card.quantity || 1;
              
              if (current) {
                current.total += cardQty;
                current.decks.push({ deck_name: deckName, quantity: cardQty });
              } else {
                usageMap.set(card.name, {
                  total: cardQty,
                  decks: [{ deck_name: deckName, quantity: cardQty }]
                });
              }
            }
          }
        }
        
        console.log(`[collection/analyze] Built usage map with ${usageMap.size} unique cards from ${deckData?.length || 0} decks`);
      }

      const cards = data.cards_json as CollectionCard[];
      
      // Consolidate any duplicate card entries (in case of legacy data)
      const cardMap = new Map<string, CollectionCard>();
      for (const card of cards) {
        const existing = cardMap.get(card.name);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + (card.quantity || 1);
        } else {
          cardMap.set(card.name, { ...card });
        }
      }
      const consolidatedCards = Array.from(cardMap.values());
      
      const analysis = analyzeCollection(consolidatedCards, usageMap);
      const archetypes = analyzeArchetypes(consolidatedCards, analysis);

      return new Response(JSON.stringify({ 
        ...analysis,
        archetypes 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /collection/efficiency
    if (req.method === "GET" && path === "efficiency") {
      console.log("[collection/efficiency] Starting efficiency analysis for user:", user.userId);
      
      const { data, error } = await sb
        .from("collections")
        .select("cards_json, updated_at")
        .eq("user_id", user.userId)
        .maybeSingle();

      if (error) {
        console.error("[collection/efficiency] Query error:", error);
        return new Response(JSON.stringify({ detail: "Failed to load collection for efficiency analysis" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data || !data.cards_json) {
        console.warn("[collection/efficiency] No collection data found for user:", user.userId);
        return new Response(JSON.stringify({ detail: "No collection found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log("[collection/efficiency] Collection loaded. Cards count:", (data.cards_json as any[]).length);

      // Query user's decks to calculate card usage (same as analyze endpoint)
      const { data: userDecks } = await sb
        .from("user_decks")
        .select("moxfield_id, deck_name")
        .eq("user_id", user.userId);

      // Build usage map
      const usageMap = new Map<string, { total: number; decks: Array<{ deck_name: string; quantity: number }> }>();
      if (userDecks && userDecks.length > 0) {
        const moxfieldIds = userDecks.map(d => d.moxfield_id);
        
        const { data: deckData } = await sb
          .from("decks")
          .select("moxfield_id, data_json")
          .in("moxfield_id", moxfieldIds);
        
        if (deckData) {
          for (const deck of deckData) {
            const deckInfo = userDecks.find(ud => ud.moxfield_id === deck.moxfield_id);
            const deckName = deckInfo?.deck_name || "Unnamed Deck";
            const data = deck.data_json as { mainboard?: { name: string; quantity?: number }[] };
            const mainboard = data.mainboard || [];
            
            for (const card of mainboard) {
              const current = usageMap.get(card.name);
              const cardQty = card.quantity || 1;
              
              if (current) {
                current.total += cardQty;
                current.decks.push({ deck_name: deckName, quantity: cardQty });
              } else {
                usageMap.set(card.name, {
                  total: cardQty,
                  decks: [{ deck_name: deckName, quantity: cardQty }]
                });
              }
            }
          }
        }
        
        console.log(`[collection/efficiency] Built usage map with ${usageMap.size} unique cards from ${deckData?.length || 0} decks`);
      }

      const cards = data.cards_json as CollectionCard[];
      
      // Consolidate any duplicate card entries (in case of legacy data)
      const cardMap = new Map<string, CollectionCard>();
      for (const card of cards) {
        const existing = cardMap.get(card.name);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + (card.quantity || 1);
        } else {
          cardMap.set(card.name, { ...card });
        }
      }
      const consolidatedCards = Array.from(cardMap.values());
      
      console.log("[collection/efficiency] Calling analyzeEfficiency with:");
      console.log("  - Cards:", consolidatedCards.length, `(${cards.length} before consolidation)`);
      console.log("  - Usage map size:", usageMap.size);
      console.log("  - Sample card:", consolidatedCards[0] ? { name: consolidatedCards[0].name, prices: (consolidatedCards[0] as any).prices } : "no cards");
      
      const efficiency = analyzeEfficiency(consolidatedCards, usageMap);
      
      console.log("[collection/efficiency] Analysis complete. Results:");
      console.log("  - Total cards:", efficiency.total_cards);
      console.log("  - Cards in use:", efficiency.cards_in_use);
      console.log("  - Total value:", efficiency.total_value);
      console.log("  - Utilization rate:", efficiency.utilization_rate);

      return new Response(JSON.stringify(efficiency), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /collection (default)
    if (req.method === "GET") {
      const { data, error } = await sb
        .from("collections")
        .select("cards_json, updated_at")
        .eq("user_id", user.userId)
        .maybeSingle();

      if (error) {
        console.error("[collection/GET] Query error:", error);
        return new Response(JSON.stringify({ detail: "Failed to load collection" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data) {
        return new Response(JSON.stringify({ cards: [], updated_at: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Consolidate any duplicate card entries (in case of legacy data)
      const cards = (data.cards_json || []) as CollectionCard[];
      const cardMap = new Map<string, CollectionCard>();
      for (const card of cards) {
        const existing = cardMap.get(card.name);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + (card.quantity || 1);
        } else {
          cardMap.set(card.name, { ...card });
        }
      }
      const consolidatedCards = Array.from(cardMap.values());

      return new Response(JSON.stringify({ cards: consolidatedCards, updated_at: data.updated_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ detail: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return new Response(JSON.stringify({ detail: e.message }), {
        status: e.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("Collection error:", e);
    return new Response(JSON.stringify({ detail: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
