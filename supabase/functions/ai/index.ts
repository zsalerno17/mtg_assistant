import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { requireAllowedUser, AuthError } from "../_shared/auth.ts";
import { getDeck } from "../_shared/moxfield.ts";
import {
  analyzeDeck,
  findCollectionImprovements,
  scenariosFallback,
} from "../_shared/deck_analyzer.ts";
import {
  getStrategyAdvice,
  getImprovementSuggestions,
  explainScenarios,
} from "../_shared/gemini.ts";
import { createCard } from "../_shared/models.ts";
import type { Card, Deck, Collection } from "../_shared/models.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, detail: string): Response {
  return jsonResponse({ detail }, status);
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
    mainboard: ((d.mainboard as Record<string, unknown>[]) || []).map(
      (c) => cardFromRaw(c)!,
    ),
    sideboard: ((d.sideboard as Record<string, unknown>[]) || []).map(
      (c) => cardFromRaw(c)!,
    ),
  };
}

/** Load deck from Moxfield, with Supabase cache as fallback. */
async function loadDeck(moxfieldId: string): Promise<Deck> {
  const sb = getServiceClient();
  try {
    return await getDeck(moxfieldId);
  } catch (e) {
    // Moxfield unreachable — fall back to Supabase cache
    const { data } = await sb
      .from("decks")
      .select("data_json")
      .eq("moxfield_id", moxfieldId)
      .maybeSingle();

    if (data) {
      console.warn(
        `Moxfield error for ${moxfieldId}, using cache: ${String(e)}`,
      );
      return deckFromCache(data.data_json);
    }
    throw new Error(`Could not load deck: ${String(e)}`);
  }
}

async function getCached(
  sb: ReturnType<typeof getServiceClient>,
  deckId: string,
  cacheType: string,
): Promise<string | null> {
  const { data } = await sb
    .from("ai_cache")
    .select("result")
    .eq("deck_id", deckId)
    .eq("cache_type", cacheType)
    .maybeSingle();
  return data?.result ?? null;
}

async function setCached(
  sb: ReturnType<typeof getServiceClient>,
  deckId: string,
  cacheType: string,
  result: string,
): Promise<void> {
  try {
    await sb.from("ai_cache").upsert(
      { deck_id: deckId, cache_type: cacheType, result },
      { onConflict: "deck_id,cache_type" },
    );
  } catch (e) {
    console.warn("Failed to write ai_cache:", e);
  }
}

// ---------------------------------------------------------------------------
// Route: POST /strategy
// ---------------------------------------------------------------------------

async function handleStrategy(
  body: { moxfield_id?: string },
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id'");

  const sb = getServiceClient();

  // Serve from cache
  const cached = await getCached(sb, moxfieldId, "strategy_v2");
  if (cached) {
    try {
      return jsonResponse({
        strategy: JSON.parse(cached),
        ai_enhanced: true,
        cached: true,
      });
    } catch {
      // corrupted cache, continue
    }
  }

  const deck = await loadDeck(moxfieldId);
  const analysis = analyzeDeck(deck);
  const result = await getStrategyAdvice(deck, analysis);

  if (result.ai_enhanced && result.content) {
    await setCached(
      sb,
      moxfieldId,
      "strategy_v2",
      JSON.stringify(result.content),
    );
  }

  return jsonResponse({
    strategy: result.content,
    ai_enhanced: result.ai_enhanced,
    cached: false,
  });
}

// ---------------------------------------------------------------------------
// Route: POST /improvements
// ---------------------------------------------------------------------------

async function handleImprovements(
  body: { moxfield_id?: string },
  userId: string,
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id'");

  const sb = getServiceClient();

  // Collection-aware cache key
  const cacheKey = `${moxfieldId}:${userId}`;
  const cached = await getCached(sb, cacheKey, "improvements_v3");
  if (cached) {
    try {
      return jsonResponse({
        improvements: JSON.parse(cached),
        ai_enhanced: true,
        cached: true,
      });
    } catch {
      // corrupted cache, continue
    }
  }

  const deck = await loadDeck(moxfieldId);
  const analysis = analyzeDeck(deck);

  // Load user collection
  const { data: colRow } = await sb
    .from("collections")
    .select("cards_json")
    .eq("user_id", userId)
    .maybeSingle();

  const collectionCards: Record<string, unknown>[] =
    colRow?.cards_json || [];

  const result = await getImprovementSuggestions(
    deck,
    analysis,
    collectionCards,
  );

  // --- Post-process: validate swaps, merge legacy formats, add owned flags ---
  const content = result.content as Record<string, unknown>;
  const mainboardLower = new Set(
    deck.mainboard.map((c) => c.name.toLowerCase()),
  );
  const ownedLower = new Set(
    collectionCards.map((c) => ((c.name as string) || "").toLowerCase()),
  );

  // Remove urgent_fixes already in deck
  if (content.urgent_fixes && Array.isArray(content.urgent_fixes)) {
    content.urgent_fixes = (
      content.urgent_fixes as Record<string, unknown>[]
    )
      .filter(
        (f) =>
          !mainboardLower.has(
            ((f.card as string) || "").toLowerCase(),
          ),
      )
      .slice(0, 5);
  }

  // Process swaps: validate cut in deck, add not in deck, set owned flag
  let rawSwaps = [
    ...((content.swaps as Record<string, unknown>[]) || []),
  ];
  const oldCuts = [
    ...((content.cuts as Record<string, unknown>[]) || []),
  ];
  const oldAdds = [
    ...((content.additions as Record<string, unknown>[]) || []),
  ];

  let unpairedAdds: Record<string, unknown>[] = [];

  if (oldCuts.length > 0 && rawSwaps.length === 0) {
    // Backwards compat: pair old cuts + additions by index
    for (let i = 0; i < oldCuts.length; i++) {
      if (i < oldAdds.length) {
        rawSwaps.push({
          cut: oldCuts[i].card || "",
          add: oldAdds[i].card || "",
          reason:
            oldAdds[i].reason || oldCuts[i].reason || "",
          category: oldCuts[i].type || "upgrade",
          price_tier: oldAdds[i].price_tier || "mid",
        });
      }
    }
    unpairedAdds = oldAdds.slice(oldCuts.length);
  } else {
    unpairedAdds = oldAdds;
  }

  delete content.cuts;

  const validatedSwaps: Record<string, unknown>[] = [];
  for (const swap of rawSwaps) {
    const cutName = ((swap.cut as string) || "").toLowerCase();
    const addName = ((swap.add as string) || "").toLowerCase();
    if (mainboardLower.has(cutName) && !mainboardLower.has(addName)) {
      swap.owned = ownedLower.has(addName);
      validatedSwaps.push(swap);
    }
  }
  content.swaps = validatedSwaps.slice(0, 8);

  // Merge staples_to_buy into additions
  const mergedAdditions = [
    ...((content.additions as Record<string, unknown>[]) || []),
    ...unpairedAdds,
  ];
  for (const s of (content.staples_to_buy as Record<string, unknown>[]) ||
    []) {
    if (
      !mergedAdditions.some(
        (a) =>
          ((a.card as string) || "").toLowerCase() ===
          ((s.card as string) || "").toLowerCase(),
      )
    ) {
      mergedAdditions.push(s);
    }
  }
  delete content.staples_to_buy;

  // Filter out cards already in deck, add truthful owned flag
  content.additions = mergedAdditions
    .filter(
      (a) =>
        !mainboardLower.has(((a.card as string) || "").toLowerCase()),
    )
    .map((a) => ({
      ...a,
      owned: ownedLower.has(((a.card as string) || "").toLowerCase()),
    }))
    .slice(0, 10);

  // Cache AI responses
  if (result.ai_enhanced && content) {
    await setCached(
      sb,
      cacheKey,
      "improvements_v3",
      JSON.stringify(content),
    );
  }

  return jsonResponse({
    improvements: content,
    ai_enhanced: result.ai_enhanced,
    cached: false,
  });
}

// ---------------------------------------------------------------------------
// Route: POST /scenarios
// ---------------------------------------------------------------------------

async function handleScenarios(
  body: {
    moxfield_id?: string;
    cards_to_add?: string[];
    cards_to_remove?: string[];
  },
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id'");

  const cardsToAdd = body.cards_to_add || [];
  const cardsToRemove = body.cards_to_remove || [];
  if (cardsToAdd.length === 0 && cardsToRemove.length === 0) {
    return errorResponse(
      400,
      "Provide at least one card to add or remove.",
    );
  }

  const deck = await loadDeck(moxfieldId);
  const analysis = analyzeDeck(deck);

  let aiEnhanced = false;
  let result: Record<string, unknown> | null = null;

  try {
    result = await explainScenarios(
      deck,
      analysis,
      cardsToAdd,
      cardsToRemove,
    );
    const before = result?.before as Record<string, unknown> | undefined;
    aiEnhanced = !!(
      before?.game_plan &&
      before.game_plan !==
        "Current deck strategy based on existing card composition."
    );
  } catch (e) {
    console.warn("explainScenarios failed:", e);
  }

  if (!aiEnhanced) {
    const fallback = scenariosFallback(deck, cardsToAdd, cardsToRemove);
    return jsonResponse({ scenarios: fallback, ai_enhanced: false });
  }

  return jsonResponse({ scenarios: result, ai_enhanced: true });
}

// ---------------------------------------------------------------------------
// Route: POST /collection-upgrades
// ---------------------------------------------------------------------------

async function handleCollectionUpgrades(
  body: { moxfield_id?: string },
  userId: string,
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id'");

  const sb = getServiceClient();

  const { data: colRow } = await sb
    .from("collections")
    .select("cards_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (!colRow?.cards_json?.length) {
    return jsonResponse({ upgrades: [], has_collection: false });
  }

  const deck = await loadDeck(moxfieldId);

  const collection: Collection = {
    cards: (colRow.cards_json as Record<string, unknown>[]).map(
      (c) =>
        createCard({
          name: (c.name as string) || "",
          quantity: (c.quantity as number) || 1,
          cmc: Number(c.cmc) || 0,
          type_line: (c.type_line as string) || "",
          oracle_text: (c.oracle_text as string) || "",
          color_identity: (c.color_identity as string[]) || [],
        }),
    ),
  };

  const suggestions = findCollectionImprovements(deck, collection);

  const upgrades = suggestions.map(
    ([colCard, cutCard, reason, score, neverCutReason]) => {
      const entry: Record<string, unknown> = {
        add: colCard.name,
        cut: cutCard?.name ?? null,
        reason,
        score,
      };
      if (neverCutReason) entry.never_cut_reason = neverCutReason;
      return entry;
    },
  );

  return jsonResponse({ upgrades, has_collection: true });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const user = await requireAllowedUser(req);
    const url = new URL(req.url);
    const path = url.pathname.replace(/.*\/ai\/?/, "/");

    if (req.method === "POST" && path.startsWith("/strategy")) {
      const body = await req.json();
      return await handleStrategy(body);
    }

    if (req.method === "POST" && path.startsWith("/improvements")) {
      const body = await req.json();
      return await handleImprovements(body, user.userId);
    }

    if (req.method === "POST" && path.startsWith("/scenarios")) {
      const body = await req.json();
      return await handleScenarios(body);
    }

    if (
      req.method === "POST" &&
      path.startsWith("/collection-upgrades")
    ) {
      const body = await req.json();
      return await handleCollectionUpgrades(body, user.userId);
    }

    return errorResponse(404, "Not found");
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.status, e.message);
    }
    console.error("Unhandled error:", e);
    return errorResponse(500, "Internal server error");
  }
});
