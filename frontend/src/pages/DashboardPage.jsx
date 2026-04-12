import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import CardTooltip from '../components/CardTooltip'

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
          <h3 className="font-heading text-[var(--color-text)] text-lg tracking-wide">Import Deck</h3>
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

function ColorPips({ colors, size = '1.1rem', enableGlow = false }) {
  if (!colors?.length) return null
  return (
    <div className="flex gap-[5px] items-center shrink-0">
      {colors.map((c) => {
        const id = c.toUpperCase()
        if (!MANA_SYMBOL_IDS.has(id)) return null
        return (
          <i
            key={c}
            className={`ms ms-${id.toLowerCase()} ms-cost ms-shadow ${enableGlow ? 'mana-glow-hover' : ''} transition-all`}
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
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <div className="skeleton w-[46px] h-[64px] rounded" />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="skeleton h-4 rounded w-32" />
            <div className="skeleton h-3 rounded w-24" />
          </div>
        </div>
      </td>
      <td>
        <div className="flex gap-1">{[...Array(3)].map((_, i) => <div key={i} className="skeleton rounded-full w-4 h-4" />)}</div>
      </td>
      <td><div className="skeleton h-3 rounded w-16" /></td>
      <td><div className="skeleton h-5 rounded-[7px] w-20" /></td>
      <td><div className="skeleton h-4 rounded w-8" /></td>
      <td className="text-right"><div className="skeleton h-5 rounded w-14 ml-auto" /></td>
    </tr>
  )
}

function StatusBadge({ analyzed }) {
  return analyzed ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-[7px] bg-emerald-500/[0.12] text-emerald-500 border border-emerald-500/25 whitespace-nowrap font-semibold">
      <span className="w-[5px] h-[5px] rounded-full bg-current" />
      Analyzed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-[7px] bg-slate-500/[0.12] text-[var(--color-muted)] border border-slate-500/20 whitespace-nowrap font-semibold">
      <span className="w-[5px] h-[5px] rounded-full bg-current" />
      Pending
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
        <h3 className="font-heading text-[var(--color-text)] text-sm leading-snug line-clamp-2 flex-1">
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

// Commander art stack for single or partner commanders
function CommanderArtStack({ commanderUri, partnerUri, commanderName }) {
  const [hovering, setHovering] = useState(false)
  
  // Extract commander names from combined string (e.g., "Leonardo, the Balance & Michelangelo, the Heart")
  const commanderNames = commanderName?.split(' & ') || []
  const hasPartner = partnerUri && commanderNames.length === 2

  if (!commanderUri && !partnerUri) {
    return (
      <div className="w-[46px] h-[64px] rounded bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0 flex items-center justify-center">
        <span className="text-[var(--color-muted)] text-xs">?</span>
      </div>
    )
  }

  if (!hasPartner) {
    // Single commander
    return (
      <CardTooltip cardName={commanderName}>
        <img
          src={commanderUri}
          alt={commanderName}
          className="w-[46px] h-[64px] rounded object-cover border-[1.5px] border-[var(--color-primary)]/25 shadow-lg shrink-0 transition-all group-hover:border-[var(--color-primary)]/50 group-hover:shadow-[0_6px_16px_rgba(0,0,0,0.5),_0_0_12px_rgba(251,191,36,0.2)] group-hover:-translate-y-0.5 cursor-help"
        />
      </CardTooltip>
    )
  }

  // Partner commanders - stacked layout using flexbox
  return (
    <div
      className="flex items-center w-[74px] h-[64px] shrink-0"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Front card (commander) */}
      <div className="shrink-0">
        <CardTooltip cardName={commanderNames[0]}>
          <img
            src={commanderUri}
            alt={commanderNames[0]}
            className={`w-[46px] h-[64px] rounded object-cover border-[1.5px] border-[var(--color-primary)]/25 shadow-lg transition-all cursor-help relative ${
              hovering 
                ? 'border-[var(--color-primary)]/50 shadow-[0_6px_16px_rgba(0,0,0,0.5),_0_0_12px_rgba(251,191,36,0.2)] -translate-y-0.5 z-20' 
                : 'z-10'
            }`}
            style={{ transitionDuration: '200ms' }}
          />
        </CardTooltip>
      </div>
      
      {/* Back card (partner) - negative margin on wrapper creates overlap */}
      <div 
        className="shrink-0 transition-all"
        style={{ 
          marginLeft: hovering ? '-18px' : '-32px',
          transitionDuration: '200ms'
        }}
      >
        <CardTooltip cardName={commanderNames[1]}>
          <img
            src={partnerUri}
            alt={commanderNames[1]}
            className={`w-[46px] h-[64px] rounded object-cover border-[1.5px] border-[var(--color-primary)]/25 shadow-lg transition-all cursor-help relative ${
              hovering 
                ? 'border-[var(--color-primary)]/50 shadow-[0_6px_16px_rgba(0,0,0,0.5),_0_0_12px_rgba(251,191,36,0.2)] -translate-y-0.5 z-10' 
                : 'z-0'
            }`}
            style={{ transitionDuration: '200ms' }}
          />
        </CardTooltip>
      </div>
    </div>
  )
}

// Desktop table row
function DeckTableRow({ item, onAnalyze, analyzingId }) {
  const navigate = useNavigate()
  const isAnalyzing = analyzingId === item.moxfield_id

  return (
    <tr className="group">
      {/* Deck name with commander art */}
      <td>
        <div className="flex items-center gap-4">
          <CommanderArtStack 
            commanderUri={item.commander_image_uri}
            partnerUri={item.partner_image_uri}
            commanderName={item.commander}
          />
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-heading text-[var(--color-text)] text-[15px] font-semibold leading-snug truncate tracking-[-0.01em]">
              {item.deck_name}
            </span>
            {item.commander && (
              <span className="text-[var(--color-muted)] text-xs truncate">
                {item.commander}
              </span>
            )}
          </div>
        </div>
      </td>
      {/* Colors */}
      <td>
        {item.colors?.length > 0
          ? <ColorPips colors={item.colors} size="18px" enableGlow />
          : <span className="text-[var(--color-muted)] opacity-30 text-xs">—</span>
        }
      </td>
      {/* Format */}
      <td>
        <span className="text-[var(--color-muted)] text-[11px] font-medium uppercase tracking-[0.3px]">
          {item.format || 'Commander'}
        </span>
      </td>
      {/* Status */}
      <td>
        <StatusBadge analyzed={item.analyzed} />
      </td>
      {/* Power Level */}
      <td>
        {item.power_level != null ? (
          <span className="text-[var(--color-primary)] font-bold text-sm">
            {item.power_level.toFixed(1)}
          </span>
        ) : (
          <span className="text-[var(--color-muted)] font-medium text-sm">—</span>
        )}
      </td>
      {/* Actions */}
      <td className="text-right">
        <div className="flex items-center justify-end gap-2">
          {item.analyzed ? (
            <button
              onClick={() => navigate(`/deck/${item.moxfield_id}`)}
              className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-gradient-to-r from-amber-500/10 to-amber-400/10 text-amber-400 border border-amber-500/20 hover:border-amber-400/40 hover:from-amber-500/20 hover:to-amber-400/20 hover:shadow-[0_0_12px_rgba(251,191,36,0.15)] transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              View Deck
            </button>
          ) : (
            <button
              onClick={() => onAnalyze(item.moxfield_id)}
              disabled={!!analyzingId}
              className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-gradient-to-r from-emerald-500/10 to-emerald-400/10 text-emerald-400 border border-emerald-500/20 hover:border-emerald-400/40 hover:from-emerald-500/20 hover:to-emerald-400/20 hover:shadow-[0_0_12px_rgba(52,211,153,0.15)] disabled:opacity-40 disabled:hover:shadow-none transition-all duration-200"
            >
              {isAnalyzing ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 animate-spin"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                  Analyzing…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                  Analyze
                </>
              )}
            </button>
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
    <div className="min-h-screen px-8 pt-10 pb-6">
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={handleImported}
        />
      )}
      <div className="max-w-[1600px] mx-auto">
        {/* Page title - "Deck Vault" */}
        <div className="flex items-baseline gap-4 mb-8">
          <h1 className="font-brand text-[28px] text-[var(--color-text)] font-semibold tracking-[0.5px]">
            Deck Vault
          </h1>
          {!decksLoading && (
            <span className="text-sm text-[var(--color-muted)]">{decks.length} decks</span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Total Decks */}
          <div className="stat-card stat-card-1 bg-gradient-to-br from-[var(--color-surface)] to-[#1a202e] border border-[var(--color-border)] rounded-[10px] p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#2d3748]">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-[0.8px] font-semibold mb-2.5">Total Decks</p>
            <p className="text-[var(--color-text)] text-[34px] font-bold font-heading leading-none">
              {decksLoading ? '—' : decks.length}
            </p>
          </div>

          {/* Analyzed Decks */}
          <div className="stat-card stat-card-2 bg-gradient-to-br from-[var(--color-surface)] to-[#1a202e] border border-[var(--color-border)] rounded-[10px] p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#2d3748]">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-[0.8px] font-semibold mb-2.5">Analyzed</p>
            <p className="text-[var(--color-text)] text-[34px] font-bold font-heading leading-none">
              {decksLoading ? '—' : decks.filter(d => d.analyzed).length}
            </p>
          </div>

          {/* Average Power Level */}
          <div className="stat-card stat-card-3 bg-gradient-to-br from-[var(--color-surface)] to-[#1a202e] border border-[var(--color-border)] rounded-[10px] p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#2d3748]">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-[0.8px] font-semibold mb-2.5">Avg Power</p>
            <p className="text-[var(--color-text)] text-[34px] font-bold font-heading leading-none">
              {decksLoading ? '—' : 
                decks.filter(d => d.power_level != null).length > 0
                  ? (decks.filter(d => d.power_level != null).reduce((sum, d) => sum + d.power_level, 0) / decks.filter(d => d.power_level != null).length).toFixed(1)
                  : '—'
              }
            </p>
          </div>

          {/* Collection Cards */}
          <div className="stat-card stat-card-4 bg-gradient-to-br from-[var(--color-surface)] to-[#1a202e] border border-[var(--color-border)] rounded-[10px] p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#2d3748]">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-[0.8px] font-semibold mb-2.5">Collection</p>
            <p className="text-[var(--color-text)] text-[34px] font-bold font-heading leading-none">
              {summaryLoading ? '—' : collectionSummary?.count?.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--color-text)] text-[18px] font-semibold font-heading tracking-[-0.01em]">Your Decks</h2>
          <button
            onClick={() => setShowImportModal(true)}
            className="font-body text-sm bg-gradient-to-br from-[var(--color-primary)] to-[#f59e0b] text-black px-5 py-[11px] rounded-lg font-semibold hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(251,191,36,0.35)] transition-all shadow-[0_2px_12px_rgba(251,191,36,0.25)]"
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
            <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="deck-table">
                <thead>
                  <tr>
                    <th style={{width: '45%'}}>Deck</th>
                    <th>Colors</th>
                    <th>Format</th>
                    <th>Status</th>
                    <th>Power</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
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
            <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="deck-table">
                <thead>
                  <tr>
                    <th style={{width: '45%'}}>Deck</th>
                    <th>Colors</th>
                    <th>Format</th>
                    <th>Status</th>
                    <th>Power</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
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
