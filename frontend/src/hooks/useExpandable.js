import { useState } from 'react'

/**
 * Manages expand/collapse state for multiple keyed lists.
 * @param {number} maxVisible - Number of items to show when collapsed.
 * @returns {{ expanded: object, toggle: (key: string) => void, visible: (key: string, items: any[]) => any[] }}
 */
export function useExpandable(maxVisible = 5) {
  const [expanded, setExpanded] = useState({})

  function toggle(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function visible(key, items) {
    return expanded[key] ? items : items.slice(0, maxVisible)
  }

  return { expanded, toggle, visible }
}
