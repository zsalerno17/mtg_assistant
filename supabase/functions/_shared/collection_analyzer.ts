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
