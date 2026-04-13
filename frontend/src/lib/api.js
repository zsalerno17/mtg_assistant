import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------
// In production, VITE_SUPABASE_URL points to the Supabase project.
// Edge Functions live at <SUPABASE_URL>/functions/v1/<function-name>.
// For local dev with `supabase functions serve`, the URL is http://localhost:54321.
// Fallback to legacy FastAPI URL if VITE_API_BASE_URL is set (migration period).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const LEGACY_API_BASE = import.meta.env.VITE_API_BASE_URL

// If VITE_USE_EDGE is explicitly 'false', force legacy FastAPI mode (local dev).
// Otherwise, use Edge Functions when SUPABASE_URL is available.
const USE_EDGE = import.meta.env.VITE_USE_EDGE !== 'false' && !!SUPABASE_URL
const EDGE_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : ''
const LEGACY_BASE = LEGACY_API_BASE || 'http://localhost:8000'

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

/** Force a token refresh and retry a fetch call once on 401. */
async function refreshAuthHeader() {
  const { data: { session }, error } = await supabase.auth.refreshSession()
  if (error || !session?.access_token) throw new Error('Session expired, please sign in again')
  _cachedAccessToken = session.access_token
  return { Authorization: `Bearer ${session.access_token}` }
}

/**
 * Unified fetch that routes to Edge Functions or legacy FastAPI based on config.
 * @param {string} fn - Edge Function name (e.g. 'decks', 'ai', 'leagues')
 * @param {string} path - Sub-path within the function (e.g. '/fetch', '/strategy')
 * @param {object} options - fetch options
 */
async function edgeFetch(fn, path, options = {}) {
  const authHeader = await getAuthHeader()
  const url = USE_EDGE
    ? `${EDGE_BASE}/${fn}${path}`
    : `${LEGACY_BASE}/api/${fn}${path}`
  const makeRequest = (headers) =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...options.headers,
      },
    })

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
}

/** Legacy apiFetch for any non-edge paths (backwards compat during migration). */
async function apiFetch(path, options = {}) {
  const authHeader = await getAuthHeader()
  const base = USE_EDGE ? EDGE_BASE : LEGACY_BASE
  const makeRequest = (headers) =>
    fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...options.headers,
      },
    })

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
}

export const api = {
  /** Fetch a deck from Moxfield (returns cached copy if already stored). */
  fetchDeck: (url) =>
    edgeFetch('decks', '/fetch', { method: 'POST', body: JSON.stringify({ url }) }),

  /** Run deck analysis and save to analysis history. */
  analyzeDeck: (moxfield_id, { force = false } = {}) =>
    edgeFetch('decks', '/analyze', { method: 'POST', body: JSON.stringify({ moxfield_id, force }) }),

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
    const url = USE_EDGE
      ? `${EDGE_BASE}/collection/upload`
      : `${LEGACY_BASE}/api/collection/upload`
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeader, // NO Content-Type — browser sets multipart boundary automatically
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `API error ${res.status}`)
    }
    return res.json()
  },

  /** Get the authenticated user's stored collection. */
  getCollection: () => edgeFetch('collection', '/', {}),

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
  createLeague: ({ name, description, season_start, season_end, status = 'active' }) =>
    edgeFetch('leagues', '', {
      method: 'POST',
      body: JSON.stringify({ name, description, season_start, season_end, status }),
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
}
