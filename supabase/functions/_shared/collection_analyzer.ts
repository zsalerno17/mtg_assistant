/**
 * Collection Analyzer - Performance-optimized categorization for Commander collections
 *
 * Tiered Approach:
 * 1. Type-line filtering (~10ms) - eliminate non-relevant cards
 * 2. Keywords array (~20ms) - fast string matching
 * 3. Smart regex (~150ms) - targeted oracle text patterns
 * 4. Memoization - cache results for identical cards
 *
 * Target: <500ms for 2000-card collections
 */

import { UsageMap } from "./deck_usage.ts";

// Type definitions
export interface CollectionCard {
  name: string;
  quantity: number;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  color_identity?: string[];
  keywords?: string[];
  card_faces?: CardFace[] | null;
}

export interface CardFace {
  name?: string;
  type_line?: string;
  oracle_text?: string;
}

export interface CardReference {
  name: string;
  quantity: number;
  in_use: number;
  available: number;
  used_in_decks?: Array<{ deck_name: string; quantity: number }>;
  cmc?: number;
  color_identity?: string[];
  type_line?: string;
}

export interface RampBreakdown {
  total: number;
  lands: number;
  rocks: number;
  dorks: number;
  treasures: number; // MTG specialist fix
  other: number;
  lands_cards: CardReference[];
  rocks_cards: CardReference[];
  dorks_cards: CardReference[];
  treasures_cards: CardReference[];
  other_cards: CardReference[];
}

export interface DrawBreakdown {
  total: number;
  card_draw: number;
  looting: number; // MTG specialist fix - separate from draw
  selection: number; // MTG specialist fix - scry/surveil
  card_draw_cards: CardReference[];
  looting_cards: CardReference[];
  selection_cards: CardReference[];
}

export interface RemovalBreakdown {
  total: number;
  targeted: number;
  board_wipes: number;
  edict: number; // MTG specialist fix
  targeted_cards: CardReference[];
  board_wipes_cards: CardReference[];
  edict_cards: CardReference[];
}

export interface CollectionAnalysis {
  ramp: RampBreakdown;
  draw: DrawBreakdown;
  removal: RemovalBreakdown;
  interaction: { total: number; counterspells: number; counterspells_cards: CardReference[] };
  tutors: { total: number; tutors_cards: CardReference[] };
  board_wipes: { total: number };
}

// Helper to deduplicate and aggregate card references by name
// Now accepts usageMap to apply usage data AFTER aggregation (fixes duplicate counting bug)
function aggregateCardReferences(
  cards: CardReference[], 
  usageMap?: Map<string, { total: number; decks: Array<{ deck_name: string; quantity: number }> }>
): CardReference[] {
  const cardMap = new Map<string, CardReference>();
  
  for (const card of cards) {
    const existing = cardMap.get(card.name);
    if (existing) {
      // Card already exists - only sum the quantities (not usage data, we'll apply that after)
      existing.quantity += card.quantity;
    } else {
      // First occurrence - add to map (without usage data for now)
      cardMap.set(card.name, { 
        name: card.name,
        quantity: card.quantity,
        in_use: 0,
        available: card.quantity,
        cmc: card.cmc,
        color_identity: card.color_identity,
        type_line: card.type_line,
      });
    }
  }
  
  // Now apply usage data to aggregated cards (only once per card name)
  if (usageMap) {
    for (const card of cardMap.values()) {
      const usage = usageMap.get(card.name);
      if (usage) {
        card.in_use = usage.total;
        card.available = Math.max(0, card.quantity - usage.total);
        card.used_in_decks = usage.decks;
      }
    }
  }
  
  // Convert map back to array, sorted alphabetically by name
  return Array.from(cardMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Helper to get oracle text from card faces (for DFCs/MDFCs/split cards)
function getOracleText(card: CollectionCard): string {
  if (card.oracle_text) return card.oracle_text;
  
  // For DFCs/MDFCs, concatenate both faces with newline (MTG specialist fix)
  if (card.card_faces && Array.isArray(card.card_faces)) {
    return card.card_faces
      .filter((face) => face.oracle_text)
      .map((face) => face.oracle_text)
      .join("\n");
  }
  
  return "";
}

// Memoization cache for card categorization
const categoryCache = new Map<string, {
  isRamp: boolean;
  rampType?: string;
  isDraw: boolean;
  drawType?: string;
  isRemoval: boolean;
  removalType?: string;
  isCounterspell: boolean;
  isTutor: boolean;
}>();

/**
 * Tier 1: Type-line filtering (fast elimination)
 * ~10ms for 2000 cards
 */
function quickTypeCheck(card: CollectionCard): {
  canBeRamp: boolean;
  canBeDraw: boolean;
  canBeRemoval: boolean;
  canBeCounterspell: boolean;
  canBeTutor: boolean;
} {
  const typeLine = (card.type_line || "").toLowerCase();
  
  return {
    canBeRamp: typeLine.includes("land") || typeLine.includes("artifact") || typeLine.includes("creature") || typeLine.includes("enchantment") || typeLine.includes("sorcery") || typeLine.includes("instant"),
    canBeDraw: !typeLine.includes("land"), // all non-lands can potentially draw
    canBeRemoval: typeLine.includes("instant") || typeLine.includes("sorcery") || typeLine.includes("creature") || typeLine.includes("enchantment") || typeLine.includes("artifact") || typeLine.includes("planeswalker"),
    canBeCounterspell: typeLine.includes("instant") || typeLine.includes("creature") || typeLine.includes("enchantment"),
    canBeTutor: !typeLine.includes("land"), // all non-lands can potentially tutor
  };
}

/**
 * Tier 2: Keywords array matching (fast string search)
 * ~20ms for 2000 cards
 */
function keywordCheck(card: CollectionCard): {
  hasFlash: boolean;
  hasScry: boolean;
} {
  const keywords = card.keywords || [];
  const keywordSet = new Set(keywords.map((k) => k.toLowerCase()));
  
  return {
    hasFlash: keywordSet.has("flash"),
    hasScry: keywordSet.has("scry"),
  };
}

/**
 * Tier 3: Targeted regex patterns (expensive but necessary)
 * ~150ms for 2000 cards
 */

// Ramp detection
function categorizeRamp(card: CollectionCard): { isRamp: boolean; rampType?: string } {
  const typeLine = (card.type_line || "").toLowerCase();
  const oracleText = getOracleText(card).toLowerCase();
  
  // Lands that tap for mana
  if (typeLine.includes("land") && /\{t\}.*add/i.test(oracleText)) {
    return { isRamp: true, rampType: "lands" };
  }
  
  // Mana rocks (artifacts that produce mana)
  if (typeLine.includes("artifact") && /\{t\}.*add|when.*enters.*add/i.test(oracleText)) {
    return { isRamp: true, rampType: "rocks" };
  }
  
  // Mana dorks (creatures that produce mana)
  if (typeLine.includes("creature") && /\{t\}.*add/i.test(oracleText)) {
    return { isRamp: true, rampType: "dorks" };
  }
  
  // Treasure generators (MTG specialist fix: Dockside Extortionist, etc.)
  if (/treasure|create.*treasure token/i.test(oracleText)) {
    return { isRamp: true, rampType: "treasures" };
  }
  
  // Other ramp (land tutors, ritual effects)
  if (/search your library for.*land|search your library for up to.*land|add \{[wubrgc]\}/i.test(oracleText) && !typeLine.includes("land")) {
    return { isRamp: true, rampType: "other" };
  }
  
  return { isRamp: false };
}

// Draw detection
function categorizeDraw(card: CollectionCard): { isDraw: boolean; drawType?: string } {
  const oracleText = getOracleText(card).toLowerCase();
  
  // Looting effects (draw + discard) - separate category per MTG specialist
  if (/(draw.*card.*discard|discard.*card.*draw).*card/i.test(oracleText)) {
    return { isDraw: true, drawType: "looting" };
  }
  
  // Selection effects (scry, surveil) - MTG specialist fix
  if (/scry|surveil/i.test(oracleText)) {
    return { isDraw: true, drawType: "selection" };
  }
  
  // Actual card draw
  if (/draw.*card|you draw|player draws|each player draws/i.test(oracleText)) {
    return { isDraw: true, drawType: "card_draw" };
  }
  
  return { isDraw: false };
}

// Removal detection
function categorizeRemoval(card: CollectionCard): { isRemoval: boolean; removalType?: string } {
  const oracleText = getOracleText(card).toLowerCase();
  const typeLine = (card.type_line || "").toLowerCase();
  
  // Board wipes
  if (/destroy all|exile all|each creature|all creatures/i.test(oracleText)) {
    return { isRemoval: true, removalType: "board_wipes" };
  }
  
  // Edict effects (MTG specialist fix: Plaguecrafter, etc.)
  if (/each opponent.*sacrifice|each player.*sacrifice.*creature/i.test(oracleText)) {
    return { isRemoval: true, removalType: "edict" };
  }
  
  // Targeted removal
  if (/destroy target|exile target|return target.*to.*hand|put target.*into.*graveyard/i.test(oracleText)) {
    return { isRemoval: true, removalType: "targeted" };
  }
  
  return { isRemoval: false };
}

// Counterspell detection
function isCounterspell(card: CollectionCard): boolean {
  const oracleText = getOracleText(card).toLowerCase();
  return /counter target|counter that spell/i.test(oracleText);
}

// Tutor detection
function isTutor(card: CollectionCard): boolean {
  const oracleText = getOracleText(card).toLowerCase();
  return /search your library for/i.test(oracleText);
}

/**
 * Main categorization function with memoization
 */
function categorizeCard(card: CollectionCard): {
  ramp?: { type: string };
  draw?: { type: string };
  removal?: { type: string };
  counterspell?: boolean;
  tutor?: boolean;
} {
  // Check cache first
  const cacheKey = card.name.toLowerCase();
  if (categoryCache.has(cacheKey)) {
    const cached = categoryCache.get(cacheKey)!;
    return {
      ramp: cached.isRamp ? { type: cached.rampType! } : undefined,
      draw: cached.isDraw ? { type: cached.drawType! } : undefined,
      removal: cached.isRemoval ? { type: cached.removalType! } : undefined,
      counterspell: cached.isCounterspell || undefined,
      tutor: cached.isTutor || undefined,
    };
  }
  
  // Tier 1: Quick type-line filtering
  const typeCheck = quickTypeCheck(card);
  
  // Tier 2: Keywords
  const keywordInfo = keywordCheck(card);
  
  // Tier 3: Targeted regex (only if type-line suggests possibility)
  const rampResult = typeCheck.canBeRamp ? categorizeRamp(card) : { isRamp: false };
  const drawResult = typeCheck.canBeDraw ? categorizeDraw(card) : { isDraw: false };
  const removalResult = typeCheck.canBeRemoval ? categorizeRemoval(card) : { isRemoval: false };
  const counterspellResult = typeCheck.canBeCounterspell ? isCounterspell(card) : false;
  const tutorResult = typeCheck.canBeTutor ? isTutor(card) : false;
  
  // Cache the result
  categoryCache.set(cacheKey, {
    isRamp: rampResult.isRamp,
    rampType: rampResult.rampType,
    isDraw: drawResult.isDraw,
    drawType: drawResult.drawType,
    isRemoval: removalResult.isRemoval,
    removalType: removalResult.removalType,
    isCounterspell: counterspellResult,
    isTutor: tutorResult,
  });
  
  return {
    ramp: rampResult.isRamp ? { type: rampResult.rampType! } : undefined,
    draw: drawResult.isDraw ? { type: drawResult.drawType! } : undefined,
    removal: removalResult.isRemoval ? { type: removalResult.removalType! } : undefined,
    counterspell: counterspellResult || undefined,
    tutor: tutorResult || undefined,
  };
}

/**
 * Analyze entire collection
 * Target: <500ms for 2000 cards
 */
export function analyzeCollection(
  cards: CollectionCard[],
  usageMap?: Map<string, { total: number; decks: Array<{ deck_name: string; quantity: number }> }>
): CollectionAnalysis {
  const startTime = performance.now();
  
  const ramp: RampBreakdown = { 
    total: 0, lands: 0, rocks: 0, dorks: 0, treasures: 0, other: 0,
    lands_cards: [], rocks_cards: [], dorks_cards: [], treasures_cards: [], other_cards: []
  };
  const draw: DrawBreakdown = { 
    total: 0, card_draw: 0, looting: 0, selection: 0,
    card_draw_cards: [], looting_cards: [], selection_cards: []
  };
  const removal: RemovalBreakdown = { 
    total: 0, targeted: 0, board_wipes: 0, edict: 0,
    targeted_cards: [], board_wipes_cards: [], edict_cards: []
  };
  const counterspells_cards: CardReference[] = [];
  const tutors_cards: CardReference[] = [];
  let counterspells = 0;
  let tutors = 0;
  let boardWipes = 0;
  
  for (const card of cards) {
    const categories = categorizeCard(card);
    const quantity = card.quantity || 1;
    // Don't apply usage data here - will be applied after aggregation to avoid duplicate counting
    const cardRef: CardReference = {
      name: card.name,
      quantity: quantity,
      in_use: 0,
      available: quantity,
      cmc: card.cmc,
      color_identity: card.color_identity,
      type_line: card.type_line,
    };
    
    // Weighted categorization for multi-function cards (70/30 split)
    if (categories.ramp) {
      const weight = (categories.draw || categories.removal) ? 0.7 : 1.0;
      ramp.total += quantity * weight;
      
      switch (categories.ramp.type) {
        case "lands":
          ramp.lands += quantity * weight;
          ramp.lands_cards.push(cardRef);
          break;
        case "rocks":
          ramp.rocks += quantity * weight;
          ramp.rocks_cards.push(cardRef);
          break;
        case "dorks":
          ramp.dorks += quantity * weight;
          ramp.dorks_cards.push(cardRef);
          break;
        case "treasures":
          ramp.treasures += quantity * weight;
          ramp.treasures_cards.push(cardRef);
          break;
        case "other":
          ramp.other += quantity * weight;
          ramp.other_cards.push(cardRef);
          break;
      }
    }
    
    if (categories.draw) {
      const weight = (categories.ramp || categories.removal) ? 0.7 : 1.0;
      draw.total += quantity * weight;
      
      switch (categories.draw.type) {
        case "card_draw":
          draw.card_draw += quantity * weight;
          draw.card_draw_cards.push(cardRef);
          break;
        case "looting":
          draw.looting += quantity * weight;
          draw.looting_cards.push(cardRef);
          break;
        case "selection":
          draw.selection += quantity * weight;
          draw.selection_cards.push(cardRef);
          break;
      }
    }
    
    if (categories.removal) {
      const weight = (categories.ramp || categories.draw) ? 0.7 : 1.0;
      removal.total += quantity * weight;
      
      switch (categories.removal.type) {
        case "targeted":
          removal.targeted += quantity * weight;
          removal.targeted_cards.push(cardRef);
          break;
        case "board_wipes":
          removal.board_wipes += quantity * weight;
          removal.board_wipes_cards.push(cardRef);
          boardWipes += quantity * weight;
          break;
        case "edict":
          removal.edict += quantity * weight;
          removal.edict_cards.push(cardRef);
          break;
      }
    }
    
    if (categories.counterspell) {
      counterspells += quantity;
      counterspells_cards.push(cardRef);
    }
    
    if (categories.tutor) {
      tutors += quantity;
      tutors_cards.push(cardRef);
    }
  }
  
  const elapsed = performance.now() - startTime;
  console.log(`[collection_analyzer] Analyzed ${cards.length} cards in ${elapsed.toFixed(2)}ms`);
  
  // Round to whole numbers (can't have fractional cards in display)
  const round = (n: number) => Math.round(n);
  
  return {
    ramp: {
      total: round(ramp.total),
      lands: round(ramp.lands),
      rocks: round(ramp.rocks),
      dorks: round(ramp.dorks),
      treasures: round(ramp.treasures),
      other: round(ramp.other),
      lands_cards: aggregateCardReferences(ramp.lands_cards, usageMap),
      rocks_cards: aggregateCardReferences(ramp.rocks_cards, usageMap),
      dorks_cards: aggregateCardReferences(ramp.dorks_cards, usageMap),
      treasures_cards: aggregateCardReferences(ramp.treasures_cards, usageMap),
      other_cards: aggregateCardReferences(ramp.other_cards, usageMap),
    },
    draw: {
      total: round(draw.total),
      card_draw: round(draw.card_draw),
      looting: round(draw.looting),
      selection: round(draw.selection),
      card_draw_cards: aggregateCardReferences(draw.card_draw_cards, usageMap),
      looting_cards: aggregateCardReferences(draw.looting_cards, usageMap),
      selection_cards: aggregateCardReferences(draw.selection_cards, usageMap),
    },
    removal: {
      total: round(removal.total),
      targeted: round(removal.targeted),
      board_wipes: round(removal.board_wipes),
      edict: round(removal.edict),
      targeted_cards: aggregateCardReferences(removal.targeted_cards, usageMap),
      board_wipes_cards: aggregateCardReferences(removal.board_wipes_cards, usageMap),
      edict_cards: aggregateCardReferences(removal.edict_cards, usageMap),
    },
    interaction: {
      total: round(counterspells),
      counterspells: round(counterspells),
      counterspells_cards: aggregateCardReferences(counterspells_cards, usageMap),
    },
    tutors: {
      total: round(tutors),
      tutors_cards: aggregateCardReferences(tutors_cards, usageMap),
    },
    board_wipes: {
      total: round(boardWipes),
    },
  };
}

// ============================================================================
// ARCHETYPE READINESS ANALYSIS
// ============================================================================

export interface ArchetypeReadiness {
  name: string;
  status: 'strong' | 'partial' | 'weak';
  progress: number; // 0-100%
  strengths: string[];
  gaps: string[];
  metrics: Record<string, { owned: number; required: number; recommended: number }>;
}

interface ArchetypeThresholds {
  name: string;
  description: string;
  min_counts: Record<string, number>;
  recommended_counts: Record<string, number>;
}

// Define requirements for each Commander archetype
const ARCHETYPE_THRESHOLDS: ArchetypeThresholds[] = [
  {
    name: 'Control',
    description: 'Reactive strategy with counterspells, removal, and card advantage',
    min_counts: {
      counterspells: 8,
      board_wipes: 4,
      draw_sources: 12,
      instant_removal: 6,
    },
    recommended_counts: {
      counterspells: 15,
      board_wipes: 7,
      draw_sources: 20,
      instant_removal: 10,
    },
  },
  {
    name: 'Combo',
    description: 'Win through synergistic card combinations',
    min_counts: {
      tutors: 4,
      ramp: 12,
      protection: 5,
      draw: 10,
    },
    recommended_counts: {
      tutors: 8,
      ramp: 18,
      protection: 8,
      draw: 15,
    },
  },
  {
    name: 'Tokens',
    description: 'Create and buff creature tokens for wide board presence',
    min_counts: {
      token_generators: 8,
      anthems: 4,
      board_wipes: 3,
      draw: 10,
    },
    recommended_counts: {
      token_generators: 15,
      anthems: 7,
      board_wipes: 5,
      draw: 15,
    },
  },
  {
    name: 'Reanimator',
    description: 'Reanimate powerful creatures from graveyard',
    min_counts: {
      reanimation: 6,
      discard_outlets: 8,
      board_wipes: 4,
      ramp: 10,
    },
    recommended_counts: {
      reanimation: 10,
      discard_outlets: 12,
      board_wipes: 6,
      ramp: 15,
    },
  },
  {
    name: 'Voltron',
    description: 'Buff a single creature with equipment and auras',
    min_counts: {
      equipment: 5,
      auras: 4,
      protection: 6,
      ramp: 8,
    },
    recommended_counts: {
      equipment: 10,
      auras: 7,
      protection: 10,
      ramp: 12,
    },
  },
  {
    name: 'Aristocrats',
    description: 'Sacrifice creatures for value and drain effects',
    min_counts: {
      sacrifice_outlets: 5,
      death_triggers: 6,
      recursion: 4,
      draw: 10,
    },
    recommended_counts: {
      sacrifice_outlets: 8,
      death_triggers: 10,
      recursion: 7,
      draw: 15,
    },
  },
];

/**
 * Assess which Commander archetypes the collection can support
 */
export function analyzeArchetypes(
  cards: CollectionCard[],
  analysis: CollectionAnalysis
): ArchetypeReadiness[] {
  const startTime = performance.now();
  const archetypes: ArchetypeReadiness[] = [];

  // Count archetype-specific pieces
  const special_counts = countSpecialArchetypePieces(cards);

  for (const threshold of ARCHETYPE_THRESHOLDS) {
    const metrics: Record<string, { owned: number; required: number; recommended: number }> = {};
    
    // Build metrics object for this archetype
    for (const key of Object.keys(threshold.min_counts)) {
      const owned = getCountForMetric(key, analysis, special_counts);
      metrics[key] = {
        owned,
        required: threshold.min_counts[key],
        recommended: threshold.recommended_counts[key],
      };
    }

    // Calculate status and progress
    const { status, progress } = calculateArchetypeStatus(metrics);
    const strengths = identifyStrengths(metrics);
    const gaps = identifyGaps(metrics);

    archetypes.push({
      name: threshold.name,
      status,
      progress,
      strengths,
      gaps,
      metrics,
    });
  }

  const elapsed = performance.now() - startTime;
  console.log(`[collection_analyzer] Analyzed archetypes in ${elapsed.toFixed(2)}ms`);

  // Sort: strong first, then partial, then weak
  return archetypes.sort((a, b) => {
    const statusOrder = { strong: 0, partial: 1, weak: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // Within same status, sort by progress
    return b.progress - a.progress;
  });
}

/**
 * Count archetype-specific cards not covered by main analysis
 */
function countSpecialArchetypePieces(cards: CollectionCard[]): Record<string, number> {
  const creatures = cards.filter(c => c.type_line?.includes('Creature'));
  const instants = cards.filter(c => c.type_line?.includes('Instant'));
  const sorceries = cards.filter(c => c.type_line?.includes('Sorcery'));
  const enchantments = cards.filter(c => c.type_line?.includes('Enchantment'));
  const artifacts = cards.filter(c => c.type_line?.includes('Artifact'));

  return {
    // Token generation
    token_generators: cards.filter(c =>
      /create.*token|populate|amass|incubate/i.test(getOracleText(c))
    ).length,

    // Anthem effects
    anthems: cards.filter(c =>
      /creatures you control get \+\d|creatures.*\+\d\/\+\d|lord/i.test(getOracleText(c))
    ).length,

    // Reanimation
    reanimation: cards.filter(c =>
      /return.*creature.*graveyard.*battlefield|reanimate|unearth|encore/i.test(getOracleText(c))
    ).length,

    // Discard outlets
    discard_outlets: cards.filter(c =>
      /discard.*card|loot|rummage|cycling/i.test(getOracleText(c))
    ).length,

    // Equipment
    equipment: cards.filter(c =>
      c.type_line?.includes('Equipment')
    ).length,

    // Auras
    auras: enchantments.filter(c =>
      c.type_line?.includes('Aura')
    ).length,

    // Protection spells
    protection: cards.filter(c =>
      /hexproof|shroud|indestructible|protection from|ward/i.test(getOracleText(c)) ||
      c.keywords?.some(k => k.match(/hexproof|shroud|protection/i))
    ).length,

    // Instant-speed removal
    instant_removal: instants.filter(c =>
      /destroy|exile|return.*hand|counter target/i.test(c.oracle_text || '')
    ).length,

    // Sacrifice outlets
    sacrifice_outlets: cards.filter(c =>
      /sacrifice.*creature|sacrifice a creature/i.test(getOracleText(c))
    ).length,

    // Death triggers
    death_triggers: cards.filter(c =>
      /when.*dies|whenever.*creature.*dies|death trigger/i.test(getOracleText(c))
    ).length,

    // Recursion
    recursion: cards.filter(c =>
      /return.*graveyard.*hand|return.*graveyard.*battlefield/i.test(getOracleText(c))
    ).length,
  };
}

/**
 * Map metric names to counts from analysis or special counts
 */
function getCountForMetric(
  metric: string,
  analysis: CollectionAnalysis,
  special: Record<string, number>
): number {
  // Map common metrics to analysis fields
  const mapping: Record<string, number> = {
    counterspells: analysis.interaction.counterspells,
    board_wipes: analysis.removal.board_wipes,
    draw_sources: analysis.draw.total,
    draw: analysis.draw.total,
    tutors: analysis.tutors.total,
    ramp: analysis.ramp.total,
    instant_removal: special.instant_removal,
    token_generators: special.token_generators,
    anthems: special.anthems,
    reanimation: special.reanimation,
    discard_outlets: special.discard_outlets,
    equipment: special.equipment,
    auras: special.auras,
    protection: special.protection,
    sacrifice_outlets: special.sacrifice_outlets,
    death_triggers: special.death_triggers,
    recursion: special.recursion,
  };

  return mapping[metric] || 0;
}

/**
 * Calculate archetype status and progress percentage
 */
function calculateArchetypeStatus(
  metrics: Record<string, { owned: number; required: number; recommended: number }>
): { status: 'strong' | 'partial' | 'weak'; progress: number } {
  const entries = Object.values(metrics);
  const total = entries.length;

  // Count how many metrics meet thresholds
  const meetsRecommended = entries.filter(m => m.owned >= m.recommended).length;
  const meetsRequired = entries.filter(m => m.owned >= m.required).length;

  // Calculate overall progress (0-100%)
  const progress = Math.round(
    entries.reduce((sum, m) => {
      const pct = Math.min((m.owned / m.recommended) * 100, 100);
      return sum + pct;
    }, 0) / total
  );

  // Determine status
  if (meetsRecommended === total) return { status: 'strong', progress };
  if (meetsRequired >= total * 0.75) return { status: 'partial', progress };
  return { status: 'weak', progress };
}

/**
 * Identify strength areas for this archetype
 */
function identifyStrengths(
  metrics: Record<string, { owned: number; required: number; recommended: number }>
): string[] {
  const strengths: string[] = [];

  for (const [key, counts] of Object.entries(metrics)) {
    if (counts.owned >= counts.recommended) {
      const label = key.replace(/_/g, ' ');
      strengths.push(`${counts.owned} ${label}`);
    }
  }

  return strengths;
}

/**
 * Identify gaps preventing archetype readiness
 */
function identifyGaps(
  metrics: Record<string, { owned: number; required: number; recommended: number }>
): string[] {
  const gaps: string[] = [];

  for (const [key, counts] of Object.entries(metrics)) {
    if (counts.owned < counts.required) {
      const needed = counts.required - counts.owned;
      const label = key.replace(/_/g, ' ');
      gaps.push(`Need ${needed} more ${label}`);
    } else if (counts.owned < counts.recommended) {
      const needed = counts.recommended - counts.owned;
      const label = key.replace(/_/g, ' ');
      gaps.push(`Add ${needed} more ${label} for optimal build`);
    }
  }

  return gaps;
}

// ============================================================================
// EFFICIENCY METRICS ANALYSIS
// ============================================================================

export interface DuplicateCard {
  name: string;
  owned: number;
  in_use: number;
  available: number;
  trade_value: number; // Value of unused copies (price * available)
  price_per_card: number;
}

export interface UnusedHighValueCard {
  name: string;
  quantity: number;
  price_per_card: number;
  total_value: number;
  cmc?: number;
  type_line?: string;
  color_identity?: string[];
  reason: string;
}

export interface EfficiencyMetrics {
  total_cards: number;
  unique_cards: number;
  cards_in_use: number;
  cards_unused: number;
  utilization_rate: number; // 0-1
  total_value: number;
  value_in_use: number;
  value_unused: number;
  duplicates: DuplicateCard[];
  high_value_unused: UnusedHighValueCard[];
}

/**
 * Analyze collection efficiency - utilization, duplicates, high-value unused
 * Requires price data in cards
 */
export function analyzeEfficiency(
  cards: CollectionCard[],
  usageMap?: Map<string, { total: number; decks: Array<{ deck_name: string; quantity: number }> }>
): EfficiencyMetrics {
  const startTime = performance.now();

  let totalCards = 0;
  let cardsInUse = 0;
  let totalValue = 0;
  let valueInUse = 0;
  const duplicates: DuplicateCard[] = [];
  const highValueUnused: UnusedHighValueCard[] = [];
  let cardsWithPrices = 0;
  let cardsWithUsage = 0;

  // Track unique cards
  const uniqueCards = new Set<string>();

  for (const card of cards) {
    const quantity = card.quantity || 1;
    const usage = usageMap?.get(card.name);
    const inUse = usage ? Math.min(usage.total, quantity) : 0;
    const available = Math.max(0, quantity - inUse);

    // Get price from Scryfall prices object
    const priceStr = (card as any).prices?.usd || "0";
    const price = parseFloat(priceStr) || 0;
    
    if (price > 0) cardsWithPrices++;
    if (inUse > 0) cardsWithUsage++;

    totalCards += quantity;
    cardsInUse += inUse;
    uniqueCards.add(card.name);
    totalValue += price * quantity;
    valueInUse += price * inUse;

    // Track duplicates (owned 2+)
    if (quantity >= 2) {
      duplicates.push({
        name: card.name,
        owned: quantity,
        in_use: inUse,
        available,
        trade_value: price * available,
        price_per_card: price,
      });
    }

    // Track high-value unused cards ($10+ per card AND have unused copies)
    if (available > 0 && price >= 10) {
      highValueUnused.push({
        name: card.name,
        quantity: available, // Only show unused copies
        price_per_card: price,
        total_value: price * available, // Value of unused copies only
        cmc: card.cmc,
        type_line: card.type_line,
        color_identity: card.color_identity,
        reason: determineWhyUnused(card, price),
      });
    }
  }

  // Deduplicate and aggregate duplicates by name
  const duplicatesMap = new Map<string, DuplicateCard>();
  for (const card of duplicates) {
    const existing = duplicatesMap.get(card.name);
    if (existing) {
      // Aggregate quantities for duplicate entries
      existing.owned += card.owned;
      existing.in_use += card.in_use;
      existing.available += card.available;
      existing.trade_value += card.trade_value;
    } else {
      duplicatesMap.set(card.name, { ...card });
    }
  }
  
  // Convert back to array and sort by trade value (highest first)
  const deduplicatedDuplicates = Array.from(duplicatesMap.values());
  deduplicatedDuplicates.sort((a, b) => b.trade_value - a.trade_value);

  // Deduplicate and aggregate high-value unused cards by name
  const highValueUnusedMap = new Map<string, UnusedHighValueCard>();
  for (const card of highValueUnused) {
    const existing = highValueUnusedMap.get(card.name);
    if (existing) {
      // Aggregate quantities and values for duplicate entries
      existing.quantity += card.quantity;
      existing.total_value += card.total_value;
    } else {
      highValueUnusedMap.set(card.name, { ...card });
    }
  }
  
  // Convert back to array and sort by total value (highest first)
  const deduplicatedHighValueUnused = Array.from(highValueUnusedMap.values());
  deduplicatedHighValueUnused.sort((a, b) => b.total_value - a.total_value);

  const elapsed = performance.now() - startTime;
  console.log(`[analyzeEfficiency] Analysis complete in ${elapsed.toFixed(2)}ms`);
  console.log("  - Total cards processed:", totalCards);
  console.log("  - Unique cards:", uniqueCards.size);
  console.log("  - Cards with prices:", cardsWithPrices);
  console.log("  - Cards with usage:", cardsWithUsage);
  console.log("  - Total value: $" + totalValue.toFixed(2));
  console.log("  - Value in use: $" + valueInUse.toFixed(2));
  console.log("  - Utilization rate:", (totalCards > 0 ? (cardsInUse / totalCards * 100).toFixed(1) : 0) + "%");
  console.log("  - Duplicates found:", deduplicatedDuplicates.length);
  console.log("  - High-value unused:", deduplicatedHighValueUnused.length);

  return {
    total_cards: totalCards,
    unique_cards: uniqueCards.size,
    cards_in_use: cardsInUse,
    cards_unused: totalCards - cardsInUse,
    utilization_rate: totalCards > 0 ? cardsInUse / totalCards : 0,
    total_value: totalValue,
    value_in_use: valueInUse,
    value_unused: totalValue - valueInUse,
    duplicates: deduplicatedDuplicates, // All duplicates, not sliced
    high_value_unused: deduplicatedHighValueUnused.slice(0, 20), // Top 20 high-value unused
  };
}

/**
 * Determine why a card might be unused
 */
function determineWhyUnused(card: CollectionCard, price: number): string {
  const typeLine = card.type_line?.toLowerCase() || "";
  const cmc = card.cmc || 0;

  // Check for specific characteristics
  if (typeLine.includes("land")) {
    if (price > 20) return "High-value land - consider adding to decks";
    return "Utility land - may fit specialized strategies";
  }

  if (cmc >= 7) {
    return "High CMC - best for ramp-heavy decks";
  }

  if (typeLine.includes("creature") && cmc >= 5) {
    return "Expensive creature - needs support or is a finisher";
  }

  if (price > 50) {
    return "High-value staple - strong trade or deck addition";
  }

  if (price > 20) {
    return "Mid-high value - potential deck upgrade or trade";
  }

  return "Expensive card not in decks - evaluate for inclusion";
}

// ============================================================================
// COLOR IDENTITY ANALYSIS (Phase 3)
// ============================================================================

export interface ColorIdentityCard {
  name: string;
  quantity: number;   // copies owned
  in_use: number;     // copies currently in decks
  available: number;  // quantity - in_use
}

export interface ColorPairStrength {
  colors: string; // e.g., "WU", "UBR"
  card_count: number;       // cards with exactly this color identity (used for matrix)
  staple_count: number;     // staples with exact color identity match
  deck_staples: number;     // staples legally playable in a deck of this color identity (subset + colorless)
  deck_card_count: number;  // total non-land cards legally playable in a deck of this color identity
  staple_cards: ColorIdentityCard[];    // full staple objects with owned/in_use/available
  commander_cards: ColorIdentityCard[]; // legendary creatures with exact color identity match
  commander_suggestions: string[];      // card names derived from commander_cards (backwards compat)
}

export interface ColorIdentityAnalysis {
  pairs: ColorPairStrength[];
  matrix: number[][]; // 5x5 matrix for W/U/B/R/G
  mono_colors: ColorPairStrength[]; // 1-color combinations
  two_color: ColorPairStrength[]; // 2-color guilds
  three_color: ColorPairStrength[]; // 3-color shards/wedges
  four_color: ColorPairStrength[]; // 4-color combinations
  five_color: ColorPairStrength[]; // 5-color combinations
  strong_pairs: ColorPairStrength[]; // multi-color combos with 20+ staples
  weak_pairs: ColorPairStrength[]; // multi-color combos with <10 staples
}

function toColorIdentityCard(card: CollectionCard, usageMap?: UsageMap): ColorIdentityCard {
  const usage = usageMap?.get(card.name.toLowerCase());
  const in_use = usage?.total ?? 0;
  return {
    name: card.name,
    quantity: card.quantity ?? 1,
    in_use,
    available: Math.max(0, (card.quantity ?? 1) - in_use),
  };
}

/**
 * Analyze which color combinations are well-supported by the collection
 */
export function analyzeColorIdentity(cards: CollectionCard[], usageMap?: UsageMap): ColorIdentityAnalysis {
  const startTime = performance.now();
  
  // Group cards by color identity (exclude lands and colorless)
  const colorGroups = new Map<string, CollectionCard[]>();
  
  for (const card of cards) {
    // Skip lands
    if (card.type_line?.toLowerCase().includes('land')) continue;
    
    const colorIdentity = card.color_identity || [];
    if (colorIdentity.length === 0) continue; // skip colorless
    
    const colorKey = colorIdentity.sort().join('');
    if (!colorGroups.has(colorKey)) {
      colorGroups.set(colorKey, []);
    }
    colorGroups.get(colorKey)!.push(card);
  }
  
  // Build 5x5 matrix for visualization
  const colors = ['W', 'U', 'B', 'R', 'G'];
  const matrix: number[][] = Array(5).fill(0).map(() => Array(5).fill(0));
  
  // Count cards for each color pair (total count, not staple count)
  const pairCounts = new Map<string, number>();
  const pairStaples = new Map<string, number>();

  for (const [colorKey, colorCards] of colorGroups.entries()) {
    const stapleCount = colorCards.filter(c => isStapleCard(c)).length;

    // For all color combos, use total card count for card_count
    if (colorKey.length === 1) {
      // Monocolor - fill diagonal
      const idx = colors.indexOf(colorKey);
      if (idx >= 0) {
        matrix[idx][idx] = colorCards.length;
        pairCounts.set(colorKey, colorCards.length);
        pairStaples.set(colorKey, stapleCount);
      }
    } else if (colorKey.length === 2) {
      // Two-color pair
      const [c1, c2] = colorKey.split('');
      const i1 = colors.indexOf(c1);
      const i2 = colors.indexOf(c2);
      if (i1 >= 0 && i2 >= 0) {
        matrix[i1][i2] = colorCards.length;
        matrix[i2][i1] = colorCards.length; // symmetric
        pairCounts.set(colorKey, colorCards.length);
        pairStaples.set(colorKey, stapleCount);
      }
    } else {
      // 3+ colors - track but don't show in matrix
      pairCounts.set(colorKey, colorCards.length);
      pairStaples.set(colorKey, stapleCount);
    }
  }

  // Build color pair strength objects
  const pairs: ColorPairStrength[] = [];
  for (const [colorKey, count] of pairCounts.entries()) {
    const staples = pairStaples.get(colorKey) || 0;
    pairs.push({
      colors: colorKey,
      card_count: count,
      staple_count: staples,
      deck_staples: 0,        // computed below
      deck_card_count: 0,     // computed below
      staple_cards: [],       // computed below
      commander_cards: [],    // computed below
      commander_suggestions: [], // computed below from commander_cards
    });
  }

  // Compute deck_staples, deck_card_count, staple_cards, and commander_cards using subset logic:
  // counts all non-land cards whose color identity is a subset of the pair's colors,
  // including colorless cards (legal in every Commander deck).
  // Known limitations: board wipe regex misses -X/-X sweepers; tutor regex has minor edge cases.
  for (const pair of pairs) {
    const pairSet = new Set(pair.colors.split(''));
    const playable = cards.filter(card => {
      const typeLine = (card.type_line || '').toLowerCase();
      if (typeLine.includes('land')) return false;
      const ci = card.color_identity || [];
      return ci.length === 0 || ci.every(c => pairSet.has(c));
    });
    pair.deck_card_count = playable.length;

    const staples = playable.filter(c => isStapleCard(c));
    pair.deck_staples = staples.length;
    pair.staple_cards = staples.map(c => toColorIdentityCard(c, usageMap));

    // Commanders: legendary creatures whose exact color identity matches this pair
    const commanders = cards.filter(card => {
      const tl = (card.type_line || '').toLowerCase();
      if (!tl.includes('legendary') || !tl.includes('creature')) return false;
      const ci = (card.color_identity || []).slice().sort().join('');
      return ci === pair.colors;
    });
    pair.commander_cards = commanders.map(c => toColorIdentityCard(c, usageMap));
    pair.commander_suggestions = pair.commander_cards.map(c => c.name);
  }

  // Sort pairs by deck_staples (most playable first)
  pairs.sort((a, b) => b.deck_staples - a.deck_staples);

  // Categorize by color count
  const mono_colors = pairs.filter(p => p.colors.length === 1);
  const two_color = pairs.filter(p => p.colors.length === 2);
  const three_color = pairs.filter(p => p.colors.length === 3);
  const four_color = pairs.filter(p => p.colors.length === 4);
  const five_color = pairs.filter(p => p.colors.length === 5);

  // Categorize as strong/weak (exclude mono-colors from these lists), using deck_staples
  const multi_color = pairs.filter(p => p.colors.length >= 2);
  const strong_pairs = multi_color.filter(p => p.deck_staples >= 30);
  const weak_pairs = multi_color.filter(p => p.deck_staples < 15);
  
  const elapsed = performance.now() - startTime;
  console.log(`[collection_analyzer] Analyzed color identity in ${elapsed.toFixed(2)}ms`);
  console.log(`[collection_analyzer] Total cards analyzed: ${cards.length}`);
  console.log(`[collection_analyzer] Color groups found: ${colorGroups.size}`);
  console.log(`[collection_analyzer] Found ${pairs.length} color identities: ${mono_colors.length} mono, ${two_color.length} dual, ${three_color.length} tri`);
  console.log(`[collection_analyzer] Strong multi-color combinations: ${strong_pairs.length}`);
  
  // Debug: Log top 5 pairs by staple count
  const topPairs = pairs.slice(0, 5);
  console.log('[collection_analyzer] Top 5 color combinations by staples:');
  topPairs.forEach(p => {
    console.log(`  ${p.colors}: ${p.staple_count} staples out of ${p.card_count} total cards`);
  });
  
  return {
    pairs,
    matrix,
    mono_colors,
    two_color,
    three_color,
    four_color,
    five_color,
    strong_pairs,
    weak_pairs,
  };
}

/**
 * Determine if a card is a "staple" (quality card worth building around)
 * 
 * Criteria: Efficient, functional cards that enable core deck strategy.
 * Focus on cards that are broadly playable in Commander, not niche synergy pieces.
 */
function isStapleCard(card: CollectionCard): boolean {
  const cmc = card.cmc || 0;
  const oracle = getOracleText(card).toLowerCase();
  const typeLine = (card.type_line || "").toLowerCase();
  
  // === RAMP (core mana acceleration) ===
  // Fast mana rocks (CMC 0-2 artifacts)
  if (cmc <= 2 && typeLine.includes('artifact') && /add {|produce.*mana/i.test(oracle)) {
    return true;
  }
  
  // Land ramp (efficient tutoring for lands)
  if (cmc <= 4 && /search your library for.*land/i.test(oracle) && !typeLine.includes('land')) {
    return true;
  }
  
  // Mana dorks (CMC 1-2 creatures that tap for mana)
  if (cmc <= 2 && typeLine.includes('creature') && /{t}:.*add {/i.test(oracle)) {
    return true;
  }
  
  // === CARD DRAW (repeatable or high-value) ===
  // Draw spells (CMC <= 4 that draw 2+ cards)
  if (cmc <= 4 && /draw (two|three|\d+) cards?/i.test(oracle)) {
    return true;
  }
  
  // Repeatable draw engines (triggers that draw, not just "whenever" alone)
  // FIXED: Require both trigger AND draw in same pattern
  if (/(whenever|at the beginning).*draw|draw.*card.*(whenever|at the beginning)/i.test(oracle)) {
    return true;
  }
  
  // === REMOVAL (efficient answers) ===
  // Efficient targeted removal (CMC <= 4, exile or destroy)
  if (cmc <= 4 && /(exile|destroy) target (artifact|creature|enchantment|planeswalker|permanent)/i.test(oracle)) {
    return true;
  }
  
  // Flexible removal (hits multiple permanent types)
  if (cmc <= 4 && /exile target.*or|destroy target.*(artifact|creature|enchantment).*or/i.test(oracle)) {
    return true;
  }
  
  // Counterspells (CMC <= 3)
  if (cmc <= 3 && /counter target (spell|ability)/i.test(oracle)) {
    return true;
  }
  
  // Board wipes (reset effects)
  if (/destroy all|exile all (creatures?|artifacts?|enchantments?|nonland permanents?)|each player sacrifices?/i.test(oracle)) {
    return true;
  }
  
  // === TUTORS (card selection/consistency) ===
  // Non-land tutors (search library for specific cards)
  if (/search your library for.*card/i.test(oracle) && !/land/.test(oracle)) {
    return true;
  }
  
  // === VALUE ENGINES ===
  // Efficient planeswalkers (CMC <= 5)
  if (cmc <= 5 && typeLine.includes('planeswalker')) {
    return true;
  }
  
  // Recursion engines (CMC <= 4, return cards from graveyard)
  if (cmc <= 4 && /return.*card.*from.*graveyard|return target.*card from your graveyard/i.test(oracle)) {
    return true;
  }
  
  // Token generators (repeatable)
  if (/(whenever|at the beginning).*create.*token|create.*token.*(whenever|at the beginning)/i.test(oracle) && cmc <= 5) {
    return true;
  }
  
  // === PROTECTION (only efficient/valuable protection) ===
  // Protection spells (CMC <= 3, not just keyword abilities on creatures)
  if (cmc <= 3 && !typeLine.includes('creature') && /(hexproof|indestructible|protection from)/i.test(oracle)) {
    return true;
  }
  
  // Flicker/blink effects (CMC <= 4, repeatable value)
  if (cmc <= 4 && /exile.*return.*to the battlefield|flicker|blink/i.test(oracle)) {
    return true;
  }
  
  return false;
}

/**
 * Get commander suggestions for a color identity from the user's collection.
 * Finds Legendary Creatures in the collection whose color identity exactly matches.
 */
function getCommanderSuggestions(colorIdentity: string, cards: CollectionCard[]): string[] {
  return cards
    .filter(card => {
      const typeLine = (card.type_line || '').toLowerCase();
      const isLegendaryCreature = typeLine.includes('legendary') && typeLine.includes('creature');
      const cardColorIdentity = (card.color_identity || []).slice().sort().join('');
      return isLegendaryCreature && cardColorIdentity === colorIdentity;
    })
    .map(card => card.name);
}
