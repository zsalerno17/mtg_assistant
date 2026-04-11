import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const MANA_SYMBOL_IDS = new Set(['W', 'U', 'B', 'R', 'G', 'C'])

function ColorPips({ colors, size = '1.1rem' }) {
  if (!colors?.length) return null
  return (
    <div className="flex gap-0.5 items-center shrink-0">
      {colors.map((c) => {
        const id = c.toUpperCase()
        if (!MANA_SYMBOL_IDS.has(id)) return null
        return (
          <i
            key={c}
            className={`ms ms-${id.toLowerCase()} ms-cost ms-shadow`}
            style={{ fontSize: size }}
            aria-label={id}
          />
        )
      })}
    </div>
  )
}

function DeckCard({ item, onClick }) {
  const colors = item.result_json?.colors || item.result_json?.color_identity
  const commander = item.result_json?.commander
  const themes = item.result_json?.themes || []
  const themeLabels = themes.slice(0, 3).map(t => typeof t === 'string' ? t : t?.name).filter(Boolean)
  const date = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="group cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-3 transition-all hover:border-[var(--color-primary)]/60 hover:shadow-lg hover:shadow-amber-500/10 hover:bg-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50"
    >
      {/* Header: name + date */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-[var(--font-heading)] text-[var(--color-text)] text-sm leading-snug line-clamp-2 flex-1">
          {item.deck_name || item.deck_id}
        </h3>
        <span className="text-[var(--color-muted)] text-xs shrink-0 pt-0.5">{date}</span>
      </div>

      {/* Color pips */}
      {colors?.length > 0 && <ColorPips colors={colors} size="1rem" />}

      {/* Commander */}
      {commander && (
        <p className="text-[var(--color-muted)] text-xs truncate">
          {commander}
        </p>
      )}

      {/* Theme tags */}
      {themeLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {themeLabels.map((t) => (
            <span
              key={t}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] truncate max-w-[120px]"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer: View Analysis */}
      <div className="mt-auto pt-1 flex items-center justify-between">
        <span className="text-[var(--color-secondary)] text-xs group-hover:underline">
          View Analysis →
        </span>
        {item.moxfield_url && (
          <a
            href={item.moxfield_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--color-muted)] text-xs hover:text-[var(--color-secondary)] transition-colors"
          >
            Moxfield ↗
          </a>
        )}
      </div>
    </div>
  )
}

function CollectionSummaryWidget({ summary, loading }) {
  if (loading) return null

  if (!summary || summary.count === 0) {
    return (
      <div className="mt-8 flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-5 py-4">
        <div>
          <p className="text-[var(--color-text)] text-sm font-medium">No collection uploaded yet</p>
          <p className="text-[var(--color-muted)] text-xs mt-0.5">Upload your Moxfield CSV to enable collection-based upgrade suggestions.</p>
        </div>
        <Link
          to="/collection"
          className="shrink-0 ml-4 text-[var(--color-secondary)] text-sm hover:underline"
        >
          Upload CSV →
        </Link>
      </div>
    )
  }

  const lastUpdated = summary.last_updated
    ? new Date(summary.last_updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="mt-8 flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--color-success)] shrink-0" />
        <p className="text-[var(--color-text)] text-sm">
          <span className="font-semibold">{summary.count.toLocaleString()} cards</span> loaded
          {lastUpdated && <span className="text-[var(--color-muted)] font-normal"> · Last updated {lastUpdated}</span>}
        </p>
      </div>
      <Link
        to="/collection"
        className="shrink-0 ml-4 text-[var(--color-secondary)] text-sm hover:underline"
      >
        Manage →
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const urlInputRef = useRef(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [collectionSummary, setCollectionSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  useEffect(() => {
    api.getAnalysisHistory()
      .then(data => setHistory(data.analyses || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))

    api.getCollectionSummary()
      .then(data => setCollectionSummary(data))
      .catch(() => setCollectionSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [])

  // Deduplicate history: keep only the most recent analysis per deck_id
  const dedupedDecks = Object.values(
    history.reduce((acc, item) => {
      if (!acc[item.deck_id] || new Date(item.created_at) > new Date(acc[item.deck_id].created_at)) {
        acc[item.deck_id] = item
      }
      return acc
    }, {})
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

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

  const focusUrlInput = () => {
    urlInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    urlInputRef.current?.focus()
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-[var(--font-heading)] text-3xl text-[var(--color-text)] tracking-wide mb-2">Dashboard</h1>
          <div className="h-px w-16 bg-gradient-to-r from-[var(--color-primary)] to-transparent" />
        </div>
        <h2 className="text-[var(--color-text)] text-lg font-medium mb-6">Analyze a Deck</h2>

        <form
          onSubmit={handleAnalyze}
          className="bg-gradient-to-br from-[var(--color-surface)] to-[#0c1321] border border-[var(--color-border)] rounded-xl p-6 mb-8 shadow-lg shadow-black/40 ring-1 ring-[rgba(251,191,36,0.25)]"
        >
          <label className="block text-[var(--color-muted)] text-sm mb-2">Moxfield Deck URL</label>
          <div className="flex gap-3">
            <input
              ref={urlInputRef}
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

        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--color-text)] text-lg font-medium">My Decks</h2>
          {dedupedDecks.length > 0 && (
            <button
              onClick={focusUrlInput}
              className="text-sm text-[var(--color-secondary)] hover:underline"
            >
              + Add New Deck
            </button>
          )}
        </div>

        {historyLoading ? (
          <p className="text-[var(--color-muted)] text-sm">Loading decks…</p>
        ) : dedupedDecks.length === 0 ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dedupedDecks.map((item) => (
              <DeckCard
                key={item.deck_id}
                item={item}
                onClick={() => navigate(`/deck/${item.deck_id}`)}
              />
            ))}
          </div>
        )}

        {/* Collection summary widget */}
        <CollectionSummaryWidget summary={collectionSummary} loading={summaryLoading} />
      </div>
    </div>
  )
}
