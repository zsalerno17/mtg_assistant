import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { ChevronDown, Info } from 'lucide-react';
import { TooltipWrapper, ProgressBar } from './shared';

// Archetype descriptions and tooltips
const ARCHETYPE_INFO = {
  'Control': {
    description: 'Reactive strategy that answers threats with counterspells and removal, then wins with card advantage',
    metrics: {
      'counterspells': 'Counter target spell effects (Counterspell, Mana Drain, Force of Will)',
      'board_wipes': 'Mass removal spells that clear the board (Wrath of God, Cyclonic Rift, Toxic Deluge)',
      'draw_sources': 'Card draw engines and spells to maintain card advantage (Rhystic Study, Mystic Remora, Fact or Fiction)',
      'instant_removal': 'Instant-speed answers to maintain interaction on opponents turns (Swords to Plowshares, Path to Exile)',
    },
  },
  'Combo': {
    description: 'Assembles synergistic card combinations to win the game instantly or create overwhelming advantage',
    metrics: {
      'tutors': 'Search your library for combo pieces (Demonic Tutor, Vampiric Tutor, Mystical Tutor)',
      'ramp': 'Fast mana to assemble combo quickly (Sol Ring, Mana Crypt, Chrome Mox)',
      'protection': 'Protect your combo from disruption (Counterspells, Silence, Grand Abolisher)',
      'draw': 'Card selection to find combo pieces (Brainstorm, Ponder, Ad Nauseam)',
    },
  },
  'Tokens': {
    description: 'Creates wide boards of creature tokens, then buffs them with anthems for overwhelming attacks',
    metrics: {
      'token_generators': 'Cards that create creature tokens (Avenger of Zendikar, Secure the Wastes, Tendershoot Dryad)',
      'anthems': 'Global pump effects for your creatures (Coat of Arms, Intangible Virtue, Cathars\' Crusade)',
      'board_wipes': 'Ideally asymmetric wipes that spare your tokens (Hour of Reckoning, Austere Command)',
      'draw': 'Card advantage to rebuild after board wipes (Skullclamp, Shamanic Revelation, Guardian Project)',
    },
  },
  'Reanimator': {
    description: 'Fills the graveyard with powerful creatures, then brings them back to the battlefield',
    metrics: {
      'reanimation': 'Return creatures from graveyard to battlefield (Animate Dead, Living Death, Reanimate)',
      'discard_outlets': 'Put high-value targets in your graveyard (Faithless Looting, Entomb, Buried Alive)',
      'board_wipes': 'Clear the way for your reanimated threats (Damnation, Toxic Deluge)',
      'ramp': 'Accelerate to cast reanimation spells (Dark Ritual, Cabal Coffers, Ancient Tomb)',
    },
  },
  'Voltron': {
    description: 'Suits up a single creature (usually your commander) with equipment and auras to one-shot opponents',
    metrics: {
      'equipment': 'Artifacts that attach to creatures for massive power boosts (Sword of Fire and Ice, Colossus Hammer, Lightning Greaves)',
      'auras': 'Enchantments that buff your commander (Rancor, Steel of the Godhead, Eldrazi Conscription)',
      'protection': 'Keep your commander alive (Swiftfoot Boots, Mother of Runes, Heroic Intervention)',
      'ramp': 'Cast and equip expensive equipment quickly (Sol Ring, Smothering Tithe, Arcane Signet)',
    },
  },
  'Aristocrats': {
    description: 'Sacrifices creatures for value, draining opponents with death triggers and recurring threats',
    metrics: {
      'sacrifice_outlets': 'Cards that let you sacrifice creatures (Phyrexian Altar, Viscera Seer, Ashnod\'s Altar)',
      'death_triggers': 'Value when creatures die (Blood Artist, Zulaport Cutthroat, Mayhem Devil)',
      'recursion': 'Bring creatures back to sacrifice again (Phyrexian Reclamation, Sun Titan, Eternal Witness)',
      'draw': 'Card advantage from sacrificing (Skullclamp, Dark Prophecy, Midnight Reaper)',
    },
  },
};

export default function ArchetypeReadiness({ archetypes }) {
  const [expandedArchetypes, setExpandedArchetypes] = useState(new Set());

  const toggleArchetype = (name) => {
    setExpandedArchetypes(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (!archetypes || archetypes.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-text-muted)]">
        <p className="text-sm">No archetype analysis available</p>
        <p className="text-xs mt-2">Upload your collection to see which Commander archetypes you can build</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">
          Archetype Readiness
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Which Commander strategies your collection can support
        </p>
      </div>

      {archetypes.map((archetype) => (
        <ArchetypeCard 
          key={archetype.name} 
          archetype={archetype}
          info={ARCHETYPE_INFO[archetype.name]}
          isExpanded={expandedArchetypes.has(archetype.name)}
          onToggle={() => toggleArchetype(archetype.name)}
        />
      ))}
    </div>
  );
}

function ArchetypeCard({ archetype, info, isExpanded, onToggle }) {
  const statusConfig = {
    strong: {
      dotColor: '#10B981',
      label: 'Ready to Build',
    },
    partial: {
      dotColor: '#FBB024',
      label: 'Partially Supported',
    },
    weak: {
      dotColor: '#94A3B8',
      label: 'Insufficient Cards',
    },
  };

  const config = statusConfig[archetype.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden"
    >
      {/* Archetype Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--color-bg)]/50 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              {archetype.name}
            </h3>
            <TooltipWrapper content={info?.description || 'Commander archetype'}>
              <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
            </TooltipWrapper>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.dotColor }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: config.dotColor }}
              >
                {config.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-semibold"
            style={{ color: config.dotColor }}
          >
            {archetype.progress}%
          </span>
          <ChevronDown
            className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30">
              
              {/* Strengths */}
              {archetype.strengths.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#10B981' }}
                    />
                    <h4 className="text-xs font-semibold uppercase text-[var(--color-text)]">
                      Strengths
                    </h4>
                  </div>
                  <div className="space-y-1 ml-3.5">
                    {archetype.strengths.map((strength, idx) => (
                      <div key={idx} className="text-sm text-[var(--color-text)]">
                        • {strength}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps */}
              {archetype.gaps.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#FBB024' }}
                    />
                    <h4 className="text-xs font-semibold uppercase text-[var(--color-text)]">
                      Gaps
                    </h4>
                  </div>
                  <div className="space-y-1 ml-3.5">
                    {archetype.gaps.map((gap, idx) => (
                      <div key={idx} className="text-sm text-[var(--color-text)]">
                        • {gap}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics Breakdown */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)]"
                  />
                  <h4 className="text-xs font-semibold uppercase text-[var(--color-text)]">
                    Breakdown
                  </h4>
                </div>
                <div className="space-y-2 ml-3.5">
                  {Object.entries(archetype.metrics).map(([key, counts]) => {
                    const percentage = Math.min(
                      (counts.owned / counts.recommended) * 100,
                      100
                    );
                    const meetsRecommended = counts.owned >= counts.recommended;
                    const meetsRequired = counts.owned >= counts.required;
                    const barColor = meetsRecommended
                      ? '#10B981'
                      : meetsRequired
                      ? '#FBB024'
                      : '#94A3B8';
                    
                    const tooltipText = info?.metrics?.[key] || `${key.replace(/_/g, ' ')} for ${archetype.name} archetype`;

                    return (
                      <div key={key} className="flex items-center justify-between py-1.5 group">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--color-text)] capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <TooltipWrapper content={tooltipText}>
                            <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
                          </TooltipWrapper>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: barColor }}
                          >
                            {counts.owned}/{counts.recommended}
                          </span>
                          <ProgressBar value={percentage} max={100} color={barColor} height="h-1.5" className="w-20" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

