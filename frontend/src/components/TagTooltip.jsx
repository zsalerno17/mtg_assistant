// Small pill badge with a CSS tooltip on hover.
export default function TagTooltip({ children, tip, className }) {
  return (
    <span className="relative group/tag inline-flex">
      <span className={className}>{children}</span>
      {tip && (
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] leading-snug bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] whitespace-nowrap opacity-0 group-hover/tag:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
          {tip}
        </span>
      )}
    </span>
  )
}
