import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg)] px-4">
      <h1 className="font-[var(--font-heading)] text-4xl text-[var(--color-primary)] mb-2 tracking-wide">
        MTG Assistant
      </h1>
      <p className="text-[var(--color-muted)] mb-10 text-center max-w-sm">
        Deck recommendations, play strategies, and scenario analysis — powered by your Moxfield collection.
      </p>
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] px-6 py-3 rounded-lg hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
      >
        <span className="text-lg">G</span>
        Sign in with Google
      </button>
    </div>
  )
}
