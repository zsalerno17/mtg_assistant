import { useState } from 'react';
import { motion } from 'framer-motion';
import CardTooltip from './CardTooltip';

const COLOR_CONFIG = {
  W: { name: 'White' },
  U: { name: 'Blue' },
  B: { name: 'Black' },
  R: { name: 'Red' },
  G: { name: 'Green' },
};

const GUILD_NAMES = {
  'UW': 'Azorius', 'BW': 'Orzhov', 'RW': 'Boros', 'GW': 'Selesnya',
  'BU': 'Dimir', 'RU': 'Izzet', 'GU': 'Simic', 'BR': 'Rakdos',
  'BG': 'Golgari', 'GR': 'Gruul',
};

const SHARD_WEDGE_NAMES = {
  'GUW': 'Bant', 'BUW': 'Esper', 'BRU': 'Grixis', 'BGR': 'Jund', 'GRW': 'Naya',
  'BGW': 'Abzan', 'RUW': 'Jeskai', 'BGU': 'Sultai', 'BRW': 'Mardu', 'GRU': 'Temur',
};

const FOUR_COLOR_NAMES = {
  'BRUW': 'Yore-Tiller', 'BGUW': 'Witch-Maw', 'GRUW': 'Ink-Treader',
  'BGRW': 'Dune-Brood', 'BGRU': 'Glint-Eye',
};

// MTG-specialist reviewed descriptions for all color combinations
const COMBO_DESCRIPTIONS = {
  // Guilds
  'UW': 'Azorius — Control and taxation. Counterspells, board wipes, and pillowfort effects. Struggles with ramp but excels at staying alive.',
  'BW': 'Orzhov — Aristocrats and life drain. Sacrifice synergies, reanimation, and incremental drain win conditions.',
  'RW': 'Boros — Aggro and equipment. Commander damage, go-wide tokens, and combat tricks. The weakest pair for card draw and ramp.',
  'GW': 'Selesnya — Tokens and counters. Wide creature strategies, anthems, and lifegain. Good ramp, but lacks removal flexibility.',
  'BU': 'Dimir — Control and reanimation. Card draw, tutors, counterspells, and graveyard recursion. One of the most consistent pairs for combo.',
  'RU': 'Izzet — Spellslinger and combo. Instants/sorceries matter, copy effects, and wheels. Lacks targeted removal outside bounce and counters.',
  'GU': 'Simic — Ramp and card advantage. Land ramp, mana dorks, card draw, and big threats. Strong in midrange and infinite mana combos.',
  'BR': 'Rakdos — Aristocrats and reanimation. Sacrifice outlets, haste threats, efficient removal, and resource denial.',
  'BG': 'Golgari — Graveyard and recursion. Self-mill, reanimation, and sacrifice loops. Black tutors plus Green ramp makes this extremely consistent.',
  'GR': 'Gruul — Ramp and aggro. Ramp into large threats and deal combat damage quickly. Weak at card draw and interaction.',
  // Shards & Wedges
  'GUW': 'Bant — Value midrange. Ramp, counterspells, and ETB creatures. Strong flicker synergies and resilient threats.',
  'BUW': 'Esper — Artifacts and control. The premier artifact-matters combination. Counterspells, board wipes, tutors, and graveyard recursion.',
  'BRU': 'Grixis — Control and combo. Efficient answers, card draw, and combo lines. Strong in cEDH due to access to the best interaction.',
  'BGR': 'Jund — Midrange and attrition. Removal, wheels, and ramp. Strong in pods that want to grind value.',
  'GRW': 'Naya — Big creatures and tokens. Ramp into large threats and wide boards. Limited counterspell access — relies on being faster or bigger.',
  'BGW': 'Abzan — Resilient midrange. Ramp, removal, recursion, and +1/+1 counters. No countermagic but the most flexible removal suite of any wedge.',
  'RUW': 'Jeskai — Spellslinger and control. Counterspells, board wipes, and draw engines built around spell-casting triggers.',
  'BGU': 'Sultai — Combo and control. Tutors, counterspells, card draw, and self-mill. Arguably the strongest 3-color combination for competitive Commander.',
  'BRW': 'Mardu — Aggro and drain. Strong removal, fast threats, and reanimation. Lacks Green ramp, limiting consistency.',
  'GRU': 'Temur — Ramp and big spells. Large creatures, counterspells, and card draw. Lacks targeted removal and Black tutors.',
  // 4-color
  'BRUW': 'Yore-Tiller (no Green) — Artifacts, control, and aggro without ramp.',
  'BGUW': 'Witch-Maw (no Red) — Proliferate, counters, and slow value engines. Atraxa colors.',
  'GRUW': 'Ink-Treader (no Black) — Lands, spells, and creature synergies. Omnath colors.',
  'BGRW': 'Dune-Brood (no Blue) — Aggro, sacrifice, and wide boards. Saskia colors.',
  'BGRU': 'Glint-Eye (no White) — Cascade, chaos, and high-variance plays. Yidris colors.',
  // 5-color
  'BGRUW': 'Five-Color — All five colors. Maximum card access and flexibility, but high mana base requirements.',
};

// Status thresholds scaled by color count.
// Without scaling, 5-color would always be "Ready" since WUBRG includes every card.
const STATUS_THRESHOLDS = {
  1: { ready: 15, developing: 8  },
  2: { ready: 30, developing: 15 },
  3: { ready: 45, developing: 25 },
  4: { ready: 55, developing: 35 },
  5: { ready: 65, developing: 45 },
};

const STATUS_CONFIG = {
  ready:       { label: 'Ready to Build', color: 'var(--color-success, #22c55e)' },
  developing:  { label: 'Developing',     color: 'var(--color-warning, #f59e0b)' },
  'needs-cards': { label: 'Needs Cards',  color: 'var(--color-muted)' },
};

function getColorName(colors) {
  if (colors.length === 1) return COLOR_CONFIG[colors]?.name || colors;
  if (colors.length === 2) return GUILD_NAMES[colors] || colors;
  if (colors.length === 3) return SHARD_WEDGE_NAMES[colors] || colors;
  if (colors.length === 4) return FOUR_COLOR_NAMES[colors] || colors;
  if (colors.length === 5) return 'Five-Color';
  return colors;
}

function getStatus(pair) {
  const s = pair.deck_staples ?? 0;
  const t = STATUS_THRESHOLDS[pair.colors.length] || STATUS_THRESHOLDS[2];
  if (s >= t.ready)      return 'ready';
  if (s >= t.developing) return 'developing';
  return 'needs-cards';
}

export default function ColorIdentityMatrix({ colorData }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!colorData || !colorData.matrix) {
    return (
      <div className="text-center py-12 text-[var(--color-muted)]">
        <p className="text-sm">No color identity analysis available</p>
        <p className="text-xs mt-2">Upload your collection to see which color combinations you can build</p>
      </div>
    );
  }

  const { matrix, pairs = [], two_color = [], three_color = [], four_color = [], five_color = [] } = colorData;
  const colors = ['W', 'U', 'B', 'R', 'G'];
  const maxValue = Math.max(...matrix.flat().filter(v => v > 0), 1);

  const sections = [
    { title: 'Two-Color Guilds',  pairs: two_color  },
    { title: 'Three-Color',       pairs: three_color },
    { title: 'Four-Color',        pairs: four_color  },
    { title: 'Five-Color',        pairs: five_color  },
  ]
    .map(s => ({
      ...s,
      pairs: s.pairs.filter(p => p.card_count > 0).sort((a, b) => (b.deck_staples ?? 0) - (a.deck_staples ?? 0)),
    }))
    .filter(s => s.pairs.length > 0);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">
          Color Identity Building Blocks
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Which color combinations are well-supported by your collection
        </p>
      </div>

      {/* Heatmap Matrix */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Color Pair Strength Matrix</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-12 h-12" />
              {colors.map(color => (
                <th key={color} className="w-16 h-12 text-center">
                  <i className={`ms ms-${color.toLowerCase()} ms-cost ms-shadow`} style={{ fontSize: '1.25rem' }} aria-label={COLOR_CONFIG[color].name} title={COLOR_CONFIG[color].name} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((rowColor, i) => (
              <tr key={rowColor}>
                <th className="w-12 h-12 text-center">
                  <i className={`ms ms-${rowColor.toLowerCase()} ms-cost ms-shadow`} style={{ fontSize: '1.25rem' }} aria-label={COLOR_CONFIG[rowColor].name} title={COLOR_CONFIG[rowColor].name} />
                </th>
                {colors.map((colColor, j) => {
                  const value = matrix[i][j];
                  const intensity = value / maxValue;
                  const colorKey = i === j ? rowColor : [rowColor, colColor].sort().join('');
                  const pairData = pairs.find(p => p.colors === colorKey);

                  return (
                    <td
                      key={`${rowColor}-${colColor}`}
                      className="w-16 h-12 border border-[var(--color-border)] text-center relative cursor-pointer transition-all hover:scale-105 hover:z-10"
                      style={{ backgroundColor: intensity > 0 ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` : 'var(--color-bg)' }}
                      onMouseEnter={() => setHoveredCell({ pairData, colorKey, value })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${getColorName(colorKey)}: ${value} cards`}
                    >
                      <span className={`text-sm font-medium ${intensity > 0.5 ? 'text-white' : 'text-[var(--color-text)]'}`}>
                        {value > 0 ? value : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {hoveredCell?.pairData && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-xs"
          >
            <span className="font-semibold text-[var(--color-text)]">{getColorName(hoveredCell.colorKey)}</span>
            <span className="text-[var(--color-muted)] ml-2">
              {hoveredCell.pairData.card_count} cards · {hoveredCell.pairData.deck_staples ?? hoveredCell.pairData.staple_count} staples
            </span>
          </motion.div>
        )}

        <p className="mt-3 text-xs text-[var(--color-muted)]">Darker cells = more quality cards for that color pair</p>
      </div>

      {/* Staple count explanation */}
      <p className="text-xs text-[var(--color-muted)] px-1">
        Staple counts include all cards legally playable in that color identity (subset + colorless).
      </p>

      {/* Unified sections by color count — all combinations with status */}
      {sections.map(section => (
        <div key={section.title} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">{section.title}</h3>
          <div className="space-y-2">
            {section.pairs.map(pair => (
              <ColorPairCard key={pair.colors} pair={pair} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ColorPairCard({ pair }) {
  const [expanded, setExpanded] = useState(false);
  const colorName = getColorName(pair.colors);
  const status = getStatus(pair);
  const statusCfg = STATUS_CONFIG[status];
  const description = COMBO_DESCRIPTIONS[pair.colors];
  const deckStaples = pair.deck_staples ?? 0;
  const deckCardCount = pair.deck_card_count ?? pair.card_count ?? 0;

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[var(--color-bg)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ColorPips colors={pair.colors} />
          {description ? (
            <span
              className="text-sm font-medium text-[var(--color-text)] cursor-help border-b border-dotted border-[var(--color-muted)]"
              title={description}
            >
              {colorName}
            </span>
          ) : (
            <span className="text-sm font-medium text-[var(--color-text)]">{colorName}</span>
          )}
          <span className="text-xs text-[var(--color-muted)]">
            {deckStaples} staples · {deckCardCount} playable cards
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium" style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          <svg className={`w-4 h-4 text-[var(--color-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30 space-y-4">
          <CardUsageTable
            title="Commanders in your collection"
            cards={pair.commander_cards}
            emptyMessage="No legendary creatures in your collection for this color identity"
          />
          <CardUsageTable
            title="Staples"
            cards={pair.staple_cards}
            emptyMessage="No staples detected for this color identity"
          />
        </div>
      )}
    </div>
  );
}

function CardUsageTable({ title, cards, emptyMessage }) {
  if (!cards?.length) {
    return <p className="text-xs text-[var(--color-muted)] italic">{emptyMessage}</p>;
  }
  return (
    <div>
      <div className="text-xs text-[var(--color-muted)] mb-1.5">{title}:</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left py-1 text-[var(--color-muted)] font-medium">Card</th>
            <th className="text-center py-1 text-[var(--color-muted)] font-medium w-14">Owned</th>
            <th className="text-center py-1 text-[var(--color-muted)] font-medium w-14">In Use</th>
            <th className="text-center py-1 text-[var(--color-muted)] font-medium w-16">Available</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => (
            <tr key={card.name} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]/50">
              <td className="py-1.5">
                <CardTooltip cardName={card.name}>
                  <a
                    href={`https://scryfall.com/search?q=!%22${encodeURIComponent(card.name)}%22`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-link)] hover:underline"
                  >
                    {card.name}
                  </a>
                </CardTooltip>
              </td>
              <td className="text-center py-1.5 text-[var(--color-muted)]">{card.quantity}</td>
              <td className="text-center py-1.5 text-[var(--color-muted)]">{card.in_use}</td>
              <td
                className="text-center py-1.5 font-medium"
                style={{ color: card.available > 0 ? 'var(--color-success, #22c55e)' : 'var(--color-muted)' }}
              >
                {card.available}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColorPips({ colors, size = 'md' }) {
  const fontSize = size === 'sm' ? '0.875rem' : '1.25rem';
  return (
    <div className="flex gap-0.5">
      {colors.split('').map((color, idx) => (
        <i key={idx} className={`ms ms-${color.toLowerCase()} ms-cost ms-shadow`} style={{ fontSize }} aria-label={COLOR_CONFIG[color]?.name} title={COLOR_CONFIG[color]?.name} />
      ))}
    </div>
  );
}
