const MANA_SYMBOL_IDS = new Set(['W', 'U', 'B', 'R', 'G', 'C'])

const FONT_SIZES = { sm: '0.875rem', md: '0.9rem', lg: '1.25rem' }

export default function ColorPips({ colors, size = 'md' }) {
  if (!colors || colors.length === 0) {
    return <span className="text-xs text-[var(--color-muted)]">—</span>
  }

  const fontSize = FONT_SIZES[size] ?? FONT_SIZES.md

  return (
    <div className="flex gap-1 items-center">
      {colors.map((c, idx) => {
        const id = c.toUpperCase()
        if (!MANA_SYMBOL_IDS.has(id)) return null
        return (
          <i
            key={idx}
            className={`ms ms-${id.toLowerCase()} ms-cost ms-shadow`}
            style={{ fontSize }}
            aria-label={id}
          />
        )
      })}
    </div>
  )
}
