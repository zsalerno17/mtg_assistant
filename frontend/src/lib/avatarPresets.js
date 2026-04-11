// MTG mana pip–style avatar presets.
// Each SVG mimics the colored mana pip circles from MTG cards (80×80).

export const AVATAR_PRESETS = [
  {
    // White mana (W): cream/gold pip with 8-point sunburst
    id: 'white',
    label: 'White (W)',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="38" fill="#6b4a0e"/>
  <circle cx="40" cy="40" r="33" fill="#d4a820"/>
  <circle cx="40" cy="40" r="29" fill="#f2dc6a"/>
  <!-- 4 long cardinal rays -->
  <polygon points="40,12 37.5,25 42.5,25" fill="#6b4a0e"/>
  <polygon points="40,68 37.5,55 42.5,55" fill="#6b4a0e"/>
  <polygon points="12,40 25,37.5 25,42.5" fill="#6b4a0e"/>
  <polygon points="68,40 55,37.5 55,42.5" fill="#6b4a0e"/>
  <!-- 4 short diagonal rays (rotate trick) -->
  <polygon points="40,19 37.8,28 42.2,28" fill="#6b4a0e" transform="rotate(45,40,40)"/>
  <polygon points="40,19 37.8,28 42.2,28" fill="#6b4a0e" transform="rotate(135,40,40)"/>
  <polygon points="40,19 37.8,28 42.2,28" fill="#6b4a0e" transform="rotate(225,40,40)"/>
  <polygon points="40,19 37.8,28 42.2,28" fill="#6b4a0e" transform="rotate(315,40,40)"/>
  <!-- Center -->
  <circle cx="40" cy="40" r="9" fill="#6b4a0e"/>
  <circle cx="40" cy="40" r="6" fill="#f2dc6a"/>
</svg>`,
  },
  {
    // Blue mana (U): blue pip with teardrop
    id: 'blue',
    label: 'Blue (U)',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="38" fill="#071d42"/>
  <circle cx="40" cy="40" r="33" fill="#1244a0"/>
  <circle cx="40" cy="40" r="29" fill="#2468c8"/>
  <!-- Teardrop (rounded bottom, pointed top) -->
  <path d="M40,14 C37,23 25,34 25,44 C25,53.9 31.8,60 40,60 C48.2,60 55,53.9 55,44 C55,34 43,23 40,14Z" fill="#071d42"/>
  <path d="M40,20 C38,28 29,37 29,44 C29,51.4 34,57 40,57 C46,57 51,51.4 51,44 C51,37 42,28 40,20Z" fill="#1244a0"/>
  <!-- specular -->
  <ellipse cx="35" cy="39" rx="3" ry="5.5" fill="#88c0f0" opacity="0.35" transform="rotate(-18,35,39)"/>
</svg>`,
  },
  {
    // Black mana (B): dark pip with skull
    id: 'black',
    label: 'Black (B)',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="38" fill="#040408"/>
  <circle cx="40" cy="40" r="33" fill="#140e1c"/>
  <circle cx="40" cy="40" r="29" fill="#1e1428"/>
  <!-- Skull cranium -->
  <ellipse cx="40" cy="33" rx="15.5" ry="14.5" fill="#040408"/>
  <!-- Jaw -->
  <rect x="29" y="42" width="22" height="12" rx="4" fill="#040408"/>
  <!-- Eye sockets -->
  <ellipse cx="33.5" cy="32" rx="5" ry="5.5" fill="#1e1428"/>
  <ellipse cx="46.5" cy="32" rx="5" ry="5.5" fill="#1e1428"/>
  <!-- Nasal cavity -->
  <path d="M38.5,40.5 L40,37 L41.5,40.5Z" fill="#1e1428"/>
  <!-- Teeth slots -->
  <rect x="31" y="44" width="3" height="7" rx="1" fill="#1e1428"/>
  <rect x="36" y="44" width="3" height="8" rx="1" fill="#1e1428"/>
  <rect x="41" y="44" width="3" height="8" rx="1" fill="#1e1428"/>
  <rect x="46" y="44" width="3" height="7" rx="1" fill="#1e1428"/>
</svg>`,
  },
  {
    // Red mana (R): red pip with three mountain peaks
    id: 'red',
    label: 'Red (R)',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="38" fill="#4e1005"/>
  <circle cx="40" cy="40" r="33" fill="#c02008"/>
  <circle cx="40" cy="40" r="29" fill="#e03c10"/>
  <!-- Three mountain peaks (classic red mana symbol) -->
  <polygon points="16,60 29,30 42,60" fill="#4e1005"/>
  <polygon points="38,60 51,30 64,60" fill="#4e1005"/>
  <!-- Center peak (tallest) -->
  <polygon points="25,60 40,13 55,60" fill="#3a0d04"/>
  <!-- Snow cap on center peak -->
  <polygon points="35,26 40,13 45,26 42,31 38,31" fill="#e8e0d8"/>
  <!-- Lava glow at base -->
  <ellipse cx="40" cy="59" rx="19" ry="4" fill="#ff6020" opacity="0.5"/>
</svg>`,
  },
  {
    // Green mana (G): green pip with layered tree
    id: 'green',
    label: 'Green (G)',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="38" fill="#051e0c"/>
  <circle cx="40" cy="40" r="33" fill="#0e6820"/>
  <circle cx="40" cy="40" r="29" fill="#1a9030"/>
  <!-- Trunk -->
  <rect x="37.5" y="53" width="5" height="13" rx="2" fill="#051e0c"/>
  <!-- Bottom canopy tier -->
  <ellipse cx="40" cy="51" rx="17" ry="10" fill="#051e0c"/>
  <ellipse cx="40" cy="50" rx="15" ry="8.5" fill="#0e6820"/>
  <!-- Mid canopy tier -->
  <ellipse cx="40" cy="39" rx="13" ry="9" fill="#051e0c"/>
  <ellipse cx="40" cy="38" rx="11" ry="7.5" fill="#1a9030"/>
  <!-- Top canopy tier -->
  <ellipse cx="40" cy="27" rx="9" ry="7" fill="#051e0c"/>
  <ellipse cx="40" cy="26" rx="7.5" ry="6" fill="#0e6820"/>
</svg>`,
  },
  {
    // Colorless/Artifact: gray pip with faceted gem
    id: 'colorless',
    label: 'Colorless',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="38" fill="#222"/>
  <circle cx="40" cy="40" r="33" fill="#5c5c5c"/>
  <circle cx="40" cy="40" r="29" fill="#8a8a8a"/>
  <!-- Gem/diamond with 4 facets -->
  <polygon points="40,14 20,40 40,66 60,40" fill="#222"/>
  <!-- Left upper facet (lighter) -->
  <polygon points="40,14 20,40 40,38" fill="#404040"/>
  <!-- Right upper facet -->
  <polygon points="40,14 60,40 40,38" fill="#686868"/>
  <!-- Left lower facet (darker) -->
  <polygon points="20,40 40,66 40,38" fill="#2e2e2e"/>
  <!-- Right lower facet -->
  <polygon points="60,40 40,66 40,38" fill="#505050"/>
  <!-- Highlight on top edge -->
  <polygon points="40,14 34,30 46,30" fill="#c0c0c0" opacity="0.45"/>
</svg>`,
  },
  {
    // Multicolor/Gold: gold pip with crown + 3 colored gems
    id: 'gold',
    label: 'Multicolor',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="38" fill="#4a2c00"/>
  <circle cx="40" cy="40" r="33" fill="#b87000"/>
  <circle cx="40" cy="40" r="29" fill="#e09418"/>
  <!-- Crown band base -->
  <rect x="21" y="49" width="38" height="11" rx="3" fill="#4a2c00"/>
  <!-- Left prong -->
  <polygon points="21,49 21,59 32,59 32,49 21,29" fill="#4a2c00"/>
  <!-- Center prong (tallest) -->
  <polygon points="32,49 32,59 48,59 48,49 40,16" fill="#4a2c00"/>
  <!-- Right prong -->
  <polygon points="48,49 48,59 59,59 59,49 48,29" fill="#4a2c00"/>
  <!-- Gems (WUBRGesque) -->
  <circle cx="26.5" cy="37.5" r="4" fill="#e84040"/>
  <circle cx="40" cy="29" r="4.5" fill="#3878e0"/>
  <circle cx="53.5" cy="37.5" r="4" fill="#28b848"/>
</svg>`,
  },
  {
    // Planeswalker: purple pip with 5-pointed star (5 colors / spark)
    id: 'planeswalker',
    label: 'Planeswalker',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" r="38" fill="#140828"/>
  <circle cx="40" cy="40" r="33" fill="#2e1470"/>
  <circle cx="40" cy="40" r="29" fill="#4828a8"/>
  <!-- 5-pointed star — outer r=22, inner r=9, top point at (40,18) -->
  <!-- Outer: (40,18) (60.9,33.2) (52.9,57.8) (27.1,57.8) (19.1,33.2) -->
  <!-- Inner: (45.3,32.7) (48.6,42.8) (40,49) (31.4,42.8) (34.7,32.7) -->
  <polygon points="40,18 45.3,32.7 60.9,33.2 48.6,42.8 52.9,57.8 40,49 27.1,57.8 31.4,42.8 19.1,33.2 34.7,32.7" fill="#140828"/>
  <!-- Inner glow -->
  <polygon points="40,22 44.5,34 58,34.4 47.6,43 51.2,56 40,48 28.8,56 32.4,43 22,34.4 35.5,34" fill="#7858d8" opacity="0.35"/>
  <!-- Center spark -->
  <circle cx="40" cy="40" r="4" fill="#c0a0ff" opacity="0.7"/>
</svg>`,
  },
]

/** Returns a data URI usable as an <img> src for the given SVG string. */
export function svgDataUrl(svgString) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
}
