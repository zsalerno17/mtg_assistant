import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the supabase client used by api.js.
// We capture the onAuthStateChange callback so tests can simulate auth events.
// ---------------------------------------------------------------------------
let authStateCallback = null
const mockGetSession = vi.fn()

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        authStateCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      getSession: mockGetSession,
    },
  },
}))

// Stub out import.meta.env values so the module can load
vi.stubEnv('VITE_SUPABASE_URL', 'https://fake.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key')

// Mock global fetch so edgeFetch / apiFetch don't make real requests
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Import after mocks are in place — this triggers module-level code such as
// the onAuthStateChange subscription and constant computation.
// ---------------------------------------------------------------------------
// We don't import `api` directly because the module caches a private
// `_cachedAccessToken` at module scope.  Instead we use a fresh dynamic
// import per describe block (via `resetModules`) so each group starts clean.
// ---------------------------------------------------------------------------

describe('getAuthHeader — auth token caching', () => {
  let api

  beforeEach(async () => {
    vi.clearAllMocks()
    authStateCallback = null

    // Reset module registry so _cachedAccessToken starts as null
    vi.resetModules()

    // Re-apply stubs after resetModules (they may be cleared)
    vi.stubEnv('VITE_SUPABASE_URL', 'https://fake.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key')

    // Dynamic import triggers module-level side effects again
    const mod = await import('../api')
    api = mod.api

    // Set up a default fetch response so api calls don't throw on response parsing
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })

  it('uses cached token after onAuthStateChange fires', async () => {
    // Simulate auth state change with a session
    expect(authStateCallback).toBeTypeOf('function')
    authStateCallback('SIGNED_IN', { access_token: 'cached-token-abc' })

    // Trigger any API call which internally calls getAuthHeader()
    await api.getProfile()

    // fetch should have been called with the cached token
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect(fetchOpts.headers.Authorization).toBe('Bearer cached-token-abc')

    // getSession should NOT have been called because we had a cached token
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  it('falls back to getSession() when no cached token', async () => {
    // No authStateCallback fired → _cachedAccessToken is null
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'session-fallback-token' } },
    })

    await api.getProfile()

    expect(mockGetSession).toHaveBeenCalledTimes(1)
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect(fetchOpts.headers.Authorization).toBe('Bearer session-fallback-token')
  })

  it('clears cached token on sign-out, then falls back to getSession()', async () => {
    // First: set a cached token
    authStateCallback('SIGNED_IN', { access_token: 'before-signout' })

    // Then sign out (session is null)
    authStateCallback('SIGNED_OUT', null)

    // Now getSession should be called as fallback
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'new-token-after-signout' } },
    })

    await api.getProfile()

    expect(mockGetSession).toHaveBeenCalledTimes(1)
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect(fetchOpts.headers.Authorization).toBe('Bearer new-token-after-signout')
  })

  it('uses the latest token when onAuthStateChange fires multiple times', async () => {
    authStateCallback('SIGNED_IN', { access_token: 'first-token' })
    authStateCallback('TOKEN_REFRESHED', { access_token: 'refreshed-token' })

    await api.getProfile()

    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect(fetchOpts.headers.Authorization).toBe('Bearer refreshed-token')
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  it('throws when no cached token and getSession() returns no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    })

    await expect(api.getProfile()).rejects.toThrow('Not authenticated')
  })
})
