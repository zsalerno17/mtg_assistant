import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------
// Edge Functions live at <SUPABASE_URL>/functions/v1/<function-name>.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const EDGE_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : ''

// ---------------------------------------------------------------------------
// Auth token cache — kept in sync via onAuthStateChange so that getAuthHeader
// never has to call getSession() which can return stale/null during client
// initialization or token refresh.
// ---------------------------------------------------------------------------
let _cachedAccessToken = null

supabase.auth.onAuthStateChange((_event, session) => {
  _cachedAccessToken = session?.access_token || null
})

async function getAuthHeader() {
  if (_cachedAccessToken) {
    return { Authorization: `Bearer ${_cachedAccessToken}` }
  }
  // Fallback: read from getSession (e.g. if listener hasn't fired yet)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  _cachedAccessToken = session.access_token
  return { Authorization: `Bearer ${session.access_token}` }
}

// Deduplicate concurrent refresh calls — Supabase refresh tokens are single-use,
// so multiple simultaneous 401 retries must share one in-flight refresh promise.
let _refreshPromise = null

/** Force a token refresh and retry a fetch call once on 401. */
async function refreshAuthHeader() {
  if (_refreshPromise) return _refreshPromise
  _refreshPromise = (async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error || !session?.access_token) {
        // Refresh failed (expired, revoked, or rate-limited) — sign out so the
        // user is redirected to login rather than seeing a cryptic API error.
        await supabase.auth.signOut()
        throw new Error('Your session has expired. Please sign in again.')
      }
      _cachedAccessToken = session.access_token
      return { Authorization: `Bearer ${session.access_token}` }
    } finally {
      _refreshPromise = null
    }
  })()
  return _refreshPromise
}

/**
 * Unified fetch targeting Edge Functions.
 * @param {string} fn - Edge Function name (e.g. 'decks', 'ai', 'leagues')
 * @param {string} path - Sub-path within the function (e.g. '/fetch', '/strategy')
 * @param {object} options - fetch options
 */
// AI endpoints involve Gemini calls that can take longer than non-AI endpoints
const AI_TIMEOUT_MS = 90000
const DEFAULT_TIMEOUT_MS = 30000

async function edgeFetch(fn, path, options = {}) {
  const authHeader = await getAuthHeader()
  const url = `${EDGE_BASE}/${fn}${path}`

  const timeoutMs = fn === 'ai' ? AI_TIMEOUT_MS : DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const makeRequest = (headers) =>
    fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...options.headers,
      },
    })

  try {
    let res = await makeRequest(authHeader)

    // On 401, refresh the token and retry once
    if (res.status === 401) {
      const refreshedHeader = await refreshAuthHeader()
      res = await makeRequest(refreshedHeader)
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `API error ${res.status}`)
    }
    return res.json()
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  /** Fetch a deck from Moxfield (returns cached copy if already stored). */
  fetchDeck: (url) =>
    edgeFetch('decks', '/fetch', { method: 'POST', body: JSON.stringify({ url }) }),

  /** Run deck analysis and save to analysis history. */
  analyzeDeck: (moxfield_id, { force = false, source = 'moxfield' } = {}) =>
    edgeFetch('decks', '/analyze', { method: 'POST', body: JSON.stringify({ moxfield_id, force, source }) }),

  /** Get Gemini strategy advice for a deck. */
  getStrategy: (moxfield_id) =>
    edgeFetch('ai', '/strategy', { method: 'POST', body: JSON.stringify({ moxfield_id }) }),

  /** Get Gemini improvement suggestions (cross-referenced with user's collection). */
  getImprovements: (moxfield_id) =>
    edgeFetch('ai', '/improvements', { method: 'POST', body: JSON.stringify({ moxfield_id }) }),

  /** Get rule-based collection upgrade suggestions (cards you own that could improve the deck). */
  getCollectionUpgrades: (moxfield_id) =>
    edgeFetch('ai', '/collection-upgrades', { method: 'POST', body: JSON.stringify({ moxfield_id }) }),

  /** Get the authenticated user's profile (username, avatar_url). */
  getProfile: () =>
    edgeFetch('users', '/profile', {}),

  /** Update the authenticated user's profile. Only provided fields are changed. */
  updateProfile: ({ username, avatar_url } = {}) =>
    edgeFetch('users', '/profile', {
      method: 'PUT',
      body: JSON.stringify({ username: username ?? null, avatar_url: avatar_url ?? null }),
    }),

  /** Get Gemini before/after scenario analysis for proposed card swaps. */
  getScenarios: (moxfield_id, cards_to_add, cards_to_remove) =>
    edgeFetch('ai', '/scenarios', {
      method: 'POST',
      body: JSON.stringify({ moxfield_id, cards_to_add, cards_to_remove }),
    }),

  /** Upload a Moxfield CSV collection export. */
  uploadCollection: async (file) => {
    const authHeader = await getAuthHeader()
    const formData = new FormData()
    formData.append('file', file)
    const url = `${EDGE_BASE}/collection/upload`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000)

    const makeRequest = (headers) =>
      fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers, // NO Content-Type — browser sets multipart boundary automatically
        body: formData,
      })

    try {
      let res = await makeRequest(authHeader)
      if (res.status === 401) {
        const refreshedHeader = await refreshAuthHeader()
        res = await makeRequest(refreshedHeader)
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || `API error ${res.status}`)
      }
      return res.json()
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.')
      }
      throw e
    } finally {
      clearTimeout(timeoutId)
    }
  },

  /** Get the authenticated user's stored collection. */
  getCollection: () => edgeFetch('collection', '/', {}),

  /** Get functional analysis of the user's collection (ramp, draw, removal, etc.). */
  getCollectionAnalysis: () => edgeFetch('collection', '/analyze', {}),

  /** Get efficiency metrics for the user's collection (utilization, duplicates, high-value unused). */
  getCollectionEfficiency: () => edgeFetch('collection', '/efficiency', {}),

  /** Get paginated analysis history for the current user. */
  getAnalysisHistory: (page = 1) => edgeFetch('analyses', `/history?page=${page}`, {}),

  /** Get collection card count + last updated timestamp (lightweight — no full card data). */
  getCollectionSummary: () => edgeFetch('collection', '/summary', {}),

  /** Add a Moxfield deck to the user's library (no analysis). */
  addToLibrary: (url) =>
    edgeFetch('decks', '/library', { method: 'POST', body: JSON.stringify({ url }) }),

  /** Get the user's deck library with analysis status for each deck. */
  getDeckLibrary: () => edgeFetch('decks', '/library', {}),

  // ============================================================================
  // LEAGUE / POD TRACKING
  // ============================================================================

  /** Create a new league/season. */
  createLeague: ({ name, description, season_start, season_end, status = 'active', scoring_config }) =>
    edgeFetch('leagues', '', {
      method: 'POST',
      body: JSON.stringify({ name, description, season_start, season_end, status, scoring_config }),
    }),

  /** List all leagues the user is in. */
  getLeagues: () => edgeFetch('leagues', '', {}),

  /** Get details for a specific league (includes members). */
  getLeague: (league_id) => edgeFetch('leagues', `/${league_id}`, {}),

  /** Update league metadata (creator only). */
  updateLeague: (league_id, updates) =>
    edgeFetch('leagues', `/${league_id}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  /** Delete a league (creator only). */
  deleteLeague: (league_id) =>
    edgeFetch('leagues', `/${league_id}`, { method: 'DELETE' }),

  /** Join a league as a new member. */
  joinLeague: (league_id, { superstar_name, entrance_music_url = null, catchphrase = null }) =>
    edgeFetch('leagues', `/${league_id}/members`, {
      method: 'POST',
      body: JSON.stringify({ superstar_name, entrance_music_url, catchphrase }),
    }),

  /** List all members in a league. */
  getLeagueMembers: (league_id) => edgeFetch('leagues', `/${league_id}/members`, {}),

  /** Update your own member profile. */
  updateMember: (league_id, member_id, updates) =>
    edgeFetch('leagues', `/${league_id}/members/${member_id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  /** Log a game with all player results. */
  logGame: (league_id, game_data) =>
    edgeFetch('leagues', `/${league_id}/games`, {
      method: 'POST',
      body: JSON.stringify(game_data),
    }),

  /** Get a single game by ID. */
  getGame: (league_id, game_id) => edgeFetch('leagues', `/${league_id}/games/${game_id}`, {}),

  /** Edit an existing game. */
  editGame: (league_id, game_id, game_data) =>
    edgeFetch('leagues', `/${league_id}/games/${game_id}`, {
      method: 'PUT',
      body: JSON.stringify(game_data),
    }),

  /** Get games for a league (paginated). */
  getLeagueGames: (league_id, page = 1) => edgeFetch('leagues', `/${league_id}/games?page=${page}`, {}),

  /** Get current standings for a league. */
  getLeagueStandings: (league_id) => edgeFetch('leagues', `/${league_id}/standings`, {}),

  /** Leave a league (non-creator only). */
  leaveLeague: (league_id) =>
    edgeFetch('leagues', `/${league_id}/members/me`, { method: 'DELETE' }),

  /** Generate an invite link for a league (creator only). */
  generateInviteLink: (league_id) =>
    edgeFetch('leagues', `/${league_id}/invite`, { method: 'POST' }),

  /** Join a league via invite token. */
  joinViaInvite: (token, { superstar_name, entrance_music_url = null, catchphrase = null }) =>
    edgeFetch('leagues', `/join/${token}`, {
      method: 'POST',
      body: JSON.stringify({ superstar_name, entrance_music_url, catchphrase }),
    }),

  /** Cast a vote for a game award (entrance or spicy_play). */
  castVote: (league_id, game_id, { category, nominee_id }) =>
    edgeFetch('leagues', `/${league_id}/games/${game_id}/votes`, {
      method: 'POST',
      body: JSON.stringify({ category, nominee_id }),
    }),

  /** Get all votes for a game. */
  getGameVotes: (league_id, game_id) =>
    edgeFetch('leagues', `/${league_id}/games/${game_id}/votes`, {}),

  /** Archive all completed leagues (season ended). */
  archiveCompletedLeagues: () =>
    edgeFetch('leagues', '/bulk/archive', { method: 'POST' }),

  // ---------------------------------------------------------------------------
  // Personal game log (standalone — no league required)
  // ---------------------------------------------------------------------------

  /** Log a personal game (skirmish). */
  logPersonalGame: ({ played_at, pod_size, placement, deck_id = null, notes = null }) =>
    edgeFetch('games', '', {
      method: 'POST',
      body: JSON.stringify({ played_at, pod_size, placement, deck_id, notes }),
    }),

  /** Get personal game history (paginated). */
  getPersonalGames: (page = 1) =>
    edgeFetch('games', `?page=${page}`, {}),

  /** Delete a personal game entry. */
  deletePersonalGame: (game_id) =>
    edgeFetch('games', `/${game_id}`, { method: 'DELETE' }),

  /** Get league games the user participated in (for Skirmishes tab). */
  getLeagueGames: () =>
    edgeFetch('games', '/league-history', {}),

  // ---------------------------------------------------------------------------
  // Admin — allowlist management
  // ---------------------------------------------------------------------------

  admin: {
    /** Get all entries in the allowed_users allowlist. */
    getAllowedUsers: () => edgeFetch('admin', '', {}),

    /** Add an email to the allowlist. */
    addAllowedUser: (email) =>
      edgeFetch('admin', '', { method: 'POST', body: JSON.stringify({ email }) }),

    /** Remove an email from the allowlist. */
    removeAllowedUser: (email) =>
      edgeFetch('admin', `?email=${encodeURIComponent(email)}`, { method: 'DELETE' }),
  },
}
