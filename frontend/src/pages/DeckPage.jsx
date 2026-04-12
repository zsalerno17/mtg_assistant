import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { api } from '../lib/api'
import CardTooltip from '../components/CardTooltip'

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
  { label: 'Collection Upgrades', icon: UpgradeIcon, mobileLabel: 'Upgrades' },
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
      elements.push(<h2 key={key++} className="text-[var(--color-primary)] font-heading text-lg mt-6 mb-2">{line.slice(3)}</h2>)
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

function StatBadge({ label, value }) {
  // Determine target thresholds based on label
  const targets = {
    'Lands': 37,
    'Ramp': 10,
    'Draw': 10,
    'Removal': 8,
    'Wipes': 2,
    'Avg CMC': 3.0,
  }
  
  const target = targets[label]
  const numValue = typeof value === 'number' ? value : parseFloat(value)
  
  // Calculate percentage for ring fill
  let percentage = 0
  let ringColor = 'text-[var(--color-border)]'
  
  if (target && !isNaN(numValue)) {
    if (label === 'Avg CMC') {
      // Inverted scale: lower CMC is better
      // Ring fills as CMC approaches 0; empty if ≥ 3.5
      if (numValue >= 3.5) {
        percentage = 0
        ringColor = 'text-rose-400'
      } else if (numValue <= 3.0) {
        percentage = 100
        ringColor = 'text-emerald-400'
      } else {
        // Between 3.0 and 3.5: map to 75-100%
        percentage = 100 - ((numValue - 3.0) / 0.5 * 25)
        ringColor = 'text-amber-400'
      }
    } else {
      // Normal scale: higher is better
      percentage = Math.min((numValue / target) * 100, 100)
      
      if (percentage >= 100) {
        ringColor = 'text-emerald-400'
      } else if (percentage >= 75) {
        ringColor = 'text-amber-400'
      } else {
        ringColor = 'text-rose-400'
      }
    }
  }
  
  // SVG circle calculations
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {/* Radial progress ring */}
      <div className="relative" style={{ width: '64px', height: '64px' }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width="64" height="64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-[var(--color-border)]/20"
          />
          {/* Progress circle */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className={`transition-all duration-500 ease-out ${ringColor}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        
        {/* Center value with fraction notation */}
        <div className="absolute inset-0 flex items-center justify-center">
          {target ? (
            <div className={`font-mono flex items-baseline ${ringColor}`}>
              <span className={label === 'Avg CMC' ? 'text-sm font-bold' : 'text-lg font-bold'}>{label === 'Avg CMC' ? numValue.toFixed(1) : value}</span>
              {label !== 'Cards' && (
                <>
                  <span className="text-[10px] text-[var(--color-muted)]">/</span>
                  <span className="text-[10px] text-[var(--color-muted)]">{label === 'Avg CMC' ? target.toFixed(1) : target}</span>
                </>
              )}
            </div>
          ) : (
            <span className={`text-lg font-mono font-bold ${ringColor}`}>{value}</span>
          )}
        </div>
      </div>
      
      {/* Label only */}
      <div className="text-center">
        <div className="text-[var(--color-text)] text-xs font-medium">{label}</div>
      </div>
    </div>
  )
}

const MANA_SYMBOL_IDS = new Set(['W', 'U', 'B', 'R', 'G', 'C'])

function ColorPips({ colors, size = '1.25rem' }) {
  if (!colors?.length) return null
  return (
    <div className="flex gap-[5px] items-center">
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

function SectionLabel({ children, className = '' }) {
  return (
    <h3 className={`font-heading text-[var(--color-muted)] text-[10px] uppercase tracking-widest mb-2 ${className}`}>
      {children}
    </h3>
  )
}

function CommanderImage({ name }) {
  const [error, setError] = useState(false)
  if (!name || error) return null
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image`
  return (
    <div
      className="shrink-0 rounded-[7px] p-px shadow-lg shadow-amber-500/20"
      style={{ background: 'linear-gradient(145deg, rgba(251,191,36,0.55) 0%, rgba(180,130,18,0.25) 50%, rgba(251,191,36,0.4) 100%)' }}
    >
      <img
        src={url}
        alt={name}
        onError={() => setError(true)}
        loading="lazy"
        className="rounded-[6px] block object-cover"
        style={{ width: 72, height: 100 }}
      />
    </div>
  )
}

function OverviewTab({ deck, analysis, onTabChange }) {
  if (!deck || !analysis) return <p className="text-[var(--color-muted)] text-sm">Loading deck data…</p>

  const manaCurveData = Object.entries(analysis.mana_curve || {})
    .map(([cmc, count]) => ({ cmc: cmc === '7' ? '7+' : cmc, count }))
    .sort((a, b) => parseInt(a.cmc) - parseInt(b.cmc))

  const cardTypes = analysis.card_types || {}
  // Derive color identity from commanders if available
  const commanderColors = [
    ...(deck.commander?.color_identity || []),
    ...(deck.partner?.color_identity || []),
  ]

  return (
    <div className="space-y-6">

      {/* ── Commander Hero ── */}
      <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-primary)]/20 rounded-xl px-6 py-5 hover:border-[var(--color-primary)]/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200">
        <SectionLabel>{deck.partner ? 'Commanders' : 'Commander'}</SectionLabel>
        <div className="flex items-center gap-5 mt-1">
          {/* Card image(s) */}
          <div className="flex gap-2 shrink-0">
            <CommanderImage name={deck.commander?.name} />
            {deck.partner?.name && <CommanderImage name={deck.partner.name} />}
          </div>
          {/* Text info */}
          <div>
            <p className="text-[var(--color-primary)] font-brand text-2xl leading-snug">
              {deck.commander?.name || 'Unknown'}
              {deck.partner?.name && (
                <span className="text-[var(--color-muted)] font-normal"> &amp; </span>
              )}
              {deck.partner?.name && (
                <span className="text-[var(--color-primary)]">{deck.partner.name}</span>
              )}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {commanderColors.length > 0 && <ColorPips colors={commanderColors} />}
              <span className="text-[var(--color-muted)] text-sm font-heading">{deck.format} · {deck.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Deck Verdict ── */}
      {analysis.verdict && (
        <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-5 py-4 hover:border-[var(--color-border)]/80 transition-border">
          <p className="text-[var(--color-text)] text-sm leading-relaxed font-body">{analysis.verdict}</p>
        </div>
      )}

      {/* ── Key Stats ── */}
      <div>
        <SectionLabel className="mb-3">Key Numbers</SectionLabel>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          <StatBadge label="Cards" value={analysis.total_cards} />
          <StatBadge label="Avg CMC" value={typeof analysis.average_cmc === 'number' ? analysis.average_cmc.toFixed(2) : '—'} />
          <StatBadge label="Lands" value={cardTypes['Lands'] || 0} />
          <StatBadge label="Ramp" value={analysis.ramp_count || 0} />
          <StatBadge label="Draw" value={analysis.draw_count || 0} />
          <StatBadge label="Removal" value={analysis.removal_count || 0} />
          <StatBadge label="Wipes" value={analysis.board_wipe_count || 0} />
        </div>
      </div>

      {/* ── Weaknesses (moved up — key differentiator) ── */}
      {analysis.weaknesses?.length > 0 && (
        <div>
          <SectionLabel className="mb-3 text-[var(--color-danger)]">
            <span className="flex items-center gap-1.5">
              <IconWarning className="w-3 h-3" />
              Identified Weaknesses
            </span>
          </SectionLabel>
          <div className="space-y-2">
            {analysis.weaknesses.map((w, i) => {
              const label = typeof w === 'string' ? w : w.label
              const isStructured = typeof w === 'object' && w !== null
              return isStructured ? (
                <details key={i} className="group bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-danger)]/35 rounded-xl hover:border-[var(--color-danger)]/60 transition-colors">
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
                          <CardTooltip key={ex} cardName={ex}>
                            <span className="bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-xs px-2 py-0.5 rounded cursor-help hover:border-[var(--color-secondary)]/40 transition-colors">
                              {ex}
                            </span>
                          </CardTooltip>
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

      {/* ── Themes ── */}
      {analysis.themes?.length > 0 && (
        <div>
          <SectionLabel className="mb-2">Themes</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {analysis.themes.map((t) => {
              const name = typeof t === 'string' ? t : t.name
              const count = typeof t === 'object' ? t.count : null
              const def = typeof t === 'object' && t.definition ? t.definition : THEME_DEFINITIONS[name]
              return (
                <span key={name} className="relative group">
                  <span className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] text-xs px-2.5 py-1 rounded-full cursor-help inline-block hover:border-[var(--color-secondary)]/50 transition-colors font-body">
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

      {/* ── Mana Curve ── */}
      {manaCurveData.length > 0 && (
        <div>
          <SectionLabel className="mb-3">Mana Curve</SectionLabel>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
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

      {/* ── Card Types ── */}
      <div>
        <SectionLabel className="mb-3">Card Types</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(cardTypes).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-lg px-3 py-2 hover:border-[var(--color-muted)]/60 hover:-translate-y-0.5 transition-all duration-150">
              <span className="text-[var(--color-muted)] text-sm">{type}</span>
              <span className="text-[var(--color-primary)] font-mono text-sm font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── What else can you do? (Differentiator section) ── */}
      <div className="border-t border-[var(--color-border)] pt-5">
        <SectionLabel className="mb-3">Explore Further</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => onTabChange?.('Strategy')}
            className="text-left bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-secondary)]/20 rounded-xl px-4 py-3 hover:border-[var(--color-secondary)]/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-200"
          >
            <p className="text-[var(--color-secondary)] font-semibold text-sm">AI Strategy Guide →</p>
            <p className="text-[var(--color-muted)] text-xs mt-0.5">Game plan, win conditions, mulligan advice, matchup tips</p>
          </button>
          <button
            onClick={() => onTabChange?.('Collection Upgrades')}
            className="text-left bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-success)]/20 rounded-xl px-4 py-3 hover:border-[var(--color-success)]/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-200"
          >
            <p className="text-[var(--color-success)] font-semibold text-sm">Upgrade with Your Collection →</p>
            <p className="text-[var(--color-muted)] text-xs mt-0.5">Cards you already own that would strengthen this deck</p>
          </button>
        </div>
      </div>

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
        <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-5">
          <SectionLabel className="mb-2 text-[var(--color-primary)]">{/* Cinzel amber for featured section */}Game Plan</SectionLabel>
          <p className="text-[var(--color-text)] text-sm leading-relaxed">{data.game_plan}</p>
        </div>
      )}

      {/* Win Conditions */}
      {data.win_conditions?.length > 0 && (
        <div>
          <SectionLabel className="mb-3">Win Conditions</SectionLabel>
          <div className="space-y-2">
            {data.win_conditions.map((wc, i) => (
              <div key={i} className="flex items-start gap-2 bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-4 py-3 hover:border-[var(--color-border)]/80 hover:-translate-y-0.5 transition-all duration-150">
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
          <SectionLabel className="mb-3">Key Cards</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.key_cards.map((kc, i) => (
              <div key={i} className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-4 py-3 hover:border-[var(--color-border)]/80 hover:-translate-y-0.5 transition-all duration-150">
                <span className="text-[var(--color-primary)] font-semibold text-sm"><CardTooltip cardName={kc.name}>{kc.name}</CardTooltip></span>
                <p className="text-[var(--color-muted)] text-xs mt-0.5">{kc.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Phases */}
      {(data.early_game || data.mid_game || data.late_game) && (
        <div>
          <SectionLabel className="mb-3">Game Phases</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            {[['Early Game', data.early_game], ['Mid Game', data.mid_game], ['Late Game', data.late_game]].map(([label, text]) => text && (
              <div key={label} className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-4 py-3">
                <p className="text-[var(--color-secondary)] font-heading text-[10px] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[var(--color-text)] text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mulligan */}
      {data.mulligan && (
        <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-5">
          <SectionLabel className="mb-2">Mulligan Strategy</SectionLabel>
          <p className="text-[var(--color-text)] text-sm leading-relaxed">{data.mulligan}</p>
        </div>
      )}

      {/* Matchup Tips */}
      {data.matchup_tips?.length > 0 && (
        <div>
          <SectionLabel className="mb-3">Matchup Tips</SectionLabel>
          <div className="space-y-2">
            {data.matchup_tips.map((tip, i) => (
              <div key={i} className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-4 py-3 hover:border-[var(--color-border)]/80 hover:-translate-y-0.5 transition-all duration-150">
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
          <h3 className="font-heading text-[var(--color-danger)] text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <IconWarning className="w-3.5 h-3.5" />
            Weakness Fixes
          </h3>
          <p className="text-[var(--color-muted)] text-xs mb-3">Cards to add that address critical gaps in your deck.</p>
          <div className="space-y-2">
            {(expanded['fixes'] ? data.urgent_fixes : data.urgent_fixes.slice(0, MAX_VISIBLE)).map((fix, i) => (
              <div key={i} className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-danger)]/30 rounded-xl px-4 py-3 flex items-start gap-3 hover:border-[var(--color-danger)]/50 hover:-translate-y-0.5 transition-all duration-150">
                <span className="text-[var(--color-success)] text-sm font-bold mt-0.5">+</span>
                <div className="flex-1">
                  <span className="text-[var(--color-text)] font-semibold text-sm"><CardTooltip cardName={fix.card}>{fix.card}</CardTooltip></span>
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
          <SectionLabel className="mb-1">Recommended Swaps</SectionLabel>
          <p className="text-[var(--color-muted)] text-xs mb-3">Paired cut → add recommendations to improve your deck.</p>
          <div className="space-y-2">
            {(expanded['swaps'] ? data.swaps : data.swaps.slice(0, MAX_VISIBLE)).map((swap, i) => (
              <div key={i} className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-4 py-3 hover:border-[var(--color-border)]/80 hover:-translate-y-0.5 transition-all duration-150">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[var(--color-danger)] font-semibold text-sm">− <CardTooltip cardName={swap.cut}>{swap.cut}</CardTooltip></span>
                  <span className="text-[var(--color-muted)] text-xs">→</span>
                  <span className="text-[var(--color-success)] font-semibold text-sm">+ <CardTooltip cardName={swap.add}>{swap.add}</CardTooltip></span>
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
            <SectionLabel className="mb-3">Cards to Add</SectionLabel>

            {ownedCards.length > 0 && (
              <div className="mb-4">
                <p className="font-heading text-[var(--color-success)] text-[10px] font-semibold uppercase tracking-widest mb-1.5">In Your Collection</p>
                <div className="space-y-2">
                  {(expanded['additions_owned'] ? ownedCards : ownedCards.slice(0, MAX_VISIBLE)).map((add, i) => (
                    <div key={i} className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-success)]/20 rounded-xl px-4 py-3 flex items-start gap-3 hover:-translate-y-0.5 transition-all duration-150">
                      <span className="text-[var(--color-success)] text-sm font-bold">+</span>
                      <div className="flex-1">
                        <span className="text-[var(--color-text)] font-semibold text-sm"><CardTooltip cardName={add.card}>{add.card}</CardTooltip></span>
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
                <p className="font-heading text-[var(--color-muted)] text-[10px] font-semibold uppercase tracking-widest mb-1.5">Worth Acquiring</p>
                <div className="space-y-2">
                  {(expanded['additions_buy'] ? buyCards : buyCards.slice(0, MAX_VISIBLE)).map((add, i) => (
                    <div key={i} className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-4 py-3 flex items-start gap-3 hover:-translate-y-0.5 transition-all duration-150">
                      <span className="text-[var(--color-success)] text-sm font-bold">+</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text)] font-semibold text-sm"><CardTooltip cardName={add.card}>{add.card}</CardTooltip></span>
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
        // Deduplicate upgrades based on (cut, add) pair
        const seen = new Set()
        const uniqueUpgrades = (data.upgrades || []).filter(u => {
          const key = `${u.cut || 'none'}::${u.add}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        
        // Group by card to cut for better UX when showing multiple options
        const grouped = {}
        uniqueUpgrades.forEach(u => {
          const cutKey = u.cut || '_no_cut'
          if (!grouped[cutKey]) grouped[cutKey] = []
          grouped[cutKey].push(u)
        })
        
        setUpgrades({ raw: uniqueUpgrades, grouped })
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

  if (!upgrades?.raw?.length) {
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
    <div className="space-y-4">
      <p className="text-[var(--color-muted)] text-sm mb-4">
        {upgrades.raw.length} upgrade{upgrades.raw.length !== 1 ? 's' : ''} from your collection.
      </p>
      {Object.entries(upgrades.grouped).map(([cutKey, options]) => {
        const hasCut = cutKey !== '_no_cut'
        const multipleOptions = options.length > 1
        
        // Sort options by score (if available) descending
        const sortedOptions = [...options].sort((a, b) => (b.score || 0) - (a.score || 0))
        
        return (
          <div key={cutKey} className="space-y-2">
            {hasCut && multipleOptions && (
              <p className="text-[var(--color-muted)] text-xs font-semibold">
                {options.length} options for replacing <CardTooltip cardName={options[0].cut}>{options[0].cut}</CardTooltip> (sorted by quality):
              </p>
            )}
            {sortedOptions.map((u, i) => (
              <div
                key={i}
                className={`bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-5 py-4 flex items-start gap-4 hover:border-[var(--color-border)]/80 hover:-translate-y-0.5 transition-all duration-150 ${
                  multipleOptions && hasCut ? 'ml-4' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[var(--color-success)] font-semibold text-sm">+ <CardTooltip cardName={u.add}>{u.add}</CardTooltip></span>
                    {u.cut && (
                      <>
                        <span className="text-[var(--color-muted)] text-xs">for</span>
                        <span className="text-[var(--color-danger)] font-semibold text-sm">− <CardTooltip cardName={u.cut}>{u.cut}</CardTooltip></span>
                      </>
                    )}
                  </div>
                  <p className="text-[var(--color-muted)] text-xs mt-1">{u.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ScenariosTab({ deckId, deck, analysis }) {
  // Selected cards (arrays of card names)
  const [cardsToAdd, setCardsToAdd] = useState([])
  const [cardsToRemove, setCardsToRemove] = useState([])
  
  // UI state
  const [removeSearchTerm, setRemoveSearchTerm] = useState('')
  const [customAddInput, setCustomAddInput] = useState('') // for manual entry
  const [showCustomAdd, setShowCustomAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [aiEnhanced, setAiEnhanced] = useState(false)

  // Load improvements data for suggestions
  const [improvements, setImprovements] = useState(null)
  const [collectionUpgrades, setCollectionUpgrades] = useState(null)
  
  useEffect(() => {
    api.getImprovements(deckId)
      .then((res) => setImprovements(res.improvements))
      .catch(() => {}) // Silent fail — suggestions are optional
  }, [deckId])
  
  useEffect(() => {
    api.getCollectionUpgrades(deckId)
      .then((res) => setCollectionUpgrades(res.upgrades || []))
      .catch(() => {}) // Silent fail — suggestions are optional
  }, [deckId])

  // Build list of suggestions from improvements + collection upgrades
  const suggestions = (() => {
    const items = []
    const seenSwaps = new Set() // Track "cut::add" pairs
    const seenAdds = new Set()  // Track all added card names
    
    // Helper to check/add swap
    const tryAddSwap = (cut, add, category, owned) => {
      const swapKey = `${cut}::${add}`
      if (!seenSwaps.has(swapKey) && !seenAdds.has(add)) {
        seenSwaps.add(swapKey)
        seenAdds.add(add)
        items.push({ type: 'swap', cut, add, category, owned })
        return true
      }
      return false
    }
    
    // Helper to check/add addition
    const tryAddAddition = (card, category, owned) => {
      if (!seenAdds.has(card)) {
        seenAdds.add(card)
        items.push({ type: 'addition', card, category, owned })
        return true
      }
      return false
    }
    
    // Prioritize collection upgrades (cards you already own)
    if (collectionUpgrades) {
      collectionUpgrades.forEach(u => {
        if (items.length >= 12) return
        if (u.cut) {
          tryAddSwap(u.cut, u.add, 'collection', true)
        } else {
          tryAddAddition(u.add, 'collection', true)
        }
      })
    }
    
    // Then add AI improvements (may include cards to buy)
    if (improvements && items.length < 12) {
      // Add swaps (paired cut → add)
      ;(improvements.swaps || []).forEach(swap => {
        if (items.length >= 12) return
        tryAddSwap(swap.cut, swap.add, swap.category, swap.owned)
      })
      
      // Add pure additions (urgent fixes + additions)
      ;(improvements.urgent_fixes || []).forEach(fix => {
        if (items.length >= 12) return
        tryAddAddition(fix.card, fix.category, fix.owned)
      })
      ;(improvements.additions || []).forEach(add => {
        if (items.length >= 12) return
        tryAddAddition(add.card, add.category || 'general', add.owned)
      })
    }
    
    return items
  })()

  // Build searchable deck card list from mainboard
  const deckCards = (deck?.mainboard || [])
    .map(c => c.name)
    .filter(name => {
      const term = removeSearchTerm.toLowerCase()
      return !term || name.toLowerCase().includes(term)
    })
    .filter(name => !cardsToRemove.includes(name)) // hide already selected
    .slice(0, 8) // show max 8 results at a time

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cardsToAdd.length === 0 && cardsToRemove.length === 0) return

    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await api.getScenarios(deckId, cardsToAdd, cardsToRemove)
      setResult(data.scenarios)
      setAiEnhanced(data.ai_enhanced ?? true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSuggestion = (suggestion) => {
    if (suggestion.type === 'swap') {
      // Toggle both cut and add for swaps
      const hasAdd = cardsToAdd.includes(suggestion.add)
      const hasCut = cardsToRemove.includes(suggestion.cut)
      const isActive = hasAdd && hasCut
      
      if (isActive) {
        // Remove both
        setCardsToAdd(prev => prev.filter(c => c !== suggestion.add))
        setCardsToRemove(prev => prev.filter(c => c !== suggestion.cut))
      } else {
        // Add both
        setCardsToAdd(prev => prev.includes(suggestion.add) ? prev : [...prev, suggestion.add])
        setCardsToRemove(prev => prev.includes(suggestion.cut) ? prev : [...prev, suggestion.cut])
      }
    } else {
      // Toggle just the add for pure additions
      const cardName = suggestion.card
      if (cardsToAdd.includes(cardName)) {
        setCardsToAdd(prev => prev.filter(c => c !== cardName))
      } else {
        setCardsToAdd(prev => [...prev, cardName])
      }
    }
  }

  const isSuggestionActive = (suggestion) => {
    if (suggestion.type === 'swap') {
      return cardsToAdd.includes(suggestion.add) && cardsToRemove.includes(suggestion.cut)
    } else {
      return cardsToAdd.includes(suggestion.card)
    }
  }

  const addRemoveCard = (cardName) => {
    if (!cardsToRemove.includes(cardName)) {
      setCardsToRemove(prev => [...prev, cardName])
    }
    setRemoveSearchTerm('') // clear search after selecting
  }

  const removeCardFromList = (cardName, list) => {
    if (list === 'add') {
      setCardsToAdd(prev => prev.filter(c => c !== cardName))
    } else {
      setCardsToRemove(prev => prev.filter(c => c !== cardName))
    }
  }

  const addCustomCards = () => {
    const cards = customAddInput.split('\n').map(s => s.trim()).filter(Boolean)
    setCardsToAdd(prev => [...new Set([...prev, ...cards])]) // dedupe
    setCustomAddInput('')
    setShowCustomAdd(false)
  }

  const STAT_ROWS = [
    { key: 'land_count', label: 'Mana Sources' },
    { key: 'ramp_count', label: 'Ramp' },
    { key: 'draw_count', label: 'Card Draw' },
    { key: 'avg_cmc',    label: 'Avg CMC' },
  ]

  const DeltaCell = ({ v, isFloat }) => {
    if (v === 0) return <span className="text-[var(--color-muted)]">—</span>
    const pos = v > 0
    const color = isFloat
      ? (pos ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]')
      : (pos ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')
    return (
      <span className={`font-semibold ${color}`}>
        {pos ? '+' : ''}{isFloat ? v.toFixed(2) : v}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Suggestions & Cards to Add */}
        <div className="space-y-3">
          <label className="block text-[var(--color-muted)] text-xs uppercase tracking-wider">Suggested Changes</label>
          
          {/* Suggestions from Improvements */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-[var(--color-muted)] text-xs mb-2">Quick-pick from Improvements:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => {
                  const isActive = isSuggestionActive(suggestion)
                  const isSwap = suggestion.type === 'swap'
                  
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleSuggestion(suggestion)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                        isActive
                          ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      {isActive && '✓ '}
                      {isSwap ? (
                        <span>
                          <span className="text-[var(--color-danger)]">− <CardTooltip cardName={suggestion.cut}>{suggestion.cut}</CardTooltip></span>
                          <span className="text-[var(--color-muted)] mx-1">→</span>
                          <span className="text-[var(--color-success)]">+ <CardTooltip cardName={suggestion.add}>{suggestion.add}</CardTooltip></span>
                        </span>
                      ) : (
                        <span>+ <CardTooltip cardName={suggestion.card}>{suggestion.card}</CardTooltip></span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Custom add button */}
          {!showCustomAdd && (
            <button
              type="button"
              onClick={() => setShowCustomAdd(true)}
              className="text-[var(--color-secondary)] text-sm hover:underline"
            >
              + Add custom card(s)
            </button>
          )}

          {/* Custom add textarea */}
          {showCustomAdd && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 space-y-2">
              <textarea
                value={customAddInput}
                onChange={(e) => setCustomAddInput(e.target.value)}
                placeholder="Type card names (one per line)"
                rows={3}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[var(--color-success)] resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addCustomCards}
                  disabled={!customAddInput.trim()}
                  className="text-[var(--color-success)] text-sm font-semibold hover:underline disabled:opacity-50"
                >
                  Add Cards
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCustomAdd(false); setCustomAddInput('') }}
                  className="text-[var(--color-muted)] text-sm hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Selected cards to add - chips */}
          {cardsToAdd.length > 0 && (
            <div className="bg-[var(--color-bg)] border border-[var(--color-success)]/30 rounded-lg p-3">
              <p className="text-[var(--color-success)] text-xs font-semibold mb-2">Selected ({cardsToAdd.length}):</p>
              <div className="flex flex-wrap gap-2">
                {cardsToAdd.map(cardName => (
                  <div key={cardName} className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/40 rounded-md px-2 py-1 text-sm text-[var(--color-text)] flex items-center gap-1.5">
                    <span>+ <CardTooltip cardName={cardName}>{cardName}</CardTooltip></span>
                    <button
                      type="button"
                      onClick={() => removeCardFromList(cardName, 'add')}
                      className="text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 text-xs font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cards to Remove */}
        <div className="space-y-3">
          <label className="block text-[var(--color-muted)] text-xs uppercase tracking-wider">Cards to Remove</label>
          
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              value={removeSearchTerm}
              onChange={(e) => setRemoveSearchTerm(e.target.value)}
              placeholder="Search your deck..."
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[var(--color-danger)] focus:shadow-[0_0_0_3px_rgba(251,113,133,0.12)] transition-all"
            />
          </div>

          {/* Deck card results */}
          {removeSearchTerm && deckCards.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg max-h-48 overflow-y-auto">
              {deckCards.map(cardName => (
                <button
                  key={cardName}
                  type="button"
                  onClick={() => addRemoveCard(cardName)}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] border-b border-[var(--color-border)] last:border-0"
                >
                  <CardTooltip cardName={cardName}>{cardName}</CardTooltip>
                </button>
              ))}
            </div>
          )}

          {removeSearchTerm && deckCards.length === 0 && (
            <p className="text-[var(--color-muted)] text-xs">No cards found</p>
          )}

          {/* Selected cards to remove - chips */}
          {cardsToRemove.length > 0 && (
            <div className="bg-[var(--color-bg)] border border-[var(--color-danger)]/30 rounded-lg p-3">
              <p className="text-[var(--color-danger)] text-xs font-semibold mb-2">Selected ({cardsToRemove.length}):</p>
              <div className="flex flex-wrap gap-2">
                {cardsToRemove.map(cardName => (
                  <div key={cardName} className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/40 rounded-md px-2 py-1 text-sm text-[var(--color-text)] flex items-center gap-1.5">
                    <span>− <CardTooltip cardName={cardName}>{cardName}</CardTooltip></span>
                    <button
                      type="button"
                      onClick={() => removeCardFromList(cardName, 'remove')}
                      className="text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 text-xs font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={loading || (cardsToAdd.length === 0 && cardsToRemove.length === 0)}
            className="bg-[var(--color-primary)] text-[var(--color-bg)] px-6 py-2 rounded-lg font-semibold tracking-wide hover:brightness-110 hover:shadow-[0_0_20px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing…' : 'Run Simulation'}
          </button>
          {error && <p className="mt-2 text-[var(--color-danger)] text-sm">{error}</p>}
        </div>
      </form>

      {loading && <LoadingSpinner />}

      {/* Rule-based stat diff table (AI unavailable) */}
      {result && !aiEnhanced && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-muted)] shrink-0" />
            <span className="text-[var(--color-muted)] text-xs">Rule-based analysis — AI unavailable</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="text-left px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold w-1/3">Stat</th>
                  <th className="text-center px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">Before</th>
                  <th className="text-center px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">After</th>
                  <th className="text-center px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">Δ</th>
                </tr>
              </thead>
              <tbody>
                {STAT_ROWS.map(({ key, label }) => {
                  const isFloat = key === 'avg_cmc'
                  const before = result.before?.[key] ?? 0
                  const after  = result.after?.[key]  ?? 0
                  const delta  = result.delta?.[key]  ?? 0
                  const changed = delta !== 0
                  return (
                    <tr
                      key={key}
                      className={`border-b border-[var(--color-border)] last:border-0 ${changed ? 'bg-amber-500/5' : ''}`}
                    >
                      <td className="px-4 py-3 text-[var(--color-text)]">{label}</td>
                      <td className="px-4 py-3 text-center text-[var(--color-muted)]">
                        {isFloat ? before.toFixed(2) : before}
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--color-text)] font-medium">
                        {isFloat ? after.toFixed(2) : after}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DeltaCell v={delta} isFloat={isFloat} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {result.verdict && (
            <p className="text-[var(--color-text)] text-sm border-l-2 border-[var(--color-primary)] pl-3">{result.verdict}</p>
          )}
        </div>
      )}

      {/* AI prose before/after (AI available) */}
      {result && aiEnhanced && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />
            <span className="text-[var(--color-muted)] text-xs">AI-enhanced analysis</span>
          </div>

          {/* Summary of Changes - hero section with bullet points */}
          {result.after?.changes_summary && (
            <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl p-5">
              <h3 className="font-heading text-[var(--color-primary)] text-xs font-semibold uppercase tracking-widest mb-3">Impact Summary</h3>
              <ul className="space-y-2">
                {result.after.changes_summary
                  .split(/\.\s+/)
                  .filter(s => s.trim().length > 0)
                  .slice(0, 4)
                  .map((point, i) => (
                    <li key={i} className="text-[var(--color-text)] text-sm flex items-start gap-2">
                      <span className="text-[var(--color-primary)] text-lg leading-none mt-0.5">•</span>
                      <span>{point.trim()}{point.trim().endsWith('.') ? '' : '.'}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* New Win Conditions */}
            {(() => {
              const beforeWins = new Set(result.before?.win_conditions || [])
              const newWins = (result.after?.win_conditions || []).filter(w => !beforeWins.has(w))
              if (newWins.length === 0) return null
              return (
                <div className="bg-[var(--color-success)]/5 border border-[var(--color-success)]/20 rounded-xl p-4">
                  <h3 className="font-heading text-[var(--color-success)] text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5" />
                    New Win Conditions
                  </h3>
                  <ul className="space-y-2">
                    {newWins.map((w, i) => (
                      <li key={i} className="text-[var(--color-text)] text-sm flex items-start gap-2">
                        <span className="text-[var(--color-success)] text-lg leading-none mt-0.5">+</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}

            {/* Consolidated Weaknesses - one source of truth */}
            {(() => {
              const beforeWeaknesses = new Set(result.before?.key_weaknesses || [])
              const afterWeaknesses = new Set(result.after?.key_weaknesses || [])
              const resolved = (result.before?.key_weaknesses || []).filter(w => !afterWeaknesses.has(w))
              const newWeaknesses = (result.after?.key_weaknesses || []).filter(w => !beforeWeaknesses.has(w))
              const unchanged = (result.before?.key_weaknesses || []).filter(w => afterWeaknesses.has(w))
              
              if (resolved.length === 0 && newWeaknesses.length === 0 && unchanged.length === 0) return null
              
              return (
                <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4">
                  <h3 className="font-heading text-[var(--color-text)] text-[10px] font-semibold uppercase tracking-widest mb-3">
                    Weaknesses
                  </h3>
                  <ul className="space-y-2">
                    {resolved.map((w, i) => (
                      <li key={`resolved-${i}`} className="text-[var(--color-muted)] text-sm flex items-start gap-2 line-through decoration-[var(--color-success)]">
                        <span className="text-[var(--color-success)] text-lg leading-none mt-0.5">✓</span>
                        <span>{w}</span>
                      </li>
                    ))}
                    {newWeaknesses.map((w, i) => (
                      <li key={`new-${i}`} className="text-[var(--color-text)] text-sm flex items-start gap-2">
                        <span className="text-[var(--color-danger)] text-lg leading-none mt-0.5">!</span>
                        <span>{w}</span>
                      </li>
                    ))}
                    {unchanged.map((w, i) => (
                      <li key={`unchanged-${i}`} className="text-[var(--color-muted)] text-sm flex items-start gap-2">
                        <span className="text-[var(--color-muted)] text-lg leading-none mt-0.5">−</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}
          </div>

          {/* Strategy comparison - collapsible */}
          {result.before?.game_plan && result.after?.game_plan && (
            <details className="bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-xl p-4">
              <summary className="font-heading text-[var(--color-muted)] text-xs font-semibold uppercase tracking-widest cursor-pointer hover:text-[var(--color-text)] transition-colors">
                Strategy Comparison (click to expand)
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[var(--color-muted)] text-xs mb-1.5">Before</p>
                  <p className="text-[var(--color-muted)] text-sm leading-relaxed">{result.before.game_plan}</p>
                </div>
                <div>
                  <p className="text-[var(--color-secondary)] text-xs mb-1.5">After</p>
                  <p className="text-[var(--color-text)] text-sm leading-relaxed">{result.after.game_plan}</p>
                </div>
              </div>
            </details>
          )}
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
      <div className="border-b border-[var(--color-border)]">
      <div className="max-w-[1600px] mx-auto px-8 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors text-sm shrink-0">
          <IconChevronLeft />
          Dashboard
        </Link>
        <div className="min-w-0">
          <h1 className="font-brand text-[var(--color-primary)] text-xl truncate leading-tight">
            {deckName}
          </h1>
          {analysis?.colors?.length > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <ColorPips colors={analysis.colors} size="0.9rem" />
              {analysis.commander && (
                <span className="text-[var(--color-muted)] text-xs truncate font-heading">{analysis.commander}</span>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 pt-0">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] pt-2">
          {TAB_CONFIG.map(({ label, icon: TabIcon, mobileLabel }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-heading whitespace-nowrap border-b-2 transition-colors active:scale-[0.97] ${
                activeTab === label
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <TabIcon />
              {mobileLabel ? (
                <>
                  <span className="sm:hidden">{mobileLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </>
              ) : label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div key={activeTab} className="max-w-5xl py-8 tab-content">
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
            <ScenariosTab deckId={deckId} deck={deck} analysis={analysis} />
          )}
        </div>
      </div>
    </div>
  )
}
