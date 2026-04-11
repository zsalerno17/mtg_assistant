import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    api.getAnalysisHistory()
      .then(data => setHistory(data.analyses || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [])

  const handleAnalyze = async (e) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const fetchResult = await api.fetchDeck(trimmed)
      const analysis = await api.analyzeDeck(fetchResult.deck_id)
      navigate(`/deck/${fetchResult.deck_id}`, {
        state: { deck: fetchResult.data, analysis: analysis.analysis },
      })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-[var(--font-heading)] text-3xl text-[var(--color-text)] tracking-wide mb-2">Dashboard</h1>
          <div className="h-px w-16 bg-gradient-to-r from-[var(--color-primary)] to-transparent" />
        </div>
        <h2 className="text-[var(--color-text)] text-lg font-medium mb-6">Analyze a Deck</h2>

        <form
          onSubmit={handleAnalyze}
          className="bg-gradient-to-br from-[var(--color-surface)] to-[#0c1321] border border-[var(--color-border)] rounded-xl p-6 mb-8 shadow-lg shadow-black/40 ring-1 ring-[var(--color-primary)]/8"
        >
          <label className="block text-[var(--color-muted)] text-sm mb-2">Moxfield Deck URL</label>
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
              {loading ? 'Loading…' : 'Analyze'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-[var(--color-danger)] text-sm">{error}</p>
          )}
        </form>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[var(--color-text)] text-lg font-medium">Recent Analyses</h2>
          <Link to="/collection" className="text-[var(--color-secondary)] text-sm hover:underline">
            Manage collection →
          </Link>
        </div>

        {historyLoading ? (
          <p className="text-[var(--color-muted)] text-sm">Loading history…</p>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center py-16 max-w-xs mx-auto gap-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-[var(--color-muted)] opacity-30">
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
              <path d="M13 19l6-6-1-1-6 6" />
              <path d="M14.5 14.5L19 19" />
              <path d="M3 21l4-4" />
            </svg>
            <p className="text-[var(--color-text)] font-semibold text-sm">No decks analyzed yet</p>
            <p className="text-[var(--color-muted)] text-xs text-center">Paste a Moxfield deck URL above to get started.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/deck/${item.deck_id}`}
                  className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-5 py-4 transition-all hover:border-[var(--color-primary)]/60 hover:shadow-md hover:shadow-amber-500/10 hover:bg-[#111827]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--color-text)] font-medium truncate">
                      {item.deck_name || item.deck_id}
                    </span>
                    <span className="text-[var(--color-muted)] text-xs shrink-0">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {item.result_json?.themes?.length > 0 && (
                      <p className="text-[var(--color-muted)] text-xs">
                        {item.result_json.themes.slice(0, 3).map(t => typeof t === 'string' ? t : t.name).join(' · ')}
                      </p>
                    )}
                    {item.moxfield_url && (
                      <a
                        href={item.moxfield_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[var(--color-secondary)] text-xs hover:underline shrink-0 ml-auto"
                      >
                        Moxfield ↗
                      </a>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
