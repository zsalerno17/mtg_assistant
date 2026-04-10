import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../lib/api'

const TABS = ['Overview', 'Collection Upgrades', 'Strategy', 'Improvements', 'Scenarios']

// Simple markdown → HTML-like renderer for Gemini output
function MarkdownBlock({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let key = 0
  for (const line of lines) {
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-[var(--color-primary)] font-[var(--font-heading)] text-lg mt-6 mb-2">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-[var(--color-secondary)] font-semibold mt-4 mb-1">{line.slice(4)}</h3>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2).replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong>${m}</strong>`)
      elements.push(<li key={key++} className="ml-4 text-[var(--color-text)] text-sm leading-relaxed list-disc" dangerouslySetInnerHTML={{ __html: content }} />)
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />)
    } else {
      const content = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong>${m}</strong>`)
      elements.push(<p key={key++} className="text-[var(--color-text)] text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />)
    }
  }
  return <div className="space-y-0.5">{elements}</div>
}

function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3 py-12 justify-center">
      <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      <span className="text-[var(--color-muted)] text-sm">Consulting Gemini…</span>
    </div>
  )
}

function StatBadge({ label, value, warning }) {
  return (
    <div className={`bg-[var(--color-bg)] border rounded px-3 py-2 text-center ${warning ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}>
      <div className={`text-xl font-[var(--font-mono)] font-bold ${warning ? 'text-[var(--color-danger)]' : 'text-[var(--color-primary)]'}`}>{value}</div>
      <div className="text-[var(--color-muted)] text-xs mt-0.5">{label}</div>
    </div>
  )
}

function OverviewTab({ deck, analysis }) {
  if (!deck || !analysis) return <p className="text-[var(--color-muted)] text-sm">Loading deck data…</p>

  const manaCurveData = Object.entries(analysis.mana_curve || {})
    .map(([cmc, count]) => ({ cmc: cmc === '7' ? '7+' : cmc, count }))
    .sort((a, b) => parseInt(a.cmc) - parseInt(b.cmc))

  const cardTypes = analysis.card_types || {}

  return (
    <div className="space-y-6">
      {/* Commander */}
      <div>
        <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Commander</h3>
        <p className="text-[var(--color-primary)] font-[var(--font-heading)] text-xl">
          {deck.commander?.name || 'Unknown'}
        </p>
        <p className="text-[var(--color-muted)] text-sm mt-0.5">{deck.format} · {deck.name}</p>
      </div>

      {/* Key stats */}
      <div>
        <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Key Numbers</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <StatBadge label="Cards" value={analysis.total_cards} />
          <StatBadge label="Avg CMC" value={typeof analysis.average_cmc === 'number' ? analysis.average_cmc.toFixed(2) : '—'} warning={analysis.average_cmc > 3.5} />
          <StatBadge label="Lands" value={cardTypes['Lands'] || 0} warning={(cardTypes['Lands'] || 0) < 36} />
          <StatBadge label="Ramp" value={analysis.ramp_count || 0} warning={(analysis.ramp_count || 0) < 10} />
          <StatBadge label="Draw" value={analysis.draw_count || 0} warning={(analysis.draw_count || 0) < 10} />
          <StatBadge label="Removal" value={analysis.removal_count || 0} warning={(analysis.removal_count || 0) < 8} />
        </div>
      </div>

      {/* Mana curve */}
      {manaCurveData.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Mana Curve</h3>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={manaCurveData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="cmc" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#fbbf24' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {manaCurveData.map((_, i) => (
                    <Cell key={i} fill="#fbbf24" opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Card types */}
      <div>
        <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Card Types</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(cardTypes).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2">
              <span className="text-[var(--color-muted)] text-sm">{type}</span>
              <span className="text-[var(--color-text)] font-[var(--font-mono)] text-sm">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Themes */}
      {analysis.themes?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Themes</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.themes.map((t) => (
              <span key={t} className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] text-xs px-2.5 py-1 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {analysis.weaknesses?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Identified Weaknesses</h3>
          <ul className="space-y-1">
            {analysis.weaknesses.map((w) => (
              <li key={w} className="text-[var(--color-danger)] text-sm flex gap-2">
                <span>⚠</span><span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function GeminiTab({ deckId, fetcher, cacheKey }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (loaded || loading) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetcher(deckId)
      setContent(data)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [deckId, fetcher, loaded, loading])

  // Load on mount
  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner />
  if (error) return (
    <div className="py-8 text-center">
      <p className="text-[var(--color-danger)] text-sm mb-3">{error}</p>
      <button onClick={() => { setLoaded(false); load() }} className="text-[var(--color-secondary)] text-sm hover:underline">
        Retry
      </button>
    </div>
  )
  if (!content) return null
  return <MarkdownBlock text={content} />
}

function ScenariosTab({ deckId }) {
  const [addInput, setAddInput] = useState('')
  const [removeInput, setRemoveInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cardsToAdd = addInput.split('\n').map(s => s.trim()).filter(Boolean)
    const cardsToRemove = removeInput.split('\n').map(s => s.trim()).filter(Boolean)
    if (!cardsToAdd.length && !cardsToRemove.length) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.getScenarios(deckId, cardsToAdd, cardsToRemove)
      setResult(data.scenarios)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-[var(--color-muted)] text-sm">
        Enter cards to add and/or remove to see how the proposed changes affect your strategy.
      </p>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Cards to Add (one per line)</label>
          <textarea
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder={"Rhystic Study\nArcane Signet"}
            rows={5}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[var(--color-success)] resize-none"
          />
        </div>
        <div>
          <label className="block text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Cards to Remove (one per line)</label>
          <textarea
            value={removeInput}
            onChange={(e) => setRemoveInput(e.target.value)}
            placeholder={"Bad Card\nWeak Synergy"}
            rows={5}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[var(--color-danger)] resize-none"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading || (!addInput.trim() && !removeInput.trim())}
            className="bg-[var(--color-primary)] text-[var(--color-bg)] px-6 py-2 rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing…' : 'Analyze Scenario'}
          </button>
          {error && <p className="mt-2 text-[var(--color-danger)] text-sm">{error}</p>}
        </div>
      </form>

      {loading && <LoadingSpinner />}

      {result && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Before */}
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-5">
            <h3 className="text-[var(--color-muted)] font-semibold text-sm uppercase tracking-wider mb-4">Before</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[var(--color-muted)] text-xs mb-1">Game Plan</p>
                <p className="text-[var(--color-text)] text-sm">{result.before?.game_plan}</p>
              </div>
              {result.before?.win_conditions?.length > 0 && (
                <div>
                  <p className="text-[var(--color-muted)] text-xs mb-1">Win Conditions</p>
                  <ul className="space-y-1">{result.before.win_conditions.map((w, i) => <li key={i} className="text-[var(--color-text)] text-sm flex gap-2"><span className="text-[var(--color-success)]">✓</span>{w}</li>)}</ul>
                </div>
              )}
              {result.before?.key_weaknesses?.length > 0 && (
                <div>
                  <p className="text-[var(--color-muted)] text-xs mb-1">Weaknesses</p>
                  <ul className="space-y-1">{result.before.key_weaknesses.map((w, i) => <li key={i} className="text-[var(--color-text)] text-sm flex gap-2"><span className="text-[var(--color-danger)]">⚠</span>{w}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
          {/* After */}
          <div className="bg-[var(--color-bg)] border border-[var(--color-secondary)] rounded-lg p-5">
            <h3 className="text-[var(--color-secondary)] font-semibold text-sm uppercase tracking-wider mb-4">After Changes</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[var(--color-muted)] text-xs mb-1">Game Plan</p>
                <p className="text-[var(--color-text)] text-sm">{result.after?.game_plan}</p>
              </div>
              {result.after?.win_conditions?.length > 0 && (
                <div>
                  <p className="text-[var(--color-muted)] text-xs mb-1">Win Conditions</p>
                  <ul className="space-y-1">{result.after.win_conditions.map((w, i) => <li key={i} className="text-[var(--color-text)] text-sm flex gap-2"><span className="text-[var(--color-success)]">✓</span>{w}</li>)}</ul>
                </div>
              )}
              {result.after?.key_weaknesses?.length > 0 && (
                <div>
                  <p className="text-[var(--color-muted)] text-xs mb-1">Weaknesses</p>
                  <ul className="space-y-1">{result.after.key_weaknesses.map((w, i) => <li key={i} className="text-[var(--color-text)] text-sm flex gap-2"><span className="text-[var(--color-danger)]">⚠</span>{w}</li>)}</ul>
                </div>
              )}
              {result.after?.changes_summary && (
                <div className="border-t border-[var(--color-border)] pt-3 mt-3">
                  <p className="text-[var(--color-muted)] text-xs mb-1">Summary of Changes</p>
                  <p className="text-[var(--color-secondary)] text-sm">{result.after.changes_summary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DeckPage() {
  const { deckId } = useParams()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('Overview')

  // Data passed from DashboardPage via navigate() state; fall back to fetching
  const [deck, setDeck] = useState(location.state?.deck || null)
  const [analysis, setAnalysis] = useState(location.state?.analysis || null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (deck && analysis) return // already have data from navigate state
    // Load deck data by fetching + analyzing (both will use cache)
    Promise.all([
      api.fetchDeck(deckId),
      api.analyzeDeck(deckId),
    ])
      .then(([fetchResult, analyzeResult]) => {
        setDeck(fetchResult.data)
        setAnalysis(analyzeResult.analysis)
      })
      .catch((err) => setLoadError(err.message))
  }, [deckId]) // eslint-disable-line react-hooks/exhaustive-deps

  const deckName = deck?.name || deckId

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Top bar */}
      <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors text-sm">
          ← Dashboard
        </Link>
        <h1 className="font-[var(--font-heading)] text-[var(--color-primary)] text-xl truncate">
          {deckName}
        </h1>
      </div>

      <div className="px-6 pt-0">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] pt-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-w-3xl py-6">
          {loadError && (
            <p className="text-[var(--color-danger)] text-sm">Failed to load deck: {loadError}</p>
          )}

          {activeTab === 'Overview' && (
            <OverviewTab deck={deck} analysis={analysis} />
          )}

          {activeTab === 'Strategy' && (
            <GeminiTab
              deckId={deckId}
              fetcher={(id) => api.getStrategy(id).then(d => d.strategy)}
              cacheKey="strategy"
            />
          )}

          {activeTab === 'Improvements' && (
            <GeminiTab
              deckId={deckId}
              fetcher={(id) => api.getImprovements(id).then(d => d.improvements)}
              cacheKey="improvements"
            />
          )}

          {activeTab === 'Collection Upgrades' && (
            <GeminiTab
              deckId={deckId}
              fetcher={(id) => api.getImprovements(id).then(d => d.improvements)}
              cacheKey="upgrades"
            />
          )}

          {activeTab === 'Scenarios' && (
            <ScenariosTab deckId={deckId} />
          )}
        </div>
      </div>
    </div>
  )
}
