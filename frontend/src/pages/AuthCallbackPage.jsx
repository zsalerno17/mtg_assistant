import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageTransition from '../components/PageTransition'

/**
 * Handles the OAuth redirect from Supabase.
 * With PKCE flow, the URL contains ?code=xxx which the Supabase client
 * exchanges for a session during initialization (_initialize → _isPKCECallback
 * → _exchangeCodeForSession). This page waits for that exchange, then redirects.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/', { replace: true })
      }
    })

    // Also poll getSession as a fallback — it awaits initialization
    // which includes the PKCE code exchange.
    const timer = setTimeout(async () => {
      const { data: { session }, error: err } = await supabase.auth.getSession()
      if (err) {
        console.error('Auth callback error:', err)
        setError(err.message)
      } else if (session) {
        navigate('/', { replace: true })
      } else {
        setError('Sign-in failed — no session received. Please try again.')
      }
    }, 3000)

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [navigate])

  if (error) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg)] px-4 gap-4">
        <p className="text-[var(--color-danger)]">{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-[var(--color-primary)] underline"
        >
          Back to sign in
        </button>
      </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
      <div className="text-[var(--color-muted)]">Signing in...</div>
    </div>
    </PageTransition>
  )
}
