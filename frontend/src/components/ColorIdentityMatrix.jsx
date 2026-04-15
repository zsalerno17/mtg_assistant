import { useState } from 'react';
import { motion } from 'framer-motion';

// MTG color names and symbols
const COLOR_CONFIG = {
  W: { name: 'White', symbol: '{W}', bg: '#F9FAFB', text: '#1F2937' },
  U: { name: 'Blue', symbol: '{U}', bg: '#3B82F6', text: '#FFFFFF' },
  B: { name: 'Black', symbol: '{B}', bg: '#1F2937', text: '#FFFFFF' },
  R: { name: 'Red', symbol: '{R}', bg: '#EF4444', text: '#FFFFFF' },
  G: { name: 'Green', symbol: '{G}', bg: '#10B981', text: '#FFFFFF' },
};

const GUILD_NAMES = {
  'UW': 'Azorius',
  'BW': 'Orzhov',
  'RW': 'Boros',
  'GW': 'Selesnya',
  'BU': 'Dimir',
  'RU': 'Izzet',
  'GU': 'Simic',
  'BR': 'Rakdos',
  'BG': 'Golgari',
  'GR': 'Gruul',
};

const SHARD_WEDGE_NAMES = {
  'GUW': 'Bant',
  'BUW': 'Esper', 
  'BRU': 'Grixis',
  'BGR': 'Jund',
  'GRW': 'Naya',
  'BGW': 'Abzan',
  'RUW': 'Jeskai',
  'BGU': 'Sultai',
  'BRW': 'Mardu',
  'GRU': 'Temur',
};

const FOUR_COLOR_NAMES = {
  'BRUW': 'Yore-Tiller',
  'BGUW': 'Witch-Maw',
  'GRUW': 'Ink-Treader',
  'BGRW': 'Dune-Brood',
  'BGRU': 'Glint-Eye',
};

const MONO_NAMES = {
  'W': 'White',
  'U': 'Blue',
  'B': 'Black',
  'R': 'Red',
  'G': 'Green',
};

// Get the proper name for any color combination
function getColorName(colors) {
  if (colors.length === 1) return MONO_NAMES[colors] || colors;
  if (colors.length === 2) return GUILD_NAMES[colors] || colors;
  if (colors.length === 3) return SHARD_WEDGE_NAMES[colors] || colors;
  if (colors.length === 4) return FOUR_COLOR_NAMES[colors] || colors;
  if (colors.length === 5) return 'Five-Color';
  return colors;
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

  const { 
    matrix, 
    pairs, 
    strong_pairs, 
    weak_pairs,
    two_color = [],
    three_color = [],
    four_color = [],
    five_color = [],
  } = colorData;
  const colors = ['W', 'U', 'B', 'R', 'G'];
  
  // DEBUG LOGGING (now using total card counts)
  console.log('=== COLOR IDENTITY ANALYSIS DATA ===');
  console.log('Total color combinations found:', pairs?.length);
  console.log('Two-color combinations:', two_color?.length, '(showing with >=15 cards)');
  console.log('Three-color combinations:', three_color?.length, '(showing with >=15 cards)');

  // Log detailed breakdown for all combinations
  console.log('\n--- ALL COLOR COMBINATIONS (sorted by total cards) ---');
  pairs?.forEach(pair => {
    const percentage = pair.card_count > 0 
      ? Math.round((pair.staple_count / pair.card_count) * 100) 
      : 0;
    const warning = percentage > 50 ? ' ⚠️ HIGH STAPLE %' : '';
    console.log(
      `${getColorName(pair.colors).padEnd(15)} (${pair.colors}): ` +
      `${pair.card_count} total cards, ${pair.staple_count} staples (${percentage}%)${warning}`
    );
  });

  // Log where each combo will appear in UI
  console.log('\n--- UI SECTION ASSIGNMENTS ---');
  pairs?.forEach(pair => {
    let section = 'Developing Combinations';
    if (pair.colors.length === 2 && pair.card_count >= 15) section = 'Two-Color Guilds';
    if (pair.colors.length === 3 && pair.card_count >= 15) section = 'Three-Color Archetypes';
    if (pair.colors.length === 4 && pair.card_count >= 25) section = 'Four-Color Combinations';
    if (pair.colors.length === 5 && pair.card_count >= 35) section = 'Five-Color Goodstuff';
    if (pair.colors.length === 1) section = 'Matrix Only (mono-color)';
    if (pair.card_count === 0) section = 'Hidden (no cards)';
    console.log(`${getColorName(pair.colors).padEnd(15)}: ${section}`);
  });

  // Log which ones have commander suggestions
  console.log('\n--- COMMANDER SUGGESTION STATUS ---');
  const withSuggestions = pairs?.filter(p => p.commander_suggestions?.length > 0).length || 0;
  const withoutSuggestions = pairs?.filter(p => !p.commander_suggestions || p.commander_suggestions.length === 0).length || 0;
  console.log(`${withSuggestions} combinations have commander suggestions (>=10 cards)`);
  console.log(`${withoutSuggestions} combinations need more cards (<10)`);
  console.log('=====================================\n');
  
  // Find max value for intensity calculation
  const maxValue = Math.max(...matrix.flat().filter(v => v > 0));

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
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
          Color Pair Strength Matrix
        </h3>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-12 h-12"></th>
              {colors.map(color => (
                <th key={color} className="w-16 h-12 text-center">
                  <i
                    className={`ms ms-${color.toLowerCase()} ms-cost ms-shadow`}
                    style={{ fontSize: '1.25rem' }}
                    aria-label={COLOR_CONFIG[color].name}
                    title={COLOR_CONFIG[color].name}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((rowColor, i) => (
              <tr key={rowColor}>
                <th className="w-12 h-12 text-center">
                  <i
                    className={`ms ms-${rowColor.toLowerCase()} ms-cost ms-shadow`}
                    style={{ fontSize: '1.25rem' }}
                    aria-label={COLOR_CONFIG[rowColor].name}
                    title={COLOR_CONFIG[rowColor].name}
                  />
                </th>
                {colors.map((colColor, j) => {
                  const value = matrix[i][j];
                  const intensity = maxValue > 0 ? value / maxValue : 0;
                  const colorKey = i === j ? rowColor : [rowColor, colColor].sort().join('');
                  const pairData = pairs.find(p => p.colors === colorKey);

                  return (
                    <td
                      key={`${rowColor}-${colColor}`}
                      className="w-16 h-12 border border-[var(--color-border)] text-center relative cursor-pointer transition-all hover:scale-105 hover:z-10"
                      style={{
                        backgroundColor: intensity > 0 
                          ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` 
                          : 'var(--color-bg)',
                      }}
                      onMouseEnter={() => setHoveredCell({ row: i, col: j, value, pairData, colorKey })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${getColorName(colorKey)}: ${value} cards`}
                    >
                      <span className={`text-sm font-medium ${intensity > 0.5 ? 'text-white' : 'text-[var(--color-text)]'}`}>
                        {value > 0 ? value : '\u2014'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Hover Tooltip */}
        {hoveredCell && hoveredCell.pairData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-xs"
          >
            <div className="font-semibold text-[var(--color-text)] mb-1">
              {getColorName(hoveredCell.colorKey)}
            </div>
            <div className="text-[var(--color-muted)]">
              {hoveredCell.pairData.card_count} total cards
              {hoveredCell.pairData.staple_count > 0 && (
                <>
                  {' '}· {hoveredCell.pairData.staple_count} staples
                </>
              )}
            </div>
          </motion.div>
        )}
        
        <div className="mt-3 text-xs text-[var(--color-muted)]">
          <p>💡 Darker cells indicate more quality cards for that color combination</p>
        </div>
      </div>

      {/* 3-Color Archetypes (Shards & Wedges) - Primary Recommendations */}
      {three_color && three_color.filter(p => p.card_count >= 15).length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Three-Color Archetypes
          </h3>
          <p className="text-xs text-[var(--color-muted)] mb-3">
            Most popular Commander color combinations (shards & wedges)
          </p>
          <div className="space-y-3">
            {three_color.filter(p => p.card_count >= 15).map(pair => (
              <ColorPairCard key={pair.colors} pair={pair} />
            ))}
          </div>
        </div>
      )}

      {/* 2-Color Guilds */}
      {two_color && two_color.filter(p => p.card_count >= 15).length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Two-Color Guilds
          </h3>
          <p className="text-xs text-[var(--color-muted)] mb-3">
            Classic dual-color combinations
          </p>
          <div className="space-y-3">
            {two_color.filter(p => p.card_count >= 15).map(pair => (
              <ColorPairCard key={pair.colors} pair={pair} />
            ))}
          </div>
        </div>
      )}

      {/* 4-Color Combinations */}
      {four_color && four_color.length > 0 && four_color.some(p => p.card_count >= 25) && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Four-Color Combinations
          </h3>
          <p className="text-xs text-[var(--color-muted)] mb-3">
            Advanced multi-color strategies
          </p>
          <div className="space-y-3">
            {four_color.filter(p => p.card_count >= 25).map(pair => (
              <ColorPairCard key={pair.colors} pair={pair} />
            ))}
          </div>
        </div>
      )}

      {/* 5-Color */}
      {five_color && five_color.length > 0 && five_color.some(p => p.card_count >= 35) && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Five-Color Goodstuff
          </h3>
          <p className="text-xs text-[var(--color-muted)] mb-3">
            Play all the colors!
          </p>
          <div className="space-y-3">
            {five_color.filter(p => p.card_count >= 35).map(pair => (
              <ColorPairCard key={pair.colors} pair={pair} />
            ))}
          </div>
        </div>
      )}

      {/* Developing Combinations */}
      {(() => {
        // Filter out combinations already shown in sections above
        const developingCombos = pairs?.filter(p => {
          // Already shown in their respective sections
          if (p.colors.length === 2 && p.card_count >= 15) return false;
          if (p.colors.length === 3 && p.card_count >= 15) return false;
          if (p.colors.length === 4 && p.card_count >= 25) return false;
          if (p.colors.length === 5 && p.card_count >= 35) return false;
          // Show combinations with some cards (not completely empty)
          return p.card_count > 0 && p.colors.length >= 2;
        }).sort((a, b) => b.card_count - a.card_count);
        
        return developingCombos && developingCombos.length > 0 && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2 flex items-center gap-2">
              <span className="text-[var(--color-muted)]">○</span>
              Developing Combinations
            </h3>
            <p className="text-xs text-[var(--color-muted)] mb-3">
              Color combinations with some support - acquire more staples to unlock their full potential
            </p>
            <div className="space-y-2">
              {developingCombos.slice(0, 8).map(pair => (
                <WeakPairRow key={pair.colors} pair={pair} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ColorPairCard({ pair }) {
  const [expanded, setExpanded] = useState(false);
  const colorName = getColorName(pair.colors);
  
  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[var(--color-bg)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ColorPips colors={pair.colors} />
          <span className="text-sm font-medium text-[var(--color-text)]">
            {colorName}
          </span>
          <span className="text-xs text-[var(--color-muted)]">
            {pair.card_count} cards
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-[var(--color-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && (
        <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30">
          {pair.commander_suggestions && pair.commander_suggestions.length > 0 ? (
            <>
              <div className="text-xs text-[var(--color-muted)] mb-1.5">Suggested Commanders:</div>
              <div className="space-y-1">
                {pair.commander_suggestions.map(commander => (
                  <CommanderScryfallLink key={commander} name={commander} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--color-muted)] italic">
              {pair.card_count > 0 
                ? `Add ${10 - pair.card_count} more cards in these colors to unlock commander suggestions`
                : 'Acquire cards in these colors to unlock commander suggestions'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommanderScryfallLink({ name }) {
  const scryfallUrl = `https://scryfall.com/search?q=!%22${encodeURIComponent(name)}%22`;
  return (
    <a
      href={scryfallUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-[var(--color-link)] hover:underline cursor-pointer"
      title={`View ${name} on Scryfall`}
    >
      • {name}
    </a>
  );
}

function WeakPairRow({ pair }) {
  const colorName = getColorName(pair.colors);
  
  return (
    <div className="flex items-center justify-between px-3 py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <ColorPips colors={pair.colors} size="sm" />
        <span className="text-[var(--color-text)]">
          {colorName}
        </span>
      </div>
      <span className="text-[var(--color-muted)]">
        {pair.card_count} cards
      </span>
    </div>
  );
}

function ColorPips({ colors, size = 'md' }) {
  const sizeMap = {
    sm: '0.875rem',
    md: '1.25rem',
  };
  
  return (
    <div className="flex gap-0.5">
      {colors.split('').map((color, idx) => (
        <i
          key={idx}
          className={`ms ms-${color.toLowerCase()} ms-cost ms-shadow`}
          style={{ fontSize: sizeMap[size] }}
          aria-label={COLOR_CONFIG[color].name}
          title={COLOR_CONFIG[color].name}
        />
      ))}
    </div>
  );
}
