/**
 * SVG icons for league pages — replacements for emoji decorations.
 * Each icon accepts className for sizing/color via Tailwind.
 */

export function TrophyIcon({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

export function CrownIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 19h19v2h-19zM22.5 7l-5 5-5.5-7L6.5 12l-5-5 2 14h18z" />
    </svg>
  )
}

export function SwordsIcon({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
      <path d="M9.5 6.5 21 18v3h-3L6.5 9.5" />
      <path d="M11 5l-6 6" />
      <path d="M8 8 4 4" />
      <path d="M5 3 3 5" />
    </svg>
  )
}

export function FlameIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-3.147 2.4-5.858 5-8.514.357-.365.714-.727 1.056-1.1C11.37 6.065 11.67 5.7 12 5c.33.7.63 1.065.944 1.386.342.373.699.735 1.056 1.1C16.6 10.142 19 12.853 19 16c0 3.866-3.134 7-7 7zm0-14.16C9.948 11.14 7 13.88 7 16c0 2.757 2.243 5 5 5s5-2.243 5-5c0-2.12-2.948-4.86-5-7.16z" />
    </svg>
  )
}
