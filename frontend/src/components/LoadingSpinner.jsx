/**
 * Centered spinner with an optional text label.
 *
 * @param {string} [label] - Text shown next to the spinner. Omit for spinner-only.
 */
export default function LoadingSpinner({ label }) {
  return (
    <div className="flex items-center gap-3 py-12 justify-center">
      <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      {label && <span className="text-[var(--color-text-muted)] text-sm">{label}</span>}
    </div>
  )
}
