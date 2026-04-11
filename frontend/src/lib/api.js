import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function apiFetch(path, options = {}) {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export const api = {
  /** Fetch a deck from Moxfield (returns cached copy if already stored). */
  fetchDeck: (url) =>
    apiFetch('/api/decks/fetch', { method: 'POST', body: JSON.stringify({ url }) }),

  /** Run deck analysis and save to analysis history. */
  analyzeDeck: (moxfield_id, { force = false } = {}) =>
    apiFetch('/api/decks/analyze', { method: 'POST', body: JSON.stringify({ moxfield_id, force }) }),

  /** Get Gemini strategy advice for a deck. */
  getStrategy: (moxfield_id) =>
    apiFetch('/api/ai/strategy', { method: 'POST', body: JSON.stringify({ moxfield_id }) }),

  /** Get Gemini improvement suggestions (cross-referenced with user's collection). */
  getImprovements: (moxfield_id) =>
    apiFetch('/api/ai/improvements', { method: 'POST', body: JSON.stringify({ moxfield_id }) }),

  /** Get rule-based collection upgrade suggestions (cards you own that could improve the deck). */
  getCollectionUpgrades: (moxfield_id) =>
    apiFetch('/api/ai/collection-upgrades', { method: 'POST', body: JSON.stringify({ moxfield_id }) }),

  /** Get the authenticated user's profile (username, avatar_url). */
  getProfile: () =>
    apiFetch('/api/users/profile'),

  /** Update the authenticated user's profile. Only provided fields are changed. */
  updateProfile: ({ username, avatar_url } = {}) =>
    apiFetch('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ username: username ?? null, avatar_url: avatar_url ?? null }),
    }),

  /** Get Gemini before/after scenario analysis for proposed card swaps. */
  getScenarios: (moxfield_id, cards_to_add, cards_to_remove) =>
    apiFetch('/api/ai/scenarios', {
      method: 'POST',
      body: JSON.stringify({ moxfield_id, cards_to_add, cards_to_remove }),
    }),

  /** Upload a Moxfield CSV collection export. */
  uploadCollection: async (file) => {
    const authHeader = await getAuthHeader()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/api/collection/upload`, {
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
  getCollection: () => apiFetch('/api/collection/'),

  /** Get paginated analysis history for the current user. */
  getAnalysisHistory: (page = 1) => apiFetch(`/api/analyses/history?page=${page}`),

  /** Get collection card count + last updated timestamp (lightweight — no full card data). */
  getCollectionSummary: () => apiFetch('/api/collection/summary'),
}
