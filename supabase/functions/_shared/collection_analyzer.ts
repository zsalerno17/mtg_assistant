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

export interface RampBreakdown {
  total: number;
  lands: number;
  rocks: number;
  dorks: number;
  treasures: number; // MTG specialist fix
  other: number;
}

export interface DrawBreakdown {
  total: number;
  card_draw: number;
  looting: number; // MTG specialist fix - separate from draw
  selection: number; // MTG specialist fix - scry/surveil
}

export interface RemovalBreakdown {
  total: number;
  targeted: number;
  board_wipes: number;
  edict: number; // MTG specialist fix
}

export interface CollectionAnalysis {
  ramp: RampBreakdown;
  draw: DrawBreakdown;
  removal: RemovalBreakdown;
  interaction: { total: number; counterspells: number };
  tutors: { total: number };
  board_wipes: { total: number };
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
export function analyzeCollection(cards: CollectionCard[]): CollectionAnalysis {
  const startTime = performance.now();
  
  const ramp: RampBreakdown = { total: 0, lands: 0, rocks: 0, dorks: 0, treasures: 0, other: 0 };
  const draw: DrawBreakdown = { total: 0, card_draw: 0, looting: 0, selection: 0 };
  const removal: RemovalBreakdown = { total: 0, targeted: 0, board_wipes: 0, edict: 0 };
  let counterspells = 0;
  let tutors = 0;
  let boardWipes = 0;
  
  for (const card of cards) {
    const categories = categorizeCard(card);
    const quantity = card.quantity || 1;
    
    // Weighted categorization for multi-function cards (70/30 split)
    if (categories.ramp) {
      const weight = (categories.draw || categories.removal) ? 0.7 : 1.0;
      ramp.total += quantity * weight;
      
      switch (categories.ramp.type) {
        case "lands":
          ramp.lands += quantity * weight;
          break;
        case "rocks":
          ramp.rocks += quantity * weight;
          break;
        case "dorks":
          ramp.dorks += quantity * weight;
          break;
        case "treasures":
          ramp.treasures += quantity * weight;
          break;
        case "other":
          ramp.other += quantity * weight;
          break;
      }
    }
    
    if (categories.draw) {
      const weight = (categories.ramp || categories.removal) ? 0.7 : 1.0;
      draw.total += quantity * weight;
      
      switch (categories.draw.type) {
        case "card_draw":
          draw.card_draw += quantity * weight;
          break;
        case "looting":
          draw.looting += quantity * weight;
          break;
        case "selection":
          draw.selection += quantity * weight;
          break;
      }
    }
    
    if (categories.removal) {
      const weight = (categories.ramp || categories.draw) ? 0.7 : 1.0;
      removal.total += quantity * weight;
      
      switch (categories.removal.type) {
        case "targeted":
          removal.targeted += quantity * weight;
          break;
        case "board_wipes":
          removal.board_wipes += quantity * weight;
          boardWipes += quantity * weight;
          break;
        case "edict":
          removal.edict += quantity * weight;
          break;
      }
    }
    
    if (categories.counterspell) {
      counterspells += quantity;
    }
    
    if (categories.tutor) {
      tutors += quantity;
    }
  }
  
  const elapsed = performance.now() - startTime;
  console.log(`[collection_analyzer] Analyzed ${cards.length} cards in ${elapsed.toFixed(2)}ms`);
  
  // Round values to 1 decimal place for cleaner display
  const round = (n: number) => Math.round(n * 10) / 10;
  
  return {
    ramp: {
      total: round(ramp.total),
      lands: round(ramp.lands),
      rocks: round(ramp.rocks),
      dorks: round(ramp.dorks),
      treasures: round(ramp.treasures),
      other: round(ramp.other),
    },
    draw: {
      total: round(draw.total),
      card_draw: round(draw.card_draw),
      looting: round(draw.looting),
      selection: round(draw.selection),
    },
    removal: {
      total: round(removal.total),
      targeted: round(removal.targeted),
      board_wipes: round(removal.board_wipes),
      edict: round(removal.edict),
    },
    interaction: {
      total: round(counterspells),
      counterspells: round(counterspells),
    },
    tutors: {
      total: round(tutors),
    },
    board_wipes: {
      total: round(boardWipes),
    },
  };
}
