import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageTransition from '../components/PageTransition'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const { signInWithGoogle, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-screen px-4 relative">
      {/* Stronger radial glow behind login card */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 45%, var(--color-secondary-subtle) 0%, transparent 60%)' }} />
      
      {/* Logo */}
      <img 
        src="/logo.svg" 
        alt="MTG Assistant Logo" 
        className="w-20 h-20 mb-4 opacity-90"
      />
      
      <h1 className="font-heading text-5xl text-[var(--color-primary)] mb-3 tracking-wide relative font-semibold">
        MTG Assistant
      </h1>

      {/* Mana pip row */}
      <div className="flex gap-2 mb-4">
        {['w','u','b','r','g'].map(c => (
          <i key={c} className={`ms ms-${c} ms-cost ms-shadow mana-glow-hover transition-all`} style={{ fontSize: '1.5rem' }} aria-label={c} />
        ))}
      </div>

      <p className="text-[var(--color-muted)] mb-10 text-center max-w-xs text-sm font-heading">
        Know your deck. Command your game.
      </p>

      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] px-6 py-3 rounded-lg hover:border-[var(--color-primary)]/60 hover:-translate-y-0.5 active:translate-y-0 transition-all font-heading relative"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>
    </div>
    </PageTransition>
  )
}
