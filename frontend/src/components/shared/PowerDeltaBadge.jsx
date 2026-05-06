import TooltipWrapper from './TooltipWrapper'

/**
 * PowerDeltaBadge
 * 
 * Shows power level change for an improvement suggestion.
 * Color-coded: green for positive, red for negative, gray for neutral.
 * 
 * @param {object} powerDelta - PowerDelta from backend
 *   {
 *     before: number,
 *     after: number,
 *     change: number,
 *     factors_changed: string[]
 *   }
 * @param {string} size - 'sm' | 'md' | 'lg'
 */
export default function PowerDeltaBadge({ powerDelta, size = 'sm' }) {
  if (!powerDelta || powerDelta.change === 0) {
    return null
  }

  const { change, factors_changed } = powerDelta

  // Size classes
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5',
  }

  // Color based on change direction
  const colorClass = change > 0 
    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' 
    : change < 0 
    ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
    : 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)]'

  const tooltipContent = (
    <div className="space-y-1">
      <div className="text-xs font-semibold">Power Impact</div>
      <div className="text-2xs text-[var(--color-text-muted)]">
        Affects: {factors_changed.join(', ')}
      </div>
    </div>
  )

  return (
    <TooltipWrapper content={tooltipContent}>
      <span 
        className={`inline-flex items-center gap-0.5 rounded-full font-mono font-medium cursor-help ${sizeClasses[size]} ${colorClass}`}
      >
        <span>{change > 0 ? '+' : ''}{change.toFixed(1)}</span>
        <span className="opacity-60">⚡</span>
      </span>
    </TooltipWrapper>
  )
}
