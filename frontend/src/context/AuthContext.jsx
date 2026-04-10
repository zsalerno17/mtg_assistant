import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    // onAuthStateChange awaits client initialization (including parsing
    // any OAuth tokens from the URL hash) before emitting INITIAL_SESSION.
    // This is the only listener we need — no separate getSession() call,
    // which can race and return null before init completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

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

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
