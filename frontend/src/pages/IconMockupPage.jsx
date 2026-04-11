/**
 * DESIGN MOCKUP — Character icon options for ProfilePage avatar picker.
 * Review at /mockup — DELETE this file after a direction is chosen.
 *
 * Three directions:
 *  A) Color-coded circles — MTG color identity per archetype, bigger icon fill
 *  B) Bare icon — no container, same visual treatment as mana symbols
 *  C) Portrait cards — rectangular tiles, name label, character-select vibe
 */
import { CreaturePresetIcon } from '../lib/creatureIcons'

const CREATURES = [
  { id: 'dragon',  label: 'Dragon'  },
  { id: 'goblin',  label: 'Goblin'  },
  { id: 'wizard',  label: 'Wizard'  },
  { id: 'angel',   label: 'Angel'   },
  { id: 'zombie',  label: 'Zombie'  },
  { id: 'elf',     label: 'Elf'     },
  { id: 'vampire', label: 'Vampire' },
  { id: 'merfolk', label: 'Merfolk' },
]

// Per-archetype MTG color identity
const T = {
  dragon:  { bg: 'linear-gradient(135deg, #991b1b, #c2410c)', icon: '#fed7aa', glow: '#ef4444' },
  goblin:  { bg: 'linear-gradient(135deg, #c2410c, #d97706)', icon: '#fef3c7', glow: '#f97316' },
  wizard:  { bg: 'linear-gradient(135deg, #1d4ed8, #4338ca)', icon: '#bfdbfe', glow: '#60a5fa' },
  angel:   { bg: 'linear-gradient(135deg, #ca8a04, #fcd34d)', icon: '#1e293b', glow: '#fbbf24' },
  zombie:  { bg: 'linear-gradient(135deg, #14532d, #1e3a1e)', icon: '#86efac', glow: '#4ade80' },
  elf:     { bg: 'linear-gradient(135deg, #15803d, #065f46)', icon: '#d1fae5', glow: '#34d399' },
  vampire: { bg: 'linear-gradient(135deg, #581c87, #881337)', icon: '#e9d5ff', glow: '#c084fc' },
  merfolk: { bg: 'linear-gradient(135deg, #0e7490, #1d4ed8)', icon: '#cffafe', glow: '#22d3ee' },
}

// The mana symbols on the page for visual comparison
const MANA_IDS = ['w', 'u', 'b', 'r', 'g', 'c', 'x', 's']

export default function IconMockupPage() {
  return (
    <div style={{ background: '#0a0f1a', minHeight: '100vh', padding: '2rem', fontFamily: 'Inter, sans-serif', color: '#f1f5f9' }}>
      <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', color: '#fbbf24', marginBottom: '0.25rem' }}>
        Icon Design Mockup
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
        Three directions for the character avatar icons. Mana symbols shown first as the visual benchmark they need to match.
      </p>

      {/* Benchmark: mana symbols */}
      <Section label="Benchmark — Mana symbols (current, looking good)">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {MANA_IDS.map(id => (
            <i key={id} className={`ms ms-${id} ms-cost ms-shadow`} style={{ fontSize: '2.5rem' }} />
          ))}
        </div>
        <Note>These render at ~40px and feel "full" because the pip design goes edge-to-edge on the glyph. This is the target visual weight.</Note>
      </Section>

      {/* Current state */}
      <Section label="Current — all same amber, small">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {CREATURES.map(c => (
            <div key={c.id} title={c.label} style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#1e293b', border: '1px solid #475569',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CreaturePresetIcon id={c.id} className="w-6 h-6 text-amber-400" />
            </div>
          ))}
        </div>
        <Note>40px container, 24px icon (60% fill). All #fbbf24 amber. No archetype distinction.</Note>
      </Section>

      {/* ────────────────────────────────────────────────
          OPTION A: Color-coded circles
      ──────────────────────────────────────────────── */}
      <Section label="Option A — Color-coded circles" tag="MTG color identity per archetype, icon fills ~80% of container">
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
          Same circular format as current, but: bigger container (44px), much larger icon (36px = 82% fill), gradient background matching each archetype's MTG color.
          Dragon=Red, Goblin=Red/Mountain, Wizard=Blue, Angel=White/Gold, Zombie=Black/Green, Elf=Green, Vampire=Black/Red, Merfolk=Blue/Cyan.
        </p>

        {/* 44px version */}
        <p style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.4rem' }}>44px container — same row as mana symbols:</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          {/* one mana as visual anchor */}
          <i className="ms ms-r ms-cost ms-shadow" style={{ fontSize: '2.5rem' }} />
          <span style={{ color: '#334155', fontSize: '0.75rem', margin: '0 0.25rem' }}>vs</span>
          {CREATURES.map(c => (
            <OptionACircle key={c.id} creature={c} size={44} iconSize={36} />
          ))}
        </div>

        {/* Active/selected state preview */}
        <p style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.4rem' }}>Selected state (with ring):</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          {CREATURES.map(c => (
            <OptionACircle key={c.id} creature={c} size={44} iconSize={36} selected />
          ))}
        </div>

        {/* How it looks in the picker row, full set */}
        <p style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.4rem' }}>As a picker row next to mana symbols (simulated profile section):</p>
        <MockPickerA />
      </Section>

      {/* ────────────────────────────────────────────────
          OPTION B: Bare icon, matches mana symbol size
      ──────────────────────────────────────────────── */}
      <Section label="Option B — No container, coloured SVG" tag="Matches mana symbol visual weight, no circle housing">
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
          No background circle. Icon SVG is sized to the same visual weight as the mana symbols (~40px). Each archetype gets its MTG color directly
          on the icon. Subtle drop-shadow for depth. Selection ring wraps the icon itself.
        </p>

        <p style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.4rem' }}>Next to mana symbols:</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <i className="ms ms-u ms-cost ms-shadow" style={{ fontSize: '2.5rem' }} />
          <span style={{ color: '#334155', fontSize: '0.75rem', margin: '0 0.25rem' }}>vs</span>
          {CREATURES.map(c => (
            <OptionBBare key={c.id} creature={c} />
          ))}
        </div>

        <p style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.4rem' }}>Selected state:</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          {CREATURES.map(c => (
            <OptionBBare key={c.id} creature={c} selected />
          ))}
        </div>

        <MockPickerB />
      </Section>

      {/* ────────────────────────────────────────────────
          OPTION C: Portrait cards
      ──────────────────────────────────────────────── */}
      <Section label="Option C — Portrait cards" tag="Character-select vibe, name label, rectangular tiles">
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
          Shifts away from circles. Each archetype gets a small rectangular card (48×56px) with gradient bg,
          large centered icon, and name in tiny text. More like a card game / character select UI.
          The mana symbols would stay as circles; creatures get this distinct card treatment to differentiate the two categories visually.
        </p>

        <p style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.4rem' }}>Default state:</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1rem' }}>
          {CREATURES.map(c => (
            <OptionCCard key={c.id} creature={c} />
          ))}
        </div>

        <p style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.4rem' }}>Selected state:</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1rem' }}>
          {CREATURES.map(c => (
            <OptionCCard key={c.id} creature={c} selected />
          ))}
        </div>

        {/* How the full picker looks: mana symbols row + cards row */}
        <MockPickerC />
      </Section>

      {/* Summary */}
      <div style={{ marginTop: '3rem', padding: '1.25rem', background: '#111827', borderRadius: '0.75rem', border: '1px solid #1e293b' }}>
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#fbbf24', marginBottom: '0.75rem' }}>Summary</p>
        <ul style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.7, paddingLeft: '1.25rem' }}>
          <li><strong style={{ color: '#e2e8f0' }}>Option A</strong> — Least disruptive. Same shape as mana symbols, keeps the row unified. Color-coding solves the identity problem. Sizing up solves the small/padding problem.</li>
          <li><strong style={{ color: '#e2e8f0' }}>Option B</strong> — Closest visual parity to mana symbols. Clean, minimal. Works if the SVG silhouettes feel strong enough without a container. Slightly harder to see on light backgrounds.</li>
          <li><strong style={{ color: '#e2e8f0' }}>Option C</strong> — Most distinctive and expressive. Deliberately separates "mana symbols = circles" from "creatures = cards". More visual real estate per icon means better legibility. Best for showing character personality.</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function Section({ label, tag, children }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#e2e8f0', margin: 0 }}>{label}</h2>
        {tag && <span style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>{tag}</span>}
      </div>
      <div style={{ height: 1, background: 'linear-gradient(to right, #334155, transparent)', marginBottom: '1rem' }} />
      {children}
    </div>
  )
}

function Note({ children }) {
  return <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem', fontStyle: 'italic' }}>{children}</p>
}

function OptionACircle({ creature, size = 44, iconSize = 36, selected = false }) {
  const theme = T[creature.id]
  return (
    <div title={creature.label} style={{
      width: size, height: size, borderRadius: '50%',
      background: theme.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: selected
        ? `0 0 0 2px #0a0f1a, 0 0 0 4px ${theme.glow}, 0 4px 12px ${theme.glow}44`
        : `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.5)`,
      transform: selected ? 'scale(1.1)' : 'scale(1)',
      transition: 'all 0.15s',
      flexShrink: 0,
    }}>
      <div style={{ color: theme.icon, width: iconSize, height: iconSize, display: 'flex' }}>
        <CreaturePresetIcon id={creature.id} className={`w-full h-full`} />
      </div>
    </div>
  )
}

function OptionBBare({ creature, selected = false }) {
  const theme = T[creature.id]
  const size = 42
  return (
    <div title={creature.label} style={{
      width: size, height: size,
      borderRadius: selected ? '50%' : '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: selected ? `0 0 0 2px #0a0f1a, 0 0 0 3.5px ${theme.glow}` : 'none',
      transform: selected ? 'scale(1.1)' : 'scale(1)',
      transition: 'all 0.15s',
      flexShrink: 0,
    }}>
      <div style={{
        color: theme.icon,
        width: size - 2, height: size - 2,
        filter: `drop-shadow(0 2px 6px ${theme.glow}88)`,
      }}>
        <CreaturePresetIcon id={creature.id} className="w-full h-full" />
      </div>
    </div>
  )
}

function OptionCCard({ creature, selected = false }) {
  const theme = T[creature.id]
  return (
    <div title={creature.label} style={{
      width: 50, height: 62,
      borderRadius: 8,
      background: theme.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3,
      boxShadow: selected
        ? `0 0 0 2px #0a0f1a, 0 0 0 4px ${theme.glow}, 0 4px 14px ${theme.glow}66`
        : `inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.6)`,
      transform: selected ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
      transition: 'all 0.15s',
      border: selected ? `1px solid ${theme.glow}99` : '1px solid rgba(255,255,255,0.08)',
      flexShrink: 0,
    }}>
      <div style={{ color: theme.icon, width: 34, height: 34, display: 'flex' }}>
        <CreaturePresetIcon id={creature.id} className="w-full h-full" />
      </div>
      <span style={{
        fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.06em',
        color: theme.icon, opacity: 0.9, fontWeight: 600, lineHeight: 1,
      }}>
        {creature.label}
      </span>
    </div>
  )
}

// ─── Full picker simulations ──────────────────────────────────

function MockPickerA() {
  const mana = ['w', 'u', 'b', 'r', 'g', 'c', 'x', 's', 'e', 'p', 'chaos', 'tap', 'planeswalker']
  return (
    <div style={{ background: '#111827', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #1e293b' }}>
      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>Mana symbols</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {mana.map(id => <i key={id} className={`ms ms-${id} ms-cost ms-shadow`} style={{ fontSize: '2.5rem' }} />)}
      </div>
      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>Characters</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {CREATURES.map((c, i) => <OptionACircle key={c.id} creature={c} size={44} iconSize={36} selected={i === 2} />)}
      </div>
    </div>
  )
}

function MockPickerB() {
  const mana = ['w', 'u', 'b', 'r', 'g', 'c', 'x', 's', 'e', 'p', 'chaos', 'tap', 'planeswalker']
  return (
    <div style={{ background: '#111827', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #1e293b' }}>
      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>Mana symbols</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {mana.map(id => <i key={id} className={`ms ms-${id} ms-cost ms-shadow`} style={{ fontSize: '2.5rem' }} />)}
      </div>
      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>Characters</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {CREATURES.map((c, i) => <OptionBBare key={c.id} creature={c} selected={i === 2} />)}
      </div>
    </div>
  )
}

function MockPickerC() {
  const mana = ['w', 'u', 'b', 'r', 'g', 'c', 'x', 's', 'e', 'p', 'chaos', 'tap', 'planeswalker']
  return (
    <div style={{ background: '#111827', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #1e293b' }}>
      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>Mana symbols</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
        {mana.map(id => <i key={id} className={`ms ms-${id} ms-cost ms-shadow`} style={{ fontSize: '2.5rem' }} />)}
      </div>
      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem' }}>Characters</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {CREATURES.map((c, i) => <OptionCCard key={c.id} creature={c} selected={i === 2} />)}
      </div>
    </div>
  )
}
