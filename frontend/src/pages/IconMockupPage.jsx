/**
 * DESIGN MOCKUP — Character icon alternatives from game-icons.net (CC-BY-3.0)
 * Review at /mockup — DELETE this file after icons are chosen.
 *
 * Gold ring = USER-CONFIRMED choice.
 * Vampire and Knight each have TWO confirmed picks.
 */
import { ICON_PATHS } from '../lib/iconAlternatives'

const THEME = {
  dragon:    { bg: 'linear-gradient(135deg, #991b1b, #c2410c)', icon: '#fed7aa', glow: '#ef4444' },
  goblin:    { bg: 'linear-gradient(135deg, #c2410c, #d97706)', icon: '#fef3c7', glow: '#f97316' },
  wizard:    { bg: 'linear-gradient(135deg, #1d4ed8, #4338ca)', icon: '#bfdbfe', glow: '#60a5fa' },
  zombie:    { bg: 'linear-gradient(135deg, #14532d, #1e3a1e)', icon: '#86efac', glow: '#4ade80' },
  elf:       { bg: 'linear-gradient(135deg, #15803d, #065f46)', icon: '#d1fae5', glow: '#34d399' },
  vampire:   { bg: 'linear-gradient(135deg, #581c87, #881337)', icon: '#e9d5ff', glow: '#c084fc' },
  knight:    { bg: 'linear-gradient(135deg, #374151, #1e3a8a)', icon: '#e2e8f0', glow: '#94a3b8' },
  barbarian: { bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)', icon: '#fca5a5', glow: '#ef4444' },
  rogue:     { bg: 'linear-gradient(135deg, #0f172a, #1e293b)', icon: '#94a3b8', glow: '#475569' },
  werewolf:  { bg: 'linear-gradient(135deg, #15803d, #1e293b)', icon: '#bbf7d0', glow: '#4ade80' },
  minotaur:  { bg: 'linear-gradient(135deg, #92400e, #7c2d12)', icon: '#fde68a', glow: '#f59e0b' },
  orc:       { bg: 'linear-gradient(135deg, #166534, #14532d)', icon: '#bbf7d0', glow: '#4ade80' },
  dwarf:     { bg: 'linear-gradient(135deg, #78350f, #422006)', icon: '#fde68a', glow: '#f59e0b' },
  ninja:     { bg: 'linear-gradient(135deg, #0f172a, #1e293b)', icon: '#e2e8f0', glow: '#64748b' },
  samurai:   { bg: 'linear-gradient(135deg, #991b1b, #78350f)', icon: '#fde68a', glow: '#ef4444' },
  troll:     { bg: 'linear-gradient(135deg, #166534, #052e16)', icon: '#d1fae5', glow: '#34d399' },
  griffin:   { bg: 'linear-gradient(135deg, #92400e, #78350f)', icon: '#fef3c7', glow: '#fbbf24' },
  centaur:   { bg: 'linear-gradient(135deg, #166534, #92400e)', icon: '#d1fae5', glow: '#34d399' },
  wyvern:    { bg: 'linear-gradient(135deg, #991b1b, #1d4ed8)', icon: '#fed7aa', glow: '#ef4444' },
  hydra:     { bg: 'linear-gradient(135deg, #14532d, #052e16)', icon: '#86efac', glow: '#4ade80' },
  golem:     { bg: 'linear-gradient(135deg, #374151, #1f2937)', icon: '#d1d5db', glow: '#6b7280' },
  skeleton:  { bg: 'linear-gradient(135deg, #374151, #111827)', icon: '#e5e7eb', glow: '#9ca3af' },
  wolf:      { bg: 'linear-gradient(135deg, #374151, #1e3a8a)', icon: '#dbeafe', glow: '#60a5fa' },
  pirate:    { bg: 'linear-gradient(135deg, #1e3a8a, #78350f)', icon: '#fde68a', glow: '#fbbf24' },
  siren:     { bg: 'linear-gradient(135deg, #0e7490, #1d4ed8)', icon: '#cffafe', glow: '#22d3ee' },
}

// selectedSet: indices with gold rings (your confirmed picks)
const GROUPS = [
  {
    key: 'dragon', archetype: 'dragon', label: 'Dragon',
    selectedSet: new Set([0]),
    icons: [
      ['spiked-dragon-head', 'Spiked Dragon Head ★'],
      ['dragon-head',        'Dragon Head'],
      ['double-dragon',      'Double Dragon'],
      ['dragon-spiral',      'Dragon Spiral'],
      ['sea-dragon',         'Sea Dragon'],
      ['drakkar-dragon',     'Drakkar Dragon'],
    ],
  },
  {
    key: 'goblin', archetype: 'goblin', label: 'Goblin',
    selectedSet: new Set([0]),
    icons: [
      ['goblin-head', 'Goblin Head ★'],
      ['goblin',      'Goblin Body'],
    ],
  },
  {
    key: 'wizard', archetype: 'wizard', label: 'Wizard / Spellcaster',
    selectedSet: new Set([0]),
    icons: [
      ['witch-flight', 'Witch in Flight ★'],
      ['wizard-face',  'Wizard Face'],
      ['wizard-staff', 'Wizard with Staff'],
      ['witch-face',   'Witch Face'],
      ['warlock-hood', 'Warlock Hood'],
      ['warlock-eye',  'Warlock Eye'],
    ],
  },
  {
    key: 'zombie', archetype: 'zombie', label: 'Zombie / Undead',
    selectedSet: new Set([0]),
    icons: [
      ['shambling-zombie', 'Shambling Zombie ★'],
      ['raise-zombie',     'Raise Zombie'],
    ],
  },
  {
    key: 'elf', archetype: 'elf', label: 'Elf',
    selectedSet: new Set([0]),
    icons: [
      ['elf-helmet',     'Elf Helmet ★'],
      ['elf-ear',        'Elf Ear'],
      ['woman-elf-face', 'Woman Elf Face'],
      ['fairy',          'Fairy'],
      ['fairy-wings',    'Fairy Wings'],
    ],
  },
  {
    key: 'vampire', archetype: 'vampire', label: 'Vampire',
    selectedSet: new Set([0, 1]),  // TWO picks — both become avatar entries
    icons: [
      ['resting-vampire', 'Resting Vampire ★'],
      ['evil-bat',        'Evil Bat ★'],
      ['vampire-dracula', 'Vampire Dracula'],
      ['vampire-cape',    'Vampire Cape'],
      ['female-vampire',  'Female Vampire'],
    ],
  },
  {
    key: 'knight', archetype: 'knight', label: 'Knight',
    selectedSet: new Set([0, 1]),
    icons: [
      ['black-knight-helm', 'Black Knight Helm ★'],
      ['mounted-knight',    'Mounted Knight ★'],
      ['knight-banner',     'Knight w/ Banner'],
      ['chess-knight',      'Chess Knight'],
    ],
  },
  {
    key: 'rogue', archetype: 'rogue', label: 'Rogue / Assassin',
    selectedSet: new Set([0]),
    icons: [
      ['rogue',           'Rogue ★'],
      ['hooded-assassin', 'Hooded Assassin'],
    ],
  },
  {
    key: 'minotaur', archetype: 'minotaur', label: 'Minotaur',
    selectedSet: new Set([0]),
    icons: [
      ['minotaur', 'Minotaur ★'],
    ],
  },
  {
    key: 'orc', archetype: 'orc', label: 'Orc',
    selectedSet: new Set([0]),
    icons: [
      ['orc-head', 'Orc Head ★'],
    ],
  },
  {
    key: 'dwarf', archetype: 'dwarf', label: 'Dwarf',
    selectedSet: new Set([1]),
    icons: [
      ['dwarf-helmet', 'Dwarf Helmet'],
      ['dwarf-face',   'Dwarf Face ★'],
      ['dwarf-king',   'Dwarf King'],
    ],
  },
  {
    key: 'ninja', archetype: 'ninja', label: 'Ninja',
    selectedSet: new Set([0]),
    icons: [
      ['ninja-head', 'Ninja Head ★'],
      ['ninja-mask', 'Ninja Mask'],
    ],
  },
  {
    key: 'samurai', archetype: 'samurai', label: 'Samurai',
    selectedSet: new Set([0]),
    icons: [
      ['samurai-helmet', 'Samurai Helmet ★'],
    ],
  },
  {
    key: 'griffin', archetype: 'griffin', label: 'Griffin',
    selectedSet: new Set([0]),
    icons: [
      ['griffin-symbol', 'Griffin ★'],
    ],
  },
  {
    key: 'wyvern', archetype: 'wyvern', label: 'Wyvern',
    selectedSet: new Set([0]),
    icons: [
      ['wyvern', 'Wyvern ★'],
    ],
  },
  {
    key: 'skeleton', archetype: 'skeleton', label: 'Skeleton',
    selectedSet: new Set([1]),
    icons: [
      ['skeleton',       'Skeleton'],
      ['raise-skeleton', 'Raise Skeleton ★'],
    ],
  },
  {
    key: 'pirate', archetype: 'pirate', label: 'Pirate',
    selectedSet: new Set([0]),
    icons: [
      ['pirate-captain', 'Pirate Captain ★'],
      ['pirate-hat',     'Pirate Hat'],
    ],
  },
]

const OTHER_ARCHETYPES = [
  { key: 'barbarian', archetype: 'barbarian', label: 'Barbarian',  icons: [['barbarian', 'Barbarian']] },
  { key: 'werewolf',  archetype: 'werewolf',  label: 'Werewolf',   icons: [['werewolf', 'Werewolf']] },
  { key: 'troll',     archetype: 'troll',     label: 'Troll',      icons: [['troll', 'Troll']] },
  { key: 'centaur',   archetype: 'centaur',   label: 'Centaur',    icons: [['centaur', 'Centaur']] },
  { key: 'hydra',     archetype: 'hydra',     label: 'Hydra',      icons: [['hydra', 'Hydra']] },
  { key: 'golem',     archetype: 'golem',     label: 'Golem',      icons: [['golem-head', 'Golem Head']] },
  { key: 'wolf',      archetype: 'wolf',      label: 'Wolf',       icons: [['wolf-head', 'Wolf Head'], ['direwolf', 'Direwolf']] },
  { key: 'siren',     archetype: 'siren',     label: 'Siren',      icons: [['siren', 'Siren']] },
]

function GameIcon({ body, color, size }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size}
      style={{ color, display: 'block', flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}

function Circle({ iconKey, archetype, label, isCurrent }) {
  const theme = THEME[archetype]
  const body = ICON_PATHS[iconKey]
  const size = 52
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: theme.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: isCurrent
          ? `0 0 0 2px #0a0f1a, 0 0 0 4px #fbbf24, 0 4px 12px #fbbf2444`
          : `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.5)`,
        border: isCurrent ? '1px solid #fbbf2466' : '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {body
          ? <GameIcon body={body} color={theme.icon} size={40} />
          : <span style={{ color: theme.icon, fontSize: 10 }}>?</span>
        }
      </div>
      <span style={{
        fontSize: '0.6rem', color: isCurrent ? '#fbbf24' : '#64748b',
        textAlign: 'center', maxWidth: 64, lineHeight: 1.3,
      }}>
        {label}
      </span>
    </div>
  )
}

export default function IconMockupPage() {
  // Flatten confirmed picks for the picker preview row
  const confirmedPicks = GROUPS.flatMap(g =>
    g.icons
      .filter((_, i) => g.selectedSet.has(i))
      .map(([key]) => ({ key, archetype: g.archetype }))
  )

  return (
    <div style={{ background: '#0a0f1a', minHeight: '100vh', padding: '2rem', fontFamily: 'Inter, sans-serif', color: '#f1f5f9' }}>
      <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', color: '#fbbf24', marginBottom: '0.25rem' }}>
        Icon Selection — Confirmed Picks + New Options
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
        <strong style={{ color: '#e2e8f0' }}>Gold ring = confirmed pick.</strong>{' '}
        All picks finalized. Vampire and Knight each have 2 selections.
      </p>
      <p style={{ color: '#475569', fontSize: '0.8rem', marginBottom: '2.5rem' }}>
        Scroll down past the picker preview to see 8 remaining archetypes (not yet added).
      </p>

      {/* ── Confirmed archetypes ── */}
      {GROUPS.map(group => (
        <div key={group.key} style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#e2e8f0', margin: 0 }}>
              {group.label}
            </h2>
            {group.selectedSet.size > 1 && (
              <span style={{ fontSize: '0.65rem', background: '#1e293b', color: '#94a3b8', padding: '2px 7px', borderRadius: 4 }}>
                {group.selectedSet.size} selected
              </span>
            )}
            <span style={{ fontSize: '0.7rem', color: '#334155' }}>
              {group.icons.length} option{group.icons.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ height: 1, background: 'linear-gradient(to right, #1e293b, transparent)', marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {group.icons.map(([iconKey, label], idx) => (
              <Circle
                key={iconKey}
                iconKey={iconKey}
                archetype={group.archetype}
                label={label}
                isCurrent={group.selectedSet.has(idx)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Full picker preview ── */}
      <div style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#e2e8f0', marginBottom: '0.5rem' }}>
          Full picker preview (confirmed picks, dragon selected for demo)
        </h2>
        <div style={{ height: 1, background: 'linear-gradient(to right, #1e293b, transparent)', marginBottom: '0.75rem' }} />
        <div style={{ background: '#111827', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #1e293b' }}>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>Mana symbols</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
            {['w','u','b','r','g','c','x','s','e','p','chaos','tap','planeswalker'].map(id => (
              <i key={id} className={`ms ms-${id} ms-cost ms-shadow`} style={{ fontSize: '2.5rem' }} />
            ))}
          </div>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>
            Characters — {confirmedPicks.length} avatars (vampire counts as 2)
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {confirmedPicks.map(({ key: iconKey, archetype }, idx) => {
              const theme = THEME[archetype]
              const body = ICON_PATHS[iconKey]
              const isSelected = idx === 0
              return (
                <div key={`${iconKey}-${idx}`} style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: theme.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: isSelected
                    ? `0 0 0 2px #111827, 0 0 0 3.5px ${theme.glow}, 0 4px 12px ${theme.glow}44`
                    : `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.5)`,
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  flexShrink: 0,
                }}>
                  {body && <GameIcon body={body} color={theme.icon} size={34} />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Other archetypes gallery ── */}
      <div>
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#fbbf24', marginBottom: '0.25rem' }}>
          Other Available Archetypes
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '2rem' }}>
          18 more creature types available from game-icons.net. Tell me which ones to add.
        </p>
        {OTHER_ARCHETYPES.map(group => (
          <div key={group.key} style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: '#cbd5e1', margin: 0 }}>
                {group.label}
              </h3>
              <span style={{ fontSize: '0.7rem', color: '#334155' }}>
                {group.icons.length} option{group.icons.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ height: 1, background: 'linear-gradient(to right, #1e293b, transparent)', marginBottom: '0.75rem' }} />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {group.icons.map(([iconKey, label]) => (
                <Circle key={iconKey} iconKey={iconKey} archetype={group.archetype} label={label} isCurrent={false} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
