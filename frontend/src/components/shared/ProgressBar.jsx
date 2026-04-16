export default function ProgressBar({ value, max, color, height = 'h-2', className = '' }) {
  const pct = Math.min((value / max) * 100, 100)

  return (
    <div className={`${height} bg-[var(--color-border)] rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}
