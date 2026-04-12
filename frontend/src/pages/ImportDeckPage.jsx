import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function ImportDeckPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null) // { deck_name, moxfield_id }

  const handleImport = async (e) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await api.addToLibrary(trimmed)
      setSuccess(result)
      setUrl('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-xl mx-auto px-8 pt-10 pb-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm transition-colors mb-4"
          >
            ← Dashboard
          </Link>
          <h1 className="font-heading text-3xl text-[var(--color-text)] tracking-wide mb-2">
            Import Deck
          </h1>
          <div className="h-px w-16 bg-gradient-to-r from-[var(--color-primary)] to-transparent mb-3" />
          <p className="text-[var(--color-muted)] text-sm">
            Paste a public Moxfield deck URL to add it to your library. No analysis runs yet — you can analyze from the dashboard whenever you're ready.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleImport}
          className="bg-gradient-to-br from-[var(--color-surface)] to-[#0c1321] border border-[var(--color-border)] rounded-xl p-6 shadow-lg shadow-black/40"
        >
          <label className="block text-[var(--color-muted)] text-sm mb-2">
            Moxfield Deck URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.moxfield.com/decks/..."
              disabled={loading}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(251,191,36,0.12)] transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-[var(--color-primary)] text-[var(--color-bg)] px-5 py-2 rounded-lg font-semibold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              {loading ? 'Importing…' : 'Import'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-[var(--color-danger)] text-sm">{error}</p>
          )}
        </form>

        {/* Success state */}
        {success && (
          <div className="mt-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-emerald-400 text-sm font-medium">Deck added to your library!</p>
              <p className="text-[var(--color-muted)] text-xs mt-0.5 truncate max-w-[260px]">
                {success.deck_name}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => { setSuccess(null); setUrl('') }}
                className="text-[var(--color-muted)] text-xs hover:text-[var(--color-text)] transition-colors"
              >
                Import another
              </button>
              <button
                onClick={() => navigate('/')}
                className="text-[var(--color-secondary)] text-xs hover:underline"
              >
                View dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
