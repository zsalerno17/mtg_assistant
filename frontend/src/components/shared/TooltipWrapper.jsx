import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function TooltipWrapper({ content, children }) {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const tooltipWidth = 250
    let left = rect.right + 8

    if (left + tooltipWidth > window.innerWidth - 16) {
      left = rect.left - tooltipWidth - 8
    }
    if (left < 16) {
      left = 16
    }

    setPosition({ top: rect.top, left })
    setShow(true)
  }

  return (
    <>
      <span onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)}>
        {children}
      </span>
      {show && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateY(-25%)',
            zIndex: 999999,
            pointerEvents: 'none',
          }}
          className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl text-xs text-[var(--color-text)]"
        >
          <div className="max-w-xs whitespace-normal">{content}</div>
        </div>,
        document.body
      )}
    </>
  )
}
