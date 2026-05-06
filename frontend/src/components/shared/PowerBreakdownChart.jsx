import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import TooltipWrapper from './TooltipWrapper'
import CardTooltip from '../CardTooltip'

/**
 * PowerBreakdownChart
 * 
 * Visualizes power level breakdown showing contribution from each factor.
 * Uses a horizontal stacked bar chart with color-coded segments.
 * 
 * @param {object} powerBreakdown - PowerLevelBreakdown from backend
 *   {
 *     total: number,
 *     rounded: number,
 *     bracket: number,
 *     bracket_label: string,
 *     factors: PowerLevelFactor[],
 *     next_bracket_threshold?: { target_bracket, target_power, gap, suggestions[] }
 *   }
 */
export default function PowerBreakdownChart({ powerBreakdown }) {
  const [expandedFactor, setExpandedFactor] = useState(null)
  
  if (!powerBreakdown || !powerBreakdown.factors) {
    return null
  }

  const { total, rounded, bracket, bracket_label, factors, next_bracket_threshold } = powerBreakdown

  // Filter to only factors with non-zero values for the chart display
  const nonZeroFactors = factors.filter(f => f.value !== 0)
  
  // For the card accordion, show all factors that have cards (even if value is 0)
  const factorsWithCards = factors.filter(f => f.cards && f.cards.length > 0)

  // Color mapping for each factor category - using design system tokens
  const FACTOR_COLORS = {
    'Base': '#92a8c8',           // --color-text-muted - starting baseline
    'Fast Mana': '#DBAC84',      // --color-secondary/warning - fast acceleration
    'Tutors': '#9875d8',         // --color-mtg-black - tutors search
    'Counterspells': '#2D82B7',  // --color-primary/mtg-blue - counterspells
    'CMC Efficiency': '#5fb8d4', // Lighter blue variant - efficiency
    'Card Draw': '#5ec070',      // --color-success/mtg-green - card advantage
    'Interaction': '#e85868',    // --color-danger/mtg-red - removal
    'Theme Coherence': '#c89860', // Muted tan variant - synergy
    'Commander': '#e89850',      // Warm orange variant of secondary - commander
  }

  // Explanatory tooltips for each factor
  const FACTOR_EXPLANATIONS = {
    'Base': 'Starting power level for all decks (3.0)',
    'Fast Mana': 'Mana rocks and rituals that cost 0-2 mana (Sol Ring, Mana Crypt, Chrome Mox, Arcane Signet, etc.). Each piece adds +0.5. Max +2.0',
    'Tutors': 'Cards that search your library for specific pieces. Premium tutors add +0.5 each, generic tutors add +0.2 each. Max +3.5 combined',
    'Counterspells': 'Instant-speed stack interaction. Each counterspell adds +0.3. Max +1.5',
    'CMC Efficiency': 'Average mana value of your deck. Lower average = higher efficiency. Range -1.0 to +1.0',
    'Card Draw': 'Reliable card advantage engines. 10-13 sources = +0.25, 14+ sources = +0.5. All cards contribute to reaching threshold. Max +0.5',
    'Interaction': 'Removal and answers (board wipes, spot removal, graveyard hate). Under 8 pieces = -0.5, 15+ pieces = +0.5. All cards contribute to threshold. Max +0.5',
    'Theme Coherence': 'Focused strategy with synergistic cards. 12-15 cards in a theme = +0.5, 16+ cards = +0.75. Multiple themes can stack. Cards listed belong to qualifying themes. Max +1.5 total',
    'Commander': 'Commander quality and synergy with the deck. cEDH-tier commanders add +1.5, strong commanders add +0.75. Score shown is what that commander adds.',
  }

  // Transform for stacked bar chart
  const chartData = [{
    name: 'Power',
    ...Object.fromEntries(nonZeroFactors.map((f, i) => [`factor${i}`, Math.abs(f.value)])),
  }]

  const bracketColors = {
    1: 'var(--color-text-muted)',
    2: 'var(--color-info)',
    3: 'var(--color-warning)',
    4: 'var(--color-danger)',
  }

  return (
    <div className="space-y-4">
      {/* Header with power level and bracket */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-[var(--color-text)]">
            Power {rounded}<span className="text-[var(--color-text-muted)] text-lg">/10</span>
          </div>
          <div 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1"
            style={{ 
              backgroundColor: `${bracketColors[bracket] || 'var(--color-text-muted)'}/20`,
              color: bracketColors[bracket] || 'var(--color-text-muted)'
            }}
          >
            <span>Bracket {bracket}</span>
            <span className="opacity-60">·</span>
            <span>{bracket_label}</span>
          </div>
        </div>

        {/* Next bracket info */}
        {next_bracket_threshold && (
          <TooltipWrapper content={
            <div className="space-y-1">
              <div className="font-semibold text-xs mb-2">To reach Bracket {next_bracket_threshold.target_bracket}:</div>
              {next_bracket_threshold.suggestions.map((s, i) => (
                <div key={i} className="text-2xs text-[var(--color-text-muted)]">• {s}</div>
              ))}
            </div>
          }>
            <div className="text-right cursor-help">
              <div className="text-xs text-[var(--color-text-muted)]">Next bracket</div>
              <div className="text-sm font-semibold text-[var(--color-secondary)]">
                +{next_bracket_threshold.gap.toFixed(1)} to B{next_bracket_threshold.target_bracket}
              </div>
            </div>
          </TooltipWrapper>
        )}
      </div>

      {/* Stacked horizontal bar */}
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
        <ResponsiveContainer width="100%" height={80}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            
            {/* Stack bars for each factor */}
            {nonZeroFactors.map((factor, i) => (
              <Bar
                key={i}
                dataKey={`factor${i}`}
                stackId="a"
                fill={FACTOR_COLORS[factor.category] || 'var(--color-text-muted)'}
                radius={i === nonZeroFactors.length - 1 ? [0, 4, 4, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {/* Legend with tooltips - show ALL factors so users know what exists */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-2xs">
          {factors.map((factor, i) => (
            <TooltipWrapper key={i} content={FACTOR_EXPLANATIONS[factor.category] || factor.description}>
              <div className="flex items-center gap-1.5 cursor-help">
                <div 
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: FACTOR_COLORS[factor.category] }}
                />
                <span className="text-[var(--color-text-muted)]">{factor.category}</span>
                <span className={`font-mono font-semibold ${factor.value > 0 ? 'text-[var(--color-success)]' : factor.value < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'}`}>
                  {factor.value > 0 ? '+' : ''}{factor.value.toFixed(1)}
                </span>
              </div>
            </TooltipWrapper>
          ))}
        </div>

        {/* Total breakdown */}
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">Total (exact)</span>
            <span className="font-mono font-semibold text-[var(--color-text)]">{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Contributing Cards Accordion */}
      <div className="space-y-2">
        {factorsWithCards.map((factor, i) => {
          const isExpanded = expandedFactor === factor.category
          return (
            <div key={i} className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface)]/80">
              <button
                onClick={() => setExpandedFactor(isExpanded ? null : factor.category)}
                className="w-full p-3 flex items-center justify-between hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: FACTOR_COLORS[factor.category] }}
                  />
                  <span className="text-sm font-medium text-[var(--color-text)]">{factor.category}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    ({factor.cards.length} card{factor.cards.length > 1 ? 's' : ''})
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-[var(--color-border)]">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {factor.cards.map((cardName, idx) => {
                      const score = factor.card_scores?.[cardName];
                      return (
                        <CardTooltip key={idx} cardName={cardName}>
                          <span className="text-xs px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors cursor-help inline-flex items-center gap-1.5">
                            <span>{cardName}</span>
                            {score !== undefined && (
                              <span className="font-mono text-2xs text-[var(--color-success)] font-semibold">
                                +{score.toFixed(1)}
                              </span>
                            )}
                          </span>
                        </CardTooltip>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
