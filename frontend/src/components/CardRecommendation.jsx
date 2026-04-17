import CardTooltip from './CardTooltip'
import TagTooltip from './TagTooltip'
import { CATEGORY_COLORS, CATEGORY_TOOLTIPS, PRICE_TIER_COLORS, PRICE_TIER_TOOLTIPS } from '../constants/improvementMaps'

const BORDER_CLASSES = {
  default: 'border-[var(--color-border)] hover:border-[var(--color-border)]/80',
  danger:  'border-[var(--color-danger)]/30 hover:border-[var(--color-danger)]/50',
  success: 'border-[var(--color-success)]/20',
}

/**
 * A bordered card row for a single card addition recommendation.
 * Used in Improvements (urgent fixes, owned additions, buy additions).
 *
 * @param {string} card - Card name
 * @param {boolean} [owned] - Whether the user owns this card
 * @param {string} [category] - Category key (ramp, draw, removal, …)
 * @param {string} [priceTier] - Price tier key (budget, mid, premium)
 * @param {string} [reason] - Explanation text
 * @param {'default'|'danger'|'success'} [variant] - Border color variant
 */
export default function CardRecommendation({ card, owned, category, priceTier, reason, variant = 'default' }) {
  const borderClass = BORDER_CLASSES[variant] ?? BORDER_CLASSES.default
  const hasTags = owned || category || priceTier

  return (
    <div className={`bg-[var(--color-surface)]/80 backdrop-blur-sm border ${borderClass} rounded-xl px-4 py-3 flex items-start gap-3 hover:-translate-y-0.5 transition-all duration-150`}>
      <span className="text-[var(--color-success)] text-sm font-bold mt-0.5">+</span>
      <div className="flex-1">
        <span className="text-[var(--color-text)] font-semibold text-sm">
          <CardTooltip cardName={card}>{card}</CardTooltip>
        </span>
        {hasTags && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {owned && (
              <span className="text-[9px] text-[var(--color-success)]">✓ owned</span>
            )}
            {category && (
              <TagTooltip
                tip={CATEGORY_TOOLTIPS[category] || category}
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full cursor-help uppercase tracking-wide ${CATEGORY_COLORS[category] || 'bg-[var(--color-muted)]/10 text-[var(--color-text-muted)]'}`}
              >
                {category}
              </TagTooltip>
            )}
            {priceTier && (
              <TagTooltip
                tip={PRICE_TIER_TOOLTIPS[priceTier] || priceTier}
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full cursor-help uppercase tracking-wide ${PRICE_TIER_COLORS[priceTier] || 'bg-[var(--color-muted)]/10 text-[var(--color-text-muted)]'}`}
              >
                {priceTier}
              </TagTooltip>
            )}
          </div>
        )}
        <p className="text-[var(--color-text-muted)] text-xs mt-0.5">{reason}</p>
      </div>
    </div>
  )
}
