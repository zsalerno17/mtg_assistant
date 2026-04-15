import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { getUserClient } from "../_shared/supabase.ts";
import { requireAllowedUser, getTokenFromRequest, AuthError } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 3600 * 1000; // 1 hour

async function checkRateLimit(
  userId: string,
  sb: ReturnType<typeof getUserClient>,
): Promise<void> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  try {
    const { count, error } = await sb
      .from("personal_games")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStart);
    if (error) {
      console.warn("Rate limit DB check failed, allowing request:", error.message);
      return;
    }
    if ((count ?? 0) >= RATE_LIMIT) {
      throw new HttpError(429, `Rate limit exceeded: maximum ${RATE_LIMIT} games per hour`);
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    console.warn("Rate limit check threw unexpectedly, allowing request:", e);
  }
}

// ---------------------------------------------------------------------------
// Sanitization helpers
// ---------------------------------------------------------------------------

function sanitizeText(
  text: string | null | undefined,
  maxLength: number = 5000,
): string | null {
  if (text == null) return null;
  let clean = text.replace(/<[^>]+>/g, "").trim();
  clean = clean.slice(0, maxLength);
  return clean || null;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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
// Route handlers
// ---------------------------------------------------------------------------

// POST / — log a personal game
async function logPersonalGame(
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await checkRateLimit(userId, sb);

  const podSize = Number(body.pod_size);
  if (!Number.isInteger(podSize) || podSize < 2 || podSize > 10) {
    return errorResponse(400, "pod_size must be an integer between 2 and 10", req);
  }

  const placement = Number(body.placement);
  if (!Number.isInteger(placement) || placement < 1 || placement > podSize) {
    return errorResponse(400, `placement must be between 1 and ${podSize}`, req);
  }

  const playedAt = body.played_at
    ? new Date(body.played_at as string).toISOString()
    : new Date().toISOString();

  const notes = sanitizeText(body.notes as string, 2000);

  const deckId = body.deck_id ? String(body.deck_id) : null;

  // Verify deck ownership if provided
  if (deckId) {
    const { data: deck } = await sb
      .from("user_decks")
      .select("user_id")
      .eq("id", deckId)
      .maybeSingle();
    if (!deck || deck.user_id !== userId) {
      return errorResponse(403, "Deck not found or does not belong to you", req);
    }
  }

  const { data, error } = await sb
    .from("personal_games")
    .insert({ user_id: userId, played_at: playedAt, pod_size: podSize, placement, deck_id: deckId, notes })
    .select()
    .single();

  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ game: data }, req);
}

// GET / — list personal games (paginated)
async function listPersonalGames(
  url: URL,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("page_size") || "20")));
  const offset = (page - 1) * pageSize;

  const { data, error } = await sb
    .from("personal_games")
    .select("*, user_decks(deck_name, commander_image_uri)")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw new HttpError(400, error.message);

  return jsonResponse({
    games: data,
    page,
    page_size: pageSize,
    has_more: (data || []).length === pageSize,
  }, req);
}

// GET /:id — single personal game
async function getPersonalGame(
  gameId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const { data, error } = await sb
    .from("personal_games")
    .select("*, user_decks(deck_name, commander_image_uri)")
    .eq("id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new HttpError(400, error.message);
  if (!data) return errorResponse(404, "Game not found", req);
  return jsonResponse({ game: data }, req);
}

// DELETE /:id — delete a personal game
async function deletePersonalGame(
  gameId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const { data: existing } = await sb
    .from("personal_games")
    .select("id")
    .eq("id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) return errorResponse(404, "Game not found", req);

  const { error } = await sb
    .from("personal_games")
    .delete()
    .eq("id", gameId);

  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ message: "Game deleted" }, req);
}

// ---------------------------------------------------------------------------
// URL path routing
// ---------------------------------------------------------------------------

function parsePath(pathname: string): string[] {
  const cleaned = pathname.replace(/.*\/games\/?/, "");
  if (!cleaned) return [];
  return cleaned.split("/").filter(Boolean);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const user = await requireAllowedUser(req);
    const token = getTokenFromRequest(req);
    const sb = getUserClient(token);
    const url = new URL(req.url);
    const segments = parsePath(url.pathname);
    const method = req.method;

    // GET / — list
    if (method === "GET" && segments.length === 0) {
      return await listPersonalGames(url, user.userId, sb, req);
    }

    // POST / — log
    if (method === "POST" && segments.length === 0) {
      const body = await req.json();
      return await logPersonalGame(body, user.userId, sb, req);
    }

    // GET /:id
    if (method === "GET" && segments.length === 1) {
      return await getPersonalGame(segments[0], user.userId, sb, req);
    }

    // DELETE /:id
    if (method === "DELETE" && segments.length === 1) {
      return await deletePersonalGame(segments[0], user.userId, sb, req);
    }

    return errorResponse(404, "Not found", req);
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse((e as AuthError).status, e.message, req);
    }
    if (e instanceof HttpError) {
      return errorResponse((e as HttpError).status, e.message, req);
    }
    console.error("Unhandled error:", e);
    return errorResponse(500, "Internal server error", req);
  }
});
