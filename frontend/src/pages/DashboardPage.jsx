import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { session, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="font-[var(--font-heading)] text-2xl text-[var(--color-primary)]">MTG Assistant</h1>
        <div className="flex items-center gap-4">
          <span className="text-[var(--color-muted)] text-sm">{session?.user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        <h2 className="text-[var(--color-text)] text-lg font-medium mb-6">Your Decks</h2>

        {/* Deck fetch form — Phase 3 wiring */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 mb-6">
          <label className="block text-[var(--color-muted)] text-sm mb-2">Moxfield Deck URL</label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="https://www.moxfield.com/decks/..."
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <button className="bg-[var(--color-primary)] text-[var(--color-bg)] px-4 py-2 rounded font-medium hover:opacity-90 transition-opacity">
              Analyze
            </button>
          </div>
        </div>

        <p className="text-[var(--color-muted)] text-sm text-center">
          No decks analyzed yet.{' '}
          <Link to="/collection" className="text-[var(--color-secondary)] hover:underline">
            Upload your collection
          </Link>{' '}
          to get started.
        </p>
      </div>
    </div>
  )
}
