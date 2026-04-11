// MTG avatar presets — two categories:
//   1. Mana symbols via mana-font (imported in main.jsx)
//   2. Creature archetypes via creatureIcons.jsx SVGs
// Both stored in Supabase profiles as "preset:{id}" in the avatar_url column.

export const AVATAR_PRESETS = [
  { id: 'w',            label: 'White' },
  { id: 'u',            label: 'Blue' },
  { id: 'b',            label: 'Black' },
  { id: 'r',            label: 'Red' },
  { id: 'g',            label: 'Green' },
  { id: 'c',            label: 'Colorless' },
  { id: 'x',            label: 'Variable (X)' },
  { id: 's',            label: 'Snow' },
  { id: 'e',            label: 'Energy' },
  { id: 'p',            label: 'Phyrexian' },
  { id: 'chaos',        label: 'Chaos' },
  { id: 'tap',          label: 'Tap' },
  { id: 'planeswalker', label: 'Planeswalker' },
]

/** MTG creature archetype presets — rendered as inline SVGs. */
export const CREATURE_PRESETS = [
  { id: 'dragon',          label: 'Dragon',           bg: 'linear-gradient(135deg, #991b1b, #c2410c)', iconColor: '#fed7aa' },
  { id: 'goblin',          label: 'Goblin',           bg: 'linear-gradient(135deg, #c2410c, #d97706)', iconColor: '#fef3c7' },
  { id: 'wizard',          label: 'Wizard',           bg: 'linear-gradient(135deg, #1d4ed8, #4338ca)', iconColor: '#bfdbfe' },
  { id: 'zombie',          label: 'Zombie',           bg: 'linear-gradient(135deg, #14532d, #1e3a1e)', iconColor: '#86efac' },
  { id: 'elf',             label: 'Elf',              bg: 'linear-gradient(135deg, #15803d, #065f46)', iconColor: '#d1fae5' },
  { id: 'vampire',         label: 'Vampire',          bg: 'linear-gradient(135deg, #581c87, #881337)', iconColor: '#e9d5ff' },
  { id: 'vampire-bat',     label: 'Vampire (Bat)',    bg: 'linear-gradient(135deg, #581c87, #881337)', iconColor: '#e9d5ff' },
  { id: 'knight',          label: 'Knight',           bg: 'linear-gradient(135deg, #374151, #1e3a8a)', iconColor: '#e2e8f0' },
  { id: 'knight-mounted',  label: 'Knight (Mounted)', bg: 'linear-gradient(135deg, #374151, #1e3a8a)', iconColor: '#e2e8f0' },
  { id: 'rogue',           label: 'Rogue',            bg: 'linear-gradient(135deg, #0f172a, #1e293b)', iconColor: '#94a3b8' },
  { id: 'minotaur',        label: 'Minotaur',         bg: 'linear-gradient(135deg, #92400e, #7c2d12)', iconColor: '#fde68a' },
  { id: 'orc',             label: 'Orc',              bg: 'linear-gradient(135deg, #166534, #14532d)', iconColor: '#bbf7d0' },
  { id: 'dwarf',           label: 'Dwarf',            bg: 'linear-gradient(135deg, #78350f, #422006)', iconColor: '#fde68a' },
  { id: 'ninja',           label: 'Ninja',            bg: 'linear-gradient(135deg, #0f172a, #1e293b)', iconColor: '#e2e8f0' },
  { id: 'samurai',         label: 'Samurai',          bg: 'linear-gradient(135deg, #991b1b, #78350f)', iconColor: '#fde68a' },
  { id: 'griffin',         label: 'Griffin',          bg: 'linear-gradient(135deg, #92400e, #78350f)', iconColor: '#fef3c7' },
  { id: 'wyvern',          label: 'Wyvern',           bg: 'linear-gradient(135deg, #991b1b, #1d4ed8)', iconColor: '#fed7aa' },
  { id: 'skeleton',        label: 'Skeleton',         bg: 'linear-gradient(135deg, #374151, #111827)', iconColor: '#e5e7eb' },
  { id: 'pirate',          label: 'Pirate',           bg: 'linear-gradient(135deg, #1e3a8a, #78350f)', iconColor: '#fde68a' },
]

/** Lookup map for creature preset theme data by id. */
export const CREATURE_PRESET_MAP = Object.fromEntries(
  CREATURE_PRESETS.map(p => [p.id, p])
)

const CREATURE_IDS = new Set(CREATURE_PRESETS.map(p => p.id))

/** Returns true if a preset id is a creature archetype (vs mana symbol). */
export function isCreaturePreset(id) {
  return CREATURE_IDS.has(id)
}

const PRESET_PREFIX = 'preset:'

/** Returns true if an avatar_url is a mana symbol preset rather than a real URL. */
export function isPresetUrl(url) {
  return typeof url === 'string' && url.startsWith(PRESET_PREFIX)
}

/** Extracts the preset id (e.g. 'w') from a preset URL (e.g. 'preset:w'). */
export function urlToPresetId(url) {
  return url.slice(PRESET_PREFIX.length)
}

/** Converts a preset id to the storage URL string (e.g. 'w' → 'preset:w'). */
export function presetIdToUrl(id) {
  return `${PRESET_PREFIX}${id}`
}
