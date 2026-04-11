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
  { id: 'dragon',  label: 'Dragon' },
  { id: 'goblin',  label: 'Goblin' },
  { id: 'wizard',  label: 'Wizard' },
  { id: 'angel',   label: 'Angel' },
  { id: 'zombie',  label: 'Zombie' },
  { id: 'elf',     label: 'Elf' },
  { id: 'vampire', label: 'Vampire' },
  { id: 'merfolk', label: 'Merfolk' },
]

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
