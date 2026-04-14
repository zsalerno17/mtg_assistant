import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import CardTooltip from '../components/CardTooltip'
import { Eye, LoaderCircle, ClipboardCheck, Swords } from 'lucide-react'
import PageTransition from '../components/PageTransition'

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
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-subtle)] transition-all disabled:opacity-50 mb-3"
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
              className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-5 py-2 rounded-lg text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[90px]"
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
      <td><div className="skeleton h-5 rounded-lg w-20" /></td>
      <td><div className="skeleton h-4 rounded w-8" /></td>
      <td className="text-right"><div className="skeleton h-5 rounded w-14 ml-auto" /></td>
    </tr>
  )
}

function StatusBadge({ analyzed }) {
  return analyzed ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500/[0.12] text-emerald-500 border border-emerald-500/25 whitespace-nowrap font-semibold">
      <span className="w-[5px] h-[5px] rounded-full bg-current" />
      Analyzed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-muted)] border border-[var(--color-border)] whitespace-nowrap font-semibold">
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

      {/* Color pips */}
      {item.colors?.length > 0 && <ColorPips colors={item.colors} size="1rem" />}

      {/* Commander */}
      {item.commander && (
        <p className="text-[var(--color-muted)] text-xs truncate font-[var(--font-display)]">{item.commander}</p>
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
      <CardTooltip cardName={commanderName} imageUrl={commanderUri}>
        <img
          src={commanderUri}
          alt={commanderName}
          className="w-[46px] h-[64px] rounded object-cover border-[1.5px] border-[var(--color-primary)]/25 shadow-lg shrink-0 transition-all group-hover:border-[var(--color-primary)]/50 group-hover:shadow-[0_6px_16px_rgba(0,0,0,0.5),_0_0_12px_var(--color-primary-glow)] group-hover:-translate-y-0.5 cursor-help"
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
        <CardTooltip cardName={commanderNames[0]} imageUrl={commanderUri}>
          <img
            src={commanderUri}
            alt={commanderNames[0]}
            className={`w-[46px] h-[64px] rounded object-cover border-[1.5px] border-[var(--color-primary)]/25 shadow-lg transition-all cursor-help relative ${
              hovering 
                ? 'border-[var(--color-primary)]/50 shadow-[0_6px_16px_rgba(0,0,0,0.5),_0_0_12px_var(--color-primary-glow)] -translate-y-0.5 z-20' 
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
        <CardTooltip cardName={commanderNames[1]} imageUrl={partnerUri}>
          <img
            src={partnerUri}
            alt={commanderNames[1]}
            className={`w-[46px] h-[64px] rounded object-cover border-[1.5px] border-[var(--color-primary)]/25 shadow-lg transition-all cursor-help relative ${
              hovering 
                ? 'border-[var(--color-primary)]/50 shadow-[0_6px_16px_rgba(0,0,0,0.5),_0_0_12px_var(--color-primary-glow)] -translate-y-0.5 z-10' 
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
function DeckTableRow({ item, onAnalyze, analyzingId, index = 0 }) {
  const navigate = useNavigate()
  const isAnalyzing = analyzingId === item.moxfield_id

  return (
    <motion.tr
      className="group"
      initial={{ opacity: 0, y: 8 }}  // Cinematic entrance — upward slide
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
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
              className="btn btn-secondary btn-sm"
            >
              <Eye className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
              View Deck
            </button>
          ) : (
            <button
              onClick={() => onAnalyze(item.moxfield_id)}
              disabled={!!analyzingId}
              className="btn btn-primary btn-sm"
            >
              {isAnalyzing ? (
                <>
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" strokeWidth={2} aria-hidden="true" />
                  Analyzing…
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" strokeWidth={2} aria-hidden="true" />
                  Analyze
                </>
              )}
            </button>
          )}
        </div>
      </td>
    </motion.tr>
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
  const { session } = useAuth()
  const [decks, setDecks] = useState([])
  const [decksLoading, setDecksLoading] = useState(true)
  const [decksError, setDecksError] = useState(null)
  const [collectionSummary, setCollectionSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(null)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)

  // loadDecks is used by the main useEffect AND by the retry button / import
  // callback.  We keep a ref-based "generation" counter so that when the
  // session token changes (e.g. token refresh) and the effect re-fires, any
  // in-flight response from a previous call is ignored — preventing a stale
  // 401 failure from overwriting a successful fresh response.
  const loadGenRef = useRef(0)

  const loadDecks = (gen) => {
    setDecksError(null)
    api.getDeckLibrary()
      .then(data => {
        if (gen !== undefined && gen !== loadGenRef.current) return
        setDecks(data.decks || [])
        setDecksError(null)
      })
      .catch(err => {
        if (gen !== undefined && gen !== loadGenRef.current) return
        console.error('[DashboardPage] Failed to load decks:', err)
        console.error('[DashboardPage] Error details:', err.message, err.stack)
        setDecks([])
        setDecksError(err.message || 'Failed to load decks. Please try again.')
      })
      .finally(() => {
        if (gen !== undefined && gen !== loadGenRef.current) return
        setDecksLoading(false)
      })
  }

  useEffect(() => {
    if (!session?.access_token) return
    const gen = ++loadGenRef.current
    setDecksLoading(true) // eslint-disable-line react-hooks/set-state-in-effect -- loading state must be set synchronously before the async fetch begins
    setSummaryLoading(true)
    loadDecks(gen)

    api.getCollectionSummary()
      .then(data => {
        if (gen !== loadGenRef.current) return
        setCollectionSummary(data)
        setSummaryError(null)
      })
      .catch(err => {
        if (gen !== loadGenRef.current) return
        console.error('[DashboardPage] Failed to load collection summary:', err)
        setCollectionSummary(null)
        setSummaryError(err.message)
      })
      .finally(() => {
        if (gen !== loadGenRef.current) return
        setSummaryLoading(false)
      })
  }, [session?.user?.id])

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
    <PageTransition>
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
          <div className="stat-card stat-card-1 bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#2d3748]">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-[0.8px] font-semibold mb-2.5">Total Decks</p>
            <p className="text-[var(--color-text)] text-[34px] font-bold font-heading leading-none">
              {decksLoading ? '—' : decks.length}
            </p>
          </div>

          {/* Analyzed Decks */}
          <div className="stat-card stat-card-2 bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#2d3748]">
            <p className="text-[var(--color-muted)] text-xs uppercase tracking-[0.8px] font-semibold mb-2.5">Analyzed</p>
            <p className="text-[var(--color-text)] text-[34px] font-bold font-heading leading-none">
              {decksLoading ? '—' : decks.filter(d => d.analyzed).length}
            </p>
          </div>

          {/* Average Power Level */}
          <div className="stat-card stat-card-3 bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#2d3748]">
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
          <div className="stat-card stat-card-4 bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#2d3748]">
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
            className="btn btn-primary"
          >
            + Import Deck
          </button>
        </div>

        {analyzeError && (
          <p className="mb-4 text-[var(--color-danger)] text-sm">{analyzeError}</p>
        )}

        {decksError && (
          <div className="mb-4 bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-[var(--color-danger)] text-sm font-semibold mb-1">Failed to load decks</p>
              <p className="text-[var(--color-danger)] text-xs">{decksError}</p>
            </div>
            <button
              onClick={() => {
                setDecksLoading(true)
                loadDecks()
              }}
              className="text-[var(--color-danger)] text-xs font-medium hover:text-red-300 underline shrink-0"
            >
              Retry
            </button>
          </div>
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
            <Swords className="w-10 h-10 text-[var(--color-muted)] opacity-30" strokeWidth={2} aria-hidden="true" />
            <p className="text-[var(--color-text)] font-semibold text-sm">No decks in your library yet</p>
            <p className="text-[var(--color-muted)] text-xs text-center">Click <span className="text-[var(--color-primary)] font-medium">+ Import Deck</span> above to get started.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
              {decks.map((item, index) => (
                <motion.div
                  key={item.moxfield_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: index * 0.06,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                >
                  <DeckCard
                    item={item}
                    onAnalyze={handleAnalyze}
                    analyzingId={analyzingId}
                  />
                </motion.div>
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
                  {decks.map((item, index) => (
                    <DeckTableRow
                      key={item.moxfield_id}
                      item={item}
                      onAnalyze={handleAnalyze}
                      analyzingId={analyzingId}
                      index={index}
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
    </PageTransition>
  )
}
