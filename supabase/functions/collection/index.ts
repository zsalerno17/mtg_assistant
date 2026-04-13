import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAllowedUser, getTokenFromRequest, AuthError } from "../_shared/auth.ts";
import { getUserClient } from "../_shared/supabase.ts";
import { parseMoxfieldCsv, parseTextList } from "../_shared/collection_parser.ts";
import { getCardsByNames } from "../_shared/scryfall.ts";

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
          scryfallCard.quantity = card.quantity;
          return scryfallCard;
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
      }));

      await sb.from("collections").upsert(
        { user_id: user.userId, cards_json: cardsData },
        { onConflict: "user_id" }
      );

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

      const cards = (data.cards_json || []) as { quantity?: number }[];
      const count = cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
      return new Response(JSON.stringify({ count, last_updated: data.updated_at }), {
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

      return new Response(JSON.stringify({ cards: data.cards_json, updated_at: data.updated_at }), {
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
