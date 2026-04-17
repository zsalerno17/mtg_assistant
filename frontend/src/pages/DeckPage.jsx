import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useParams, useLocation, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList, CartesianGrid, PieChart, Pie, RadialBarChart, RadialBar, Legend } from 'recharts'
import { api } from '../lib/api'
import CardTooltip from '../components/CardTooltip'
import PageTransition from '../components/PageTransition'
import TagTooltip from '../components/TagTooltip'
import EmptyState from '../components/EmptyState'
import CardRecommendation from '../components/CardRecommendation'
import LoadingSpinner from '../components/LoadingSpinner'
import { useDataFetch } from '../hooks/useDataFetch'
import { useExpandable } from '../hooks/useExpandable'
import { CATEGORY_COLORS, CATEGORY_TOOLTIPS, PRICE_TIER_COLORS, PRICE_TIER_TOOLTIPS } from '../constants/improvementMaps'
import { LayoutGrid, ArrowUp, ScrollText, TrendingUp, MessageSquare, AlertTriangle, Check, ChevronDown, ChevronLeft, Wand2, Axe, Skull } from 'lucide-react'

function OverviewIcon() { return <LayoutGrid className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" /> }
function UpgradeIcon() { return <ArrowUp className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" /> }
function StrategyIcon() { return <ScrollText className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" /> }
function ImprovementsIcon() { return <TrendingUp className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" /> }
function ScenariosIcon() { return <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" /> }

const TAB_CONFIG = [
  { label: 'Overview', icon: OverviewIcon },
  { label: 'Upgrades', icon: UpgradeIcon, mobileLabel: 'Upgrades' },
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
  Midrange: 'Ramps early, plays value creatures and engines mid-game, grinds out wins through card advantage. Flexible with threats and answers.',
  Stax: 'Slows down or stops opponents through resource denial and taxing effects. Wins slowly while opponents cannot interact.',
  Reanimator: 'Puts expensive creatures into the graveyard early, then cheats them onto the battlefield with reanimation spells.',
}

const STRATEGY_DEFINITIONS = {
  combo: 'Assembles specific card combinations that win on the spot or create an overwhelming advantage. Relies on tutors, card draw, and protection.',
  aggro: 'Wins through early pressure and combat damage. Prioritizes low-cost creatures and dealing damage quickly before opponents stabilize.',
  control: 'Wins through attrition, removing threats and answering everything until opponents run out of resources. Heavy on counterspells and removal.',
  midrange: 'Ramps early, plays value creatures and engines mid-game, grinds out wins through card advantage. Flexible strategy with mix of threats and answers.',
  stax: 'Slows down or stops opponents through resource denial and taxing effects. Aims to break parity and win slowly while opponents cannot interact.',
  voltron: 'Wins by making a single creature (usually the commander) extremely large and lethal with equipment or auras. Vulnerable to removal but can kill quickly.',
  aristocrats: 'Sacrifice-based strategy that generates value from creatures dying. Uses sacrifice outlets, death triggers, and recursion.',
  spellslinger: 'Built around casting lots of instants and sorceries, with creatures or enchantments that trigger on spell casts.',
  tokens: 'Go-wide strategy creating many small creatures. Relies on token generators and anthem effects. Vulnerable to board wipes.',
  reanimator: 'Puts expensive creatures into graveyard early, then cheats them onto battlefield with reanimation spells. Bypasses mana costs.',
  tribal: 'Built around a specific creature type, using lords and tribal synergies. Strength varies by tribe and available support.',
}

const POWER_LEVEL_TOOLTIP = 'Power Level 1-10 scale measuring how quickly and consistently a deck can win. 1-3: precon/casual, 4-6: upgraded casual, 6-7: focused/tuned, 7-8: optimized, 9-10: cEDH (competitive).'

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


function IconWarning({ className = 'w-4 h-4 shrink-0' }) {
  return <AlertTriangle className={className} strokeWidth={2} aria-hidden="true" />
}

function IconCheck({ className = 'w-3.5 h-3.5 shrink-0' }) {
  return <Check className={className} strokeWidth={2} aria-hidden="true" />
}

function IconChevronDown({ className = 'w-3.5 h-3.5 shrink-0' }) {
  return <ChevronDown className={className} strokeWidth={2} aria-hidden="true" />
}

function IconChevronLeft({ className = 'w-4 h-4 shrink-0' }) {
  return <ChevronLeft className={className} strokeWidth={2} aria-hidden="true" />
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
                  <span className="text-2xs text-[var(--color-text-muted)]">/</span>
                  <span className="text-2xs text-[var(--color-text-muted)]">{label === 'Avg CMC' ? target.toFixed(1) : target}</span>
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
    <div className="flex gap-1 items-center">
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
    <h3 className={`font-heading text-[var(--color-text-muted)] text-2xs uppercase tracking-widest mb-2 ${className}`}>
      {children}
    </h3>
  )
}

function CommanderImage({ name, size = 'default' }) {
  const [error, setError] = useState(false)
  if (!name || error) return null
  const imageUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image`
  
  // Phase 38: Support different sizes
  // default: 72×100px (small inline)
  // large: 120×168px (desktop hero)
  // massive: 280×392px (mobile hero - Direction B)
  const dimensions = size === 'massive'
    ? { width: 280, height: 392 }
    : size === 'large' 
      ? { width: 120, height: 168 } 
      : { width: 72, height: 100 }
  
  // Mobile massive: click to Scryfall instead of hover tooltip
  const handleClick = (e) => {
    if (size === 'massive') {
      e.preventDefault()
      window.open(`https://scryfall.com/search?q=!"${encodeURIComponent(name)}"`, '_blank', 'noopener,noreferrer')
    }
  }
  
  const imageElement = (
    <div 
      className={`shrink-0 rounded-sm overflow-hidden shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${size === 'massive' ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      <img
        src={imageUrl}
        alt={name}
        onError={() => setError(true)}
        loading="lazy"
        className="rounded-sm block object-cover"
        style={dimensions}
      />
    </div>
  )
  
  // Massive size: no tooltip, just clickable
  if (size === 'massive') {
    return imageElement
  }
  
  // Other sizes: wrap with tooltip
  return (
    <CardTooltip cardName={name}>
      {imageElement}
    </CardTooltip>
  )
}

function OverviewTab({ deck, analysis, onTabChange }) {
  if (!deck || !analysis) return <p className="text-[var(--color-text-muted)] text-sm">Loading deck data…</p>

  const manaCurveData = Object.entries(analysis.mana_curve || {})
    .map(([cmc, count]) => ({ cmc: cmc === '7' ? '7+' : cmc, count }))
    .sort((a, b) => parseInt(a.cmc) - parseInt(b.cmc))

  const cardTypes = analysis.card_types || {}
  // Derive color identity from commanders if available
  // Deduplicate colors for partner decks (both commanders may share colors)
  const commanderColors = [
    ...new Set([
      ...(deck.commander?.color_identity || []),
      ...(deck.partner?.color_identity || []),
    ])
  ]

  // Weaknesses rendering function
  const renderWeaknesses = () => {
    if (!analysis.weaknesses?.length) return null
    
    return (
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
                    <IconChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-muted)]" />
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-1 space-y-2 border-t border-[var(--color-border)]">
                  <p className="text-[var(--color-text-muted)] text-sm">{w.why}</p>
                  <p className="text-[var(--color-text)] text-sm">
                    <span className="text-[var(--color-text-muted)] font-medium">Look for: </span>{w.look_for}
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
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Deck Verdict ── */}
      {analysis.verdict && (
        <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-5 py-4 hover:border-[var(--color-border)]/80 transition-border">
          <p className="text-[var(--color-text)] text-sm leading-relaxed font-body">{analysis.verdict}</p>
        </div>
      )}

      {/* ── Mobile: Weaknesses SECOND (Direction B) ── */}
      <div className="md:hidden">
        {renderWeaknesses()}
      </div>

      {/* ── Key Stats ── Mobile: horizontal scroll, Desktop: grid ── */}
      <div>
        <SectionLabel className="mb-3">Key Numbers</SectionLabel>
        {/* Mobile: Horizontal scroll */}
        <div className="flex md:hidden gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-3 min-w-min">
            <StatBadge label="Cards" value={analysis.total_cards} />
            <StatBadge label="Avg CMC" value={typeof analysis.average_cmc === 'number' ? analysis.average_cmc.toFixed(2) : '—'} />
            <StatBadge label="Lands" value={cardTypes['Lands'] || 0} />
            <StatBadge label="Ramp" value={analysis.ramp_count || 0} />
            <StatBadge label="Draw" value={analysis.draw_count || 0} />
            <StatBadge label="Removal" value={analysis.removal_count || 0} />
            <StatBadge label="Wipes" value={analysis.board_wipe_count || 0} />
          </div>
        </div>
        {/* Desktop: Grid */}
        <div className="hidden md:grid grid-cols-4 gap-3 sm:grid-cols-7">
          <StatBadge label="Cards" value={analysis.total_cards} />
          <StatBadge label="Avg CMC" value={typeof analysis.average_cmc === 'number' ? analysis.average_cmc.toFixed(2) : '—'} />
          <StatBadge label="Lands" value={cardTypes['Lands'] || 0} />
          <StatBadge label="Ramp" value={analysis.ramp_count || 0} />
          <StatBadge label="Draw" value={analysis.draw_count || 0} />
          <StatBadge label="Removal" value={analysis.removal_count || 0} />
          <StatBadge label="Wipes" value={analysis.board_wipe_count || 0} />
        </div>
      </div>

      {/* ── Desktop: Weaknesses (Direction A) ── */}
      <div className="hidden md:block">
        {renderWeaknesses()}
      </div>

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
                    <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-52 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-xl shadow-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                      <span className="block text-[var(--color-secondary)] text-xs font-semibold mb-0.5">{name}</span>
                      <span className="block text-[var(--color-text)] text-xs leading-relaxed">{def}</span>
                      <span className="absolute top-full left-4 -mt-px border-4 border-transparent border-t-[var(--color-surface)]" />
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Charts Section: Mana Curve + Role Composition ── Phase 38: Two-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Mana Curve ── */}
        {manaCurveData.length > 0 && (
          <div>
            <SectionLabel className="mb-3">Mana Curve</SectionLabel>
            <p className="text-[8px] text-[var(--color-text-muted)] mb-3">Distribution of spells by mana cost — color-coded by timing (acceleration, core spells, and haymakers).</p>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4" style={{ minHeight: '268px' }}>
              <div className="flex items-center justify-center" style={{ height: '180px', marginBottom: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
              <BarChart data={manaCurveData} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis dataKey="cmc" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--color-primary-subtle)' }}
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-text)' }}
                  itemStyle={{ color: 'var(--color-text-muted)' }}
                  formatter={(value) => [value, 'Cards']}
                  labelFormatter={(label) => `CMC ${label}`}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                  <LabelList dataKey="count" position="top" style={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                  {manaCurveData.map((d) => {
                    const n = parseInt(d.cmc)
                    const fill = n <= 2 ? 'var(--color-primary)' : n <= 4 ? 'var(--color-secondary)' : 'var(--color-danger)'
                    return <Cell key={d.cmc} fill={fill} />
                  })}
                </Bar>
              </BarChart>
              </ResponsiveContainer>
              </div>
            {/* Zone legend */}
            <div className="flex gap-4 justify-end">
              {[['var(--color-primary)', '0–2 Acceleration'], ['var(--color-secondary)', '3–4 Core spells'], ['var(--color-danger)', '5+ Haymakers']].map(([color, label]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                  <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* ── Removal Suite (Donut Chart) ── */}
        {(() => {
        const quality = analysis.removal_quality
        if (!quality || quality.total === 0) return null
        
        const qualityData = [
          { name: 'Exile', value: quality.exile, color: 'var(--color-primary)', desc: 'premium', tooltip: 'Bypasses indestructible, recursion, and death triggers' },
          { name: 'Destroy', value: quality.destroy, color: 'var(--color-secondary)', desc: 'good', tooltip: 'Standard removal — stopped by indestructible' },
          { name: 'Damage', value: quality.damage, color: 'var(--color-danger)', desc: 'flexible', tooltip: 'Scalable removal — can hit multiple targets or planeswalkers' },
          { name: 'Bounce', value: quality.bounce, color: 'var(--color-text-subtle)', desc: 'tempo', tooltip: 'Returns to hand — temporary answer, good for ETB value' },
          { name: 'Tuck', value: quality.tuck, color: 'var(--color-success)', desc: 'niche', tooltip: 'Shuffles into library — strong vs commanders' },
          { name: 'Other', value: quality.other, color: 'var(--color-muted)', desc: 'varies', tooltip: 'Sacrifice effects, debuffs, and other removal types' },
        ].filter(q => q.value > 0)
        
        return (
          <div>
            <SectionLabel className="mb-3">Removal Suite</SectionLabel>
            <p className="text-[8px] text-[var(--color-text-muted)] mb-3">Breakdown of removal by quality — exile is permanent, destroy can be recursed, bounce is temporary.</p>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4" style={{ minHeight: '268px' }}>
              <div className="flex flex-col items-center">
                {/* Donut Chart */}
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={qualityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                      isAnimationActive={false}
                      stroke="none"
                    >
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text */}
                <div className="text-center -mt-[110px] pointer-events-none">
                  <div className="text-2xl font-bold text-[var(--color-text)]">{quality.total}</div>
                </div>

                {/* Legend */}
                <div className="space-y-1.5 w-full">
                  {qualityData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs group relative">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-[var(--color-text)]">{item.value} {item.name}</span>
                      </div>
                      <span className="text-[var(--color-text-subtle)] cursor-help">({item.desc})</span>
                      {item.tooltip && (
                        <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-xl shadow-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                          <span className="block text-[var(--color-text)] text-2xs leading-relaxed">{item.tooltip}</span>
                          <span className="absolute top-full left-4 -mt-px border-4 border-transparent border-t-[var(--color-surface)]" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] w-full text-center">
                  {quality.exile_percentage >= 40 && (
                    <span className="text-xs text-[var(--color-success)]">
                      ✓ {quality.exile_percentage}% exile — strong vs recursion
                    </span>
                  )}
                  {quality.exile_percentage < 20 && quality.total >= 5 && (
                    <span className="text-xs text-[var(--color-danger)]">
                      ⚠️ {quality.exile_percentage}% exile — weak vs recursion
                    </span>
                  )}
                  {quality.exile_percentage >= 20 && quality.exile_percentage < 40 && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {quality.exile_percentage}% exile-based removal
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
        })()}
      </div>

      {/* ── Interaction Coverage (Full Width) ── */}
      {(() => {
        const coverage = analysis.interaction_coverage
        if (!coverage) return null
        
        const categories = [
          { 
            subject: 'Creatures', 
            value: coverage.creature_removal,
            threshold: 10,
            color: 'var(--color-primary)',
            tooltip: 'Single-target removal and board wipes that answer creature threats',
            detail: coverage.creature_removal > 0 ? `${coverage.creature_removal_instant} instant • ${coverage.board_wipes} wipes` : null,
          },
          { 
            subject: 'Artifacts/Enchantments', 
            value: coverage.artifact_enchantment_removal,
            threshold: 5,
            color: 'var(--color-secondary)',
            tooltip: 'Answers problematic permanents like Rhystic Study, Smothering Tithe, etc.',
            detail: null,
          },
          { 
            subject: 'Stack', 
            value: coverage.counterspells,
            threshold: 3,
            color: 'var(--color-success)',
            tooltip: 'Counterspells that can stop game-winning plays on the stack',
            detail: coverage.counterspells > 0 ? 'Combo defense' : null,
          },
          { 
            subject: 'Graveyard', 
            value: coverage.graveyard_hate,
            threshold: 1,
            color: 'var(--color-danger)',
            tooltip: 'Cards that exile graveyards or prevent graveyard strategies (vs Meren, Muldrotha, reanimator)',
            detail: null,
          },
        ]
        
        const hasData = categories.some(c => c.value > 0)
        if (!hasData) return null
        
        // Transform for radial bars (reverse order so creatures are outermost)
        const radialData = categories.map(cat => ({
          name: cat.subject,
          actualValue: cat.value,  // Use actualValue to avoid conflict with Recharts
          fill: cat.color,
          target: cat.threshold,
          fillPercentage: Math.min((cat.value / cat.threshold) * 100, 100),
          tooltip: cat.tooltip,
          detail: cat.detail,
        })).reverse()
        
        return (
          <div>
            <SectionLabel className="mb-3">Interaction Coverage</SectionLabel>
            <p className="text-[8px] text-[var(--color-text-muted)] mb-3">Your ability to answer different threat types — full circle is recommended, filled portion is current coverage.</p>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Radial Bar Chart */}
                <div className="w-full lg:w-2/3">
                  <ResponsiveContainer width="100%" height={400}>
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="20%" 
                      outerRadius="90%" 
                      data={radialData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar
                        minAngle={15}
                        background={{ fill: 'var(--color-surface)' }}
                        clockWise
                        dataKey="fillPercentage"
                        isAnimationActive={true}
                        animationDuration={500}
                        activeBar={false}
                      />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg">
                              <div className="font-semibold text-sm text-[var(--color-text)] mb-1">
                                {data.name}
                              </div>
                              <div className="text-xs text-[var(--color-text-muted)] mb-1">
                                {data.tooltip}
                              </div>
                              <div className="text-xs font-mono text-[var(--color-text)]">
                                {data.actualValue}/{data.target} ({Math.round(data.fillPercentage)}%)
                              </div>
                              {data.detail && (
                                <div className="text-2xs text-[var(--color-text-muted)] mt-1">
                                  {data.detail}
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>

                {/* Compact Legend */}
                <div className="w-full lg:w-1/3 space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.subject} className="group relative">
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--color-surface)]/30 border border-[var(--color-border)]/30 hover:bg-[var(--color-surface)]/50 hover:border-[var(--color-border)]/50 transition-colors">
                        <div 
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          style={{ background: cat.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--color-text)]">{cat.subject}</span>
                            <span className="text-xs font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                              {cat.value}/{cat.threshold}
                              <span className="ml-1 text-[var(--color-success)]">
                                ({Math.min(Math.round((cat.value / cat.threshold) * 100), 100)}%)
                              </span>
                            </span>
                          </div>
                          {cat.detail && (
                            <div className="text-xs text-[var(--color-text-muted)] opacity-75 mt-0.5">↗ {cat.detail}</div>
                          )}
                          {cat.value === 0 && (
                            <div className="text-xs text-[var(--color-danger)] font-medium mt-1">⚠️ Missing coverage</div>
                          )}
                          {cat.value > 0 && cat.value < cat.threshold && (
                            <div className="text-xs text-[var(--color-secondary)] font-medium mt-1">⚠️ Light coverage</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {cat.tooltip}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── What else can you do? (Differentiator section) ── */}
      <div className="border-t border-[var(--color-border)] pt-5">
        <SectionLabel className="mb-3">Explore Further</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => onTabChange?.('Strategy')}
            className="text-left bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-secondary)]/20 rounded-xl px-4 py-3 hover:border-[var(--color-secondary)]/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <p className="text-[var(--color-secondary)] font-semibold text-sm">AI Strategy Guide →</p>
            <p className="text-[var(--color-text-muted)] text-xs mt-0.5">Game plan, win conditions, mulligan advice, matchup tips</p>
          </button>
          <button
            onClick={() => onTabChange?.('Upgrades')}
            className="text-left bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-success)]/20 rounded-xl px-4 py-3 hover:border-[var(--color-success)]/50 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <p className="text-[var(--color-success)] font-semibold text-sm">Upgrade with Your Collection →</p>
            <p className="text-[var(--color-text-muted)] text-xs mt-0.5">Cards you already own that would strengthen this deck</p>
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
      <span className="text-[var(--color-text-muted)] text-xs">
        {aiEnhanced ? 'AI-generated analysis' : 'Rule-based analysis — AI quota unavailable'}
      </span>
    </div>
  )
}


// Parses text and wraps any deck card names with CardTooltip.
// Sorted by name length (desc) so multi-word names match before substrings.
function renderWithCardTooltips(text, cardNameSet) {
  if (!text || !cardNameSet?.size) return text
  const names = Array.from(cardNameSet).sort((a, b) => b.length - a.length)
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.split(regex).map((part, i) => {
    const match = names.find(n => n.toLowerCase() === part.toLowerCase())
    if (match) {
      return (
        <CardTooltip key={i} cardName={match}>
          <span className="text-[var(--color-primary)] cursor-help border-b border-dotted border-[var(--color-primary)]/40">{part}</span>
        </CardTooltip>
      )
    }
    return part
  })
}

// Stacked card fan accordion for Early / Mid / Late game phases.
// Inactive cards peek from left/right; clicking brings them to front.
function GamePhasesAccordion({ phases, mainboardCards }) {
  const [active, setActive] = useState(0)

  const getCardAnim = (index) => {
    const offset = index - active
    if (offset === 0)  return { x: '0%',   scale: 1,    zIndex: 30, opacity: 1,    rotate: 0  }
    if (offset === -1) return { x: '-52%', scale: 0.88, zIndex: 20, opacity: 0.72, rotate: -4 }
    if (offset === 1)  return { x: '52%',  scale: 0.88, zIndex: 20, opacity: 0.72, rotate: 4  }
    if (offset <= -2)  return { x: '-78%', scale: 0.80, zIndex: 10, opacity: 0.35, rotate: -7 }
    return                    { x: '78%',  scale: 0.80, zIndex: 10, opacity: 0.35, rotate: 7  }
  }

  return (
    <div className="relative flex justify-center" style={{ height: '300px' }}>
      {phases.map((phase, i) => {
        const isActive = i === active
        return (
          <motion.div
            key={phase.label}
            animate={getCardAnim(i)}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            style={{ position: 'absolute', width: '100%', maxWidth: '460px', cursor: isActive ? 'default' : 'pointer', top: 0 }}
            onClick={() => !isActive && setActive(i)}
            className={`bg-[var(--color-surface)] border rounded-2xl p-5 select-none overflow-hidden
              ${isActive
                ? 'border-[var(--color-primary)]/50 shadow-xl shadow-black/20'
                : 'border-[var(--color-border)]'
              }`}
          >
            {/* Card header */}
            <div className="flex items-center gap-2 mb-3">
              <phase.Icon className={`w-5 h-5 shrink-0 ${phase.color}`} strokeWidth={1.75} />
              <div>
                <p className={`font-heading text-sm font-semibold ${phase.color}`}>{phase.label}</p>
                <p className="text-[var(--color-text-muted)] text-2xs">{phase.sub}</p>
              </div>
            </div>

            {/* Active: full bullet list */}
            {isActive && (
              <ul className="space-y-2">
                {phase.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <span className={`mt-[3px] text-xs shrink-0 ${phase.color}`}>•</span>
                    <span className="leading-relaxed">{renderWithCardTooltips(b, mainboardCards)}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Inactive: faint skeleton lines as a visual hint */}
            {!isActive && (
              <div className="space-y-2 opacity-25 pointer-events-none">
                {[80, 65, 50].map((w, j) => (
                  <div key={j} className="h-2 bg-[var(--color-muted)]/50 rounded-full" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

function StrategyTab({ deckId, mainboardCards = new Set() }) {
  const { data: raw, loading, error } = useDataFetch(() => api.getStrategy(deckId), [deckId])
  const data = raw?.strategy
  const aiEnhanced = raw?.ai_enhanced ?? false

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>
  if (!data) return null

  const toBullets = (val) =>
    Array.isArray(val) ? val : (val || '').split(/\.\s+/).filter(Boolean)

  const phases = [
    { label: 'Early Game', sub: 'Turns 1–3', Icon: Wand2, color: 'text-emerald-400', bullets: toBullets(data.early_game) },
    { label: 'Mid Game',   sub: 'Turns 4–6', Icon: Axe,   color: 'text-amber-400',   bullets: toBullets(data.mid_game)   },
    { label: 'Late Game',  sub: 'Turns 7+',  Icon: Skull, color: 'text-rose-400',    bullets: toBullets(data.late_game)  },
  ].filter(p => p.bullets.length > 0)

  return (
    <div className="space-y-6">
      <AiSourceBadge aiEnhanced={aiEnhanced} />

      {/* Game Plan */}
      {data.game_plan && (
        <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-5">
          <SectionLabel className="mb-2 text-[var(--color-primary)]">Game Plan</SectionLabel>
          <p className="text-[var(--color-text)] text-sm leading-relaxed">{renderWithCardTooltips(data.game_plan, mainboardCards)}</p>
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
                  <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{renderWithCardTooltips(wc.description, mainboardCards)}</p>
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
                <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{renderWithCardTooltips(kc.role, mainboardCards)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Phases — stacked card fan */}
      {phases.length > 0 && (
        <div>
          <SectionLabel className="mb-4">Game Phases</SectionLabel>
          <GamePhasesAccordion phases={phases} mainboardCards={mainboardCards} />
        </div>
      )}

      {/* Mulligan */}
      {data.mulligan && (
        <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-5">
          <SectionLabel className="mb-2">Mulligan Strategy</SectionLabel>
          <p className="text-[var(--color-text)] text-sm leading-relaxed">{renderWithCardTooltips(data.mulligan, mainboardCards)}</p>
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
                <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{renderWithCardTooltips(tip.advice, mainboardCards)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ImprovementsTab({ deckId }) {
  const { data: raw, loading, error } = useDataFetch(() => api.getImprovements(deckId), [deckId])
  const data = raw?.improvements
  const aiEnhanced = raw?.ai_enhanced ?? false
  const { expanded, toggle, visible } = useExpandable(5)

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-[var(--color-danger)] text-sm">{error}</p>
  if (!data) return null

  const renderShowMore = (key, total) => {
    if (total <= 5) return null
    return (
      <button
        onClick={() => toggle(key)}
        className="text-[var(--color-secondary)] text-xs hover:underline mt-1 cursor-pointer"
      >
        {expanded[key] ? 'Show less' : `Show all ${total}`}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <AiSourceBadge aiEnhanced={aiEnhanced} />

      {/* Weakness Fixes — cards to ADD, split by owned vs need to acquire */}
      {data.urgent_fixes?.length > 0 && (() => {
        const hasOwnershipData = data.urgent_fixes.some(f => f.owned !== undefined)
        const ownedFixes = hasOwnershipData ? data.urgent_fixes.filter(f => f.owned === true) : data.urgent_fixes
        const acquireFixes = hasOwnershipData ? data.urgent_fixes.filter(f => f.owned !== true) : []
        return (
          <div>
            <h3 className="font-heading text-[var(--color-danger)] text-2xs uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <IconWarning className="w-3.5 h-3.5" />
              Weakness Fixes
            </h3>
            <p className="text-[var(--color-text-muted)] text-xs mb-3">Cards that address critical gaps in your deck.</p>

            {ownedFixes.length > 0 && (
              <div className={acquireFixes.length > 0 ? 'mb-4' : ''}>
                {hasOwnershipData && <p className="font-heading text-[var(--color-success)] text-2xs font-semibold uppercase tracking-widest mb-1.5">In Your Collection</p>}
                <div className="space-y-2">
                  {visible('fixes_owned', ownedFixes).map((fix, i) => (
                    <CardRecommendation
                      key={i}
                      card={fix.card}
                      owned={fix.owned}
                      category={fix.category}
                      priceTier={fix.price_tier}
                      reason={fix.reason}
                      variant="danger"
                    />
                  ))}
                </div>
                {renderShowMore('fixes_owned', ownedFixes.length)}
              </div>
            )}

            {acquireFixes.length > 0 && (
              <div>
                <p className="font-heading text-[var(--color-text-muted)] text-2xs font-semibold uppercase tracking-widest mb-1.5">Worth Acquiring</p>
                <div className="space-y-2">
                  {visible('fixes_acquire', acquireFixes).map((fix, i) => (
                    <CardRecommendation
                      key={i}
                      card={fix.card}
                      category={fix.category}
                      priceTier={fix.price_tier}
                      reason={fix.reason}
                      variant="danger"
                    />
                  ))}
                </div>
                {renderShowMore('fixes_acquire', acquireFixes.length)}
              </div>
            )}
          </div>
        )
      })()}

      {/* Recommended Swaps — paired cut → add */}
      {data.swaps?.length > 0 && (
        <div>
          <SectionLabel className="mb-1">Recommended Swaps</SectionLabel>
          <p className="text-[var(--color-text-muted)] text-xs mb-3">Paired cut → add recommendations to improve your deck.</p>
          <div className="space-y-2">
            {visible('swaps', data.swaps).map((swap, i) => (
              <div key={i} className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl px-4 py-3 hover:border-[var(--color-border)]/80 hover:-translate-y-0.5 transition-all duration-150">
                {/* Row 1: cut → add */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[var(--color-danger)] font-semibold text-sm shrink-0">−</span>
                  <span className="text-[var(--color-danger)] font-semibold text-sm truncate"><CardTooltip cardName={swap.cut}>{swap.cut}</CardTooltip></span>
                  <span className="text-[var(--color-text-muted)] text-xs shrink-0">→</span>
                  <span className="text-[var(--color-success)] font-semibold text-sm shrink-0">+</span>
                  <span className="text-[var(--color-success)] font-semibold text-sm truncate"><CardTooltip cardName={swap.add}>{swap.add}</CardTooltip></span>
                </div>
                {/* Row 2: meta tags — subordinate, small pills */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {swap.owned && (
                    <span className="text-[9px] text-[var(--color-success)]">✓ owned</span>
                  )}
                  {swap.category && (
                    <TagTooltip
                      tip={CATEGORY_TOOLTIPS[swap.category] || swap.category}
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full cursor-help uppercase tracking-wide ${CATEGORY_COLORS[swap.category] || 'bg-[var(--color-muted)]/10 text-[var(--color-text-muted)]'}`}
                    >
                      {swap.category}
                    </TagTooltip>
                  )}
                  {swap.price_tier && (
                    <TagTooltip
                      tip={PRICE_TIER_TOOLTIPS[swap.price_tier] || swap.price_tier}
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full cursor-help uppercase tracking-wide ${PRICE_TIER_COLORS[swap.price_tier] || 'bg-[var(--color-muted)]/10 text-[var(--color-text-muted)]'}`}
                    >
                      {swap.price_tier}
                    </TagTooltip>
                  )}
                </div>
                <p className="text-[var(--color-text-muted)] text-xs mt-1">{swap.reason}</p>
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
                <p className="font-heading text-[var(--color-success)] text-2xs font-semibold uppercase tracking-widest mb-1.5">In Your Collection</p>
                <div className="space-y-2">
                  {visible('additions_owned', ownedCards).map((add, i) => (
                    <CardRecommendation
                      key={i}
                      card={add.card}
                      owned
                      priceTier={add.price_tier}
                      reason={add.reason}
                      variant="success"
                    />
                  ))}
                </div>
                {renderShowMore('additions_owned', ownedCards.length)}
              </div>
            )}

            {buyCards.length > 0 && (
              <div>
                <p className="font-heading text-[var(--color-text-muted)] text-2xs font-semibold uppercase tracking-widest mb-1.5">Worth Acquiring</p>
                <div className="space-y-2">
                  {visible('additions_buy', buyCards).map((add, i) => (
                    <CardRecommendation
                      key={i}
                      card={add.card}
                      priceTier={add.price_tier}
                      reason={add.reason}
                    />
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
        <EmptyState
          icon={IconCheck}
          iconClassName="text-[var(--color-success)]"
          title="Deck looks solid!"
          description="No urgent improvements identified."
        />
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
      <EmptyState
        iconNode={<UpgradeIcon />}
        title="No collection uploaded"
        description={<>Upload your Moxfield collection CSV on the{' '}<Link to="/collection" className="text-[var(--color-secondary)] hover:underline">Collection page</Link>{' '}to see upgrade suggestions from cards you already own.</>}
      />
    )
  }

  if (!upgrades?.raw?.length) {
    return (
      <EmptyState
        icon={IconCheck}
        iconClassName="text-[var(--color-success)]"
        title="No upgrades found"
        description="Your collection doesn't have obvious upgrades for this deck based on its current weaknesses and themes."
      />
    )
  }

  return (
    <div className="space-y-4">
      <SectionLabel className="mb-1">From My Collection</SectionLabel>
      <p className="text-[var(--color-text-muted)] text-sm mb-4">
        {upgrades.raw.length} upgrade{upgrades.raw.length !== 1 ? 's' : ''} from your collection.
        Check the <span className="text-[var(--color-secondary)]">Improvements</span> tab for additional suggestions including cards to purchase.
      </p>
      {Object.entries(upgrades.grouped).map(([cutKey, options]) => {
        const hasCut = cutKey !== '_no_cut'
        const multipleOptions = options.length > 1
        
        // Sort options by score (if available) descending
        const sortedOptions = [...options].sort((a, b) => (b.score || 0) - (a.score || 0))
        
        return (
          <div key={cutKey} className="space-y-2">
            {hasCut && multipleOptions && (
              <p className="text-[var(--color-text-muted)] text-xs font-semibold">
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
                        <span className="text-[var(--color-text-muted)] text-xs">for</span>
                        <span className="text-[var(--color-danger)] font-semibold text-sm">− <CardTooltip cardName={u.cut}>{u.cut}</CardTooltip></span>
                      </>
                    )}
                  </div>
                  <p className="text-[var(--color-text-muted)] text-xs mt-1">{u.reason}</p>
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
    if (v === 0) return <span className="text-[var(--color-text-muted)]">—</span>
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
          <label className="block text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Suggested Changes</label>
          
          {/* Suggestions from Improvements */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-[var(--color-text-muted)] text-xs mb-2">Quick-pick from Improvements:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => {
                  const isActive = isSuggestionActive(suggestion)
                  const isSwap = suggestion.type === 'swap'
                  
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleSuggestion(suggestion)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      {isActive && '✓ '}
                      {isSwap ? (
                        <span>
                          <span className="text-[var(--color-danger)]">− <CardTooltip cardName={suggestion.cut}>{suggestion.cut}</CardTooltip></span>
                          <span className="text-[var(--color-text-muted)] mx-1">→</span>
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
              className="text-[var(--color-secondary)] text-sm hover:underline cursor-pointer"
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
                  className="text-[var(--color-success)] text-sm font-semibold hover:underline disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Add Cards
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCustomAdd(false); setCustomAddInput('') }}
                  className="text-[var(--color-text-muted)] text-sm hover:underline cursor-pointer"
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
                      className="text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 text-xs font-bold cursor-pointer"
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
          <label className="block text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Cards to Remove</label>
          
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
                  className="w-full text-left px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] border-b border-[var(--color-border)] last:border-0 cursor-pointer"
                >
                  <CardTooltip cardName={cardName}>{cardName}</CardTooltip>
                </button>
              ))}
            </div>
          )}

          {removeSearchTerm && deckCards.length === 0 && (
            <p className="text-[var(--color-text-muted)] text-xs">No cards found</p>
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
                      className="text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 text-xs font-bold cursor-pointer"
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
            className="bg-[var(--color-primary)] text-[var(--color-bg)] px-6 py-2 rounded-lg font-semibold tracking-wide hover:brightness-110 hover:shadow-[0_0_20px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
            <span className="text-[var(--color-text-muted)] text-xs">Rule-based analysis — AI unavailable</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="text-left px-4 py-2.5 text-[var(--color-text-muted)] text-xs uppercase tracking-wider font-semibold w-1/3">Stat</th>
                  <th className="text-center px-4 py-2.5 text-[var(--color-text-muted)] text-xs uppercase tracking-wider font-semibold">Before</th>
                  <th className="text-center px-4 py-2.5 text-[var(--color-text-muted)] text-xs uppercase tracking-wider font-semibold">After</th>
                  <th className="text-center px-4 py-2.5 text-[var(--color-text-muted)] text-xs uppercase tracking-wider font-semibold">Δ</th>
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
                      <td className="px-4 py-3 text-center text-[var(--color-text-muted)]">
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
            <span className="text-[var(--color-text-muted)] text-xs">AI-enhanced analysis</span>
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
                  <h3 className="font-heading text-[var(--color-success)] text-2xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
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
                  <h3 className="font-heading text-[var(--color-text)] text-2xs font-semibold uppercase tracking-widest mb-3">
                    Weaknesses
                  </h3>
                  <ul className="space-y-2">
                    {resolved.map((w, i) => (
                      <li key={`resolved-${i}`} className="text-[var(--color-text-muted)] text-sm flex items-start gap-2 line-through decoration-[var(--color-success)]">
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
                      <li key={`unchanged-${i}`} className="text-[var(--color-text-muted)] text-sm flex items-start gap-2">
                        <span className="text-[var(--color-text-muted)] text-lg leading-none mt-0.5">−</span>
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
              <summary className="font-heading text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-widest cursor-pointer hover:text-[var(--color-text)] transition-colors">
                Strategy Comparison (click to expand)
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[var(--color-text-muted)] text-xs mb-1.5">Before</p>
                  <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{result.before.game_plan}</p>
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

  // Source platform ('moxfield' or 'archidekt') passed through navigate state
  const source = location.state?.source || 'moxfield'
  const platformFetchUrl = source === 'archidekt'
    ? `https://archidekt.com/decks/${deckId}`
    : `https://www.moxfield.com/decks/${deckId}`

  useEffect(() => {
    if (deck && analysis) return // already have data from navigate state
    // Load deck data by fetching + analyzing (both will use cache)
    Promise.all([
      api.fetchDeck(platformFetchUrl),
      api.analyzeDeck(deckId, { source }),
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
    api.analyzeDeck(deckId, { force: true, source })
      .then((result) => {
        setAnalysis(result.analysis)
        setIsCached(false)
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setReanalyzing(false))
  }, [deckId]) // eslint-disable-line react-hooks/exhaustive-deps

  const deckName = deck?.name || deckId

  return (
    <PageTransition>
      <div className="min-h-screen">
      
      <div className="max-w-[1400px] mx-auto px-8 pt-6">
        {/* ── Hero Box ── Phase 38: Desktop (Direction A) + Mobile (Direction B) */}
        {deck && analysis && (
          <div 
            className="relative rounded-2xl border border-[var(--color-primary)] mb-6"
            style={{ 
              background: 'linear-gradient(135deg, rgba(45, 130, 183, 0.15) 0%, rgba(35, 41, 46, 0.8) 100%)' 
            }}
          >
            {/* Desktop: Horizontal Layout (Direction A) */}
            <div className="hidden md:flex items-center gap-6 px-6 py-6">
              {/* Card image(s) */}
              <div className="flex gap-3 shrink-0">
                <CommanderImage name={deck.commander?.name} size="large" />
                {deck.partner?.name && <CommanderImage name={deck.partner.name} size="large" />}
              </div>
              
              {/* Text info */}
              <div className="flex-1 min-w-0">
                {/* Deck Name */}
                <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-[var(--color-primary)] text-3xl leading-tight font-bold mb-2">
                  {deck.name || 'Unnamed Deck'}
                </h1>
                
                {/* Commander Name */}
                <h2 className="text-[var(--color-text)] font-heading text-2xl leading-tight mb-3">
                  {deck.commander?.name || 'Unknown'}
                  {deck.partner?.name && (
                    <>
                      <span className="text-[var(--color-text-muted)] font-normal"> &amp; </span>
                      <span className="text-[var(--color-text)]">{deck.partner.name}</span>
                    </>
                  )}
                </h2>
                
                {/* Metadata badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  {(() => {
                    const commanderColors = [
                      ...new Set([
                        ...(deck.commander?.color_identity || []),
                        ...(deck.partner?.color_identity || []),
                      ])
                    ]
                    return commanderColors.length > 0 && <ColorPips colors={commanderColors} />
                  })()}
                  {analysis.strategy && (
                    <span 
                      className="bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] text-xs px-2 py-0.5 rounded-full border border-[var(--color-secondary)]/20 font-semibold capitalize cursor-help relative group"
                      title={STRATEGY_DEFINITIONS[analysis.strategy.toLowerCase()] || ''}
                    >
                      {analysis.strategy}
                      {STRATEGY_DEFINITIONS[analysis.strategy.toLowerCase()] && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-xl shadow-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                          <span className="block text-[var(--color-secondary)] text-xs font-semibold mb-1 capitalize">{analysis.strategy}</span>
                          <span className="block text-[var(--color-text)] text-xs leading-relaxed">
                            {STRATEGY_DEFINITIONS[analysis.strategy.toLowerCase()]}
                          </span>
                          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[var(--color-surface)]" />
                        </span>
                      )}
                    </span>
                  )}
                  {analysis.power_level != null && (
                    <span 
                      className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 font-semibold cursor-help relative group"
                      title={POWER_LEVEL_TOOLTIP}
                    >
                      Power {analysis.power_level}/10
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-xl shadow-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                        <span className="block text-[var(--color-primary)] text-xs font-semibold mb-1">Power Level Scale</span>
                        <span className="block text-[var(--color-text)] text-xs leading-relaxed">
                          {POWER_LEVEL_TOOLTIP}
                        </span>
                        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[var(--color-surface)]" />
                      </span>
                    </span>
                  )}
                  <span className="text-[var(--color-text-muted)] text-sm capitalize">
                    {deck.format}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile: Vertical Centered Layout (Direction B) */}
            <div className="flex md:hidden flex-col items-center text-center gap-6 px-4 py-8">
              {/* Massive Commander Art */}
              <div className="flex gap-3">
                <CommanderImage name={deck.commander?.name} size="massive" />
                {deck.partner?.name && <CommanderImage name={deck.partner.name} size="massive" />}
              </div>
              
              {/* Text info */}
              <div className="w-full">
                {/* Deck Name - Large Cinzel */}
                <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-[var(--color-primary)] text-3xl leading-tight mb-2 font-bold">
                  {deck.name || 'Unnamed Deck'}
                </h1>
                
                {/* Commander Name */}
                <h2 className="text-[var(--color-text)] font-heading text-lg leading-tight mb-4">
                  {deck.commander?.name || 'Unknown'}
                  {deck.partner?.name && (
                    <>
                      <span className="text-[var(--color-text-muted)] font-normal"> &amp; </span>
                      <span className="text-[var(--color-text)]">{deck.partner.name}</span>
                    </>
                  )}
                </h2>
                
                {/* Metadata badges */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {(() => {
                    const commanderColors = [
                      ...new Set([
                        ...(deck.commander?.color_identity || []),
                        ...(deck.partner?.color_identity || []),
                      ])
                    ]
                    return commanderColors.length > 0 && <ColorPips colors={commanderColors} size="1.5rem" />
                  })()}
                  {analysis.strategy && (
                    <span className="bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] text-xs px-2 py-0.5 rounded-full border border-[var(--color-secondary)]/20 font-semibold capitalize">
                      {analysis.strategy}
                    </span>
                  )}
                  {analysis.power_level != null && (
                    <span className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 font-semibold">
                      Power {analysis.power_level}/10
                    </span>
                  )}
                  <span className="text-[var(--color-text-muted)] text-sm capitalize">
                    {deck.format}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
          {TAB_CONFIG.map(({ label, icon: TabIcon, mobileLabel }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-heading whitespace-nowrap border-b-2 transition-colors active:scale-[0.97] cursor-pointer ${
                activeTab === label
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
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
              <span className="text-[var(--color-text-muted)] text-sm">
                Showing cached results — deck hasn't changed on Moxfield.
              </span>
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="ml-auto btn btn-ghost text-xs"
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
            <StrategyTab deckId={deckId} mainboardCards={new Set((deck?.mainboard || []).map(c => c.name))} />
          )}

          {activeTab === 'Improvements' && (
            <ImprovementsTab deckId={deckId} />
          )}

          {activeTab === 'Upgrades' && (
            <CollectionUpgradesTab deckId={deckId} />
          )}

          {activeTab === 'Scenarios' && (
            <ScenariosTab deckId={deckId} deck={deck} analysis={analysis} />
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  )
}
