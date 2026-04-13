/**
 * Icons for league pages — Lucide React wrappers.
 * Each icon accepts className for sizing/color via Tailwind.
 */
import { Trophy, Crown, Swords, Flame } from 'lucide-react'

export function TrophyIcon({ className = 'w-10 h-10' }) {
  return <Trophy className={className} strokeWidth={2} aria-hidden="true" />
}

export function CrownIcon({ className = 'w-8 h-8' }) {
  return <Crown className={className} strokeWidth={2} aria-hidden="true" />
}

export function SwordsIcon({ className = 'w-10 h-10' }) {
  return <Swords className={className} strokeWidth={2} aria-hidden="true" />
}

export function FlameIcon({ className = 'w-4 h-4' }) {
  return <Flame className={className} strokeWidth={2} aria-hidden="true" />
}
