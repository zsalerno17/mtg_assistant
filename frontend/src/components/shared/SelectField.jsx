import { useState, useRef, useEffect, Children } from 'react'
import { createPortal } from 'react-dom'

/**
 * SelectField — fully custom styled listbox that replaces <select>.
 *
 * API is intentionally identical to a native <select> so all call sites work
 * without changes:
 *   value, onChange(e)  — onChange receives a synthetic { target: { value } }
 *   disabled, id        — forwarded to the trigger button
 *   className           — applied to the outer wrapper div
 *   children            — <option value="...">Label</option> elements
 *
 * The dropdown is portalled to document.body to escape stacking contexts
 * (backdrop-filter, transform, etc.). Outside-click detection uses a
 * full-screen backdrop behind the dropdown — no document event listeners,
 * no scroll-capture races.
 */
export default function SelectField({ value, onChange, disabled, id, className = '', children }) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const triggerRef = useRef(null)

  // Parse <option> children into { value, label } pairs
  const options = Children.toArray(children)
    .filter((child) => child?.type === 'option')
    .map((child) => ({
      value: String(child.props.value ?? ''),
      label: child.props.children ?? '',
    }))

  const selected = options.find((o) => o.value === String(value ?? ''))
  const displayLabel = selected?.label ?? ''

  function calcStyle(rect) {
    const DROPDOWN_MAX_H = 240 // matches max-h-60
    const MARGIN = 4
    const spaceBelow = window.innerHeight - rect.bottom - MARGIN
    const spaceAbove = rect.top - MARGIN
    const openUpward = spaceBelow < DROPDOWN_MAX_H && spaceAbove > spaceBelow
    return {
      position: 'fixed',
      left: rect.left,
      minWidth: rect.width,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + MARGIN }
        : { top: rect.bottom + MARGIN }),
    }
  }

  // Reposition when open so the dropdown tracks the trigger if the page resizes
  useEffect(() => {
    if (!open || !triggerRef.current) return
    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setDropdownStyle(calcStyle(rect))
    }
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [open])

  function openDropdown() {
    if (disabled || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownStyle(calcStyle(rect))
    setOpen((o) => !o)
  }

  function select(val) {
    onChange?.({ target: { value: val } })
    setOpen(false)
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={openDropdown}
        className="
          w-full flex items-center justify-between gap-2
          bg-[var(--color-bg)]
          border border-[var(--color-border)]
          rounded-lg
          pl-3 pr-2.5 py-2
          text-sm text-left text-[var(--color-text)]
          focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          transition-colors
        "
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{displayLabel}</span>
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
          className={`shrink-0 text-[var(--color-text-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Portal: backdrop + dropdown panel */}
      {open && createPortal(
        <>
          {/* Transparent backdrop — clicking outside closes without any doc listeners */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onMouseDown={() => setOpen(false)}
          />
          {/* Dropdown panel sits above the backdrop */}
          <ul
            role="listbox"
            style={{ ...dropdownStyle, zIndex: 9999 }}
            className="
              bg-[var(--color-surface)]
              border border-[var(--color-border)]
              rounded-lg shadow-lg
              py-1
              max-h-60 overflow-y-auto
            "
          >
            {options.map((opt) => {
              const isSelected = opt.value === String(value ?? '')
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => { e.stopPropagation(); select(opt.value) }}
                  className={`
                    px-3 py-2 text-sm cursor-pointer select-none
                    ${isSelected
                      ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 font-medium'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-border)]/40'
                    }
                  `}
                >
                  {opt.label}
                </li>
              )
            })}
          </ul>
        </>,
        document.body
      )}
    </div>
  )
}
