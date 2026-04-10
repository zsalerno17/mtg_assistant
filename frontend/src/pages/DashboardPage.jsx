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
    <div className="min-h-screen bg-[var(--color-bg)] p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-[var(--font-heading)] text-2xl text-[var(--color-primary)] mb-8">Dashboard</h1>
        <h2 className="text-[var(--color-text)] text-lg font-medium mb-6">Analyze a Deck</h2>

        <form
          onSubmit={handleAnalyze}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 mb-8"
        >
          <label className="block text-[var(--color-muted)] text-sm mb-2">Moxfield Deck URL</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.moxfield.com/decks/..."
              disabled={loading}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-[var(--color-primary)] text-[var(--color-bg)] px-5 py-2 rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-w-[90px]"
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
          <p className="text-[var(--color-muted)] text-sm text-center py-8">
            No decks analyzed yet. Paste a Moxfield URL above to get started.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/deck/${item.deck_id}`}
                  className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-5 py-4 hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text)] font-medium font-[var(--font-mono)] text-sm">
                      {item.deck_id}
                    </span>
                    <span className="text-[var(--color-muted)] text-xs">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {item.result_json?.themes?.length > 0 && (
                    <p className="text-[var(--color-muted)] text-xs mt-1">
                      {item.result_json.themes.slice(0, 3).join(' · ')}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
