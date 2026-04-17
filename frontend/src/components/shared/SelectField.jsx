/**
 * SelectField — styled <select> wrapper used across the app.
 *
 * Props:
 *   value, onChange, disabled, className  — passed through / merged
 *   children                              — <option> elements
 *   All other native <select> props are forwarded.
 */
export default function SelectField({ className = '', children, ...props }) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        {...props}
        className="
          w-full appearance-none
          bg-[var(--color-bg)]
          border border-[var(--color-border)]
          rounded-lg
          pl-3 pr-8 py-2
          text-sm text-[var(--color-text)]
          focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
        "
      >
        {children}
      </select>
      {/* Custom chevron — sits flush inside the right edge */}
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  )
}
