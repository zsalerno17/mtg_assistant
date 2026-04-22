import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient, getUserClient } from "../_shared/supabase.ts";
import { requireAllowedUser, getTokenFromRequest, AuthError } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// Rate limiting (DB-backed, survives cold starts)
// ---------------------------------------------------------------------------

const GAME_LOG_RATE_LIMIT = 10;
const GAME_LOG_WINDOW_MS = 3600 * 1000; // 1 hour

/**
 * DB-backed rate limit: counts league_games created in the last hour.
 * Fails open (allows request) if the DB check itself errors, to avoid
 * blocking legitimate traffic due to transient DB issues.
 */
async function checkGameRateLimit(
  leagueId: string,
  sb: ReturnType<typeof getUserClient>,
): Promise<void> {
  const windowStart = new Date(Date.now() - GAME_LOG_WINDOW_MS).toISOString();
  try {
    const { count, error } = await sb
      .from("league_games")
      .select("id", { count: "exact", head: true })
      .eq("league_id", leagueId)
      .gte("created_at", windowStart);
    if (error) {
      console.warn("Rate limit DB check failed, allowing request:", error.message);
      return; // fail open
    }
    if ((count ?? 0) >= GAME_LOG_RATE_LIMIT) {
      throw new HttpError(
        429,
        `Rate limit exceeded: maximum ${GAME_LOG_RATE_LIMIT} games per hour per league`,
      );
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    console.warn("Rate limit check threw unexpectedly, allowing request:", e);
    // fail open
  }
}

// ---------------------------------------------------------------------------
// URL / text sanitization helpers (XSS / SSRF prevention)
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

function validateHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new HttpError(400, "Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "URL must use http or https scheme");
  }
  const blocked = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "10.",
    "172.16.",
    "192.168.",
  ];
  if (
    parsed.hostname &&
    blocked.some((b) => parsed.hostname.startsWith(b))
  ) {
    throw new HttpError(
      400,
      "URL cannot point to localhost or private network addresses",
    );
  }
  return url;
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

/** Verify user is a member of the given league. Returns member_id. */
async function verifyMembership(
  leagueId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
): Promise<string> {
  const { data } = await sb
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    throw new HttpError(403, "Not a member of this league");
  }
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Scoring helper
// ---------------------------------------------------------------------------

/**
 * Sanitize the custom_bonus_winners map from the request body.
 * Ensures it is a plain { awardId: memberId } object with string values.
 */
function sanitizeCustomBonusWinners(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === "string" && typeof v === "string" && k.length < 100 && v.length < 200) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Calculate total points for a game result using the league's configured
 * placement points (falls back to 3-2-1-0 for backward compatibility).
 */
function calculatePoints(
  placement: number,
  earnedEntranceBonus: boolean,
  earnedFirstBlood: boolean,
  earnedSpicyPlay: boolean,
  placementPointsConfig?: Record<string, number>,
  bonusAwardsCfg?: Array<{ id: string; points?: number }>,
): number {
  const pp = placementPointsConfig ?? { "1": 3, "2": 2, "3": 1, "4": 0 };
  // Use last configured key as fallback (matches frontend getPointsForPlacement)
  const keys = Object.keys(pp).map(Number).sort((a, b) => a - b);
  const lastKey = String(keys[keys.length - 1] ?? 4);
  let pts = pp[String(placement)] ?? pp[lastKey] ?? 0;
  // Look up each award's configured point value instead of hardcoding +1
  const awardPts = (id: string) =>
    bonusAwardsCfg?.find((a) => a.id === id)?.points ?? 1;
  if (earnedEntranceBonus) pts += awardPts("entrance_bonus");
  if (earnedFirstBlood) pts += awardPts("first_blood");
  if (earnedSpicyPlay) pts += awardPts("spicy_play");
  return pts;
}

/** Sum points from bonus awards won by a specific member in a game.
 *  Counts all awards in the winners map — isCustom is a UI hint only,
 *  not a scoring filter.
 */
function customBonusPoints(
  memberId: string,
  winners: Record<string, string>,
  awardsCfg: Array<{ id: string; points?: number }>,
): number {
  let pts = 0;
  for (const [awardId, winnerId] of Object.entries(winners)) {
    if (winnerId === memberId) {
      const award = awardsCfg.find((a) => a.id === awardId);
      if (award) pts += award.points ?? 0;
    }
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

// GET /users — list all registered users for pilot picker
async function listAllUsers(
  req: Request,
): Promise<Response> {
  const srv = getServiceClient();
  const { data, error } = await srv
    .from("user_profiles")
    .select("user_id, username, avatar_url")
    .order("username");
  if (error) throw new HttpError(500, error.message);
  return jsonResponse({ users: data ?? [] }, req);
}

// POST / — create league
async function createLeague(
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const name = sanitizeText(body.name as string, 200);
  if (!name) return errorResponse(400, "Name is required", req);

  const description = sanitizeText(body.description as string, 5000);
  const seasonStart = (body.season_start as string) || null;
  const seasonEnd = (body.season_end as string) || null;
  const status = (body.status as string) || "active";

  if (!/^(draft|active|completed)$/.test(status))
    return errorResponse(400, "Invalid status", req);
  if (seasonStart && seasonEnd && seasonEnd <= seasonStart)
    return errorResponse(400, "season_end must be after season_start", req);

  const { data, error } = await sb.from("leagues").insert({
    name,
    description,
    created_by: userId,
    season_start: seasonStart,
    season_end: seasonEnd,
    status,
    scoring_config: body.scoring_config ?? { first_blood: true, entrance_bonus: true, spicy_play: true },
  }).select().single();

  if (error) throw new HttpError(400, error.message);

  // Auto-add the creator as the first league member so the league appears
  // in listLeagues (which inner-joins on league_members).
  const { data: profile } = await sb
    .from("user_profiles")
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();

  const superstarsName = sanitizeText(
    (profile as { username?: string } | null)?.username || "Creator",
    100,
  ) ?? "Creator";

  const { error: memberError } = await sb.from("league_members").insert({
    league_id: data.id,
    user_id: userId,
    superstar_name: superstarsName,
  });

  if (memberError) throw new HttpError(400, memberError.message);

  // Auto-add any invited pilots (up to 3)
  const inviteErrors: string[] = [];
  const invitedIds = Array.isArray(body.invited_user_ids)
    ? (body.invited_user_ids as string[]).slice(0, 3)
    : [];

  if (invitedIds.length > 0) {
    const srv = getServiceClient();
    for (const invitedUserId of invitedIds) {
      if (!invitedUserId || invitedUserId === userId) continue;

      // Fetch their username for superstar_name default
      const { data: invitedProfile } = await srv
        .from("user_profiles")
        .select("username")
        .eq("user_id", invitedUserId)
        .maybeSingle();

      const invitedName = sanitizeText(
        (invitedProfile as { username?: string } | null)?.username || "Pilot",
        100,
      ) ?? "Pilot";

      const { error: inviteErr } = await srv.from("league_members").insert({
        league_id: data.id,
        user_id: invitedUserId,
        superstar_name: invitedName,
      });

      if (inviteErr) {
        if (inviteErr.message.toLowerCase().includes("duplicate")) {
          inviteErrors.push(`${invitedUserId}: already a member`);
        } else {
          inviteErrors.push(`${invitedUserId}: could not add (${inviteErr.message})`);
        }
      }
    }
  }

  return jsonResponse({ league: data, invite_errors: inviteErrors }, req);
}

// GET / — list leagues user is in
async function listLeagues(
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  // Step 1: get the league IDs this user belongs to
  const { data: memberships, error: memberError } = await sb
    .from("league_members")
    .select("league_id")
    .eq("user_id", userId);
  if (memberError) throw new HttpError(400, memberError.message);

  const leagueIds = (memberships || []).map(
    (m: Record<string, unknown>) => m.league_id as string,
  );
  if (!leagueIds.length) return jsonResponse({ leagues: [] }, req);

  // Step 2: fetch those leagues with ALL their members so the frontend
  // can show an accurate pilot count (the old !inner join only returned
  // the requesting user's own membership row).
  const { data, error } = await sb
    .from("leagues")
    .select("*, league_members(user_id, superstar_name)")
    .in("id", leagueIds);
  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ leagues: data }, req);
}

// GET /:id — league detail
async function getLeague(
  leagueId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await verifyMembership(leagueId, userId, sb);

  // PostgREST cannot auto-join league_members → user_profiles because there is
  // no FK between those two tables (both reference auth.users separately).
  // Fetch them independently and merge.
  const { data: leagueData, error: leagueError } = await sb
    .from("leagues")
    .select("*, league_members(*)")
    .eq("id", leagueId)
    .single();
  if (leagueError) throw new HttpError(400, leagueError.message);

  const memberUserIds = ((leagueData as Record<string, unknown>).league_members as Record<string, unknown>[] || []).map((m) => m.user_id as string);
  let profilesByUserId: Record<string, Record<string, unknown>> = {};
  if (memberUserIds.length > 0) {
    const { data: profiles } = await sb
      .from("user_profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", memberUserIds);
    for (const p of profiles || []) {
      profilesByUserId[(p as Record<string, unknown>).user_id as string] = p as Record<string, unknown>;
    }
  }

  const membersWithProfiles = ((leagueData as Record<string, unknown>).league_members as Record<string, unknown>[] || []).map((m) => ({
    ...m,
    user_profiles: profilesByUserId[m.user_id as string] || null,
  }));

  return jsonResponse({ league: { ...(leagueData as Record<string, unknown>), league_members: membersWithProfiles } }, req);
}

// PATCH /:id — update league (creator only)
async function updateLeague(
  leagueId: string,
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const { data: league, error: fetchErr } = await sb
    .from("leagues")
    .select("created_by")
    .eq("id", leagueId)
    .single();
  if (fetchErr) throw new HttpError(400, fetchErr.message);
  if (league.created_by !== userId)
    throw new HttpError(403, "Only league creator can update");

  const payload: Record<string, unknown> = {};
  if (body.name != null)
    payload.name = sanitizeText(body.name as string, 200);
  if (body.description != null)
    payload.description = sanitizeText(body.description as string, 5000);
  if (body.season_start != null) payload.season_start = body.season_start;
  if (body.season_end != null) payload.season_end = body.season_end;
  if (body.status != null) {
    if (!/^(draft|active|completed)$/.test(body.status as string))
      return errorResponse(400, "Invalid status", req);
    payload.status = body.status;
  }
  if (body.scoring_config != null) payload.scoring_config = body.scoring_config;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from("leagues")
    .update(payload)
    .eq("id", leagueId)
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ league: data }, req);
}

// DELETE /:id — delete league (creator only)
async function deleteLeague(
  leagueId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const { data: league, error: fetchErr } = await sb
    .from("leagues")
    .select("created_by")
    .eq("id", leagueId)
    .single();
  if (fetchErr) throw new HttpError(400, fetchErr.message);
  if (league.created_by !== userId)
    throw new HttpError(403, "Only league creator can delete");

  await sb.from("leagues").delete().eq("id", leagueId);
  return jsonResponse({ message: "League deleted" }, req);
}

// POST /:id/members — join league
async function joinLeague(
  leagueId: string,
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const superstarName = sanitizeText(body.superstar_name as string, 100);
  if (!superstarName) return errorResponse(400, "superstar_name is required", req);
  const entranceMusicUrl = validateHttpUrl(
    body.entrance_music_url as string,
  );
  const catchphrase = sanitizeText(body.catchphrase as string, 500);

  const { data, error } = await sb.from("league_members").insert({
    league_id: leagueId,
    user_id: userId,
    superstar_name: superstarName,
    entrance_music_url: entranceMusicUrl,
    catchphrase,
  }).select().single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate"))
      return errorResponse(400, "Already a member of this league", req);
    throw new HttpError(400, error.message);
  }
  return jsonResponse({ member: data }, req);
}

// GET /:id/members
async function listMembers(
  leagueId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await verifyMembership(leagueId, userId, sb);
  const { data, error } = await sb
    .from("league_members")
    .select("*")
    .eq("league_id", leagueId);
  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ members: data }, req);
}

// PATCH /:id/members/:mid — update own member profile
async function updateMember(
  leagueId: string,
  memberId: string,
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const { data: member, error: fetchErr } = await sb
    .from("league_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("league_id", leagueId)
    .single();
  if (fetchErr) throw new HttpError(400, fetchErr.message);
  if (member.user_id !== userId)
    throw new HttpError(403, "Can only update your own profile");

  const payload: Record<string, unknown> = {};
  if (body.superstar_name != null)
    payload.superstar_name = sanitizeText(body.superstar_name as string, 100);
  if (body.entrance_music_url != null)
    payload.entrance_music_url = validateHttpUrl(
      body.entrance_music_url as string,
    );
  if (body.catchphrase != null)
    payload.catchphrase = sanitizeText(body.catchphrase as string, 500);
  if (body.current_title != null)
    payload.current_title = sanitizeText(body.current_title as string, 100);

  const { data, error } = await sb
    .from("league_members")
    .update(payload)
    .eq("id", memberId)
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ member: data }, req);
}

// DELETE /:id/members/me — leave league
async function leaveLeague(
  leagueId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const memberId = await verifyMembership(leagueId, userId, sb);

  const { data: league } = await sb
    .from("leagues")
    .select("created_by")
    .eq("id", leagueId)
    .single();

  if (league?.created_by === userId)
    throw new HttpError(
      400,
      "League creator cannot leave. Delete the league instead.",
    );

  await sb.from("league_members").delete().eq("id", memberId);
  return jsonResponse({ message: "Successfully left the league" }, req);
}

// POST /:id/invite — generate invite token
async function generateInvite(
  leagueId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const { data: league, error: fetchErr } = await sb
    .from("leagues")
    .select("created_by")
    .eq("id", leagueId)
    .single();
  if (fetchErr) throw new HttpError(400, fetchErr.message);
  if (league.created_by !== userId)
    throw new HttpError(
      403,
      "Only league creator can generate invite links",
    );

  // Generate cryptographically secure token
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  const token = Array.from(buffer, (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  const { data, error } = await sb.from("league_invites").insert({
    league_id: leagueId,
    token,
    created_by: userId,
  }).select().single();

  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ token, invite: data }, req);
}

// POST /join/:token — join via invite
async function joinViaInvite(
  inviteToken: string,
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const { data: invite, error: invErr } = await sb
    .from("league_invites")
    .select("league_id, expires_at, used_count, max_uses")
    .eq("token", inviteToken)
    .single();

  if (invErr || !invite) throw new HttpError(404, "Invalid invite link");

  const leagueId = invite.league_id as string;

  // Check expiration
  if (invite.expires_at) {
    const expires = new Date(invite.expires_at as string);
    if (new Date() > expires) throw new HttpError(410, "Invite link has expired");
  }

  // Check max uses
  if (invite.max_uses && (invite.used_count || 0) >= invite.max_uses) {
    throw new HttpError(410, "Invite link has reached maximum uses");
  }

  // Check if already member
  const { data: existing } = await sb
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) throw new HttpError(400, "Already a member of this league");

  const superstarName = sanitizeText(body.superstar_name as string, 100);
  if (!superstarName)
    return errorResponse(400, "superstar_name is required", req);
  const entranceMusicUrl = validateHttpUrl(
    body.entrance_music_url as string,
  );
  const catchphrase = sanitizeText(body.catchphrase as string, 500);

  const { data, error } = await sb.from("league_members").insert({
    league_id: leagueId,
    user_id: userId,
    superstar_name: superstarName,
    entrance_music_url: entranceMusicUrl,
    catchphrase,
  }).select().single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate"))
      return errorResponse(400, "Already a member of this league", req);
    throw new HttpError(400, error.message);
  }

  // Increment used_count
  await sb
    .from("league_invites")
    .update({ used_count: ((invite.used_count as number) || 0) + 1 })
    .eq("token", inviteToken);

  return jsonResponse({ member: data, league_id: leagueId }, req);
}

// POST /:id/games — log a game
async function logGame(
  leagueId: string,
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await checkGameRateLimit(leagueId, sb);
  await verifyMembership(leagueId, userId, sb);

  const game = body.game as Record<string, unknown>;
  const results = body.results as Record<string, unknown>[];
  if (!game || !results?.length)
    return errorResponse(400, "game and results are required", req);

  // Validate all member_ids belong to this league
  const submittedMemberIds = results.map((r) => String(r.member_id));
  const { data: validMembers } = await sb
    .from("league_members")
    .select("id, user_id")
    .eq("league_id", leagueId)
    .in("id", submittedMemberIds);

  const validMemberIds = new Set(
    (validMembers || []).map((m: Record<string, unknown>) => m.id as string),
  );
  const invalid = submittedMemberIds.filter((id) => !validMemberIds.has(id));
  if (invalid.length > 0) {
    return errorResponse(
      400,
      `Invalid member_ids: ${invalid.join(", ")}. All players must be league members.`, req,
    );
  }

  // Build member_id -> user_id mapping
  const memberToUser: Record<string, string> = {};
  for (const m of validMembers || []) {
    memberToUser[m.id as string] = m.user_id as string;
  }

  // Validate deck ownership
  for (const result of results) {
    if (result.deck_id) {
      const { data: deck, error: deckErr } = await sb
        .from("user_decks")
        .select("user_id")
        .eq("id", String(result.deck_id))
        .single();

      if (deckErr || !deck)
        return errorResponse(404, `Deck ${result.deck_id} not found`, req);

      const expectedUser = memberToUser[String(result.member_id)];
      if (deck.user_id !== expectedUser)
        return errorResponse(
          403,
          `Deck ${result.deck_id} does not belong to member ${result.member_id}`, req,
        );
    }
  }

  // Check for duplicate placements
  const placements = results.map((r) => r.placement as number);
  if (new Set(placements).size !== placements.length) {
    return errorResponse(
      400,
      "Each player must have a unique placement. Duplicate placements detected.", req,
    );
  }

  // Fetch scoring config for placement points and custom bonus award point values
  const { data: leagueConfig } = await sb
    .from("leagues")
    .select("scoring_config")
    .eq("id", leagueId)
    .single();
  const scoringCfg = leagueConfig?.scoring_config as Record<string, unknown> | undefined;
  const placementPointsConfig = scoringCfg?.points as Record<string, number> | undefined;
  const bonusAwardsCfg = (scoringCfg?.bonus_awards ?? []) as Array<{ id: string; points?: number; isCustom?: boolean }>;

  // Auto-calculate game number (sequential within league)
  const { count: existingCount } = await sb
    .from("league_games")
    .select("id", { count: "exact", head: true })
    .eq("league_id", leagueId);
  const nextGameNumber = (existingCount ?? 0) + 1;

  // Create game record
  const playedAt = game.played_at
    ? new Date(game.played_at as string).toISOString()
    : new Date().toISOString();

  const screenshotUrl = validateHttpUrl(game.screenshot_url as string);

  const { data: gameRecord, error: gameErr } = await sb
    .from("league_games")
    .insert({
      league_id: leagueId,
      game_number: nextGameNumber,
      played_at: playedAt,
      screenshot_url: screenshotUrl,
      spicy_play_description: sanitizeText(
        game.spicy_play_description as string,
        2000,
      ),
      spicy_play_winner_id: game.spicy_play_winner_id
        ? String(game.spicy_play_winner_id)
        : null,
      entrance_winner_id: game.entrance_winner_id
        ? String(game.entrance_winner_id)
        : null,
      notes: sanitizeText(game.notes as string, 2000),
      custom_bonus_winners: sanitizeCustomBonusWinners(game.custom_bonus_winners),
    })
    .select()
    .single();

  if (gameErr) throw new HttpError(400, gameErr.message);

  const gameId = gameRecord.id;

  // Create result records
  const customWinners = sanitizeCustomBonusWinners(game.custom_bonus_winners);
  const spicyPlayWinnerId = game.spicy_play_winner_id ? String(game.spicy_play_winner_id) : null;
  const resultsToInsert = results.map((r) => {
    const memberId = String(r.member_id);
    const customBonusPts = customBonusPoints(memberId, customWinners, bonusAwardsCfg);
    const points = calculatePoints(
      r.placement as number,
      !!(r.earned_entrance_bonus),
      !!(r.earned_first_blood),
      spicyPlayWinnerId === memberId,
      placementPointsConfig,
      bonusAwardsCfg,
    ) + customBonusPts;

    return {
      game_id: gameId,
      member_id: String(r.member_id),
      deck_id: r.deck_id ? String(r.deck_id) : null,
      placement: r.placement,
      earned_win: r.earned_win || false,
      earned_second_place: r.earned_second_place || false,
      earned_third_place: r.earned_third_place || false,
      earned_first_blood: r.earned_first_blood || false,
      earned_last_stand: r.earned_last_stand || false,
      earned_entrance_bonus: r.earned_entrance_bonus || false,
      total_points: points,
      notes: r.notes ? sanitizeText(r.notes as string, 2000) : null,
    };
  });

  const { data: resultsData, error: resultsErr } = await sb
    .from("league_game_results")
    .insert(resultsToInsert)
    .select();

  if (resultsErr) throw new HttpError(400, resultsErr.message);

  return jsonResponse({ game: gameRecord, results: resultsData }, req);
}

// GET /:id/games/:gid — single game detail
async function getGame(
  leagueId: string,
  gameId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await verifyMembership(leagueId, userId, sb);

  const { data, error } = await sb
    .from("league_games")
    .select("*, league_game_results(*, league_members(superstar_name), user_decks(deck_name))")
    .eq("id", gameId)
    .eq("league_id", leagueId)
    .single();

  if (error || !data) return errorResponse(404, "Game not found", req);
  return jsonResponse({ game: data }, req);
}

// PUT /:id/games/:gid — edit a game (any member)
async function editGame(
  leagueId: string,
  gameId: string,
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await verifyMembership(leagueId, userId, sb);

  // Verify game belongs to this league
  const { data: existingGame, error: gameCheckErr } = await sb
    .from("league_games")
    .select("id")
    .eq("id", gameId)
    .eq("league_id", leagueId)
    .single();
  if (gameCheckErr || !existingGame) return errorResponse(404, "Game not found", req);

  const game = body.game as Record<string, unknown>;
  const results = body.results as Record<string, unknown>[];
  if (!game || !results?.length)
    return errorResponse(400, "game and results are required", req);

  // Validate member_ids
  const submittedMemberIds = results.map((r) => String(r.member_id));
  const { data: validMembers } = await sb
    .from("league_members")
    .select("id, user_id")
    .eq("league_id", leagueId)
    .in("id", submittedMemberIds);
  const validMemberIds = new Set((validMembers || []).map((m: Record<string, unknown>) => m.id as string));
  const invalid = submittedMemberIds.filter((id) => !validMemberIds.has(id));
  if (invalid.length > 0)
    return errorResponse(400, `Invalid member_ids: ${invalid.join(", ")}`, req);

  const memberToUser: Record<string, string> = {};
  for (const m of validMembers || []) memberToUser[m.id as string] = m.user_id as string;

  // Validate deck ownership
  for (const result of results) {
    if (result.deck_id) {
      const { data: deck, error: deckErr } = await sb
        .from("user_decks")
        .select("user_id")
        .eq("id", String(result.deck_id))
        .single();
      if (deckErr || !deck) return errorResponse(404, `Deck ${result.deck_id} not found`, req);
      if (deck.user_id !== memberToUser[String(result.member_id)])
        return errorResponse(403, `Deck ${result.deck_id} does not belong to member ${result.member_id}`, req);
    }
  }

  const placements = results.map((r) => r.placement as number);
  if (new Set(placements).size !== placements.length)
    return errorResponse(400, "Each player must have a unique placement", req);

  // Fetch scoring config for placement points and custom bonus award point values
  const { data: leagueConfigEdit } = await sb
    .from("leagues")
    .select("scoring_config")
    .eq("id", leagueId)
    .single();
  const editScoringCfg = leagueConfigEdit?.scoring_config as Record<string, unknown> | undefined;
  const editPlacementPointsConfig = editScoringCfg?.points as Record<string, number> | undefined;
  const editBonusAwardsCfg = (editScoringCfg?.bonus_awards ?? []) as Array<{ id: string; points?: number; isCustom?: boolean }>;

  const playedAt = game.played_at
    ? new Date(game.played_at as string).toISOString()
    : new Date().toISOString();
  const screenshotUrl = validateHttpUrl(game.screenshot_url as string);

  const editCustomWinners = sanitizeCustomBonusWinners(game.custom_bonus_winners);
  const editSpicyPlayWinnerId = game.spicy_play_winner_id ? String(game.spicy_play_winner_id) : null;

  const { data: gameRecord, error: gameErr } = await sb
    .from("league_games")
    .update({
      played_at: playedAt,
      screenshot_url: screenshotUrl,
      spicy_play_description: sanitizeText(game.spicy_play_description as string, 2000),
      spicy_play_winner_id: editSpicyPlayWinnerId,
      entrance_winner_id: game.entrance_winner_id ? String(game.entrance_winner_id) : null,
      notes: sanitizeText(game.notes as string, 2000),
      custom_bonus_winners: editCustomWinners,
    })
    .eq("id", gameId)
    .select()
    .single();
  if (gameErr) throw new HttpError(400, gameErr.message);

  // Delete old results, re-insert updated ones
  await sb.from("league_game_results").delete().eq("game_id", gameId);

  const resultsToInsert = results.map((r) => {
    const memberId = String(r.member_id);
    const editCustomBonusPts = customBonusPoints(memberId, editCustomWinners, editBonusAwardsCfg);
    const points = calculatePoints(
      r.placement as number,
      !!(r.earned_entrance_bonus),
      !!(r.earned_first_blood),
      editSpicyPlayWinnerId === memberId,
      editPlacementPointsConfig,
      editBonusAwardsCfg,
    ) + editCustomBonusPts;
    return {
      game_id: gameId,
      member_id: memberId,
      deck_id: r.deck_id ? String(r.deck_id) : null,
      placement: r.placement,
      earned_win: r.earned_win || false,
      earned_second_place: r.earned_second_place || false,
      earned_third_place: r.earned_third_place || false,
      earned_first_blood: r.earned_first_blood || false,
      earned_last_stand: false,
      earned_entrance_bonus: r.earned_entrance_bonus || false,
      total_points: points,
      notes: r.notes ? sanitizeText(r.notes as string, 2000) : null,
    };
  });

  const { data: resultsData, error: resultsErr } = await sb
    .from("league_game_results")
    .insert(resultsToInsert)
    .select();
  if (resultsErr) throw new HttpError(400, resultsErr.message);

  return jsonResponse({ game: gameRecord, results: resultsData }, req);
}
async function listGames(
  leagueId: string,
  url: URL,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await verifyMembership(leagueId, userId, sb);

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("page_size") || "20")));
  const offset = (page - 1) * pageSize;

  // Use service client so RLS on league_game_results → league_members nested
  // join doesn't silently return empty arrays. Membership is already verified above.
  const srv = getServiceClient();
  const { data, error } = await srv
    .from("league_games")
    .select(
      "*, league_game_results(*, league_members(superstar_name), user_decks(deck_name))",
    )
    .eq("league_id", leagueId)
    .order("game_number", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw new HttpError(400, error.message);

  return jsonResponse({
    games: data,
    page,
    page_size: pageSize,
    has_more: (data || []).length === pageSize,
  }, req);
}

// GET /:id/standings
// Computed via direct table queries rather than an RPC to avoid schema-cache
// type-mismatch issues and to return the fields the frontend actually needs
// (second_places, third_places) instead of the deprecated first_bloods/last_stands.
async function getStandings(
  leagueId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await verifyMembership(leagueId, userId, sb);

  // 1. Get all members for this league
  const { data: members, error: membersError } = await sb
    .from("league_members")
    .select("id, superstar_name")
    .eq("league_id", leagueId);
  if (membersError) throw new HttpError(400, membersError.message);
  if (!members?.length) return jsonResponse({ standings: [] }, req);

  // 2. Get all game IDs that belong to this league
  const { data: games, error: gamesError } = await sb
    .from("league_games")
    .select("id")
    .eq("league_id", leagueId);
  if (gamesError) throw new HttpError(400, gamesError.message);

  // 3. Build a standings map seeded with zero totals for every member
  type StandingEntry = {
    member_id: string;
    superstar_name: string;
    total_points: number;
    games_played: number;
    wins: number;
    second_places: number;
    third_places: number;
    entrance_bonuses: number;
    first_bloods: number;
    last_stands: number;
  };
  const standingsMap = new Map<string, StandingEntry>();
  for (const m of members) {
    standingsMap.set(m.id as string, {
      member_id: m.id as string,
      superstar_name: m.superstar_name as string,
      total_points: 0,
      games_played: 0,
      wins: 0,
      second_places: 0,
      third_places: 0,
      entrance_bonuses: 0,
      first_bloods: 0,
      last_stands: 0,
    });
  }

  // 4. Aggregate results (only if games exist)
  const gameIds = (games || []).map((g: Record<string, unknown>) => g.id as string);
  if (gameIds.length > 0) {
    const { data: results, error: resultsError } = await sb
      .from("league_game_results")
      .select(
        "member_id, total_points, earned_win, earned_second_place, earned_third_place, earned_entrance_bonus, earned_first_blood, earned_last_stand",
      )
      .in("game_id", gameIds);
    if (resultsError) throw new HttpError(400, resultsError.message);

    for (const r of results || []) {
      const entry = standingsMap.get(r.member_id as string);
      if (!entry) continue;
      entry.total_points += (r.total_points as number) || 0;
      entry.games_played += 1;
      if (r.earned_win) entry.wins += 1;
      if (r.earned_second_place) entry.second_places += 1;
      if (r.earned_third_place) entry.third_places += 1;
      if (r.earned_entrance_bonus) entry.entrance_bonuses += 1;
      if (r.earned_first_blood) entry.first_bloods += 1;
      if (r.earned_last_stand) entry.last_stands += 1;
    }
  }

  const standings = Array.from(standingsMap.values()).sort(
    (a, b) => b.total_points - a.total_points || b.wins - a.wins,
  );

  return jsonResponse({ standings }, req);
}

// POST /:id/games/:gid/votes — cast vote
async function castVote(
  leagueId: string,
  gameId: string,
  body: Record<string, unknown>,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const memberId = await verifyMembership(leagueId, userId, sb);

  const category = body.category as string;
  if (!category || !/^(entrance|spicy_play)$/.test(category)) {
    return errorResponse(400, "category must be 'entrance' or 'spicy_play'", req);
  }

  const nomineeId = body.nominee_id as string;
  if (!nomineeId) return errorResponse(400, "nominee_id is required", req);

  // Verify game belongs to league
  const { data: game } = await sb
    .from("league_games")
    .select("id")
    .eq("id", gameId)
    .eq("league_id", leagueId)
    .maybeSingle();
  if (!game) throw new HttpError(404, "Game not found in this league");

  // Verify nominee is a league member
  const { data: nominee } = await sb
    .from("league_members")
    .select("id")
    .eq("id", nomineeId)
    .eq("league_id", leagueId)
    .maybeSingle();
  if (!nominee) throw new HttpError(400, "Nominee is not a member of this league");

  // Delete existing vote, then insert
  await sb
    .from("league_game_votes")
    .delete()
    .eq("game_id", gameId)
    .eq("voter_id", memberId)
    .eq("category", category);

  const { data, error } = await sb
    .from("league_game_votes")
    .insert({
      game_id: gameId,
      voter_id: memberId,
      category,
      nominee_id: nomineeId,
    })
    .select()
    .single();

  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ vote: data }, req);
}

// GET /:id/games/:gid/votes — get votes
async function getVotes(
  leagueId: string,
  gameId: string,
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  await verifyMembership(leagueId, userId, sb);

  const { data, error } = await sb
    .from("league_game_votes")
    .select("*, league_members!league_game_votes_voter_id_fkey(superstar_name)")
    .eq("game_id", gameId);

  if (error) throw new HttpError(400, error.message);
  return jsonResponse({ votes: data }, req);
}

// POST /bulk/archive — archive completed leagues
async function archiveCompletedLeagues(
  userId: string,
  sb: ReturnType<typeof getUserClient>,
  req: Request,
): Promise<Response> {
  const today = new Date().toISOString().split("T")[0];

  const { data: leagues } = await sb
    .from("leagues")
    .select("id, name, league_members!inner(user_id)")
    .eq("league_members.user_id", userId)
    .eq("status", "active")
    .lt("season_end", today);

  const archivedIds: string[] = [];
  for (const league of leagues || []) {
    await sb
      .from("leagues")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", league.id)
      .eq("created_by", userId);
    archivedIds.push(league.id);
  }

  return jsonResponse({ archived: archivedIds.length, league_ids: archivedIds }, req);
}

// ---------------------------------------------------------------------------
// URL path routing
// ---------------------------------------------------------------------------

/**
 * Parse the request path into segments after /leagues/.
 * Examples:
 *   /leagues          → []
 *   /leagues/abc      → ["abc"]
 *   /leagues/abc/members       → ["abc", "members"]
 *   /leagues/abc/members/xyz   → ["abc", "members", "xyz"]
 *   /leagues/join/token        → ["join", "token"]
 */
function parsePath(pathname: string): string[] {
  const cleaned = pathname.replace(/.*\/leagues\/?/, "");
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

    // POST /join/:token
    if (
      method === "POST" &&
      segments.length === 2 &&
      segments[0] === "join"
    ) {
      const body = await req.json();
      return await joinViaInvite(segments[1], body, user.userId, sb, req);
    }

    // POST /bulk/archive — must come before /:id routes
    if (
      method === "POST" &&
      segments.length === 2 &&
      segments[0] === "bulk" &&
      segments[1] === "archive"
    ) {
      return await archiveCompletedLeagues(user.userId, sb, req);
    }

    // GET /users — list all users for pilot picker (must precede /:id routes)
    if (method === "GET" && segments.length === 1 && segments[0] === "users") {
      return await listAllUsers(req);
    }

    // POST / — create league
    if (method === "POST" && segments.length === 0) {
      const body = await req.json();
      return await createLeague(body, user.userId, sb, req);
    }

    // GET / — list leagues
    if (method === "GET" && segments.length === 0) {
      return await listLeagues(user.userId, sb, req);
    }

    // Need a league_id for everything else
    if (segments.length === 0) return errorResponse(404, "Not found", req);
    const leagueId = segments[0];

    // GET /:id
    if (method === "GET" && segments.length === 1) {
      return await getLeague(leagueId, user.userId, sb, req);
    }

    // PATCH /:id
    if (method === "PATCH" && segments.length === 1) {
      const body = await req.json();
      return await updateLeague(leagueId, body, user.userId, sb, req);
    }

    // DELETE /:id
    if (method === "DELETE" && segments.length === 1) {
      return await deleteLeague(leagueId, user.userId, sb, req);
    }

    // /:id/members routes
    if (segments.length >= 2 && segments[1] === "members") {
      // POST /:id/members — join
      if (method === "POST" && segments.length === 2) {
        const body = await req.json();
        return await joinLeague(leagueId, body, user.userId, sb, req);
      }

      // GET /:id/members
      if (method === "GET" && segments.length === 2) {
        return await listMembers(leagueId, user.userId, sb, req);
      }

      // DELETE /:id/members/me — leave
      if (
        method === "DELETE" &&
        segments.length === 3 &&
        segments[2] === "me"
      ) {
        return await leaveLeague(leagueId, user.userId, sb, req);
      }

      // PATCH /:id/members/:mid — update member
      if (method === "PATCH" && segments.length === 3) {
        const body = await req.json();
        return await updateMember(
          leagueId,
          segments[2],
          body,
          user.userId,
          sb,
          req,
        );
      }
    }

    // /:id/games routes
    if (segments.length >= 2 && segments[1] === "games") {
      // /:id/games/:gid/votes routes
      if (segments.length === 4 && segments[3] === "votes") {
        if (method === "POST") {
          const body = await req.json();
          return await castVote(leagueId, segments[2], body, user.userId, sb, req);
        }
        if (method === "GET") {
          return await getVotes(leagueId, segments[2], user.userId, sb, req);
        }
      }

      if (method === "POST" && segments.length === 2) {
        const body = await req.json();
        return await logGame(leagueId, body, user.userId, sb, req);
      }
      if (method === "GET" && segments.length === 2) {
        return await listGames(leagueId, url, user.userId, sb, req);
      }
      // /:id/games/:gid — single game GET or edit PUT
      if (segments.length === 3) {
        if (method === "GET") {
          return await getGame(leagueId, segments[2], user.userId, sb, req);
        }
        if (method === "PUT") {
          const body = await req.json();
          return await editGame(leagueId, segments[2], body, user.userId, sb, req);
        }
      }
    }

    // /:id/standings
    if (
      method === "GET" &&
      segments.length === 2 &&
      segments[1] === "standings"
    ) {
      return await getStandings(leagueId, user.userId, sb, req);
    }

    // /:id/invite
    if (
      method === "POST" &&
      segments.length === 2 &&
      segments[1] === "invite"
    ) {
      return await generateInvite(leagueId, user.userId, sb, req);
    }

    return errorResponse(404, "Not found", req);
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.status, e.message, req);
    }
    if (e instanceof HttpError) {
      return errorResponse(e.status, e.message, req);
    }
    console.error("Unhandled error:", e);
    return errorResponse(500, "Internal server error", req);
  }
});
