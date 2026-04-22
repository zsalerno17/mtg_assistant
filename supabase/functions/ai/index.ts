import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient, getUserClient } from "../_shared/supabase.ts";
import { requireAllowedUser, getTokenFromRequest, AuthError } from "../_shared/auth.ts";
import { getDeck } from "../_shared/moxfield.ts";
import {
  analyzeDeck,
  findCollectionImprovements,
  scenariosFallback,
  identifyWeaknesses,
  _findCut,
  _isWeakCategoryCard,
} from "../_shared/deck_analyzer.ts";
import {
  getStrategyAdvice,
  getImprovementSuggestions,
  explainScenarios,
  validateStrategyCards,
} from "../_shared/gemini.ts";
import { createCard } from "../_shared/models.ts";
import type { Card, Deck, Collection } from "../_shared/models.ts";

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
    try {
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
    } catch (dbErr) {
      console.error(
        `Cache fallback also failed for ${moxfieldId}:`,
        dbErr instanceof Error ? dbErr.message : String(dbErr),
      );
    }
    throw new Error(`Could not load deck: ${String(e)}`);
  }
}

/** Generate a stable cache key for a scenario request. */
async function getScenarioCacheKey(
  moxfieldId: string,
  cardsToAdd: string[],
  cardsToRemove: string[],
): Promise<string> {
  const input = [
    moxfieldId,
    [...cardsToAdd].sort().join(","),
    [...cardsToRemove].sort().join(","),
  ].join("|");
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  return `${moxfieldId}:scenario_${hash}`;
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
  req: Request,
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id'", req);

  const sb = getServiceClient();

  // Load deck first so we can validate card references on both cache hits and misses
  const deck = await loadDeck(moxfieldId);

  const cached = await getCached(sb, moxfieldId, "strategy_v4");
  if (cached) {
    try {
      const strategy = validateStrategyCards(JSON.parse(cached), deck.mainboard);
      return jsonResponse({ strategy, ai_enhanced: true, cached: true }, req);
    } catch {
      // corrupted cache, continue
    }
  }

  const analysis = analyzeDeck(deck);
  const result = await getStrategyAdvice(deck, analysis);
  const strategy = validateStrategyCards(
    result.content as Record<string, unknown>,
    deck.mainboard,
  );

  if (result.ai_enhanced && strategy) {
    await setCached(sb, moxfieldId, "strategy_v4", JSON.stringify(strategy));
  }

  return jsonResponse({
    strategy,
    ai_enhanced: result.ai_enhanced,
    cached: false,
  }, req);
}

// ---------------------------------------------------------------------------
// Route: POST /improvements
// ---------------------------------------------------------------------------

async function handleImprovements(
  body: { moxfield_id?: string; allowed_sets?: string[] },
  userId: string,
  userClient: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id'", req);
  const allowedSets = body.allowed_sets?.length ? body.allowed_sets : undefined;

  const sb = getServiceClient();

  // Collection-aware cache key — include set filter so filtered results are cached separately
  const setsKey = allowedSets ? `:${allowedSets.slice().sort().join(",")}` : "";
  const cacheKey = `${moxfieldId}:${userId}${setsKey}`;
  const cached = await getCached(sb, cacheKey, "improvements_v5");
  if (cached) {
    try {
      return jsonResponse({
        improvements: JSON.parse(cached),
        ai_enhanced: true,
        cached: true,
      }, req);
    } catch {
      // corrupted cache, continue
    }
  }

  const deck = await loadDeck(moxfieldId);
  const analysis = analyzeDeck(deck);

  // Compute weakness list once — used for weakness-aware cut selection and swap validation
  const weaknesses = identifyWeaknesses(
    deck,
    analysis.strategy as string | undefined,
    analysis.power_level as number | undefined,
  );
  const weakLabels = weaknesses.map((w) => w.label);

  // Load user collection (user-scoped — user client)
  const { data: colRow } = await userClient
    .from("collections")
    .select("cards_json")
    .eq("user_id", userId)
    .maybeSingle();

  const collectionCards: Record<string, unknown>[] =
    colRow?.cards_json || [];

  // Filter collection to allowed sets if specified
  const filteredCards = allowedSets
    ? collectionCards.filter((c) => {
        const code = ((c.set_code as string) || "").toLowerCase();
        return allowedSets.some((s) => s.toLowerCase() === code);
      })
    : collectionCards;

  const result = await getImprovementSuggestions(
    deck,
    analysis,
    filteredCards,
    allowedSets,
  );

  // --- Post-process: validate swaps, merge legacy formats, add owned flags ---
  const content = result.content as Record<string, unknown>;
  const mainboardLower = new Set(
    deck.mainboard.map((c) => c.name.toLowerCase()),
  );
  const ownedLower = new Set(
    filteredCards.map((c) => ((c.name as string) || "").toLowerCase()),
  );

  // Build a lookup of collection cards by name for type_line / oracle_text info
  // (needed to call _findCut with a properly typed Card)
  const collectionByName = new Map<string, Record<string, unknown>>();
  for (const c of filteredCards) {
    collectionByName.set(((c.name as string) || "").toLowerCase(), c);
  }

  // Remove urgent_fixes already in deck, add owned flag
  const urgentFixesRaw: Record<string, unknown>[] = Array.isArray(
    content.urgent_fixes,
  )
    ? (content.urgent_fixes as Record<string, unknown>[]).filter(
        (f) => !mainboardLower.has(((f.card as string) || "").toLowerCase()),
      ).map((f) => ({
        ...f,
        owned: ownedLower.has(((f.card as string) || "").toLowerCase()),
      })).slice(0, 5)
    : [];
  content.urgent_fixes = urgentFixesRaw;

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
          reason: oldAdds[i].reason || oldCuts[i].reason || "",
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

  // Merge staples_to_buy into additions before further processing
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

  // Stamp owned flag on all additions
  const stampedAdditions: Record<string, unknown>[] = mergedAdditions
    .filter(
      (a) => !mainboardLower.has(((a.card as string) || "").toLowerCase()),
    )
    .map((a) => ({
      ...a,
      owned: ownedLower.has(((a.card as string) || "").toLowerCase()),
    }))
    .slice(0, 10);

  // --- Promote owned urgent_fixes and owned additions into concrete swaps ---
  // If a user already owns a card that fixes a weakness or is a recommended addition,
  // pair it with a weakness-safe cut so it appears in Recommended Swaps immediately.
  const promotedSwaps: Record<string, unknown>[] = [];
  const promotedCardNames = new Set<string>();

  function tryPromoteToSwap(
    item: Record<string, unknown>,
    priority: "critical" | "upgrade",
  ): void {
    const cardName = (item.card as string) || "";
    const cardNameLower = cardName.toLowerCase();
    if (promotedCardNames.has(cardNameLower)) return;

    const colCard = collectionByName.get(cardNameLower);
    const incomingCard = createCard({
      name: cardName,
      quantity: 1,
      mana_cost: "",
      cmc: Number(colCard?.cmc) || 0,
      type_line: (colCard?.type_line as string) || "",
      oracle_text: (colCard?.oracle_text as string) || "",
      colors: [],
      color_identity: [],
      keywords: [],
      rarity: "",
      set_code: "",
      image_uri: "",
      scryfall_id: "",
    });
    const [cutCard] = _findCut(deck, incomingCard, weaknesses);
    if (cutCard) {
      promotedSwaps.push({
        cut: cutCard.name,
        add: cardName,
        reason: (item.reason as string) ||
          (priority === "critical"
            ? `Addresses a critical deck weakness`
            : `Upgrade from your collection`),
        category: (item.category as string) || "upgrade",
        price_tier: (item.price_tier as string) || "budget",
        owned: true,
        priority,
      });
      promotedCardNames.add(cardNameLower);
    }
  }

  // Owned urgent_fixes first (critical priority)
  for (const fix of urgentFixesRaw) {
    if (fix.owned) tryPromoteToSwap(fix, "critical");
  }
  // Owned additions second (upgrade priority)
  for (const add of stampedAdditions) {
    if (add.owned) tryPromoteToSwap(add, "upgrade");
  }

  // Remove promoted items from urgent_fixes and additions (they now live in swaps)
  content.urgent_fixes = urgentFixesRaw.filter(
    (f) => !promotedCardNames.has(((f.card as string) || "").toLowerCase()),
  );
  content.additions = stampedAdditions.filter(
    (a) => !promotedCardNames.has(((a.card as string) || "").toLowerCase()),
  );

  // --- Validate Gemini swaps: cut must be in deck, add must not be, cut must not worsen a weakness ---
  const validatedSwaps: Record<string, unknown>[] = [];
  for (const swap of rawSwaps) {
    const cutName = ((swap.cut as string) || "").toLowerCase();
    const addName = ((swap.add as string) || "").toLowerCase();
    if (!mainboardLower.has(cutName) || mainboardLower.has(addName)) continue;
    // Skip if the cut card belongs to a weak category (would make the deck worse)
    const cutCard = deck.mainboard.find((c) => c.name.toLowerCase() === cutName);
    if (cutCard && _isWeakCategoryCard(cutCard, weakLabels)) continue;
    // Skip if the add card was already promoted into a swap
    if (promotedCardNames.has(addName)) continue;
    swap.owned = ownedLower.has(addName);
    validatedSwaps.push(swap);
  }

  // Promoted swaps first (owned, concrete, highest value), then Gemini swaps
  const allSwaps = [...promotedSwaps, ...validatedSwaps];
  // Deduplicate by add card name
  const seenAdds = new Set<string>();
  const dedupedSwaps: Record<string, unknown>[] = [];
  for (const s of allSwaps) {
    const addName = ((s.add as string) || "").toLowerCase();
    if (!seenAdds.has(addName)) {
      seenAdds.add(addName);
      dedupedSwaps.push(s);
    }
  }
  content.swaps = dedupedSwaps.slice(0, 8);

  // Cache AI responses
  if (result.ai_enhanced && content) {
    await setCached(
      sb,
      cacheKey,
      "improvements_v5",
      JSON.stringify(content),
    );
  }

  return jsonResponse({
    improvements: content,
    ai_enhanced: result.ai_enhanced,
    cached: false,
  }, req);
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
  req: Request,
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id'", req);

  const cardsToAdd = body.cards_to_add || [];
  const cardsToRemove = body.cards_to_remove || [];
  if (cardsToAdd.length === 0 && cardsToRemove.length === 0) {
    return errorResponse(
      400,
      "Provide at least one card to add or remove.", req,
    );
  }

  const sb = getServiceClient();

  // Serve from cache — scenario analysis is expensive (Gemini call)
  const cacheKey = await getScenarioCacheKey(moxfieldId, cardsToAdd, cardsToRemove);
  const cachedScenario = await getCached(sb, cacheKey, "scenarios_v1");
  if (cachedScenario) {
    try {
      return jsonResponse({
        scenarios: JSON.parse(cachedScenario),
        ai_enhanced: true,
        cached: true,
      }, req);
    } catch {
      // corrupted cache entry — continue to regenerate
    }
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
    return jsonResponse({ scenarios: fallback, ai_enhanced: false }, req);
  }

  // Cache successful AI response
  await setCached(sb, cacheKey, "scenarios_v1", JSON.stringify(result));

  return jsonResponse({ scenarios: result, ai_enhanced: true, cached: false }, req);
}

// ---------------------------------------------------------------------------
// Route: POST /collection-upgrades
// ---------------------------------------------------------------------------

async function handleCollectionUpgrades(
  body: { moxfield_id?: string },
  userId: string,
  userClient: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id'", req);

  // Load user collection (user-scoped — user client)
  const { data: colRow } = await userClient
    .from("collections")
    .select("cards_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (!colRow?.cards_json?.length) {
    return jsonResponse({ upgrades: [], has_collection: false }, req);
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

  return jsonResponse({ upgrades, has_collection: true }, req);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const user = await requireAllowedUser(req);
    const token = getTokenFromRequest(req);
    const userClient = getUserClient(token);
    const url = new URL(req.url);
    const path = url.pathname.replace(/.*\/ai\/?/, "/");

    if (req.method === "POST" && path.startsWith("/strategy")) {
      const body = await req.json();
      return await handleStrategy(body, req);
    }

    if (req.method === "POST" && path.startsWith("/improvements")) {
      const body = await req.json();
      return await handleImprovements(body, user.userId, userClient, req);
    }

    if (req.method === "POST" && path.startsWith("/scenarios")) {
      const body = await req.json();
      return await handleScenarios(body, req);
    }

    if (
      req.method === "POST" &&
      path.startsWith("/collection-upgrades")
    ) {
      const body = await req.json();
      return await handleCollectionUpgrades(body, user.userId, userClient, req);
    }

    return errorResponse(404, "Not found", req);
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.status, e.message, req);
    }
    console.error("Unhandled error:", e);
    return errorResponse(500, "Internal server error", req);
  }
});
