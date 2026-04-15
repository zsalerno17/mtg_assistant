import { useState } from 'react';
import { motion } from 'framer-motion';

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

function getColorName(colors) {
  if (colors.length === 1) return COLOR_CONFIG[colors]?.name || colors;
  if (colors.length === 2) return GUILD_NAMES[colors] || colors;
  if (colors.length === 3) return SHARD_WEDGE_NAMES[colors] || colors;
  if (colors.length === 4) return FOUR_COLOR_NAMES[colors] || colors;
  if (colors.length === 5) return 'Five-Color';
  return colors;
}

function getStatus(pair) {
  if (pair.staple_count >= 15) return 'ready';
  if (pair.staple_count >= 5) return 'developing';
  return 'needs-cards';
}

const STATUS_CONFIG = {
  'ready':       { label: 'Ready to Build', color: 'var(--color-success, #22c55e)' },
  'developing':  { label: 'Developing',     color: 'var(--color-warning, #f59e0b)' },
  'needs-cards': { label: 'Needs Cards',    color: 'var(--color-muted)' },
};

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

  // Sections to render — filter out empty combos, sort strongest first within each
  const sections = [
    { title: 'Two-Color Guilds', pairs: two_color },
    { title: 'Three-Color',      pairs: three_color },
    { title: 'Four-Color',       pairs: four_color },
    { title: 'Five-Color',       pairs: five_color },
  ]
    .map(s => ({ ...s, pairs: s.pairs.filter(p => p.card_count > 0).sort((a, b) => b.staple_count - a.staple_count) }))
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
              {hoveredCell.pairData.card_count} cards · {hoveredCell.pairData.staple_count} staples
            </span>
          </motion.div>
        )}

        <p className="mt-3 text-xs text-[var(--color-muted)]">Darker cells = more quality cards for that color pair</p>
      </div>

      {/* Unified sections by color count — all combinations, each with a status */}
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

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[var(--color-bg)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ColorPips colors={pair.colors} />
          <span className="text-sm font-medium text-[var(--color-text)]">{colorName}</span>
          <span className="text-xs text-[var(--color-muted)]">{pair.card_count} cards · {pair.staple_count} staples</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          <svg className={`w-4 h-4 text-[var(--color-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30">
          {pair.commander_suggestions?.length > 0 ? (
            <>
              <div className="text-xs text-[var(--color-muted)] mb-1.5">Commanders in your collection:</div>
              <div className="space-y-1">
                {pair.commander_suggestions.map(name => (
                  <CommanderScryfallLink key={name} name={name} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--color-muted)] italic">
              No legendary creatures in your collection for this color identity
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommanderScryfallLink({ name }) {
  return (
    <a
      href={`https://scryfall.com/search?q=!%22${encodeURIComponent(name)}%22`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-[var(--color-link)] hover:underline cursor-pointer"
      title={`View ${name} on Scryfall`}
    >
      • {name}
    </a>
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
