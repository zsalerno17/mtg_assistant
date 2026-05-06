import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAllowedUser, getTokenFromRequest } from "../_shared/auth.ts";
import { getServiceClient, getUserClient } from "../_shared/supabase.ts";
import { getDeck } from "../_shared/moxfield.ts";
import { analyzeDeck, buildUpgradePath, type UserGoals } from "../_shared/deck_analyzer.ts";
import { createCard, type Card, type Deck } from "../_shared/models.ts";
import { buildCardUsageMap } from "../_shared/deck_usage.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, req: Request, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, detail: string, req: Request): Response {
  return jsonResponse({ detail }, req, status);
}

/** Reconstruct a Deck object from the Supabase decks cache. */
function deckFromCache(d: Record<string, unknown>): Deck {
  function cardFromRaw(raw: Record<string, unknown> | null): Card | null {
    if (!raw) return null;
    return createCard({
      name: (raw.name as string) || "",
      quantity: (raw.quantity as number) || 1,
      mana_cost: (raw.mana_cost as string) || "",
      cmc: Number(raw.cmc) || 0,
      type_line: (raw.type_line as string) || "",
      oracle_text: (raw.oracle_text as string) || "",
      colors: (raw.colors as string[]) || [],
      color_identity: (raw.color_identity as string[]) || [],
      keywords: (raw.keywords as string[]) || [],
      rarity: (raw.rarity as string) || "",
      set_code: (raw.set_code as string) || "",
      image_uri: (raw.image_uri as string) || "",
      scryfall_id: (raw.scryfall_id as string) || "",
    });
  }

  return {
    id: (d.id as string) || "",
    name: (d.name as string) || "",
    format: (d.format as string) || "commander",
    commander: cardFromRaw(d.commander as Record<string, unknown> | null),
    partner: cardFromRaw(d.partner as Record<string, unknown> | null),
    mainboard: ((d.mainboard as Record<string, unknown>[]) || [])
      .map((raw) => cardFromRaw(raw))
      .filter((c): c is Card => c !== null),
  };
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await requireAllowedUser(req);
    const token = getTokenFromRequest(req);
    const userSb = getUserClient(token);
    const serviceSb = getServiceClient();

    if (req.method !== "POST") {
      return errorResponse(405, "Method not allowed", req);
    }

    const body = await req.json();
    const { deckId, userGoals } = body;

    if (!deckId || typeof deckId !== "string") {
      return errorResponse(400, "Missing or invalid deckId", req);
    }

    if (!userGoals || typeof userGoals !== "object") {
      return errorResponse(400, "Missing or invalid userGoals", req);
    }

    // Validate userGoals structure
    const goals: UserGoals = {
      targetPowerLevel: userGoals.targetPowerLevel ?? undefined,
      budgetConstraint: userGoals.budgetConstraint ?? undefined,
      themeEmphasis: Array.isArray(userGoals.themeEmphasis) ? userGoals.themeEmphasis : [],
      style: userGoals.style ?? "casual",
    };

    // 1. Fetch deck from cache or Moxfield
    let deck: Deck;
    const { data: deckCache } = await serviceSb
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .maybeSingle();

    if (deckCache) {
      console.log(`[upgrade-path] Found deck ${deckId} in cache`);
      deck = deckFromCache(deckCache);
    } else {
      console.log(`[upgrade-path] Fetching deck ${deckId} from Moxfield`);
      deck = await getDeck(deckId);
    }

    // 2. Fetch user's collection
    const { data: collectionRow } = await userSb
      .from("collections")
      .select("cards_json")
      .eq("user_id", user.userId)
      .maybeSingle();

    const collection: Card[] | null = collectionRow?.cards_json
      ? (collectionRow.cards_json as any[]).map((c) => createCard(c))
      : null;

    if (!collection || collection.length === 0) {
      return errorResponse(
        400,
        "No collection found. Please upload your collection first.",
        req
      );
    }

    console.log(`[upgrade-path] Found collection with ${collection.length} cards`);

    // 3. Build card usage map to track which decks cards are in
    const usageMap = await buildCardUsageMap(userSb, user.userId);
    
    // Helper: get deck names a card is already in (excluding the current deck)
    const getInDecks = (cardName: string): string[] => {
      const entry = usageMap.get(cardName.toLowerCase());
      if (!entry) return [];
      return entry.decks
        .filter((d: { deck_name: string }) => d.deck_name !== deck.name)
        .map((d: { deck_name: string }) => d.deck_name);
    };

    // 4. Analyze deck to get current state
    const currentAnalysis = analyzeDeck(deck);
    console.log(
      `[upgrade-path] Current deck power: ${currentAnalysis.power_breakdown.rounded}/10 (${currentAnalysis.bracket_label})`
    );

    // 5. Build upgrade path
    const upgradePath = buildUpgradePath(deck, collection, goals, currentAnalysis);
    
    // 6. Stamp in_decks on all cardIn objects
    for (const phase of upgradePath.phases) {
      for (const swap of phase.swaps) {
        const inDecks = getInDecks(swap.cardIn.name);
        if (inDecks.length > 0) {
          swap.cardIn.in_decks = inDecks;
        }
      }
    }

    console.log(
      `[upgrade-path] Built path: ${upgradePath.phases.length} phases, $${upgradePath.totalBudget.toFixed(2)}, ${upgradePath.currentPower} → ${upgradePath.targetPower}`
    );

    return jsonResponse(upgradePath, req);
  } catch (error) {
    console.error("[upgrade-path] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(500, `Server error: ${message}`, req);
  }
});
