import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'
import CardTooltip from './CardTooltip'
import { ColorPips, TooltipWrapper, ProgressBar } from './shared'

/**
 * CollectionDepth Component - Display functional breakdown of collection
 * Shows ramp, draw, removal, interaction categorized by quality/type
 */
export default function CollectionDepth({ analysis }) {
  const [expandedSections, setExpandedSections] = useState(new Set(['ramp']))
  const [expandedSubcategories, setExpandedSubcategories] = useState(new Set())

  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const toggleSubcategory = (subcategoryKey) => {
    setExpandedSubcategories(prev => {
      const next = new Set(prev)
      if (next.has(subcategoryKey)) {
        next.delete(subcategoryKey)
      } else {
        next.add(subcategoryKey)
      }
      return next
    })
  }

  if (!analysis) {
    return (
      <div className="text-center py-12 text-[var(--color-text-muted)]">
        <p className="text-sm">No analysis available yet</p>
        <p className="text-xs mt-2">Upload a collection to see your functional breakdown</p>
      </div>
    )
  }

  const sections = [
    {
      id: 'ramp',
      title: 'Ramp',
      total: analysis.ramp?.total || 0,
      description: 'Mana acceleration and land tutors',
      breakdown: [
        { 
          label: 'Lands', 
          value: analysis.ramp?.lands || 0,
          tooltip: 'Lands that tap for mana or fetch other lands',
          accentColor: '#10B981',
          cards: analysis.ramp?.lands_cards || [],
        },
        { 
          label: 'Mana Rocks', 
          value: analysis.ramp?.rocks || 0,
          tooltip: 'Artifacts that produce mana (Sol Ring, Arcane Signet, etc.)',
          accentColor: '#10B981',
          cards: analysis.ramp?.rocks_cards || [],
        },
        { 
          label: 'Dorks', 
          value: analysis.ramp?.dorks || 0,
          tooltip: 'Creatures that tap for mana (Llanowar Elves, Birds of Paradise, etc.)',
          accentColor: '#FBB024',
          cards: analysis.ramp?.dorks_cards || [],
        },
        { 
          label: 'Treasure Generators', 
          value: analysis.ramp?.treasures || 0,
          tooltip: 'Cards that create Treasure tokens (Dockside Extortionist, Smothering Tithe, etc.)',
          accentColor: '#FBB024',
          cards: analysis.ramp?.treasures_cards || [],
        },
        { 
          label: 'Other', 
          value: analysis.ramp?.other || 0,
          tooltip: 'Ritual effects, land tutors, and other ramp spells',
          accentColor: '#94A3B8',
          cards: analysis.ramp?.other_cards || [],
        },
      ],
    },
    {
      id: 'draw',
      title: 'Card Advantage',
      total: analysis.draw?.total || 0,
      description: 'Draw engines and card selection',
      breakdown: [
        { 
          label: 'Card Draw', 
          value: analysis.draw?.card_draw || 0,
          tooltip: 'Cards that draw you additional cards (Rhystic Study, Mystic Remora, etc.)',
          accentColor: '#10B981',
          cards: analysis.draw?.card_draw_cards || [],
        },
        { 
          label: 'Looting', 
          value: analysis.draw?.looting || 0,
          tooltip: 'Draw + discard effects (Faithless Looting, Cathartic Reunion, etc.)',
          accentColor: '#FBB024',
          cards: analysis.draw?.looting_cards || [],
        },
        { 
          label: 'Selection', 
          value: analysis.draw?.selection || 0,
          tooltip: 'Scry, surveil, and card filtering (Preordain, Brainstorm, etc.)',
          accentColor: '#FBB024',
          cards: analysis.draw?.selection_cards || [],
        },
      ],
    },
    {
      id: 'removal',
      title: 'Removal',
      total: analysis.removal?.total || 0,
      description: 'Answers and board control',
      breakdown: [
        { 
          label: 'Targeted', 
          value: analysis.removal?.targeted || 0,
          tooltip: 'Single-target removal (Swords to Plowshares, Beast Within, etc.)',
          accentColor: '#10B981',
          cards: analysis.removal?.targeted_cards || [],
        },
        { 
          label: 'Board Wipes', 
          value: analysis.removal?.board_wipes || 0,
          tooltip: 'Mass removal spells (Wrath of God, Cyclonic Rift, etc.)',
          accentColor: '#10B981',
          cards: analysis.removal?.board_wipes_cards || [],
        },
        { 
          label: 'Edict/Sacrifice', 
          value: analysis.removal?.edict || 0,
          tooltip: 'Force opponents to sacrifice (Plaguecrafter, Fleshbag Marauder, etc.)',
          accentColor: '#FBB024',
          cards: analysis.removal?.edict_cards || [],
        },
      ],
    },
    {
      id: 'interaction',
      title: 'Interaction',
      total: analysis.interaction?.counterspells || 0,
      description: 'Counterspells and stack interaction',
      breakdown: [
        { 
          label: 'Counterspells', 
          value: analysis.interaction?.counterspells || 0,
          tooltip: 'Counter target spell effects (Counterspell, Swan Song, etc.)',
          accentColor: '#10B981',
          cards: analysis.interaction?.counterspells_cards || [],
        },
      ],
    },
    {
      id: 'tutors',
      title: 'Tutors',
      total: analysis.tutors?.total || 0,
      description: 'Cards that search your library',
      breakdown: [
        { 
          label: 'Total Tutors', 
          value: analysis.tutors?.total || 0,
          tooltip: 'Cards that search your library (Demonic Tutor, Mystical Tutor, etc.)',
          accentColor: '#10B981',
          cards: analysis.tutors?.tutors_cards || [],
        },
      ],
    },
  ]

  return (
    <div className="space-y-3">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">
          Collection Depth
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Functional breakdown of your collection by Commander staple categories
        </p>
      </div>

      {sections.map((section) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden"
        >
          {/* Section Header */}
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--color-bg)]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  {section.title}
                </h3>
                <span className="text-lg font-bold text-[var(--color-primary)]">
                  {section.total}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
                {section.description}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${
                expandedSections.has(section.id) ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Expanded Breakdown */}
          <AnimatePresence>
            {expandedSections.has(section.id) && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30 space-y-2">
                  {section.breakdown.map((item, idx) => {
                    const subcategoryKey = `${section.id}-${idx}`;
                    const isExpanded = expandedSubcategories.has(subcategoryKey);
                    const hasCards = item.cards && item.cards.length > 0;
                    
                    return (
                      <div key={idx} className="rounded-md overflow-hidden">
                        {/* Subcategory Header */}
                        <div
                          className={`flex items-center justify-between py-2 px-3 ${
                            hasCards ? 'cursor-pointer hover:bg-[var(--color-surface)]/50' : ''
                          } transition-colors group`}
                          onClick={() => hasCards && toggleSubcategory(subcategoryKey)}
                        >
                          <div className="flex items-center gap-2">
                            {hasCards && (
                              <ChevronRight
                                className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                            )}
                            <span className={`text-sm text-[var(--color-text)] ${!hasCards ? 'ml-5' : ''}`}>
                              {item.label}
                            </span>
                            <TooltipWrapper content={item.tooltip}>
                              <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
                            </TooltipWrapper>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.value === 0 ? (
                              <TooltipWrapper content={`No ${item.label.toLowerCase()} found in your collection. Consider adding some to improve your deck-building options.`}>
                                <span className="text-sm text-[var(--color-text-muted)] cursor-help">
                                  —
                                </span>
                              </TooltipWrapper>
                            ) : (
                              <>
                                <span
                                  className="text-sm font-semibold"
                                  style={{ color: item.accentColor }}
                                >
                                  {item.value}
                                </span>
                                <ProgressBar value={item.value} max={section.total} color={item.accentColor} height="h-1.5" className="w-20" />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Card List */}
                        {hasCards && isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden bg-[var(--color-bg)]/50"
                          >
                            <div className="px-6 py-3">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-[var(--color-border)]">
                                    <th className="text-left text-xs text-[var(--color-text-muted)] font-medium pb-2">Card Name</th>
                                    <th className="text-left text-xs text-[var(--color-text-muted)] font-medium pb-2 w-16">CMC</th>
                                    <th className="text-left text-xs text-[var(--color-text-muted)] font-medium pb-2 w-24">Colors</th>
                                    <th className="text-right text-xs text-[var(--color-text-muted)] font-medium pb-2 w-16">Owned</th>
                                    <th className="text-right text-xs text-[var(--color-text-muted)] font-medium pb-2 w-16">In Use</th>
                                    <th className="text-right text-xs text-[var(--color-text-muted)] font-medium pb-2 w-16">Available</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.cards.map((card, cardIdx) => (
                                    <tr 
                                      key={cardIdx} 
                                      className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface)]/30 transition-colors"
                                    >
                                      <td className="py-2 text-xs text-[var(--color-text)]">
                                        <CardTooltip cardName={card.name}>
                                          <span className="cursor-help hover:text-[var(--color-primary)]">{card.name}</span>
                                        </CardTooltip>
                                      </td>
                                      <td className="py-2 text-xs text-[var(--color-text-muted)] font-mono">{card.cmc}</td>
                                      <td className="py-2">
                                        <ColorPips colors={card.color_identity} />
                                      </td>
                                      <td className="py-2 text-xs text-[var(--color-text)] text-right font-medium">{card.quantity}</td>
                                      <td className="py-2 text-xs text-right">
                                        {card.in_use > 0 && card.used_in_decks ? (
                                          <TooltipWrapper 
                                            content={
                                              <div>
                                                <div className="font-semibold mb-1">Used in decks:</div>
                                                {card.used_in_decks.map((deck, idx) => (
                                                  <div key={idx} className="text-xs">
                                                    • {deck.deck_name}: ×{deck.quantity}
                                                  </div>
                                                ))}
                                              </div>
                                            }
                                          >
                                            <span className="text-[var(--color-text-muted)] cursor-help border-b border-dotted border-[var(--color-muted)]">
                                              {card.in_use}
                                            </span>
                                          </TooltipWrapper>
                                        ) : (
                                          <span className="text-[var(--color-text-muted)]">{card.in_use}</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-xs text-right">
                                        {card.available < 0 ? (
                                          <TooltipWrapper 
                                            content={
                                              <div>
                                                <div className="font-semibold mb-1 text-rose-400">Short {Math.abs(card.available)} card{Math.abs(card.available) !== 1 ? 's' : ''}</div>
                                                <div className="text-xs">You need {Math.abs(card.available)} more to cover all decks</div>
                                                {card.used_in_decks && (
                                                  <>
                                                    <div className="text-xs mt-2 font-semibold">Used in:</div>
                                                    {card.used_in_decks.map((deck, idx) => (
                                                      <div key={idx} className="text-xs">
                                                        • {deck.deck_name}: ×{deck.quantity}
                                                      </div>
                                                    ))}
                                                  </>
                                                )}
                                              </div>
                                            }
                                          >
                                            <span className="text-rose-400 cursor-help border-b border-dotted border-rose-400">
                                              {card.available}
                                            </span>
                                          </TooltipWrapper>
                                        ) : (
                                          <span className={card.available === 0 ? 'text-amber-400' : 'text-emerald-400'}>
                                            {card.available}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                  
                  {section.total === 0 && (
                    <div className="text-center py-4 text-[var(--color-text-muted)] text-sm">
                      <p>No {section.title.toLowerCase()} detected in your collection</p>
                      <TooltipWrapper content={section.description}>
                        <p className="text-xs mt-1 cursor-help inline-flex items-center gap-1">
                          Learn about {section.title.toLowerCase()} <Info className="w-3 h-3" />
                        </p>
                      </TooltipWrapper>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}

