/**
 * AvatarDisplay — canonical avatar component used across the entire app.
 * Handles creature presets, mana-symbol presets, real image URLs, and initials fallback.
 * All callers should use this instead of inlining avatar logic.
 */
import { isPresetUrl, urlToPresetId, isCreaturePreset, CREATURE_PRESET_MAP } from '../lib/avatarPresets'
import { CreaturePresetIcon } from '../lib/creatureIcons'

const SIZES = {
  sm: { container: 'w-7 h-7',   icon: 'w-4 h-4', ms: '1.25rem' },
  md: { container: 'w-9 h-9',   icon: 'w-6 h-6', ms: '1.5rem'  },
  lg: { container: 'w-10 h-10', icon: 'w-7 h-7', ms: '1.75rem' },
  xl: { container: 'w-16 h-16', icon: 'w-10 h-10', ms: '2.5rem' },
}

const BORDER = '2px solid rgba(255,255,255,0.08)'

/**
 * @param {string|null} avatarUrl   - stored avatar URL (preset:// or real https://)
 * @param {string}      fallbackLabel - used for the initials fallback (first char)
 * @param {'sm'|'md'|'lg'|'xl'} size
 * @param {string}      alt         - img alt text
 * @param {string}      className   - extra classes on the root element
 */
export function AvatarDisplay({ avatarUrl, fallbackLabel, size = 'md', alt = 'Avatar', className = '' }) {
  const s = SIZES[size] || SIZES.md

  if (avatarUrl && isPresetUrl(avatarUrl)) {
    const id = urlToPresetId(avatarUrl)

    if (isCreaturePreset(id)) {
      const p = CREATURE_PRESET_MAP[id]
      return (
        <div
          className={`${s.container} rounded-full flex items-center justify-center overflow-hidden shrink-0 ${className}`}
          style={{ background: p?.bg ?? '#1e293b', color: p?.iconColor ?? '#94a3b8', border: BORDER }}
        >
          <CreaturePresetIcon id={id} className={s.icon} />
        </div>
      )
    }

    // Mana-symbol preset — bare icon element, no container circle
    return (
      <i
        className={`ms ms-${id} ms-cost ms-shadow shrink-0 ${className}`}
        style={{ fontSize: s.ms }}
        aria-label="profile icon"
      />
    )
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={alt}
        className={`${s.container} rounded-full object-cover shrink-0 ${className}`}
        style={{ border: BORDER }}
      />
    )
  }

  // Fallback: single initial
  const initial = fallbackLabel ? fallbackLabel.trim().slice(0, 1).toUpperCase() : '?'
  return (
    <div
      className={`${s.container} rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{ background: '#1e293b', border: BORDER }}
      aria-hidden="true"
    >
      <span className="text-[var(--color-text-muted)] font-semibold select-none">{initial}</span>
    </div>
  )
}
