import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)

  const refreshProfile = useCallback(async () => {
    console.log('[AuthContext] Fetching profile...')
    setProfileError(null)
    try {
      const p = await api.getProfile()
      console.log('[AuthContext] Profile loaded:', p)
      setProfile(p)
      setProfileError(null)
    } catch (err) {
      console.error('[AuthContext] Failed to load profile:', err)
      console.error('[AuthContext] Error details:', err.message, err.stack)
      setProfile(null)
      setProfileError(err.message || 'Failed to load profile')
    }
  }, [])

  useEffect(() => {
    // onAuthStateChange awaits client initialization (including parsing
    // any OAuth tokens from the URL hash) before emitting INITIAL_SESSION.
    // This is the only listener we need — no separate getSession() call,
    // which can race and return null before init completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        refreshProfile()
      } else {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [refreshProfile])

  const signInWithGoogle = async () => {
    // Clear any stale PKCE code_verifier from a previous failed attempt.
    // If a leftover verifier exists, the token exchange will 401 because
    // it won't match the code_challenge of the new flow.
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.endsWith('-code-verifier')) {
        localStorage.removeItem(key)
      }
    }
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const signInWithEmail = async (email) => {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, profile, profileError, refreshProfile, signInWithGoogle, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
