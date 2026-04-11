import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { api } from '../lib/api'

function OverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function UpgradeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <polyline points="17 11 12 6 7 11" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  )
}
function StrategyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  )
}
function ImprovementsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  )
}
function ScenariosIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

const TAB_CONFIG = [
  { label: 'Overview', icon: OverviewIcon },
  { label: 'Collection Upgrades', icon: UpgradeIcon },
  { label: 'Strategy', icon: StrategyIcon },
  { label: 'Improvements', icon: ImprovementsIcon },
  { label: 'Scenarios', icon: ScenariosIcon },
]
const TABS = TAB_CONFIG.map(t => t.label)

const THEME_DEFINITIONS = {
  Tokens: 'Generates creature tokens to overwhelm through wide board presence.',
  Graveyard: 'Uses the graveyard as a resource — reanimation, recursion, and flashback effects.',
  Aristocrats: 'Sacrifices creatures for value — death triggers, life drain, and card advantage.',
  Aggro: 'Fast creatures with evasion and combat bonuses; aims to win through early pressure.',
  Control: 'Answers threats with counterspells, wraths, and removal to dominate the late game.',
  Voltron: 'Grows one creature enormous through equipment or auras — usually the commander.',
  Spellslinger: 'Gets value from casting instants and sorceries — cantrips, triggers, storm-style payoffs.',
  Landfall: 'Triggers powerful effects whenever a land enters the battlefield.',
  Tribal: 'Synergies between creatures of the same type — lords, shared abilities, tribal payoffs.',
  Combo: 'Assembles specific card combinations to generate infinite loops or win the game immediately.',
}

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

function IconWarning({ className = 'w-4 h-4 shrink-0' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCheck({ className = 'w-3.5 h-3.5 shrink-0' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconChevronDown({ className = 'w-3.5 h-3.5 shrink-0' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconChevronLeft({ className = 'w-4 h-4 shrink-0' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function StatBadge({ label, value, warning, healthy }) {
  const borderColor = warning
    ? 'border-[var(--color-danger)]'
    : healthy
    ? 'border-[var(--color-success)]'
    : 'border-[var(--color-border)]'
  const textColor = warning
    ? 'text-[var(--color-danger)]'
    : healthy
    ? 'text-[var(--color-success)]'
    : 'text-[var(--color-primary)]'
  return (
    <div className={`bg-[var(--color-bg)] border rounded-lg px-4 py-3 text-center ${borderColor}`}>
      <div className={`text-2xl font-[var(--font-mono)] font-bold ${textColor}`}>{value}</div>
      <div className="text-[var(--color-muted)] text-xs mt-0.5">{label}</div>
    </div>
  )
}

function OverviewTab({ deck, analysis, onTabChange }) {
  if (!deck || !analysis) return <p className="text-[var(--color-muted)] text-sm">Loading deck data…</p>

  const manaCurveData = Object.entries(analysis.mana_curve || {})
    .map(([cmc, count]) => ({ cmc: cmc === '7' ? '7+' : cmc, count }))
    .sort((a, b) => parseInt(a.cmc) - parseInt(b.cmc))

  const cardTypes = analysis.card_types || {}

  return (
    <div className="space-y-6">
      {/* Deck verdict */}
      {analysis.verdict && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-primary)] border-opacity-40 rounded-lg px-4 py-3">
          <p className="text-[var(--color-text)] text-sm leading-relaxed">{analysis.verdict}</p>
        </div>
      )}

      {/* Differentiator callout */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => onTabChange?.('Strategy')}
          className="text-[var(--color-secondary)] text-xs border border-[var(--color-secondary)] border-opacity-40 rounded px-3 py-1.5 hover:bg-[var(--color-surface)] transition-colors"
        >
          AI Strategy Guide →
        </button>
        <button
          onClick={() => onTabChange?.('Collection Upgrades')}
          className="text-[var(--color-secondary)] text-xs border border-[var(--color-secondary)] border-opacity-40 rounded px-3 py-1.5 hover:bg-[var(--color-surface)] transition-colors"
        >
          Upgrade with Your Collection →
        </button>
      </div>

      {/* Commander */}
      <div>
        <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">
          {deck.partner ? 'Commanders' : 'Commander'}
        </h3>
        <p className="text-[var(--color-primary)] font-[var(--font-heading)] text-xl">
          {deck.commander?.name || 'Unknown'}
          {deck.partner?.name && ` & ${deck.partner.name}`}
        </p>
        <p className="text-[var(--color-muted)] text-sm mt-0.5">{deck.format} · {deck.name}</p>
      </div>

      {/* Key stats */}
      <div>
        <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Key Numbers</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-7">
          <StatBadge label="Cards" value={analysis.total_cards} />
          <StatBadge label="Avg CMC" value={typeof analysis.average_cmc === 'number' ? analysis.average_cmc.toFixed(2) : '—'} warning={analysis.average_cmc > 3.5} healthy={typeof analysis.average_cmc === 'number' && analysis.average_cmc <= 3.0} />
          <StatBadge label="Lands" value={cardTypes['Lands'] || 0} warning={(cardTypes['Lands'] || 0) < 36} healthy={(cardTypes['Lands'] || 0) >= 36} />
          <StatBadge label="Ramp" value={analysis.ramp_count || 0} warning={(analysis.ramp_count || 0) < 10} healthy={(analysis.ramp_count || 0) >= 10} />
          <StatBadge label="Draw" value={analysis.draw_count || 0} warning={(analysis.draw_count || 0) < 10} healthy={(analysis.draw_count || 0) >= 10} />
          <StatBadge label="Removal" value={analysis.removal_count || 0} warning={(analysis.removal_count || 0) < 8} healthy={(analysis.removal_count || 0) >= 8} />
          <StatBadge label="Wipes" value={analysis.board_wipe_count || 0} warning={(analysis.board_wipe_count || 0) < 2} healthy={(analysis.board_wipe_count || 0) >= 2} />
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
                  cursor={{ fill: 'rgba(251,191,36,0.08)' }}
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#fbbf24' }}
                  formatter={(value) => [value, 'Cards']}
                  labelFormatter={(label) => `CMC ${label}`}
                />
                {typeof analysis.average_cmc === 'number' && (
                  <ReferenceLine
                    x={String(Math.round(analysis.average_cmc))}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    label={{ value: `avg ${analysis.average_cmc.toFixed(1)}`, fill: '#94a3b8', fontSize: 10, position: 'top' }}
                  />
                )}
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
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
              <div key={type} className="flex justify-between items-center bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 hover:border-[var(--color-muted)]/60 transition-colors">
                <span className="text-[var(--color-muted)] text-sm">{type}</span>
                <span className="text-[var(--color-primary)] font-[var(--font-mono)] text-sm font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Themes */}
      {analysis.themes?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Themes</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.themes.map((t) => {
              const name = typeof t === 'string' ? t : t.name
              const count = typeof t === 'object' ? t.count : null
              const def = typeof t === 'object' && t.definition ? t.definition : THEME_DEFINITIONS[name]
              return (
                <span key={name} className="relative group">
                  <span className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] text-xs px-2.5 py-1 rounded-full cursor-help inline-block">
                    {name}{count != null ? ` (${count})` : ''}
                  </span>
                  {def && (
                    <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-52 bg-[#0f1d2e] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-xl shadow-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                      <span className="block text-[var(--color-secondary)] text-xs font-semibold mb-0.5">{name}</span>
                      <span className="block text-[var(--color-muted)] text-xs leading-relaxed">{def}</span>
                      <span className="absolute top-full left-4 -mt-px border-4 border-transparent border-t-[#0f1d2e]" />
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {analysis.weaknesses?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Identified Weaknesses</h3>
          <div className="space-y-2">
            {analysis.weaknesses.map((w, i) => {
              const label = typeof w === 'string' ? w : w.label
              const isStructured = typeof w === 'object' && w !== null
              return isStructured ? (
                <details key={i} className="group bg-[var(--color-bg)] border border-[var(--color-danger)] border-opacity-40 rounded-lg">
                  <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none text-[var(--color-danger)] text-sm select-none">
                    <IconWarning />
                    <span className="flex-1">{label}</span>
                    <span className="transition-transform group-open:rotate-180">
                      <IconChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--color-muted)]" />
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-1 space-y-2 border-t border-[var(--color-border)]">
                    <p className="text-[var(--color-muted)] text-sm">{w.why}</p>
                    <p className="text-[var(--color-text)] text-sm">
                      <span className="text-[var(--color-muted)] font-medium">Look for: </span>{w.look_for}
                    </p>
                    {w.examples?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {w.examples.map((ex) => (
                          <span key={ex} className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-xs px-2 py-0.5 rounded">
                            {ex}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ) : (
                <div key={i} className="flex items-center gap-2 text-[var(--color-danger)] text-sm px-1">
                  <IconWarning /><span>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AiSourceBadge({ aiEnhanced }) {
  if (aiEnhanced === null || aiEnhanced === undefined) return null
  return (
    <div className="flex items-center gap-1.5 mb-5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
        aiEnhanced ? 'bg-[var(--color-success)]' : 'bg-[var(--color-primary)]'
      }`} />
      <span className="text-[var(--color-muted)] text-xs">
        {aiEnhanced ? 'AI-generated analysis' : 'Rule-based analysis — AI quota unavailable'}
      </span>
    </div>
  )
}

function StrategyTab({ deckId }) {
  const [data, setData] = useState(null)
  const [aiEnhanced, setAiEnhanced] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getStrategy(deckId)
      .then((res) => {
        setData(res.strategy)
        setAiEnhanced(res.ai_enhanced ?? false)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [deckId])

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>
  if (!data) return null

  return (
    <div className="space-y-6">
      <AiSourceBadge aiEnhanced={aiEnhanced} />

      {/* Game Plan */}
      {data.game_plan && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
          <h3 className="text-[var(--color-primary)] font-[var(--font-heading)] text-sm uppercase tracking-wider mb-2">Game Plan</h3>
          <p className="text-[var(--color-text)] text-sm leading-relaxed">{data.game_plan}</p>
        </div>
      )}

      {/* Win Conditions */}
      {data.win_conditions?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Win Conditions</h3>
          <div className="space-y-2">
            {data.win_conditions.map((wc, i) => (
              <div key={i} className="flex items-start gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3">
                <IconCheck className="w-4 h-4 text-[var(--color-success)] mt-0.5 shrink-0" />
                <div>
                  <span className="text-[var(--color-text)] font-semibold text-sm">{wc.name}</span>
                  <p className="text-[var(--color-muted)] text-xs mt-0.5">{wc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Cards */}
      {data.key_cards?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Key Cards</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.key_cards.map((kc, i) => (
              <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3">
                <span className="text-[var(--color-primary)] font-semibold text-sm">{kc.name}</span>
                <p className="text-[var(--color-muted)] text-xs mt-0.5">{kc.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Phases */}
      {(data.early_game || data.mid_game || data.late_game) && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Game Phases</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {[['Early Game', data.early_game], ['Mid Game', data.mid_game], ['Late Game', data.late_game]].map(([label, text]) => text && (
              <div key={label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3">
                <p className="text-[var(--color-secondary)] text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[var(--color-text)] text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mulligan */}
      {data.mulligan && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Mulligan Strategy</h3>
          <p className="text-[var(--color-text)] text-sm leading-relaxed">{data.mulligan}</p>
        </div>
      )}

      {/* Matchup Tips */}
      {data.matchup_tips?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Matchup Tips</h3>
          <div className="space-y-2">
            {data.matchup_tips.map((tip, i) => (
              <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3">
                <span className="text-[var(--color-primary)] font-semibold text-sm">vs {tip.against}</span>
                <p className="text-[var(--color-muted)] text-xs mt-0.5">{tip.advice}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ImprovementsTab({ deckId }) {
  const [data, setData] = useState(null)
  const [aiEnhanced, setAiEnhanced] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  const MAX_VISIBLE = 5

  useEffect(() => {
    api.getImprovements(deckId)
      .then((res) => {
        setData(res.improvements)
        setAiEnhanced(res.ai_enhanced ?? false)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [deckId])

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>
  if (!data) return null

  const categoryColors = {
    ramp: 'text-green-400',
    draw: 'text-sky-400',
    removal: 'text-red-400',
    wipes: 'text-orange-400',
    lands: 'text-amber-400',
    synergy: 'text-purple-400',
    upgrade: 'text-sky-400',
  }

  const renderShowMore = (key, total) => {
    if (total <= MAX_VISIBLE) return null
    return (
      <button
        onClick={() => toggle(key)}
        className="text-[var(--color-secondary)] text-xs hover:underline mt-1"
      >
        {expanded[key] ? 'Show less' : `Show all ${total}`}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <AiSourceBadge aiEnhanced={aiEnhanced} />

      {/* Weakness Fixes — cards to ADD */}
      {data.urgent_fixes?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-danger)] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <IconWarning className="w-3.5 h-3.5" />
            Weakness Fixes
          </h3>
          <p className="text-[var(--color-muted)] text-xs mb-3">Cards to add that address critical gaps in your deck.</p>
          <div className="space-y-2">
            {(expanded['fixes'] ? data.urgent_fixes : data.urgent_fixes.slice(0, MAX_VISIBLE)).map((fix, i) => (
              <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-danger)]/30 rounded-lg px-4 py-3 flex items-start gap-3">
                <span className="text-[var(--color-success)] text-sm font-bold mt-0.5">+</span>
                <div className="flex-1">
                  <span className="text-[var(--color-text)] font-semibold text-sm">{fix.card}</span>
                  <span className={`ml-2 text-xs font-medium uppercase ${categoryColors[fix.category] || 'text-[var(--color-muted)]'}`}>
                    {fix.category}
                  </span>
                  <p className="text-[var(--color-muted)] text-xs mt-0.5">{fix.reason}</p>
                </div>
              </div>
            ))}
          </div>
          {renderShowMore('fixes', data.urgent_fixes.length)}
        </div>
      )}

      {/* Recommended Swaps — paired cut → add */}
      {data.swaps?.length > 0 && (
        <div>
          <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-1">Recommended Swaps</h3>
          <p className="text-[var(--color-muted)] text-xs mb-3">Paired cut → add recommendations to improve your deck.</p>
          <div className="space-y-2">
            {(expanded['swaps'] ? data.swaps : data.swaps.slice(0, MAX_VISIBLE)).map((swap, i) => (
              <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[var(--color-danger)] font-semibold text-sm">− {swap.cut}</span>
                  <span className="text-[var(--color-muted)] text-xs">→</span>
                  <span className="text-[var(--color-success)] font-semibold text-sm">+ {swap.add}</span>
                  {swap.owned && (
                    <span className="text-[var(--color-success)] text-xs">✓ owned</span>
                  )}
                  {swap.category && (
                    <span className={`text-[10px] font-medium uppercase ${categoryColors[swap.category] || 'text-[var(--color-muted)]'}`}>
                      {swap.category}
                    </span>
                  )}
                  {!swap.owned && swap.price_tier && (
                    <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${
                      swap.price_tier === 'budget' ? 'bg-green-400/10 text-green-400' : swap.price_tier === 'premium' ? 'bg-amber-400/10 text-amber-400' : 'bg-sky-400/10 text-sky-400'
                    }`}>
                      {swap.price_tier}
                    </span>
                  )}
                </div>
                <p className="text-[var(--color-muted)] text-xs mt-1">{swap.reason}</p>
              </div>
            ))}
          </div>
          {renderShowMore('swaps', data.swaps.length)}
        </div>
      )}

      {/* Cards to Add — unpaired additions, split by owned vs need to buy */}
      {data.additions?.length > 0 && (() => {
        const ownedCards = data.additions.filter(a => a.owned === true)
        const buyCards = data.additions.filter(a => !a.owned)
        return (
          <div>
            <h3 className="text-[var(--color-muted)] text-xs uppercase tracking-wider mb-3">Cards to Add</h3>

            {ownedCards.length > 0 && (
              <div className="mb-4">
                <p className="text-[var(--color-success)] text-xs font-semibold uppercase tracking-wider mb-1.5">In Your Collection</p>
                <div className="space-y-2">
                  {(expanded['additions_owned'] ? ownedCards : ownedCards.slice(0, MAX_VISIBLE)).map((add, i) => (
                    <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-success)]/20 rounded-lg px-4 py-3 flex items-start gap-3">
                      <span className="text-[var(--color-success)] text-sm font-bold">+</span>
                      <div className="flex-1">
                        <span className="text-[var(--color-text)] font-semibold text-sm">{add.card}</span>
                        <span className="ml-2 text-[var(--color-success)] text-xs">✓ owned</span>
                        <p className="text-[var(--color-muted)] text-xs mt-0.5">{add.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {renderShowMore('additions_owned', ownedCards.length)}
              </div>
            )}

            {buyCards.length > 0 && (
              <div>
                <p className="text-[var(--color-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Worth Acquiring</p>
                <div className="space-y-2">
                  {(expanded['additions_buy'] ? buyCards : buyCards.slice(0, MAX_VISIBLE)).map((add, i) => (
                    <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-start gap-3">
                      <span className="text-[var(--color-success)] text-sm font-bold">+</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text)] font-semibold text-sm">{add.card}</span>
                          {add.price_tier && (
                            <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${
                              add.price_tier === 'budget' ? 'bg-green-400/10 text-green-400' : add.price_tier === 'premium' ? 'bg-amber-400/10 text-amber-400' : 'bg-sky-400/10 text-sky-400'
                            }`}>
                              {add.price_tier}
                            </span>
                          )}
                        </div>
                        <p className="text-[var(--color-muted)] text-xs mt-0.5">{add.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {renderShowMore('additions_buy', buyCards.length)}
              </div>
            )}
          </div>
        )
      })()}

      {/* Empty state */}
      {!data.urgent_fixes?.length && !data.swaps?.length && !data.additions?.length && (
        <div className="flex flex-col items-center py-16 max-w-xs mx-auto gap-4">
          <IconCheck className="w-8 h-8 text-[var(--color-success)]" />
          <p className="text-[var(--color-text)] font-semibold text-sm">Deck looks solid!</p>
          <p className="text-[var(--color-muted)] text-xs text-center">No urgent improvements identified.</p>
        </div>
      )}
    </div>
  )
}

function CollectionUpgradesTab({ deckId }) {
  const [upgrades, setUpgrades] = useState(null)
  const [hasCollection, setHasCollection] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCollectionUpgrades(deckId)
      .then((data) => {
        setUpgrades(data.upgrades)
        setHasCollection(data.has_collection)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [deckId])

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>

  if (!hasCollection) {
    return (
      <div className="flex flex-col items-center py-16 max-w-xs mx-auto gap-4">
        <UpgradeIcon />
        <p className="text-[var(--color-text)] font-semibold text-sm">No collection uploaded</p>
        <p className="text-[var(--color-muted)] text-xs text-center">
          Upload your Moxfield collection CSV on the{' '}
          <Link to="/collection" className="text-[var(--color-secondary)] hover:underline">Collection page</Link>{' '}
          to see upgrade suggestions from cards you already own.
        </p>
      </div>
    )
  }

  if (!upgrades?.length) {
    return (
      <div className="flex flex-col items-center py-16 max-w-xs mx-auto gap-4">
        <IconCheck className="w-8 h-8 text-[var(--color-success)]" />
        <p className="text-[var(--color-text)] font-semibold text-sm">No upgrades found</p>
        <p className="text-[var(--color-muted)] text-xs text-center">
          Your collection doesn't have obvious upgrades for this deck based on its current weaknesses and themes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[var(--color-muted)] text-sm mb-4">
        {upgrades.length} card{upgrades.length !== 1 ? 's' : ''} from your collection could improve this deck.
      </p>
      {upgrades.map((u, i) => (
        <div
          key={i}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-5 py-4 flex items-start gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[var(--color-success)] font-semibold text-sm">+ {u.add}</span>
              {u.cut && (
                <>
                  <span className="text-[var(--color-muted)] text-xs">for</span>
                  <span className="text-[var(--color-danger)] font-semibold text-sm">− {u.cut}</span>
                </>
              )}
            </div>
            <p className="text-[var(--color-muted)] text-xs mt-1">{u.reason}</p>
          </div>
        </div>
      ))}
    </div>
  )
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
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[var(--color-success)] focus:shadow-[0_0_0_3px_rgba(52,211,153,0.12)] transition-all resize-none"
          />
        </div>
        <div>
          <label className="block text-[var(--color-muted)] text-xs uppercase tracking-wider mb-2">Cards to Remove (one per line)</label>
          <textarea
            value={removeInput}
            onChange={(e) => setRemoveInput(e.target.value)}
            placeholder={"Bad Card\nWeak Synergy"}
            rows={5}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[var(--color-danger)] focus:shadow-[0_0_0_3px_rgba(251,113,133,0.12)] transition-all resize-none"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading || (!addInput.trim() && !removeInput.trim())}
            className="bg-[var(--color-primary)] text-[var(--color-bg)] px-6 py-2 rounded-lg font-semibold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <ul className="space-y-1">{result.before.win_conditions.map((w, i) => <li key={i} className="text-[var(--color-text)] text-sm flex items-start gap-2"><IconCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-success)]" />{w}</li>)}</ul>
                </div>
              )}
              {result.before?.key_weaknesses?.length > 0 && (
                <div>
                  <p className="text-[var(--color-muted)] text-xs mb-1">Weaknesses</p>
                  <ul className="space-y-1">{result.before.key_weaknesses.map((w, i) => <li key={i} className="text-[var(--color-text)] text-sm flex items-start gap-2"><IconWarning className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-danger)]" />{w}</li>)}</ul>
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
                  <ul className="space-y-1">{result.after.win_conditions.map((w, i) => <li key={i} className="text-[var(--color-text)] text-sm flex items-start gap-2"><IconCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-success)]" />{w}</li>)}</ul>
                </div>
              )}
              {result.after?.key_weaknesses?.length > 0 && (
                <div>
                  <p className="text-[var(--color-muted)] text-xs mb-1">Weaknesses</p>
                  <ul className="space-y-1">{result.after.key_weaknesses.map((w, i) => <li key={i} className="text-[var(--color-text)] text-sm flex items-start gap-2"><IconWarning className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-danger)]" />{w}</li>)}</ul>
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
  const [isCached, setIsCached] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)

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
        setIsCached(analyzeResult.cached === true)
      })
      .catch((err) => setLoadError(err.message))
  }, [deckId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReanalyze = useCallback(() => {
    setReanalyzing(true)
    api.analyzeDeck(deckId, { force: true })
      .then((result) => {
        setAnalysis(result.analysis)
        setIsCached(false)
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setReanalyzing(false))
  }, [deckId])

  const deckName = deck?.name || deckId

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b border-[var(--color-border)] px-6 py-4 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors text-sm">
          <IconChevronLeft />
          Dashboard
        </Link>
        <h1 className="font-[var(--font-heading)] text-[var(--color-primary)] text-xl truncate">
          {deckName}
        </h1>
      </div>

      <div className="px-6 pt-0">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] pt-2">
          {TAB_CONFIG.map(({ label, icon: TabIcon }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === label
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <TabIcon />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-w-5xl py-6">
          {isCached && (
            <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[var(--color-muted)] text-sm">
                Showing cached results — deck hasn't changed on Moxfield.
              </span>
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="ml-auto text-xs font-medium px-3 py-1 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25 transition-colors disabled:opacity-50"
              >
                {reanalyzing ? 'Re-analyzing…' : 'Force Re-analyze'}
              </button>
            </div>
          )}
          {loadError && (
            <p className="text-[var(--color-danger)] text-sm">Failed to load deck: {loadError}</p>
          )}

          {activeTab === 'Overview' && (
            <OverviewTab deck={deck} analysis={analysis} onTabChange={setActiveTab} />
          )}

          {activeTab === 'Strategy' && (
            <StrategyTab deckId={deckId} />
          )}

          {activeTab === 'Improvements' && (
            <ImprovementsTab deckId={deckId} />
          )}

          {activeTab === 'Collection Upgrades' && (
            <CollectionUpgradesTab deckId={deckId} />
          )}

          {activeTab === 'Scenarios' && (
            <ScenariosTab deckId={deckId} />
          )}
        </div>
      </div>
    </div>
  )
}
