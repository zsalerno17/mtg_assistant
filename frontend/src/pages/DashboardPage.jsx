import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

function ImportModal({ onClose, onImported }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.addToLibrary(trimmed)
      onImported(result)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-[var(--font-heading)] text-[var(--color-text)] text-lg tracking-wide">Import Deck</h3>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-[var(--color-muted)] text-xs mb-4">
          Paste a public Moxfield deck URL. No analysis runs yet — analyze from the dashboard when you're ready.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.moxfield.com/decks/..."
            disabled={loading}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(251,191,36,0.12)] transition-all disabled:opacity-50 mb-3"
          />
          {error && (
            <p className="mb-3 text-[var(--color-danger)] text-xs">{error}</p>
          )}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-[var(--color-primary)] text-[var(--color-bg)] px-5 py-2 rounded-lg text-sm font-semibold hover:brightness-110 hover:shadow-[0_0_16px_rgba(251,191,36,0.3)] active:scale-[0.98] transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[90px]"
            >
              {loading ? 'Importing…' : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
            className={`ms ms-${id.toLowerCase()} ms-cost ms-shadow mana-glow-hover transition-all`}
            style={{ fontSize: size }}
            aria-label={id}
          />
        )
      })}
    </div>
  )
}

function DeckCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div className="skeleton h-4 rounded-md w-3/4" />
      <div className="flex gap-1.5">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton rounded-full w-5 h-5" />)}
      </div>
      <div className="skeleton h-3 rounded w-1/2" />
      <div className="pt-1 flex items-center justify-between">
        <div className="skeleton h-5 rounded-full w-20" />
        <div className="skeleton h-3 rounded w-12" />
      </div>
    </div>
  )
}

function DeckRowSkeleton() {
  return (
    <tr className="border-b border-[var(--color-border)]">
      <td className="py-3 px-4"><div className="skeleton h-4 rounded w-32" /></td>
      <td className="py-3 px-4"><div className="skeleton h-4 rounded w-24" /></td>
      <td className="py-3 px-4">
        <div className="flex gap-1">{[...Array(3)].map((_, i) => <div key={i} className="skeleton rounded-full w-4 h-4" />)}</div>
      </td>
      <td className="py-3 px-4"><div className="skeleton h-3 rounded w-16" /></td>
      <td className="py-3 px-4"><div className="skeleton h-5 rounded-full w-20" /></td>
      <td className="py-3 px-4"><div className="skeleton h-5 rounded w-14" /></td>
    </tr>
  )
}

function StatusBadge({ analyzed }) {
  return analyzed ? (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
      Analyzed
    </span>
  ) : (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-muted)] border border-[var(--color-border)] whitespace-nowrap">
      Not analyzed
    </span>
  )
}

// Mobile card view for a single deck
function DeckCard({ item, onAnalyze, analyzingId }) {
  const navigate = useNavigate()
  const isAnalyzing = analyzingId === item.moxfield_id
  const date = new Date(item.added_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-3">
      {/* Header: name + date */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-[var(--font-heading)] text-[var(--color-text)] text-sm leading-snug line-clamp-2 flex-1">
          {item.deck_name}
        </h3>
        <span className="text-[var(--color-muted)] text-xs shrink-0 pt-0.5">{date}</span>
      </div>

      {/* Color pips (only if analyzed) */}
      {item.colors?.length > 0 && <ColorPips colors={item.colors} size="1rem" />}

      {/* Commander */}
      {item.commander && (
        <p className="text-[var(--color-muted)] text-xs truncate">{item.commander}</p>
      )}

      {/* Status */}
      <StatusBadge analyzed={item.analyzed} />

      {/* Footer actions */}
      <div className="mt-auto pt-1 flex items-center justify-between">
        {item.analyzed ? (
          <button
            onClick={() => navigate(`/deck/${item.moxfield_id}`)}
            className="text-[var(--color-secondary)] text-xs hover:underline"
          >
            View Analysis →
          </button>
        ) : (
          <button
            onClick={() => onAnalyze(item.moxfield_id)}
            disabled={!!analyzingId}
            className="text-[var(--color-primary)] text-xs font-medium hover:underline disabled:opacity-40"
          >
            {isAnalyzing ? 'Analyzing…' : 'Analyze →'}
          </button>
        )}
        {item.moxfield_url && (
          <a
            href={item.moxfield_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-muted)] text-xs hover:text-[var(--color-secondary)] transition-colors"
          >
            Moxfield ↗
          </a>
        )}
      </div>
    </div>
  )
}

// Desktop table row
function DeckTableRow({ item, onAnalyze, analyzingId }) {
  const navigate = useNavigate()
  const isAnalyzing = analyzingId === item.moxfield_id
  const date = new Date(item.added_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]/60 transition-colors">
      {/* Deck name */}
      <td className="py-3 px-4">
        <span className="font-[var(--font-heading)] text-[var(--color-text)] text-sm leading-snug line-clamp-1">
          {item.deck_name}
        </span>
      </td>
      {/* Commander */}
      <td className="py-3 px-4">
        <span className="text-[var(--color-muted)] text-xs truncate max-w-[160px] block">
          {item.commander || <span className="opacity-30">—</span>}
        </span>
      </td>
      {/* Colors */}
      <td className="py-3 px-4">
        {item.colors?.length > 0
          ? <ColorPips colors={item.colors} size="0.95rem" />
          : <span className="text-[var(--color-muted)] opacity-30 text-xs">—</span>
        }
      </td>
      {/* Date */}
      <td className="py-3 px-4">
        <span className="text-[var(--color-muted)] text-xs">{date}</span>
      </td>
      {/* Status */}
      <td className="py-3 px-4">
        <StatusBadge analyzed={item.analyzed} />
      </td>
      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {item.analyzed ? (
            <button
              onClick={() => navigate(`/deck/${item.moxfield_id}`)}
              className="text-[var(--color-secondary)] text-xs hover:underline whitespace-nowrap"
            >
              View Analysis →
            </button>
          ) : (
            <button
              onClick={() => onAnalyze(item.moxfield_id)}
              disabled={!!analyzingId}
              className="text-[var(--color-primary)] text-xs font-medium hover:underline disabled:opacity-40 whitespace-nowrap"
            >
              {isAnalyzing ? 'Analyzing…' : 'Analyze'}
            </button>
          )}
          {item.moxfield_url && (
            <a
              href={item.moxfield_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-muted)] text-xs hover:text-[var(--color-secondary)] transition-colors"
            >
              Moxfield ↗
            </a>
          )}
        </div>
      </td>
    </tr>
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
  const [decks, setDecks] = useState([])
  const [decksLoading, setDecksLoading] = useState(true)
  const [collectionSummary, setCollectionSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)

  const loadDecks = () => {
    api.getDeckLibrary()
      .then(data => setDecks(data.decks || []))
      .catch(() => setDecks([]))
      .finally(() => setDecksLoading(false))
  }

  useEffect(() => {
    loadDecks()

    api.getCollectionSummary()
      .then(data => setCollectionSummary(data))
      .catch(() => setCollectionSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [])

  const handleImported = () => {
    setShowImportModal(false)
    setDecksLoading(true)
    loadDecks()
  }

  const handleAnalyze = async (moxfieldId) => {
    setAnalyzingId(moxfieldId)
    setAnalyzeError(null)
    try {
      const result = await api.analyzeDeck(moxfieldId)
      navigate(`/deck/${moxfieldId}`, { state: { analysis: result.analysis } })
    } catch (err) {
      setAnalyzeError(err.message)
      setAnalyzingId(null)
    }
  }

  return (
    <div className="min-h-screen p-6">
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={handleImported}
        />
      )}
      <div className="max-w-6xl mx-auto">
        {/* Page title - "Deck Vault" */}
        <div className="mb-8">
          <h1 className="font-[var(--font-brand)] text-3xl sm:text-4xl text-[var(--color-primary)] tracking-wide mb-2 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]">
            Deck Vault
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-[var(--color-primary)] to-transparent" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Total Decks */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 gradient-border-amber">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-1">Total Decks</p>
            <p className="text-[var(--color-text)] text-2xl font-bold font-[var(--font-heading)]">
              {decksLoading ? '—' : decks.length}
            </p>
          </div>

          {/* Analyzed Decks */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 gradient-border-green">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-1">Analyzed</p>
            <p className="text-[var(--color-text)] text-2xl font-bold font-[var(--font-heading)]">
              {decksLoading ? '—' : decks.filter(d => d.analyzed).length}
            </p>
          </div>

          {/* Average Power Level */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 gradient-border-purple">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-1">Avg Power</p>
            <p className="text-[var(--color-text)] text-2xl font-bold font-[var(--font-heading)]">
              {decksLoading ? '—' : 
                decks.filter(d => d.power_level != null).length > 0
                  ? (decks.filter(d => d.power_level != null).reduce((sum, d) => sum + d.power_level, 0) / decks.filter(d => d.power_level != null).length).toFixed(1)
                  : '—'
              }
            </p>
          </div>

          {/* Collection Cards */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 gradient-border-blue">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-1">Collection</p>
            <p className="text-[var(--color-text)] text-2xl font-bold font-[var(--font-heading)]">
              {summaryLoading ? '—' : collectionSummary?.count?.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--color-text)] text-lg font-medium">My Decks</h2>
          <button
            onClick={() => setShowImportModal(true)}
            className="text-sm bg-[var(--color-primary)] text-[var(--color-bg)] px-4 py-1.5 rounded-lg font-semibold hover:brightness-110 hover:shadow-[0_0_16px_rgba(251,191,36,0.3)] active:scale-[0.97] transition-all shadow-md shadow-amber-500/20"
          >
            + Import Deck
          </button>
        </div>

        {analyzeError && (
          <p className="mb-4 text-[var(--color-danger)] text-sm">{analyzeError}</p>
        )}

        {decksLoading ? (
          <>
            {/* Mobile: card skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
              {[...Array(3)].map((_, i) => <DeckCardSkeleton key={i} />)}
            </div>
            {/* Desktop: table skeleton */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                    {['Deck', 'Commander', 'Colors', 'Added', 'Status', 'Actions'].map(h => (
                      <th key={h} className="py-3 px-4 text-[var(--color-muted)] text-xs font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[var(--color-bg)]">
                  {[...Array(4)].map((_, i) => <DeckRowSkeleton key={i} />)}
                </tbody>
              </table>
            </div>
          </>
        ) : decks.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center py-16 max-w-xs mx-auto gap-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-[var(--color-muted)] opacity-30">
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
              <path d="M13 19l6-6-1-1-6 6" />
              <path d="M14.5 14.5L19 19" />
              <path d="M3 21l4-4" />
            </svg>
            <p className="text-[var(--color-text)] font-semibold text-sm">No decks in your library yet</p>
            <p className="text-[var(--color-muted)] text-xs text-center">Click <span className="text-[var(--color-primary)] font-medium">+ Import Deck</span> above to get started.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
              {decks.map((item) => (
                <DeckCard
                  key={item.moxfield_id}
                  item={item}
                  onAnalyze={handleAnalyze}
                  analyzingId={analyzingId}
                />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                    <th className="py-3 px-4 text-[var(--color-muted)] text-xs font-medium uppercase tracking-wider">Deck</th>
                    <th className="py-3 px-4 text-[var(--color-muted)] text-xs font-medium uppercase tracking-wider">Commander</th>
                    <th className="py-3 px-4 text-[var(--color-muted)] text-xs font-medium uppercase tracking-wider">Colors</th>
                    <th className="py-3 px-4 text-[var(--color-muted)] text-xs font-medium uppercase tracking-wider">Added</th>
                    <th className="py-3 px-4 text-[var(--color-muted)] text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-[var(--color-muted)] text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--color-bg)]">
                  {decks.map((item) => (
                    <DeckTableRow
                      key={item.moxfield_id}
                      item={item}
                      onAnalyze={handleAnalyze}
                      analyzingId={analyzingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Collection summary widget */}
        <CollectionSummaryWidget summary={collectionSummary} loading={summaryLoading} />
      </div>
    </div>
  )
}
