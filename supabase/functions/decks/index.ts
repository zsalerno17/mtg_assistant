import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient, getUserClient } from "../_shared/supabase.ts";
import { requireAllowedUser, getTokenFromRequest, AuthError } from "../_shared/auth.ts";
import { extractDeckId, getDeck, getDeckWithMeta, parseMoxfieldDeck } from "../_shared/moxfield.ts";
import { analyzeDeck } from "../_shared/deck_analyzer.ts";
import type { Card, Deck } from "../_shared/models.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, detail: string): Response {
  return jsonResponse({ detail }, status);
}

// ---------------------------------------------------------------------------
// Route: POST /fetch
// ---------------------------------------------------------------------------

async function handleFetch(body: { url?: string }): Promise<Response> {
  const url = body.url;
  if (!url) return errorResponse(400, "Missing 'url' field");

  let deckId: string | null = null;
  try {
    deckId = extractDeckId(url);
  } catch {
    // fall through
  }
  if (!deckId) return errorResponse(400, "Invalid Moxfield URL or deck ID");

  const sb = getServiceClient();

  // Return cached version if available
  const { data: cached } = await sb
    .from("decks")
    .select("*")
    .eq("moxfield_id", deckId)
    .maybeSingle();

  if (cached) {
    return jsonResponse({ deck_id: deckId, cached: true, data: cached.data_json });
  }

  // Fetch fresh from Moxfield
  let deck: Deck;
  try {
    deck = await getDeck(deckId);
  } catch (e) {
    return errorResponse(502, `Moxfield fetch failed: ${String(e)}`);
  }

  const deckData = serializeDeck(deck);
  await sb.from("decks").insert({ moxfield_id: deckId, data_json: deckData });

  return jsonResponse({ deck_id: deckId, cached: false, data: deckData });
}

// ---------------------------------------------------------------------------
// Route: POST /analyze
// ---------------------------------------------------------------------------

async function handleAnalyze(
  body: { moxfield_id?: string; force?: boolean },
  userId: string,
): Promise<Response> {
  const moxfieldId = body.moxfield_id;
  if (!moxfieldId) return errorResponse(400, "Missing 'moxfield_id' field");

  const sb = getServiceClient();
  const force = body.force ?? false;

  // Check deck exists in cache
  const { data: cachedDeck } = await sb
    .from("decks")
    .select("data_json")
    .eq("moxfield_id", moxfieldId)
    .maybeSingle();

  if (!cachedDeck) {
    return errorResponse(404, "Deck not found. Fetch it first.");
  }

  // Check for existing analysis
  const { data: existingRows } = await sb
    .from("analyses")
    .select("id, result_json, deck_updated_at")
    .eq("user_id", userId)
    .eq("deck_id", moxfieldId);

  const existing = existingRows?.[0] ?? null;

  // Re-fetch from Moxfield for fresh deck data and lastUpdatedAtUtc
  let deck: Deck;
  let lastUpdatedAt: string | null = null;

  try {
    [deck, lastUpdatedAt] = await getDeckWithMeta(moxfieldId);
  } catch (e) {
    // If Moxfield is down but we have an existing analysis, return it
    if (existing) {
      return jsonResponse({ analysis: existing.result_json, cached: true });
    }
    return errorResponse(502, `Could not load deck for analysis: ${String(e)}`);
  }

  // Return cached analysis if deck content hasn't changed (unless force)
  if (!force && existing && existing.deck_updated_at === lastUpdatedAt) {
    return jsonResponse({ analysis: existing.result_json, cached: true });
  }

  // Update deck cache with fresh data
  try {
    await sb
      .from("decks")
      .update({ data_json: serializeDeck(deck) })
      .eq("moxfield_id", moxfieldId);
  } catch (e) {
    console.warn(`Failed to update deck cache for ${moxfieldId}:`, e);
  }

  // Run fresh analysis
  const result = analyzeDeck(deck);

  const moxfieldUrl = `https://www.moxfield.com/decks/${moxfieldId}`;
  const deckName = deck.name || cachedDeck.data_json?.name || moxfieldId;

  const row = {
    user_id: userId,
    deck_id: moxfieldId,
    result_json: result,
    deck_name: deckName,
    moxfield_url: moxfieldUrl,
    deck_updated_at: lastUpdatedAt,
  };

  if (existing) {
    await sb.from("analyses").update(row).eq("id", existing.id);
  } else {
    await sb.from("analyses").insert(row);
  }

  return jsonResponse({ analysis: result, cached: false });
}

// ---------------------------------------------------------------------------
// Route: POST /library  (add to library)
// ---------------------------------------------------------------------------

async function handleAddToLibrary(
  body: { url?: string },
  userId: string,
): Promise<Response> {
  const url = body.url;
  if (!url) return errorResponse(400, "Missing 'url' field");

  let deckId: string | null = null;
  try {
    deckId = extractDeckId(url);
  } catch {
    // fall through
  }
  if (!deckId) return errorResponse(400, "Invalid Moxfield URL or deck ID");

  const sb = getServiceClient();

  // Ensure deck data is in the global cache
  const { data: cached } = await sb
    .from("decks")
    .select("data_json")
    .eq("moxfield_id", deckId)
    .maybeSingle();

  let deckData: Record<string, unknown>;
  if (cached) {
    deckData = cached.data_json;
  } else {
    let deck: Deck;
    try {
      deck = await getDeck(deckId);
    } catch (e) {
      return errorResponse(502, `Moxfield fetch failed: ${String(e)}`);
    }
    deckData = serializeDeck(deck);
    await sb.from("decks").insert({ moxfield_id: deckId, data_json: deckData });
  }

  const moxfieldUrl = `https://www.moxfield.com/decks/${deckId}`;
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

  const row = {
    user_id: userId,
    moxfield_id: deckId,
    deck_name: deckName,
    moxfield_url: moxfieldUrl,
    commander_image_uri: commanderImageUri,
    partner_image_uri: partnerImageUri,
    format: (deckData as Record<string, unknown>).format as string || "commander",
  };

  await sb.from("user_decks").upsert(row, { onConflict: "user_id,moxfield_id" });

  return jsonResponse({ moxfield_id: deckId, deck_name: deckName });
}

// ---------------------------------------------------------------------------
// Route: GET /library
// ---------------------------------------------------------------------------

async function handleGetLibrary(userId: string): Promise<Response> {
  const sb = getServiceClient();

  // Fetch user's library and analyses
  const [decksRes, analysesRes] = await Promise.all([
    sb.from("user_decks").select("*").eq("user_id", userId),
    sb.from("analyses").select("*").eq("user_id", userId),
  ]);

  // Check for errors in parallel queries
  if (decksRes.error) {
    console.error("[handleGetLibrary] Failed to fetch user_decks:", decksRes.error);
    return errorResponse(500, "Failed to load deck library");
  }
  if (analysesRes.error) {
    console.error("[handleGetLibrary] Failed to fetch analyses:", analysesRes.error);
    return errorResponse(500, "Failed to load deck analyses");
  }

  const userDecks = decksRes.data || [];
  const analyses = analysesRes.data || [];

  // Index analyses by deck_id, keeping most recent per deck
  const analysesByDeck: Record<string, Record<string, unknown>> = {};
  for (const a of analyses) {
    const did = a.deck_id as string;
    if (!analysesByDeck[did] || (a.created_at as string) > (analysesByDeck[did].created_at as string)) {
      analysesByDeck[did] = a;
    }
  }

  const userDeckIds = new Set(userDecks.map((d: Record<string, unknown>) => d.moxfield_id));

  // Pre-fetch cached deck data for color identity on unanalyzed decks
  const allDeckIds = Array.from(userDeckIds) as string[];
  const cachedDecksMap: Record<string, Record<string, unknown>> = {};
  if (allDeckIds.length > 0) {
    try {
      const { data: cachedRows } = await sb
        .from("decks")
        .select("moxfield_id, data_json")
        .in("moxfield_id", allDeckIds);
      for (const row of cachedRows || []) {
        cachedDecksMap[row.moxfield_id as string] = (row.data_json as Record<string, unknown>) || {};
      }
    } catch (e) {
      console.warn("[handleGetLibrary] Failed to fetch cached deck data:", e instanceof Error ? e.message : String(e));
    }
  }

  const resultList: Record<string, unknown>[] = [];

  // Library decks with optional analysis overlay
  for (const deck of userDecks) {
    const mid = deck.moxfield_id as string;
    const analysis = analysesByDeck[mid];
    const rj = (analysis?.result_json as Record<string, unknown>) || {};

    // Get colors: prefer analysis, fall back to cached deck commander color_identity
    let colors = rj.colors || rj.color_identity;
    if (!colors) {
      const dj = cachedDecksMap[mid] || {};
      const ci = new Set<string>();
      for (const key of ["commander", "partner"]) {
        const obj = dj[key] as Record<string, unknown> | null;
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

    resultList.push({
      id: deck.id,
      moxfield_id: mid,
      deck_name: deck.deck_name,
      moxfield_url: deck.moxfield_url,
      added_at: deck.added_at,
      analyzed: !!analysis,
      commander: rj.commander,
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
  for (const [deckId, analysis] of Object.entries(analysesByDeck)) {
    if (userDeckIds.has(deckId)) continue;
    const rj = (analysis.result_json as Record<string, unknown>) || {};

    // Try to get commander images from cached deck data
    let commanderImageUri: string | null = null;
    let partnerImageUri: string | null = null;
    try {
      const { data: cachedDeck } = await sb
        .from("decks")
        .select("data_json")
        .eq("moxfield_id", deckId)
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

  return jsonResponse({ decks: resultList });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const user = await requireAllowedUser(req);
    const url = new URL(req.url);
    const path = url.pathname.replace(/.*\/decks\/?/, "/");

    if (req.method === "POST" && (path === "/fetch" || path === "/" + "fetch")) {
      const body = await req.json();
      return await handleFetch(body);
    }

    if (req.method === "POST" && path.startsWith("/analyze")) {
      const body = await req.json();
      return await handleAnalyze(body, user.userId);
    }

    if (req.method === "POST" && path.startsWith("/library")) {
      const body = await req.json();
      return await handleAddToLibrary(body, user.userId);
    }

    if (req.method === "GET" && path.startsWith("/library")) {
      return await handleGetLibrary(user.userId);
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
