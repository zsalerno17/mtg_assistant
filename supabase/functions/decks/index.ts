import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient, getUserClient } from "../_shared/supabase.ts";
import { requireAllowedUser, getTokenFromRequest, AuthError } from "../_shared/auth.ts";
import {
  extractDeckId as extractMoxfieldDeckId,
  getDeck as getMoxfieldDeck,
  getDeckWithMeta as getMoxfieldDeckWithMeta,
} from "../_shared/moxfield.ts";
import {
  extractDeckId as extractArchidektDeckId,
  getDeck as getArchidektDeck,
  getDeckWithMeta as getArchidektDeckWithMeta,
} from "../_shared/archidekt.ts";
import { analyzeDeck } from "../_shared/deck_analyzer.ts";
import type { Card, Deck } from "../_shared/models.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DeckSource = "moxfield" | "archidekt";

function detectSource(url: string): DeckSource {
  return url.includes("archidekt.com") ? "archidekt" : "moxfield";
}

function extractDeckId(url: string, source: DeckSource): string | null {
  return source === "archidekt"
    ? extractArchidektDeckId(url)
    : extractMoxfieldDeckId(url);
}

async function fetchDeckFromSource(deckId: string, source: DeckSource): Promise<Deck> {
  return source === "archidekt"
    ? getArchidektDeck(deckId)
    : getMoxfieldDeck(deckId);
}

async function fetchDeckWithMetaFromSource(
  deckId: string,
  source: DeckSource,
): Promise<[Deck, string]> {
  return source === "archidekt"
    ? getArchidektDeckWithMeta(deckId)
    : getMoxfieldDeckWithMeta(deckId);
}

function buildDeckUrl(deckId: string, source: DeckSource): string {
  return source === "archidekt"
    ? `https://archidekt.com/decks/${deckId}`
    : `https://www.moxfield.com/decks/${deckId}`;
}

function serializeCard(c: Card): Record<string, unknown> {
  return {
    name: c.name,
    quantity: c.quantity,
    mana_cost: c.mana_cost,
    cmc: c.cmc,
    type_line: c.type_line,
    oracle_text: c.oracle_text,
    colors: c.colors,
    color_identity: c.color_identity,
    keywords: c.keywords,
    rarity: c.rarity,
    set_code: c.set_code,
    image_uri: c.image_uri,
    scryfall_id: c.scryfall_id,
  };
}

function serializeDeck(deck: Deck): Record<string, unknown> {
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    commander: deck.commander ? serializeCard(deck.commander) : null,
    partner: deck.partner ? serializeCard(deck.partner) : null,
    mainboard: deck.mainboard.map(serializeCard),
    sideboard: deck.sideboard.map(serializeCard),
  };
}

function jsonResponse(data: unknown, req: Request, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, detail: string, req: Request): Response {
  return jsonResponse({ detail }, req, status);
}

// ---------------------------------------------------------------------------
// Route: POST /fetch
// ---------------------------------------------------------------------------

async function handleFetch(body: { url?: string }, req: Request): Promise<Response> {
  const url = body.url;
  if (!url) return errorResponse(400, "Missing 'url' field", req);

  const source = detectSource(url);
  let deckId: string | null = null;
  try {
    deckId = extractDeckId(url, source);
  } catch {
    // fall through
  }
  if (!deckId) return errorResponse(400, "Invalid deck URL or ID", req);

  const sb = getServiceClient();

  // Return cached version if available
  const { data: cached } = await sb
    .from("decks")
    .select("*")
    .eq("moxfield_id", deckId)
    .eq("source", source)
    .maybeSingle();

  if (cached) {
    return jsonResponse({ deck_id: deckId, cached: true, data: cached.data_json }, req);
  }

  // Fetch fresh from source platform
  let deck: Deck;
  try {
    deck = await fetchDeckFromSource(deckId, source);
  } catch (e) {
    return errorResponse(502, `Deck fetch failed: ${String(e)}`, req);
  }

  const deckData = serializeDeck(deck);
  await sb.from("decks").insert({ moxfield_id: deckId, source, data_json: deckData });

  return jsonResponse({ deck_id: deckId, cached: false, data: deckData }, req);
}

// ---------------------------------------------------------------------------
// Route: POST /analyze
// ---------------------------------------------------------------------------

async function handleAnalyze(
  body: { moxfield_id?: string; source?: string; force?: boolean },
  userId: string,
  userClient: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id' field", req);

  const source: DeckSource = body.source === "archidekt" ? "archidekt" : "moxfield";
  const sb = getServiceClient();
  const force = body.force ?? false;

  // Check deck exists in cache (shared table — service client)
  const { data: cachedDeck } = await sb
    .from("decks")
    .select("data_json")
    .eq("moxfield_id", moxfieldId)
    .eq("source", source)
    .maybeSingle();

  if (!cachedDeck) {
    return errorResponse(404, "Deck not found. Fetch it first.", req);
  }

  // Check for existing analysis (user-scoped — user client)
  const { data: existingRows } = await userClient
    .from("analyses")
    .select("id, result_json, deck_updated_at")
    .eq("user_id", userId)
    .eq("deck_id", moxfieldId)
    .eq("source", source);

  const existing = existingRows?.[0] ?? null;

  // Re-fetch from source platform for fresh data and updated timestamp
  let deck: Deck;
  let lastUpdatedAt: string | null = null;

  try {
    [deck, lastUpdatedAt] = await fetchDeckWithMetaFromSource(moxfieldId, source);
  } catch (e) {
    // If source is down but we have an existing analysis, return it
    if (existing) {
      return jsonResponse({ analysis: existing.result_json, cached: true }, req);
    }
    return errorResponse(502, `Could not load deck for analysis: ${String(e)}`, req);
  }

  // Return cached analysis if deck content hasn't changed (unless force)
  const hasRequiredFields = existing?.result_json &&
    "mana_curve" in existing.result_json &&
    "interaction_coverage" in existing.result_json &&
    "removal_quality" in existing.result_json;

  if (!force && existing && existing.deck_updated_at === lastUpdatedAt && hasRequiredFields) {
    return jsonResponse({ analysis: existing.result_json, cached: true }, req);
  }

  // Update deck cache with fresh data. Preserve any existing image URIs if the
  // new fetch returned empty ones.
  try {
    const serialized = serializeDeck(deck);
    const cachedData = cachedDeck.data_json as Record<string, unknown>;
    const oldCommander = cachedData?.commander as Record<string, unknown> | null;
    const newCommander = serialized.commander as Record<string, unknown> | null;
    if (newCommander && !newCommander.image_uri && oldCommander?.image_uri) {
      newCommander.image_uri = oldCommander.image_uri;
    }
    const oldPartner = cachedData?.partner as Record<string, unknown> | null;
    const newPartner = serialized.partner as Record<string, unknown> | null;
    if (newPartner && !newPartner.image_uri && oldPartner?.image_uri) {
      newPartner.image_uri = oldPartner.image_uri;
    }
    await sb
      .from("decks")
      .update({ data_json: serialized })
      .eq("moxfield_id", moxfieldId)
      .eq("source", source);
  } catch (e) {
    console.warn(`Failed to update deck cache for ${moxfieldId}:`, e);
  }

  // Run fresh analysis
  const result = analyzeDeck(deck);

  const deckUrl = buildDeckUrl(moxfieldId, source);
  const deckName = deck.name || cachedDeck.data_json?.name || moxfieldId;

  const row = {
    user_id: userId,
    deck_id: moxfieldId,
    source,
    result_json: result,
    deck_name: deckName,
    moxfield_url: deckUrl,
    deck_updated_at: lastUpdatedAt,
  };

  if (existing) {
    await userClient.from("analyses").update(row).eq("id", existing.id);
  } else {
    await userClient.from("analyses").insert(row);
  }

  return jsonResponse({ analysis: result, cached: false }, req);
}

// ---------------------------------------------------------------------------
// Route: POST /library  (add to library)
// ---------------------------------------------------------------------------

async function handleAddToLibrary(
  body: { url?: string },
  userId: string,
  userClient: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const url = body.url;
  if (!url) return errorResponse(400, "Missing 'url' field", req);

  const source = detectSource(url);
  let deckId: string | null = null;
  try {
    deckId = extractDeckId(url, source);
  } catch {
    // fall through
  }
  if (!deckId) return errorResponse(400, "Invalid deck URL or ID", req);

  const sb = getServiceClient();

  // Ensure deck data is in the global cache (shared table — service client)
  const { data: cached } = await sb
    .from("decks")
    .select("data_json")
    .eq("moxfield_id", deckId)
    .eq("source", source)
    .maybeSingle();

  let deckData: Record<string, unknown>;
  if (cached) {
    deckData = cached.data_json;
  } else {
    let deck: Deck;
    try {
      deck = await fetchDeckFromSource(deckId, source);
    } catch (e) {
      return errorResponse(502, `Deck fetch failed: ${String(e)}`, req);
    }
    deckData = serializeDeck(deck);
    await sb.from("decks").insert({ moxfield_id: deckId, source, data_json: deckData });
  }

  const deckUrl = buildDeckUrl(deckId, source);
  const deckName = (deckData as Record<string, unknown>).name as string || deckId;

  // Extract commander/partner images
  let commanderImageUri: string | null = null;
  let partnerImageUri: string | null = null;
  const commanderObj = (deckData as Record<string, unknown>).commander as Record<string, unknown> | null;
  const partnerObj = (deckData as Record<string, unknown>).partner as Record<string, unknown> | null;
  if (commanderObj && typeof commanderObj === "object") {
    commanderImageUri = (commanderObj.image_uri as string) || null;
  }
  if (partnerObj && typeof partnerObj === "object") {
    partnerImageUri = (partnerObj.image_uri as string) || null;
  }

  // Never overwrite a previously-good image URI with null.
  if (!commanderImageUri || !partnerImageUri) {
    const { data: existingRow } = await sb
      .from("user_decks")
      .select("commander_image_uri, partner_image_uri")
      .eq("user_id", userId)
      .eq("moxfield_id", deckId)
      .eq("source", source)
      .maybeSingle();
    if (!commanderImageUri && existingRow?.commander_image_uri) {
      commanderImageUri = existingRow.commander_image_uri;
    }
    if (!partnerImageUri && existingRow?.partner_image_uri) {
      partnerImageUri = existingRow.partner_image_uri;
    }
  }

  const row = {
    user_id: userId,
    moxfield_id: deckId,
    source,
    deck_name: deckName,
    moxfield_url: deckUrl,
    commander_image_uri: commanderImageUri,
    partner_image_uri: partnerImageUri,
    format: (deckData as Record<string, unknown>).format as string || "commander",
  };

  // user_decks is user-scoped — use user client
  await userClient.from("user_decks").upsert(row, { onConflict: "user_id,moxfield_id" });

  return jsonResponse({ moxfield_id: deckId, deck_name: deckName, source }, req);
}

// ---------------------------------------------------------------------------
// Route: GET /library
// ---------------------------------------------------------------------------

async function handleGetLibrary(
  userId: string,
  userClient: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const sb = getServiceClient();

  // Fetch user's library and analyses (user-scoped — user client)
  const [decksRes, analysesRes] = await Promise.all([
    userClient.from("user_decks").select("*").eq("user_id", userId),
    userClient.from("analyses").select("*").eq("user_id", userId),
  ]);

  if (decksRes.error) {
    console.error("[handleGetLibrary] Failed to fetch user_decks:", decksRes.error);
    return errorResponse(500, "Failed to load deck library", req);
  }
  if (analysesRes.error) {
    console.error("[handleGetLibrary] Failed to fetch analyses:", analysesRes.error);
    return errorResponse(500, "Failed to load deck analyses", req);
  }

  const userDecks = decksRes.data || [];
  const analyses = analysesRes.data || [];

  // Index analyses by (source, deck_id), keeping most recent per deck
  const analysesByDeck: Record<string, Record<string, unknown>> = {};
  for (const a of analyses) {
    const source = (a.source as string) || "moxfield";
    const key = `${source}:${a.deck_id as string}`;
    if (!analysesByDeck[key] || (a.created_at as string) > (analysesByDeck[key].created_at as string)) {
      analysesByDeck[key] = a;
    }
  }

  // Pre-fetch cached deck data for color identity on unanalyzed decks
  const deckLookupKeys = userDecks.map((d: Record<string, unknown>) => ({
    id: d.moxfield_id as string,
    source: (d.source as string) || "moxfield",
  }));

  const cachedDecksMap: Record<string, Record<string, unknown>> = {};
  if (deckLookupKeys.length > 0) {
    try {
      // Group by source for efficient queries
      const moxfieldIds = deckLookupKeys.filter((k: { source: string; id: string }) => k.source === "moxfield").map((k: { source: string; id: string }) => k.id);
      const archidektIds = deckLookupKeys.filter((k: { source: string; id: string }) => k.source === "archidekt").map((k: { source: string; id: string }) => k.id);

      const queries: Promise<void>[] = [];

      if (moxfieldIds.length > 0) {
        queries.push(
          sb.from("decks").select("moxfield_id, source, data_json")
            .in("moxfield_id", moxfieldIds).eq("source", "moxfield")
            .then(({ data: rows }: { data: Record<string, unknown>[] | null }) => {
              for (const row of rows || []) {
                cachedDecksMap[`moxfield:${row.moxfield_id}`] = (row.data_json as Record<string, unknown>) || {};
              }
            })
        );
      }
      if (archidektIds.length > 0) {
        queries.push(
          sb.from("decks").select("moxfield_id, source, data_json")
            .in("moxfield_id", archidektIds).eq("source", "archidekt")
            .then(({ data: rows }: { data: Record<string, unknown>[] | null }) => {
              for (const row of rows || []) {
                cachedDecksMap[`archidekt:${row.moxfield_id}`] = (row.data_json as Record<string, unknown>) || {};
              }
            })
        );
      }

      await Promise.all(queries);
    } catch (e) {
      console.warn("[handleGetLibrary] Failed to fetch cached deck data:", e instanceof Error ? e.message : String(e));
    }
  }

  const resultList: Record<string, unknown>[] = [];

  // Library decks with optional analysis overlay
  for (const deck of userDecks) {
    const mid = deck.moxfield_id as string;
    const source = (deck.source as string) || "moxfield";
    const key = `${source}:${mid}`;
    const analysis = analysesByDeck[key];
    const rj = (analysis?.result_json as Record<string, unknown>) || {};

    // Get colors: prefer analysis, fall back to cached deck commander color_identity
    let colors = rj.colors || rj.color_identity;
    if (!colors) {
      const dj = cachedDecksMap[key] || {};
      const ci = new Set<string>();
      for (const k of ["commander", "partner"]) {
        const obj = dj[k] as Record<string, unknown> | null;
        if (obj && typeof obj === "object") {
          for (const c of (obj.color_identity as string[]) || []) {
            ci.add(c);
          }
        }
      }
      if (ci.size > 0) {
        const order = ["W", "U", "B", "R", "G"];
        colors = order.filter((c) => ci.has(c));
      }
    }

    const cachedDeckDataForName = cachedDecksMap[key] || {};
    const commanderName = (rj.commander as string | null) ||
      ((cachedDeckDataForName.commander as Record<string, unknown> | null)?.name as string) ||
      null;

    resultList.push({
      id: deck.id,
      moxfield_id: mid,
      source,
      deck_name: deck.deck_name,
      moxfield_url: deck.moxfield_url,
      added_at: deck.added_at,
      analyzed: !!analysis,
      commander: commanderName,
      commander_image_uri: deck.commander_image_uri,
      partner_image_uri: deck.partner_image_uri,
      format: deck.format || "commander",
      colors,
      themes: rj.themes || [],
      verdict: rj.verdict,
      power_level: rj.power_level,
    });
  }

  // Backwards-compat: include analyses that have no user_decks entry
  const userDeckKeys = new Set(
    userDecks.map((d: Record<string, unknown>) =>
      `${(d.source as string) || "moxfield"}:${d.moxfield_id as string}`
    )
  );

  for (const [key, analysis] of Object.entries(analysesByDeck)) {
    if (userDeckKeys.has(key)) continue;
    const rj = (analysis.result_json as Record<string, unknown>) || {};
    const [analysisSource, deckId] = key.split(":") as [string, string];

    let commanderImageUri: string | null = null;
    let partnerImageUri: string | null = null;
    try {
      const { data: cachedDeck } = await sb
        .from("decks")
        .select("data_json")
        .eq("moxfield_id", deckId)
        .eq("source", analysisSource)
        .maybeSingle();
      if (cachedDeck) {
        const dd = cachedDeck.data_json as Record<string, unknown>;
        const cObj = dd.commander as Record<string, unknown> | null;
        const pObj = dd.partner as Record<string, unknown> | null;
        if (cObj && typeof cObj === "object") commanderImageUri = (cObj.image_uri as string) || null;
        if (pObj && typeof pObj === "object") partnerImageUri = (pObj.image_uri as string) || null;
      }
    } catch (e) {
      console.warn(`[handleGetLibrary] Failed to fetch commander images for legacy deck ${deckId}:`, e instanceof Error ? e.message : String(e));
    }

    resultList.push({
      moxfield_id: deckId,
      source: analysisSource,
      deck_name: analysis.deck_name || deckId,
      moxfield_url: analysis.moxfield_url,
      added_at: analysis.created_at,
      analyzed: true,
      commander: rj.commander,
      commander_image_uri: commanderImageUri,
      partner_image_uri: partnerImageUri,
      format: "commander",
      colors: rj.colors || rj.color_identity,
      themes: rj.themes || [],
      verdict: rj.verdict,
      power_level: rj.power_level,
    });
  }

  resultList.sort((a, b) =>
    ((b.added_at as string) || "").localeCompare((a.added_at as string) || ""),
  );

  return jsonResponse({ decks: resultList }, req);
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
    const path = url.pathname.replace(/.*\/decks\/?/, "/");

    if (req.method === "POST" && (path === "/fetch" || path === "/" + "fetch")) {
      const body = await req.json();
      return await handleFetch(body, req);
    }

    if (req.method === "POST" && path.startsWith("/analyze")) {
      const body = await req.json();
      return await handleAnalyze(body, user.userId, userClient, req);
    }

    if (req.method === "POST" && path.startsWith("/library")) {
      const body = await req.json();
      return await handleAddToLibrary(body, user.userId, userClient, req);
    }

    if (req.method === "GET" && path.startsWith("/library")) {
      return await handleGetLibrary(user.userId, userClient, req);
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
