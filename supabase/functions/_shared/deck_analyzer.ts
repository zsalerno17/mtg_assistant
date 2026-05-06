/**
 * Deck analysis engine for Commander decks.
 * Ported from backend/src/deck_analyzer.py
 */

import {
  Card,
  Deck,
  Collection,
  getAllCards,
  isLand,
  isCreature,
  getCollectionCard,
  hasCard,
  getDeckColorIdentity,
  createCard,
  getCardCount,
} from "./models.ts";
import { getCardByName } from "./scryfall.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_NAMES: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

// Recommended minimums for Commander (100-card singleton)
const RECOMMENDED_LANDS: [number, number] = [36, 38];
const RECOMMENDED_RAMP = 10;
const RECOMMENDED_DRAW = 10;
const RECOMMENDED_REMOVAL = 8;
const RECOMMENDED_BOARD_WIPES = 2;
const HIGH_AVG_CMC_THRESHOLD = 3.5;

// Color-aware staple recommendations for weakness examples.
// "*" = colorless (always legal in any deck).
const _COLOR_STAPLES: Record<string, Record<string, string[]>> = {
  ramp: {
    W: ["Smothering Tithe", "Knight of the White Orchid", "Archaeomancer's Map"],
    U: [],
    B: ["Dark Ritual", "Crypt Ghast", "Black Market Connections"],
    R: ["Dockside Extortionist", "Jeska's Will", "Curse of Opulence"],
    G: [
      "Cultivate",
      "Kodama's Reach",
      "Nature's Lore",
      "Llanowar Elves",
      "Birds of Paradise",
    ],
    "*": ["Sol Ring", "Arcane Signet", "Fellwar Stone", "Mind Stone"],
  },
  draw: {
    W: ["Esper Sentinel", "Welcoming Vampire", "Mentor of the Meek"],
    U: ["Rhystic Study", "Mystic Remora", "Fact or Fiction"],
    B: [
      "Phyrexian Arena",
      "Sign in Blood",
      "Night's Whisper",
      "Read the Bones",
    ],
    R: ["Faithless Looting", "Light Up the Stage"],
    G: [
      "Beast Whisperer",
      "Guardian Project",
      "Harmonize",
      "Sylvan Library",
    ],
    "*": ["Skullclamp"],
  },
  removal: {
    W: ["Swords to Plowshares", "Path to Exile", "Generous Gift"],
    U: ["Reality Shift", "Rapid Hybridization", "Pongify"],
    B: ["Go for the Throat", "Infernal Grasp", "Feed the Swarm"],
    R: ["Chaos Warp", "Abrade", "Vandalblast"],
    G: ["Beast Within", "Nature's Claim"],
    "*": [],
  },
  board_wipes: {
    W: ["Wrath of God", "Farewell", "Austere Command"],
    U: ["Cyclonic Rift", "Flood of Tears"],
    B: ["Damnation", "Toxic Deluge", "Black Sun's Zenith"],
    R: ["Blasphemous Act", "Chain Reaction"],
    G: ["Bane of Progress"],
    "*": ["Oblivion Stone", "Nevinyrral's Disk", "All Is Dust"],
  },
};

function _getColorFilteredExamples(
  category: string,
  colorIdentity: string[]
): string[] {
  const staples = _COLOR_STAPLES[category] ?? {};
  const examples: string[] = [...(staples["*"] ?? [])];
  for (const color of colorIdentity) {
    examples.push(...(staples[color] ?? []));
  }
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const card of examples) {
    if (!seen.has(card)) {
      seen.add(card);
      unique.push(card);
    }
  }
  return unique.slice(0, 5);
}

// ─── Result Interfaces ───────────────────────────────────────────────────────

export interface DeckAnalysis {
  commander: string | null;
  colors: string[];
  total_cards: number;
  strategy: string;
  power_level: number;
  bracket: number;
  bracket_label: string;
  mana_curve: Record<number, number>;
  average_cmc: number;
  card_types: Record<string, number>;
  color_distribution: Record<string, number>;
  mana_source_count: number;
  ramp_count: number;
  draw_count: number;
  removal_count: number;
  board_wipe_count: number;
  interaction_count: number;
  tutor_count: number;
  counterspell_count: number;
  fast_mana_count: number;
  exile_removal_count: number;
  interaction_timeline: InteractionTimeline;
  removal_quality: RemovalQuality;
  interaction_coverage: InteractionCoverage;
  themes: ThemeResult[];
  theme_names: string[];
  weaknesses: WeaknessResult[];
  power_breakdown: PowerLevelBreakdown;
  win_conditions: WinCondition[];
  verdict: string;
}

export interface InteractionTimeline {
  acceleration: { total: number; instant: number; sorcery: number }; // 0-2 CMC
  core: { total: number; instant: number; sorcery: number }; // 3-4 CMC
  haymakers: { total: number; instant: number; sorcery: number }; // 5+ CMC
  instant_speed_percentage: number;
}

export interface RemovalQuality {
  exile: number;
  destroy: number;
  bounce: number;
  tuck: number;
  damage: number;
  other: number;
  total: number;
  exile_percentage: number;
}

export interface InteractionCoverage {
  creature_removal: number;
  creature_removal_instant: number;
  artifact_enchantment_removal: number;
  counterspells: number;
  board_wipes: number;
  graveyard_hate: number;
}

export interface ThemeResult {
  name: string;
  count: number;
  cards: string[];
  definition: string;
}

export interface WeaknessResult {
  label: string;
  why: string;
  look_for: string;
  examples: string[];
}

export interface ScenarioStats {
  land_count: number;
  ramp_count: number;
  draw_count: number;
  avg_cmc: number;
}

export interface ScenarioResult {
  before: ScenarioStats;
  after: ScenarioStats;
  delta: ScenarioStats;
  verdict: string;
}

export interface PowerLevelFactor {
  category: string;
  value: number;
  max_contribution: number;
  description: string;
  cards?: string[]; // Card names contributing to this factor
  card_scores?: { [cardName: string]: number }; // Individual card contributions
}

export interface PowerLevelBreakdown {
  total: number;
  rounded: number;
  bracket: number;
  bracket_label: string;
  factors: PowerLevelFactor[];
  next_bracket_threshold?: {
    target_bracket: number;
    target_power: number;
    gap: number;
    suggestions: string[];
  };
}

export interface PowerDelta {
  before: number;
  after: number;
  change: number;
  factors_changed: string[];
}

export interface WinCondition {
  type: "combo" | "combat" | "alternate_wincon" | "value_grind";
  description: string;
  cards: string[];
  reliability: "primary" | "secondary" | "backup";
}

export interface UserGoals {
  targetPowerLevel?: number;           // Target power level (1-10)
  budgetConstraint?: number;            // Budget in USD
  themeEmphasis?: string[];             // Themes to prioritize (e.g., ["Tokens", "Aristocrats"])
  style?: "casual" | "competitive" | "thematic" | "budget"; // Playstyle preference
}

export interface UpgradePhase {
  phaseNumber: number;
  title: string;
  description: string;
  estimatedCost: number;
  powerGain: number;
  targetPower: number;
  swaps: Array<{
    cardOut: Card;
    cardIn: Card;
    reason: string;
    cost: number;
    powerDelta: PowerDelta;
  }>;
  additions?: Array<{
    cardIn: Card;
    reason: string;
    cost: number;
    powerDelta: PowerDelta;
  }>;
}

export interface UpgradePath {
  currentPower: number;
  targetPower: number;
  totalBudget: number;
  phases: UpgradePhase[];
  summary: string;
}

export type ImprovementSuggestion = [
  Card,                // add
  Card | null,         // cut
  string,              // reason
  number,              // score
  string | null,       // neverCutReason
  PowerDelta | null,   // power impact (NEW)
];

export interface CardRoles {
  isRamp: boolean;
  isDraw: boolean;
  isRemoval: boolean;
  isBoardWipe: boolean;
  isLegendaryOrGod: boolean;
  themes: string[];
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function analyzeDeck(deck: Deck): DeckAnalysis {
  const allCards = getAllCards(deck);
  const themes = identifyThemes(deck);
  const commanders: string[] = [];
  if (deck.commander) commanders.push(deck.commander.name);
  if (deck.partner) commanders.push(deck.partner.name);

  const strategy = classifyStrategy(deck);
  
  // Get detailed power breakdown first
  const powerBreakdown = explainPowerLevel(deck, themes);
  console.log(`[analyzeDeck] powerBreakdown has ${powerBreakdown.factors.length} factors`);
  const powerLevel = powerBreakdown.rounded; // Use rounded value from detailed breakdown

  // Recalculate weaknesses with dynamic thresholds
  const weaknesses = identifyWeaknesses(deck, strategy, powerLevel);

  const partial: Omit<DeckAnalysis, "verdict"> = {
    commander: commanders.length > 0 ? commanders.join(" & ") : null,
    colors: getDeckColorIdentity(deck),
    total_cards: getCardCount(deck),
    strategy,
    power_level: powerLevel,
    ...getDeckBracket(powerLevel),
    mana_curve: buildManaCurve(allCards),
    average_cmc: calculateAverageCmc(allCards),
    card_types: categorizeCardTypes(allCards),
    color_distribution: getColorDistribution(allCards),
    mana_source_count: countManaSources(allCards),
    ramp_count: countRamp(allCards),
    draw_count: countDraw(allCards),
    removal_count: countRemoval(allCards),
    board_wipe_count: countBoardWipes(allCards),
    interaction_count: countInteraction(allCards),
    tutor_count: countTutors(allCards),
    counterspell_count: countCounterspells(allCards),
    fast_mana_count: countFastMana(allCards),
    exile_removal_count: countExileRemoval(allCards),
    interaction_timeline: getInteractionTimeline(allCards),
    removal_quality: getRemovalQualityBreakdown(allCards),
    interaction_coverage: getInteractionCoverage(allCards),
    themes,
    theme_names: themes.map((t) => t.name),
    weaknesses,
    power_breakdown: powerBreakdown,
    win_conditions: identifyWinConditions(deck, themes),
  };

  return {
    ...partial,
    verdict: generateDeckVerdict(partial as DeckAnalysis),
  };
}

export function findCollectionImprovements(
  deck: Deck,
  collection: Collection
): ImprovementSuggestion[] {
  const deckNames = new Set(
    getAllCards(deck).map((c) => c.name.toLowerCase())
  );
  const commanderColors = new Set(getDeckColorIdentity(deck));
  const weaknesses = identifyWeaknesses(deck);
  const themes = identifyThemes(deck);
  // Build per-card roles once — passed to _findCut and _isWeakCategoryCard to avoid re-scanning
  const cardRoles = buildCardRoles(deck);

  const suggestions: ImprovementSuggestion[] = [];

  for (const colCard of collection.cards) {
    // Skip if already in deck
    if (deckNames.has(colCard.name.toLowerCase())) continue;

    // Enforce color identity (colorless cards are always fine)
    const cardColors = new Set(colCard.color_identity);
    if (
      cardColors.size > 0 &&
      ![...cardColors].every((c) => commanderColors.has(c))
    ) {
      continue;
    }

    const result = _evaluateCard(colCard, weaknesses, themes);
    if (result) {
      const [reason, score] = result;
      const [cut, neverCutReason] = _findCut(deck, colCard, weaknesses, cardRoles);
      
      // Calculate power delta for this suggestion
      const powerDelta = calculatePowerDelta(deck, colCard, cut, themes);
      
      suggestions.push([colCard, cut, reason, score, neverCutReason, powerDelta]);
    }
  }

  // Sort by power delta descending (prioritize highest impact), then by score
  suggestions.sort((a, b) => {
    const deltaA = a[5]?.change ?? 0;
    const deltaB = b[5]?.change ?? 0;
    if (deltaB !== deltaA) return deltaB - deltaA; // Highest power delta first
    return b[3] - a[3]; // Then by score
  });
  return suggestions.slice(0, 50); // Increased from 20 to 50 for upgrade path building
}

export function scenariosFallback(
  deck: Deck,
  adds: string[],
  removes: string[]
): ScenarioResult {
  // Build a mutable copy of the mainboard as name->card map (case-insensitive)
  const cardMap = new Map<string, Card>();
  for (const c of getAllCards(deck)) {
    cardMap.set(c.name.toLowerCase(), c);
  }

  // Current stats
  const allCards = [...getAllCards(deck)];
  const beforeLands = countManaSources(allCards);
  const beforeRamp = countRamp(allCards);
  const beforeDraw = countDraw(allCards);
  const beforeAvgCmc = calculateAverageCmc(allCards);

  // Apply changes: find matching cards from the deck for removals
  const modified = [...allCards];
  for (const name of removes) {
    const key = name.trim().toLowerCase();
    const match = cardMap.get(key);
    if (match) {
      const idx = modified.indexOf(match);
      if (idx !== -1) {
        modified.splice(idx, 1);
      }
    }
  }

  // For adds, construct minimal placeholder cards
  const addedCards: Card[] = [];
  for (const name of adds) {
    addedCards.push(createCard({ name: name.trim(), quantity: 1 }));
  }

  const afterCards = [...modified, ...addedCards];

  const afterLands = countManaSources(afterCards);
  const afterRamp = countRamp(afterCards);
  const afterDraw = countDraw(afterCards);
  const afterAvgCmc = calculateAverageCmc(afterCards);

  const deltaLands = afterLands - beforeLands;
  const deltaRamp = afterRamp - beforeRamp;
  const deltaDraw = afterDraw - beforeDraw;
  const deltaCmc = Math.round((afterAvgCmc - beforeAvgCmc) * 100) / 100;

  // Template-driven verdict
  const parts: string[] = [];
  if (deltaRamp > 0) {
    parts.push(`ramp improves by ${deltaRamp}`);
  } else if (deltaRamp < 0) {
    parts.push(`ramp decreases by ${Math.abs(deltaRamp)}`);
  }
  if (deltaDraw > 0) {
    parts.push(`card draw improves by ${deltaDraw}`);
  } else if (deltaDraw < 0) {
    parts.push(`card draw decreases by ${Math.abs(deltaDraw)}`);
  }
  if (deltaLands !== 0) {
    const direction = deltaLands > 0 ? "up" : "down";
    parts.push(`mana sources go ${direction} by ${Math.abs(deltaLands)}`);
  }
  if (deltaCmc > 0.05) {
    parts.push(`average CMC rises by ${deltaCmc.toFixed(2)}`);
  } else if (deltaCmc < -0.05) {
    parts.push(`average CMC drops by ${Math.abs(deltaCmc).toFixed(2)}`);
  }

  const verdict = parts.length > 0
    ? "Net effect: " + parts.join(", ") + "."
    : "These changes have minimal measurable impact on ramp, draw, lands, or average CMC.";

  return {
    before: {
      land_count: beforeLands,
      ramp_count: beforeRamp,
      draw_count: beforeDraw,
      avg_cmc: beforeAvgCmc,
    },
    after: {
      land_count: afterLands,
      ramp_count: afterRamp,
      draw_count: afterDraw,
      avg_cmc: afterAvgCmc,
    },
    delta: {
      land_count: deltaLands,
      ramp_count: deltaRamp,
      draw_count: deltaDraw,
      avg_cmc: deltaCmc,
    },
    verdict,
  };
}

// ─── Mana Curve & CMC ─────────────────────────────────────────────────────────

export function buildManaCurve(cards: Card[]): Record<number, number> {
  const curve: Record<number, number> = {};
  for (const card of cards) {
    if (!isLand(card)) {
      const cmc = Math.min(Math.floor(card.cmc), 8); // bin 8+ together
      curve[cmc] = (curve[cmc] ?? 0) + card.quantity;
    }
  }
  // Return sorted by key
  const sorted: Record<number, number> = {};
  for (const key of Object.keys(curve).map(Number).sort((a, b) => a - b)) {
    sorted[key] = curve[key];
  }
  return sorted;
}

export function calculateAverageCmc(cards: Card[]): number {
  const nonLands = cards.filter((c) => !isLand(c));
  const total = nonLands.reduce((sum, c) => sum + c.cmc * c.quantity, 0);
  const count = nonLands.reduce((sum, c) => sum + c.quantity, 0);
  return count > 0 ? Math.round((total / count) * 100) / 100 : 0.0;
}

// ─── Card Type Breakdown ──────────────────────────────────────────────────────

export function categorizeCardTypes(cards: Card[]): Record<string, number> {
  const types: Record<string, number> = {};
  for (const card of cards) {
    const tl = card.type_line.toLowerCase();
    if (tl.includes("land")) {
      types["Lands"] = (types["Lands"] ?? 0) + card.quantity;
    } else if (tl.includes("creature")) {
      types["Creatures"] = (types["Creatures"] ?? 0) + card.quantity;
    } else if (tl.includes("instant")) {
      types["Instants"] = (types["Instants"] ?? 0) + card.quantity;
    } else if (tl.includes("sorcery")) {
      types["Sorceries"] = (types["Sorceries"] ?? 0) + card.quantity;
    } else if (tl.includes("enchantment")) {
      types["Enchantments"] = (types["Enchantments"] ?? 0) + card.quantity;
    } else if (tl.includes("artifact")) {
      types["Artifacts"] = (types["Artifacts"] ?? 0) + card.quantity;
    } else if (tl.includes("planeswalker")) {
      types["Planeswalkers"] = (types["Planeswalkers"] ?? 0) + card.quantity;
    } else if (tl) {
      types["Other"] = (types["Other"] ?? 0) + card.quantity;
    }
  }
  return types;
}

export function getColorDistribution(cards: Card[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const card of cards) {
    if (isLand(card)) continue;
    for (const color of card.color_identity) {
      const label = COLOR_NAMES[color] ?? color;
      dist[label] = (dist[label] ?? 0) + card.quantity;
    }
  }
  return dist;
}

// ─── Resource Counts ──────────────────────────────────────────────────────────

export function countManaSources(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) {
      count += card.quantity;
    } else {
      const oracle = card.oracle_text.toLowerCase();
      const manaPatterns = [
        "add {",
        "adds {",
        "add one mana",
        "add two mana",
        "add three mana",
        "add mana",
        "produces mana",
        "treasure token",
      ];
      if (manaPatterns.some((p) => oracle.includes(p))) {
        count += card.quantity;
      }
    }
  }
  return count;
}

export function countRamp(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) continue;
    if (card.cmc > 3) continue;
    const oracle = card.oracle_text.toLowerCase();
    const tl = card.type_line.toLowerCase();

    // Mana rocks / dorks
    const manaAdders = [
      "add {",
      "adds {",
      "add one mana",
      "add two mana",
      "add three mana",
      "add mana",
    ];
    if (manaAdders.some((p) => oracle.includes(p))) {
      count += card.quantity;
    }
    // Treasure producers
    else if (oracle.includes("treasure token")) {
      count += card.quantity;
    }
    // Land tutors (instants/sorceries that search for lands)
    else if (
      (tl.includes("sorcery") || tl.includes("instant")) &&
      oracle.includes("search your library") &&
      oracle.includes("land")
    ) {
      count += card.quantity;
    }
  }
  return count;
}

export function countDraw(cards: Card[]): number {
  const drawPhrases = [
    "draw a card",
    "draw cards",
    "draw two",
    "draw three",
    "draw x ",
    "draw that many",
    "draw an additional",
  ];
  let count = 0;
  const matchedCards: string[] = [];
  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (drawPhrases.some((p) => oracle.includes(p))) {
      count += card.quantity;
      matchedCards.push(card.name);
    }
  }
  console.log(`[DEBUG countDraw] Total count: ${count}, matched cards:`, matchedCards.slice(0, 5));
  return count;
}

export function countRemoval(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    const tl = card.type_line.toLowerCase();

    // Direct destroy/exile
    if (
      oracle.includes("destroy target") ||
      oracle.includes("exile target")
    ) {
      count += card.quantity;
    }
    // Damage-based removal
    else if (
      oracle.includes("deals damage to any target") ||
      oracle.includes("deals damage to target creature")
    ) {
      count += card.quantity;
    }
    // Enchantment-based neutralization
    else if (tl.includes("enchantment") && oracle.includes("loses all")) {
      count += card.quantity;
    }
    // Tuck effects
    else if (
      oracle.includes("shuffle") &&
      oracle.includes("into") &&
      oracle.includes("library") &&
      oracle.includes("target")
    ) {
      count += card.quantity;
    }
  }
  return count;
}

export function countBoardWipes(cards: Card[]): number {
  const wipePhrases = [
    "destroy all creatures",
    "destroy all nonland",
    "destroy all permanents",
    "destroy all artifact",
    "exile all",
    "all creatures get -",
    "return all creatures",
    "return all nonland",
  ];
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (wipePhrases.some((p) => oracle.includes(p))) {
      count += card.quantity;
    } else if (oracle.includes("damage to each creature")) {
      count += card.quantity;
    } else if (
      oracle.includes("-1/-1 counter") &&
      oracle.includes("each creature")
    ) {
      count += card.quantity;
    }
  }
  return count;
}

export function countInteraction(cards: Card[]): number {
  const interactionPhrases = [
    "destroy target",
    "exile target",
    "return target",
    "counter target",
    "deals damage to any target",
    "deals damage to target creature",
  ];
  let count = 0;
  for (const card of cards) {
    const tl = card.type_line.toLowerCase();
    if (!tl.includes("instant") && !tl.includes("sorcery")) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (interactionPhrases.some((p) => oracle.includes(p))) {
      count += card.quantity;
    }
  }
  return count;
}

// ─── Enhanced Counting Functions ──────────────────────────────────────────────

export function countTutors(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (oracle.includes("search your library")) {
      // Exclude land-only tutors (those are ramp, not combo tutors)
      if (
        oracle.includes("land") &&
        !["card", "creature", "instant", "sorcery", "artifact", "enchantment"].some(
          (kw) => oracle.includes(kw),
        )
      ) {
        continue;
      }
      count += card.quantity;
    }
  }
  return count;
}

export function countCounterspells(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (
      oracle.includes("counter target") &&
      (oracle.includes("spell") || oracle.includes("ability"))
    ) {
      count += card.quantity;
    }
  }
  return count;
}

const _FAST_MANA_NAMES = new Set([
  "sol ring", "mana crypt", "mana vault", "chrome mox", "mox diamond",
  "jeweled lotus", "lotus petal", "simian spirit guide", "elvish spirit guide",
  "dark ritual", "cabal ritual", "rite of flame", "desperate ritual",
  "pyretic ritual", "seething song",
]);

const _FAST_MANA_LAND_NAMES = new Set([
  "ancient tomb", "city of traitors", "gemstone caverns", "cabal coffers",
]);

// ─── Known Commander Combos ───────────────────────────────────────────────────
// Two-card infinite combos commonly seen in Commander. Map piece → enabling pieces.

const KNOWN_COMBOS: Record<string, string[]> = {
  // Infinite mana combos
  "isochron scepter": ["dramatic reversal"],
  "dramatic reversal": ["isochron scepter"],
  "kiki-jiki, mirror breaker": ["zealous conscripts", "deceiver exarch", "pestermite", "corridor monitor"],
  "zealous conscripts": ["kiki-jiki, mirror breaker"],
  "deceiver exarch": ["kiki-jiki, mirror breaker", "splinter twin"],
  "pestermite": ["kiki-jiki, mirror breaker", "splinter twin"],
  "corridor monitor": ["kiki-jiki, mirror breaker"],
  "splinter twin": ["deceiver exarch", "pestermite"],
  "pili-pala": ["grand architect"],
  "grand architect": ["pili-pala"],
  "basalt monolith": ["rings of brighthearth", "power artifact", "forsaken monument"],
  "rings of brighthearth": ["basalt monolith", "grim monolith"],
  "power artifact": ["basalt monolith", "grim monolith"],
  "grim monolith": ["rings of brighthearth", "power artifact"],
  "pemmin's aura": ["incubation druid", "priest of titania", "elvish archdruid"],
  "freed from the real": ["incubation druid", "priest of titania", "elvish archdruid"],
  "deadeye navigator": ["peregrine drake", "palinchron", "cloud of faeries"],
  "peregrine drake": ["deadeye navigator"],
  "palinchron": ["deadeye navigator"],
  "cloud of faeries": ["deadeye navigator"],
  
  // Infinite creature combos
  "mikaeus, the unhallowed": ["walking ballista", "triskelion"],
  "walking ballista": ["mikaeus, the unhallowed", "heliod, sun-crowned"],
  "triskelion": ["mikaeus, the unhallowed"],
  "heliod, sun-crowned": ["walking ballista"],
  "nim deathmantle": ["ashnod's altar"],
  "ashnod's altar": ["nim deathmantle"],
  
  // Infinite damage/lifegain
  "exquisite blood": ["sanguine bond", "vito, thorn of the dusk rose"],
  "sanguine bond": ["exquisite blood"],
  "vito, thorn of the dusk rose": ["exquisite blood"],
  
  // Infinite storm/ETB
  "ghostly flicker": ["archaeomancer", "mnemonic wall"],
  "archaeomancer": ["ghostly flicker", "displace"],
  "mnemonic wall": ["ghostly flicker", "displace"],
  "displace": ["archaeomancer", "mnemonic wall"],
  
  // Thoracle wins
  "thassa's oracle": ["demonic consultation", "tainted pact"],
  "demonic consultation": ["thassa's oracle", "laboratory maniac"],
  "tainted pact": ["thassa's oracle", "laboratory maniac"],
  "laboratory maniac": ["demonic consultation", "tainted pact"],
  
  // Time/turn combos
  "time warp": ["archaeomancer", "eternal witness"],
  "eternal witness": ["time warp", "temporal manipulation"],
  "temporal manipulation": ["archaeomancer", "eternal witness"],
  
  // Food Chain combo
  "food chain": ["misthollow griffin", "eternal scourge", "squee, the immortal"],
  "misthollow griffin": ["food chain"],
  "eternal scourge": ["food chain"],
  "squee, the immortal": ["food chain"],
  
  // Doomsday piles
  "doomsday": ["thassa's oracle", "laboratory maniac"],
  
  // Underworld Breach combos
  "underworld breach": ["brain freeze", "wheel of fortune"],
  "brain freeze": ["underworld breach"],
  
  // Worldgorger Dragon combo
  "worldgorger dragon": ["animate dead", "dance of the dead", "necromancy"],
  "animate dead": ["worldgorger dragon"],
  "dance of the dead": ["worldgorger dragon"],
  "necromancy": ["worldgorger dragon"],
};

export function countFastMana(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    const nameLower = card.name.toLowerCase();
    if (isLand(card)) {
      if (_FAST_MANA_LAND_NAMES.has(nameLower)) count += card.quantity;
      continue;
    }
    if (_FAST_MANA_NAMES.has(nameLower)) {
      count += card.quantity;
    } else if (card.cmc <= 1) {
      const oracle = card.oracle_text.toLowerCase();
      const tl = card.type_line.toLowerCase();
      // 0-1 CMC mana dorks
      if (
        tl.includes("creature") &&
        (oracle.includes("add {") || oracle.includes("add one mana"))
      ) {
        count += card.quantity;
      }
    }
  }
  return count;
}

const _STAX_PHRASES = [
  "opponents can't",
  "each opponent",
  "players can't",
  "nonland permanent an opponent",
  "costs {1} more",
  "costs {2} more",
  "rule of law",
  "can't cast more than",
  "can't search",
];

const _STAX_NAMES = new Set([
  "thalia, guardian of thraben", "drannith magistrate",
  "eidolon of the great revel", "archon of emeria",
  "collector ouphe", "null rod", "stony silence",
  "rest in peace", "grafdigger's cage", "torpor orb",
  "cursed totem", "winter orb", "static orb",
  "blood moon", "back to basics", "stranglehold",
]);

export function countStaxPieces(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) continue;
    if (_STAX_NAMES.has(card.name.toLowerCase())) {
      count += card.quantity;
      continue;
    }
    const oracle = card.oracle_text.toLowerCase();
    if (_STAX_PHRASES.some((p) => oracle.includes(p))) {
      count += card.quantity;
    }
  }
  return count;
}

export function countTokenGenerators(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (oracle.includes("creature token") || oracle.includes("populate")) {
      count += card.quantity;
    }
  }
  return count;
}

export function countExileRemoval(cards: Card[]): number {
  let count = 0;
  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (oracle.includes("exile target")) {
      count += card.quantity;
    }
  }
  return count;
}

export function getInteractionTimeline(cards: Card[]): InteractionTimeline {
  const acceleration = { total: 0, instant: 0, sorcery: 0 };
  const core = { total: 0, instant: 0, sorcery: 0 };
  const haymakers = { total: 0, instant: 0, sorcery: 0 };

  const interactionPhrases = [
    "destroy target",
    "exile target",
    "return target",
    "counter target",
    "deals damage to any target",
    "deals damage to target creature",
    "tap target",
    "untap target",
  ];

  let totalInstant = 0;
  let totalSorcery = 0;

  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    const tl = card.type_line.toLowerCase();

    // Check if it's interaction
    if (!interactionPhrases.some((p) => oracle.includes(p))) continue;

    const isInstant = tl.includes("instant") || oracle.includes("flash");
    const isSorcery = tl.includes("sorcery");
    
    // Classify by CMC
    const cmc = card.cmc;
    if (cmc <= 2) {
      acceleration.total += card.quantity;
      if (isInstant) {
        acceleration.instant += card.quantity;
        totalInstant += card.quantity;
      } else if (isSorcery) {
        acceleration.sorcery += card.quantity;
        totalSorcery += card.quantity;
      }
    } else if (cmc <= 4) {
      core.total += card.quantity;
      if (isInstant) {
        core.instant += card.quantity;
        totalInstant += card.quantity;
      } else if (isSorcery) {
        core.sorcery += card.quantity;
        totalSorcery += card.quantity;
      }
    } else {
      haymakers.total += card.quantity;
      if (isInstant) {
        haymakers.instant += card.quantity;
        totalInstant += card.quantity;
      } else if (isSorcery) {
        haymakers.sorcery += card.quantity;
        totalSorcery += card.quantity;
      }
    }
  }

  const total = totalInstant + totalSorcery;
  const instant_speed_percentage = total > 0
    ? Math.round((totalInstant / total) * 100)
    : 0;

  return {
    acceleration,
    core,
    haymakers,
    instant_speed_percentage,
  };
}

export function getRemovalQualityBreakdown(cards: Card[]): RemovalQuality {
  let exile = 0;
  let destroy = 0;
  let bounce = 0;
  let tuck = 0;
  let damage = 0;
  let other = 0;

  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();

    let counted = false;

    // Exile (premium removal)
    if (oracle.includes("exile target")) {
      exile += card.quantity;
      counted = true;
    }
    // Destroy
    else if (oracle.includes("destroy target")) {
      destroy += card.quantity;
      counted = true;
    }
    // Bounce (return to hand)
    else if (
      oracle.includes("return target") &&
      (oracle.includes("to its owner's hand") ||
        oracle.includes("to their owner's hand"))
    ) {
      bounce += card.quantity;
      counted = true;
    }
    // Tuck (shuffle into library)
    else if (
      oracle.includes("shuffle") &&
      oracle.includes("into") &&
      oracle.includes("library") &&
      oracle.includes("target")
    ) {
      tuck += card.quantity;
      counted = true;
    }
    // Damage-based removal
    else if (
      oracle.includes("deals damage to any target") ||
      oracle.includes("deals damage to target creature") ||
      oracle.includes("deals damage to target planeswalker")
    ) {
      damage += card.quantity;
      counted = true;
    }

    // Other removal types - be more specific to avoid counting stax/random effects
    // Only count actual removal/neutralization effects
    if (
      !counted &&
      oracle.includes("target") &&
      (oracle.includes("sacrifice") ||
        oracle.includes("gets -") ||
        (oracle.includes("loses all abilities") && !oracle.includes("you control")))
    ) {
      other += card.quantity;
    }
  }

  const total = exile + destroy + bounce + tuck + damage + other;
  const exile_percentage = total > 0 ? Math.round((exile / total) * 100) : 0;

  return {
    exile,
    destroy,
    bounce,
    tuck,
    damage,
    other,
    total,
    exile_percentage,
  };
}

export function getInteractionCoverage(cards: Card[]): InteractionCoverage {
  let creature_removal = 0;
  let creature_removal_instant = 0;
  let artifact_enchantment_removal = 0;
  let counterspells = 0;
  let board_wipes = 0;
  let graveyard_hate = 0;

  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    const tl = card.type_line.toLowerCase();

    // Board wipes (check first so we count them separately)
    const isWipe = 
      oracle.includes("destroy all creatures") ||
      oracle.includes("destroy all nonland") ||
      oracle.includes("exile all") ||
      oracle.includes("all creatures get -") ||
      oracle.includes("damage to each creature");
    
    if (isWipe) {
      board_wipes += card.quantity;
      creature_removal += card.quantity; // Wipes answer creatures too
    }

    // Single-target creature removal
    if (
      !isWipe && (
        oracle.includes("destroy target creature") ||
        oracle.includes("exile target creature") ||
        oracle.includes("deals damage to target creature") ||
        oracle.includes("return target creature")
      )
    ) {
      creature_removal += card.quantity;
      if (tl.includes("instant") || oracle.includes("flash")) {
        creature_removal_instant += card.quantity;
      }
    }

    // Artifact/Enchantment removal
    if (
      oracle.includes("destroy target artifact") ||
      oracle.includes("destroy target enchantment") ||
      oracle.includes("exile target artifact") ||
      oracle.includes("exile target enchantment") ||
      oracle.includes("destroy target noncreature") ||
      oracle.includes("destroy target permanent")
    ) {
      artifact_enchantment_removal += card.quantity;
    }

    // Counterspells
    if (
      oracle.includes("counter target") &&
      (oracle.includes("spell") || oracle.includes("ability"))
    ) {
      counterspells += card.quantity;
    }

    // Graveyard hate
    if (
      oracle.includes("exile all cards from all graveyards") ||
      oracle.includes("exile target card from a graveyard") ||
      oracle.includes("players can't cast spells from graveyards") ||
      oracle.includes("cards in graveyards can't") ||
      oracle.includes("rest in peace") ||
      card.name.toLowerCase().includes("rest in peace") ||
      card.name.toLowerCase().includes("bojuka bog") ||
      card.name.toLowerCase().includes("grafdigger")
    ) {
      graveyard_hate += card.quantity;
    }
  }

  return {
    creature_removal,
    creature_removal_instant,
    artifact_enchantment_removal,
    counterspells,
    board_wipes,
    graveyard_hate,
  };
}

// ─── Strategy Classification ─────────────────────────────────────────────────

const STRATEGY_CATEGORIES = [
  "aggro", "tokens", "combo", "midrange", "control", "stax", "ramp",
] as const;

export function classifyStrategy(deck: Deck): string {
  const allCards = getAllCards(deck);
  const nonLands = allCards.filter((c) => !isLand(c));
  const avgCmc = calculateAverageCmc(allCards);

  const tutorCount = countTutors(allCards);
  const counterCount = countCounterspells(allCards);
  const fastManaCount = countFastMana(allCards);
  const tokenCount = countTokenGenerators(allCards);
  const staxCount = countStaxPieces(allCards);
  const drawCount = countDraw(allCards);

  const creatureCount = nonLands
    .filter((c) => c.type_line.toLowerCase().includes("creature"))
    .reduce((sum, c) => sum + c.quantity, 0);
  const instantSorceryCount = nonLands
    .filter(
      (c) =>
        c.type_line.toLowerCase().includes("instant") ||
        c.type_line.toLowerCase().includes("sorcery"),
    )
    .reduce((sum, c) => sum + c.quantity, 0);

  const scores: Record<string, number> = {};
  for (const s of STRATEGY_CATEGORIES) scores[s] = 0;

  // Combo signals
  scores["combo"] += tutorCount * 1.5;
  scores["combo"] += fastManaCount * 1.0;
  if (avgCmc <= 2.5) scores["combo"] += 3.0;

  // Control signals
  scores["control"] += counterCount * 2.0;
  scores["control"] += drawCount * 0.3;
  if (instantSorceryCount > creatureCount) scores["control"] += 3.0;

  // Stax signals
  scores["stax"] += staxCount * 3.0;

  // Token signals
  scores["tokens"] += tokenCount * 1.5;
  if (tokenCount >= 8) scores["tokens"] += 3.0;

  // Aggro signals
  if (avgCmc <= 2.8) scores["aggro"] += 3.0;
  if (creatureCount >= 30) scores["aggro"] += 3.0;
  scores["aggro"] += creatureCount * 0.1;

  // Ramp signals
  const rampCount = countRamp(allCards);
  if (avgCmc >= 3.8) scores["ramp"] += 3.0;
  scores["ramp"] += rampCount * 0.5;
  if (rampCount >= 14) scores["ramp"] += 3.0;

  // Midrange baseline
  scores["midrange"] += 2.0;
  if (avgCmc > 2.8 && avgCmc < 3.8) scores["midrange"] += 2.0;
  if (creatureCount >= 20 && creatureCount <= 30) scores["midrange"] += 1.0;

  let best = "midrange";
  let bestScore = -Infinity;
  for (const [strat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = strat;
    }
  }
  return best;
}

// ─── Power Level Detection ───────────────────────────────────────────────────

const _PREMIUM_TUTOR_NAMES = new Set([
  "demonic tutor", "vampiric tutor", "imperial seal", "grim tutor",
  "mystical tutor", "enlightened tutor", "worldly tutor", "diabolic intent",
  "dark petition", "tainted pact", "demonic consultation",
]);

const _HIGH_POWER_COMMANDERS = new Set([
  "thassa's oracle", "kinnan, bonder prodigy", "najeela, the blade-blossom",
  "tymna the weaver", "thrasios, triton hero", "urza, lord high artificer",
  "prossh, skyraider of kher", "kenrith, the returned king",
  "selvala, heart of the wilds", "kraum, ludevic's opus",
]);

const _STRONG_COMMANDERS = new Set([
  "yisan, the wanderer bard", "edgar markov", "atraxa, praetors' voice",
  "atraxa, grand unifier",
  "breya, etherium shaper", "zur the enchanter", "the gitrog monster",
]);

export function getDeckBracket(powerLevel: number): { bracket: number; bracket_label: string } {
  if (powerLevel <= 3) return { bracket: 1, bracket_label: "Precon" };
  if (powerLevel <= 5) return { bracket: 2, bracket_label: "Casual" };
  if (powerLevel <= 7) return { bracket: 3, bracket_label: "Focused" };
  if (powerLevel <= 9) return { bracket: 3, bracket_label: "Optimized" };
  return { bracket: 4, bracket_label: "cEDH" };
}

export function calculatePowerLevel(
  deck: Deck,
  themes: ThemeResult[] = [],
): number {
  const allCards = getAllCards(deck);
  const avgCmc = calculateAverageCmc(allCards);

  const fastMana = countFastMana(allCards);
  const counters = countCounterspells(allCards);
  const draw = countDraw(allCards);
  const interaction = countInteraction(allCards);

  // Split tutors into premium and generic
  let premiumTutors = 0;
  let genericTutors = 0;
  for (const card of allCards) {
    if (isLand(card)) continue;
    const nameLower = card.name.toLowerCase();
    const oracle = card.oracle_text.toLowerCase();
    if (_PREMIUM_TUTOR_NAMES.has(nameLower)) {
      premiumTutors += card.quantity;
    } else if (oracle.includes("search your library")) {
      if (
        oracle.includes("land") &&
        !["card", "creature", "instant", "sorcery", "artifact", "enchantment"].some(
          (kw) => oracle.includes(kw),
        )
      ) {
        continue;
      }
      genericTutors += card.quantity;
    }
  }

  let score = 3.0;

  // Fast mana: +0.5 each, max +2
  score += Math.min(fastMana * 0.5, 2.0);

  // Tutors: premium +0.5 each (cap +2.5), generic +0.2 each (cap +1.0)
  score += Math.min(premiumTutors * 0.5, 2.5);
  score += Math.min(genericTutors * 0.2, 1.0);

  // Counterspells: +0.3 each, max +1.5
  score += Math.min(counters * 0.3, 1.5);

  // CMC efficiency
  if (avgCmc <= 2.5) score += 1.0;
  else if (avgCmc >= 4.0) score -= 1.0;

  // Card draw density — gradient so synergy decks with 10-11 draw aren't cliff-penalized
  if (draw >= 14) score += 0.5;
  else if (draw >= 10) score += 0.25;

  // Interaction density
  if (interaction >= 15) score += 0.5;

  // Low-interaction penalty (goldfish/pure combo with no answers)
  if (interaction < 8) score -= 0.5;

  // Theme coherence bonus — a focused synergy deck earns credit for card density,
  // not just for running fast mana and tutors
  let themeBonus = 0;
  for (const theme of themes) {
    const threshold = _THEME_THRESHOLDS[theme.name] ?? 8;
    if (theme.count >= threshold * 2.0) themeBonus += 0.75;
    else if (theme.count >= threshold * 1.5) themeBonus += 0.5;
  }
  score += Math.min(themeBonus, 1.5);

  // Commander power signals — name list first, then oracle text fallback
  // for commanders not in the hardcoded lists (e.g. lesser-known counter/proliferate commanders)
  const commanderBonus = (card: Card | null | undefined): number => {
    if (!card) return 0;
    const n = card.name.toLowerCase();
    if (_HIGH_POWER_COMMANDERS.has(n)) return 1.5;
    if (_STRONG_COMMANDERS.has(n)) return 0.75;
    const oracle = card.oracle_text.toLowerCase();
    if (oracle.includes("proliferate")) return 0.5;
    if (oracle.includes("put a +1/+1 counter") || oracle.includes("+1/+1 counter on each")) return 0.5;
    return 0;
  };
  score += commanderBonus(deck.commander);
  score += commanderBonus(deck.partner);

  return Math.max(1, Math.min(10, Math.round(score)));
}

// ─── Power Level Breakdown (Phase 1) ─────────────────────────────────────────

export function explainPowerLevel(
  deck: Deck,
  themes: ThemeResult[] = [],
): PowerLevelBreakdown {
  const allCards = getAllCards(deck);
  const avgCmc = calculateAverageCmc(allCards);

  const fastMana = countFastMana(allCards);
  const counters = countCounterspells(allCards);
  const draw = countDraw(allCards);
  const interaction = countInteraction(allCards);

  console.log(`[DEBUG explainPowerLevel] Card Draw count: ${draw}`);

  // Split tutors into premium and generic
  let premiumTutors = 0;
  let genericTutors = 0;
  const premiumTutorCards: string[] = [];
  const genericTutorCards: string[] = [];
  for (const card of allCards) {
    if (isLand(card)) continue;
    const nameLower = card.name.toLowerCase();
    const oracle = card.oracle_text.toLowerCase();
    if (_PREMIUM_TUTOR_NAMES.has(nameLower)) {
      premiumTutors += card.quantity;
      premiumTutorCards.push(card.name);
    } else if (oracle.includes("search your library")) {
      if (
        oracle.includes("land") &&
        !["card", "creature", "instant", "sorcery", "artifact", "enchantment"].some(
          (kw) => oracle.includes(kw),
        )
      ) {
        continue;
      }
      genericTutors += card.quantity;
      genericTutorCards.push(card.name);
    }
  }

  // Calculate each factor explicitly
  const factors: PowerLevelFactor[] = [];

  // Base
  factors.push({
    category: "Base",
    value: 3.0,
    max_contribution: 3.0,
    description: "Starting baseline for all decks",
  });

  // Fast mana
  const fastManaCards: string[] = [];
  const fastManaScores: { [name: string]: number } = {};
  for (const card of allCards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (card.cmc <= 1 && (oracle.includes("add {") || oracle.includes("add mana"))) {
      fastManaCards.push(card.name);
      // Each fast mana piece contributes +0.5, capped at 2.0 total
      fastManaScores[card.name] = 0.5;
    }
  }
  const fastManaValue = Math.min(fastMana * 0.5, 2.0);
  factors.push({
    category: "Fast Mana",
    value: fastManaValue,
    max_contribution: 2.0,
    description: `${fastMana} pieces (Sol Ring, Mana Crypt, Mox Diamond, etc.)`,
    cards: fastManaCards,
    card_scores: fastManaScores,
  });

  // Tutors
  const tutorValue = Math.min(premiumTutors * 0.5, 2.5) + Math.min(genericTutors * 0.2, 1.0);
  const tutorScores: { [name: string]: number } = {};
  for (const card of premiumTutorCards) {
    tutorScores[card] = 0.5; // Premium tutors contribute +0.5 each
  }
  for (const card of genericTutorCards) {
    tutorScores[card] = 0.2; // Generic tutors contribute +0.2 each
  }
  factors.push({
    category: "Tutors",
    value: tutorValue,
    max_contribution: 3.5,
    description: `${premiumTutors} premium, ${genericTutors} generic`,
    cards: [...premiumTutorCards, ...genericTutorCards],
    card_scores: tutorScores,
  });

  // Counterspells
  const counterCards: string[] = [];
  const counterScores: { [name: string]: number } = {};
  for (const card of allCards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (
      oracle.includes("counter target") &&
      (oracle.includes("spell") || oracle.includes("ability"))
    ) {
      counterCards.push(card.name);
      // Each counterspell contributes +0.3, capped at 1.5 total
      counterScores[card.name] = 0.3;
    }
  }
  const counterValue = Math.min(counters * 0.3, 1.5);
  factors.push({
    category: "Counterspells",
    value: counterValue,
    max_contribution: 1.5,
    description: `${counters} counterspells`,
    cards: counterCards,
    card_scores: counterScores,
  });

  // CMC efficiency
  let cmcValue = 0;
  let cmcDesc = "";
  if (avgCmc <= 2.5) {
    cmcValue = 1.0;
    cmcDesc = `Avg CMC ${avgCmc.toFixed(1)} (very efficient)`;
  } else if (avgCmc >= 4.0) {
    cmcValue = -1.0;
    cmcDesc = `Avg CMC ${avgCmc.toFixed(1)} (slow/expensive)`;
  } else {
    cmcValue = 0;
    cmcDesc = `Avg CMC ${avgCmc.toFixed(1)} (balanced)`;
  }
  factors.push({
    category: "CMC Efficiency",
    value: cmcValue,
    max_contribution: 1.0,
    description: cmcDesc,
  });

  // Card draw
  const drawPhrases = [
    "draw a card",
    "draw cards",
    "draw two",
    "draw three",
    "draw x ",
    "draw that many",
    "draw an additional",
  ];
  const drawCards: string[] = [];
  for (const card of allCards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (drawPhrases.some((p) => oracle.includes(p))) {
      drawCards.push(card.name);
    }
  }
  console.log(`[DEBUG Card Draw] drawCards.length: ${drawCards.length}, draw count: ${draw}, cards:`, drawCards.slice(0, 5));
  
  let drawValue = 0;
  let drawDesc = "";
  if (draw >= 14) {
    drawValue = 0.5;
    drawDesc = `${draw} sources (excellent density)`;
  } else if (draw >= 10) {
    drawValue = 0.25;
    drawDesc = `${draw} sources (good density)`;
  } else {
    drawValue = 0;
    drawDesc = `${draw} sources (needs improvement)`;
  }
  console.log(`[DEBUG Card Draw] Final drawValue: ${drawValue}, desc: ${drawDesc}`);
  factors.push({
    category: "Card Draw",
    value: drawValue,
    max_contribution: 0.5,
    description: drawDesc,
    cards: drawCards.slice(0, 20), // Limit to first 20 to avoid excessive list
    // No card_scores - this is a threshold bonus, not per-card
  });

  // Interaction
  const interactionCards: string[] = [];
  for (const card of allCards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    const typeLine = card.type_line.toLowerCase();
    if (
      oracle.includes("destroy") ||
      oracle.includes("exile") ||
      oracle.includes("counter target") ||
      oracle.includes("return") ||
      (typeLine.includes("instant") && oracle.includes("damage"))
    ) {
      interactionCards.push(card.name);
    }
  }
  // Use interactionCards length for scoring to match what we display
  const interactionCount = interactionCards.length;
  let interactionValue = 0;
  let interactionDesc = "";
  if (interactionCount >= 15) {
    interactionValue = 0.5;
    interactionDesc = `${interactionCount} pieces (excellent)`;
  } else if (interactionCount < 8) {
    interactionValue = -0.5;
    interactionDesc = `${interactionCount} pieces (dangerously low)`;
  } else {
    interactionValue = 0;
    interactionDesc = `${interactionCount} pieces (adequate)`;
  }
  factors.push({
    category: "Interaction",
    value: interactionValue,
    max_contribution: 0.5,
    description: interactionDesc,
    cards: interactionCards.slice(0, 20),
    // No card_scores - this is a threshold bonus, not per-card
  });

  // Theme coherence
  let themeBonus = 0;
  const themeDescriptions: string[] = [];
  const themeCards: string[] = [];
  
  for (const theme of themes) {
    const threshold = _THEME_THRESHOLDS[theme.name] ?? 8;
    let themeBonusValue = 0;
    
    if (theme.count >= threshold * 2.0) {
      themeBonusValue = 0.75;
      themeDescriptions.push(`${theme.name} (${theme.count} cards)`);
      const cardsToShow = theme.cards.slice(0, 10);
      themeCards.push(...cardsToShow);
      themeBonus += themeBonusValue;
    } else if (theme.count >= threshold * 1.5) {
      themeBonusValue = 0.5;
      themeDescriptions.push(`${theme.name} (${theme.count} cards)`);
      const cardsToShow = theme.cards.slice(0, 10);
      themeCards.push(...cardsToShow);
      themeBonus += themeBonusValue;
    }
  }
  themeBonus = Math.min(themeBonus, 1.5);
  factors.push({
    category: "Theme Coherence",
    value: themeBonus,
    max_contribution: 1.5,
    description: themeDescriptions.length > 0 ? themeDescriptions.join(", ") : "No focused themes detected",
    cards: themeCards,
    // No card_scores - threshold-based bonus, not per-card
  });

  // Commander power
  const commanderBonus = (card: Card | null | undefined): [number, string] => {
    if (!card) return [0, ""];
    const n = card.name.toLowerCase();
    if (_HIGH_POWER_COMMANDERS.has(n)) return [1.5, `${card.name} (cEDH-tier commander)`];
    if (_STRONG_COMMANDERS.has(n)) return [0.75, `${card.name} (strong commander)`];
    const oracle = card.oracle_text.toLowerCase();
    if (oracle.includes("proliferate")) return [0.5, `${card.name} (proliferate synergy)`];
    if (oracle.includes("put a +1/+1 counter") || oracle.includes("+1/+1 counter on each")) 
      return [0.5, `${card.name} (counter synergy)`];
    return [0, `${card.name}`];
  };
  const [cmdValue, cmdDesc] = commanderBonus(deck.commander);
  const [partnerValue, partnerDesc] = commanderBonus(deck.partner);
  const totalCommanderValue = cmdValue + partnerValue;
  const commanderDesc = [cmdDesc, partnerDesc].filter(d => d).join(" + ");
  
  // Build commander cards list and scores
  const commanderCards: string[] = [];
  const commanderScores: { [name: string]: number } = {};
  if (deck.commander) {
    commanderCards.push(deck.commander.name);
    commanderScores[deck.commander.name] = cmdValue;
  }
  if (deck.partner) {
    commanderCards.push(deck.partner.name);
    commanderScores[deck.partner.name] = partnerValue;
  }
  
  factors.push({
    category: "Commander",
    value: totalCommanderValue,
    max_contribution: 3.0,
    description: commanderDesc || "No commander detected",
    cards: commanderCards,
    card_scores: commanderScores,
  });

  // Calculate total
  const total = factors.reduce((sum, f) => sum + f.value, 0);
  const rounded = Math.max(1, Math.min(10, Math.round(total)));
  const { bracket, bracket_label } = getDeckBracket(rounded);

  // Calculate gap to next bracket
  const bracketThresholds: Record<number, number> = { 1: 4, 2: 6, 3: 8, 4: 10 };
  const nextBracketNum = Math.min(bracket + 1, 4);
  const nextBracketTarget = bracketThresholds[nextBracketNum];
  const gap = nextBracketTarget ? nextBracketTarget - total : 0;

  let next_bracket_threshold;
  if (gap > 0 && bracket < 4) {
    const suggestions: string[] = [];
    
    // Analyze weakest factors
    if (fastManaValue < 1.5) {
      const needed = Math.ceil((1.5 - fastManaValue) / 0.5);
      suggestions.push(`Add ${needed} fast mana piece${needed > 1 ? 's' : ''} (+${(needed * 0.5).toFixed(1)})`);
    }
    if (tutorValue < 2.0 && premiumTutors < 3) {
      suggestions.push(`Add 1-2 premium tutors (+0.5-1.0)`);
    }
    if (avgCmc > 2.5 && bracket >= 3) {
      suggestions.push(`Lower average CMC to ≤2.5 (+1.0)`);
    }
    if (drawValue < 0.5) {
      suggestions.push(`Increase card draw to 14+ sources (+0.25-0.5)`);
    }

    next_bracket_threshold = {
      target_bracket: nextBracketNum,
      target_power: nextBracketTarget,
      gap: Math.round(gap * 10) / 10,
      suggestions,
    };
  }

  console.log(`[explainPowerLevel] About to return ${factors.length} factors:`, factors.map(f => ({ category: f.category, hasCards: (f.cards?.length ?? 0) > 0 })));

  return {
    total: Math.round(total * 10) / 10,
    rounded,
    bracket,
    bracket_label,
    factors,
    next_bracket_threshold,
  };
}

export function calculatePowerDelta(
  deck: Deck,
  add: Card,
  remove: Card | null,
  themes: ThemeResult[] = [],
): PowerDelta {
  // Use explainPowerLevel to get unrounded scores for accurate delta calculation
  const beforeBreakdown = explainPowerLevel(deck, themes);
  const beforePower = beforeBreakdown.total;

  // Create modified deck
  const modifiedMainboard = [...deck.mainboard];
  
  // Remove card if specified
  if (remove) {
    const idx = modifiedMainboard.findIndex(c => c.name === remove.name);
    if (idx !== -1) {
      modifiedMainboard.splice(idx, 1);
    }
  }
  
  // Add new card
  modifiedMainboard.push(add);

  const modifiedDeck: Deck = {
    ...deck,
    mainboard: modifiedMainboard,
  };

  const afterBreakdown = explainPowerLevel(modifiedDeck, themes);
  const afterPower = afterBreakdown.total;

  // Detect which factors changed (simple heuristic)
  const factors_changed: string[] = [];
  const addOracle = add.oracle_text.toLowerCase();
  const addType = add.type_line.toLowerCase();
  
  // Check fast mana
  if (add.cmc <= 1 && (addOracle.includes("add {") || addOracle.includes("add mana"))) {
    factors_changed.push("Fast Mana");
  }
  
  // Check tutors
  if (addOracle.includes("search your library")) {
    factors_changed.push("Tutors");
  }
  
  // Check counterspells
  if (addOracle.includes("counter target")) {
    factors_changed.push("Counterspells");
  }
  
  // Check CMC impact
  if (remove && Math.abs(add.cmc - remove.cmc) >= 1) {
    factors_changed.push("CMC Efficiency");
  }
  
  // Check draw
  if (addOracle.includes("draw")) {
    factors_changed.push("Card Draw");
  }

  return {
    before: beforePower,
    after: afterPower,
    change: Math.round((afterPower - beforePower) * 10) / 10,
    factors_changed,
  };
}

// ─── Win Condition Detection ──────────────────────────────────────────────────

/**
 * identifyWinConditions - Detect how the deck is trying to win
 * 
 * Returns array of WinCondition objects with type, description, cards, and reliability.
 * Types: combo (two-card infinites), combat (aggro/voltron/tokens), alternate_wincon (Thoracle), value_grind (fallback)
 */
export function identifyWinConditions(deck: Deck, themes: ThemeResult[]): WinCondition[] {
  const allCards = getAllCards(deck);
  const cardNameSet = new Set(allCards.map(c => c.name.toLowerCase()));
  const winConditions: WinCondition[] = [];

  // ─── 1. Detect Infinite Combos ─────────────────────────────────────────────
  const foundCombos: Array<{ piece1: string; piece2: string }> = [];
  
  for (const card of allCards) {
    const nameLower = card.name.toLowerCase();
    const comboPartners = KNOWN_COMBOS[nameLower];
    
    if (comboPartners) {
      for (const partner of comboPartners) {
        if (cardNameSet.has(partner)) {
          // Found a combo! Avoid duplicates by sorting names
          const sorted = [nameLower, partner].sort();
          const isDuplicate = foundCombos.some(
            c => c.piece1 === sorted[0] && c.piece2 === sorted[1]
          );
          if (!isDuplicate) {
            foundCombos.push({ piece1: sorted[0], piece2: sorted[1] });
          }
        }
      }
    }
  }

  // Add combo win conditions
  for (const combo of foundCombos) {
    const description = `Infinite combo: ${combo.piece1} + ${combo.piece2}`;
    winConditions.push({
      type: "combo",
      description,
      cards: [combo.piece1, combo.piece2],
      reliability: foundCombos.length === 1 ? "primary" : "secondary",
    });
  }

  // ─── 2. Detect Alternate Win Cons (Thoracle, Lab Man, etc.) ────────────────
  const alternateWincons = [
    "thassa's oracle",
    "laboratory maniac",
    "jace, wielder of mysteries",
    "approach of the second sun",
    "maze's end",
    "coalition victory",
    "felidar sovereign",
    "helix pinnacle",
    "mortal combat",
  ];

  for (const card of allCards) {
    const nameLower = card.name.toLowerCase();
    if (alternateWincons.includes(nameLower)) {
      winConditions.push({
        type: "alternate_wincon",
        description: `Alternate win condition: ${card.name}`,
        cards: [nameLower],
        reliability: foundCombos.length > 0 ? "secondary" : "primary",
      });
    }
  }

  // ─── 3. Detect Combat Strategies ───────────────────────────────────────────
  const tokenTheme = themes.find(t => t.name.toLowerCase() === "tokens");
  const voltronTheme = themes.find(t => t.name.toLowerCase() === "voltron");
  const tribalTheme = themes.find(t => t.name.toLowerCase() === "tribal");
  
  if (tokenTheme && tokenTheme.count >= 8) {
    winConditions.push({
      type: "combat",
      description: `Go-wide combat with ${tokenTheme.count} token generators`,
      cards: [],
      reliability: foundCombos.length > 0 || winConditions.some(w => w.type === "alternate_wincon") 
        ? "backup" 
        : "primary",
    });
  }

  if (voltronTheme && voltronTheme.count >= 6) {
    winConditions.push({
      type: "combat",
      description: `Voltron strategy with ${voltronTheme.count} equipment/auras`,
      cards: [],
      reliability: foundCombos.length > 0 || winConditions.some(w => w.type === "alternate_wincon")
        ? "backup"
        : "primary",
    });
  }

  if (tribalTheme && tribalTheme.count >= 15) {
    winConditions.push({
      type: "combat",
      description: `Tribal combat with ${tribalTheme.count}+ synergistic creatures`,
      cards: [],
      reliability: foundCombos.length > 0 || winConditions.some(w => w.type === "alternate_wincon")
        ? "backup"
        : "primary",
    });
  }

  // Generic aggro if we have lots of creatures but no specific theme
  const creatureCount = allCards.filter(c => isCreature(c)).length;
  if (creatureCount >= 25 && !tokenTheme && !tribalTheme && !voltronTheme) {
    winConditions.push({
      type: "combat",
      description: `Combat damage with ${creatureCount} creatures`,
      cards: [],
      reliability: foundCombos.length > 0 || winConditions.some(w => w.type === "alternate_wincon")
        ? "backup"
        : "secondary",
    });
  }

  // ─── 4. Value Grind (Fallback) ─────────────────────────────────────────────
  if (winConditions.length === 0) {
    winConditions.push({
      type: "value_grind",
      description: "Value-based grind — win through card advantage and superior board state",
      cards: [],
      reliability: "primary",
    });
  }

  // Sort by reliability: primary > secondary > backup
  const reliabilityOrder = { primary: 0, secondary: 1, backup: 2 };
  winConditions.sort((a, b) => reliabilityOrder[a.reliability] - reliabilityOrder[b.reliability]);

  return winConditions;
}

// ─── Upgrade Path Builder ───────────────────────────────────────────────────

/**
 * buildUpgradePath - Generate a phased upgrade plan to reach target power level
 * 
 * Takes user goals (target power, budget, theme emphasis) and returns a multi-phase
 * upgrade path with swaps and additions prioritized by impact/cost ratio.
 */
export function buildUpgradePath(
  deck: Deck,
  collection: Card[] | null,
  userGoals: UserGoals,
  currentAnalysis: DeckAnalysis,
): UpgradePath {
  const currentPower = currentAnalysis.power_breakdown.rounded;
  const targetPower = userGoals.targetPowerLevel ?? Math.min(currentPower + 2, 10);
  const budgetConstraint = userGoals.budgetConstraint ?? 200;
  const themeEmphasis = userGoals.themeEmphasis ?? [];
  
  // Find all possible upgrades from collection
  const themes = currentAnalysis.themes;
  const weaknesses = currentAnalysis.weaknesses;
  const allCards = getAllCards(deck);
  const collectionObj = collection ? { cards: collection } : null;
  const collectionUpgrades = collectionObj ? findCollectionImprovements(deck, collectionObj) : [];
  
  // Score each upgrade by impact/cost ratio
  const scoredUpgrades = collectionUpgrades.map(([cardIn, cardOut, reason, score, neverCut, powerDelta]) => {
    // In collection mode, cards are free (already owned)
    const cardPrice = 0;
    const impactCostRatio = powerDelta?.change ?? 0.5; // No cost division needed since cost is 0
    
    // Bonus for theme emphasis
    let themeBonus = 0;
    if (themeEmphasis.length > 0 && reason) {
      for (const themeName of themeEmphasis) {
        if (reason.toLowerCase().includes(themeName.toLowerCase())) {
          themeBonus = 0.3;
          break;
        }
      }
    }
    
    return {
      cardIn,
      cardOut,
      reason,
      score: score + themeBonus,
      powerDelta: powerDelta ?? { before: currentPower, after: currentPower + 0.5, change: 0.5, factors_changed: [] },
      cost: cardPrice,
      impactCostRatio,
    };
  });
  
  // Sort by impact/cost ratio (bang for buck) — or just by power delta change if cost is 0
  scoredUpgrades.sort((a, b) => b.impactCostRatio - a.impactCostRatio);
  
  // Build phases until we hit target power or run out of upgrades
  const phases: UpgradePhase[] = [];
  let accumulatedPower = currentPower;
  let accumulatedBudget = 0;
  let remainingUpgrades = [...scoredUpgrades];
  let phaseNum = 1;
  
  const isCollectionMode = collection !== null;
  
  // For collection mode, group upgrades by strategic category for meaningful phases
  if (isCollectionMode) {
    // Categorize each upgrade
    const categorizeUpgrade = (upgrade: typeof scoredUpgrades[0]): string => {
      const reason = upgrade.reason.toLowerCase();
      const factorsChanged = upgrade.powerDelta?.factors_changed || [];
      
      // Priority order matches typical deck-building sequence
      if (reason.includes("ramp") || reason.includes("land")) {
        return "mana";
      }
      if (reason.includes("card draw") || factorsChanged.includes("Card Draw") || factorsChanged.includes("Tutors")) {
        return "card_advantage";
      }
      if (reason.includes("removal") || reason.includes("board wipe") || reason.includes("counterspell")) {
        return "interaction";
      }
      if (reason.includes("combo piece") || reason.includes("deepens") || reason.includes("fits deck theme")) {
        return "win_conditions";
      }
      // Default to win conditions for uncategorized
      return "win_conditions";
    };
    
    const categoryTitles: Record<string, string> = {
      mana: "Mana Foundation",
      card_advantage: "Card Advantage",
      interaction: "Interaction",
      win_conditions: "Win Conditions & Synergy",
    };
    
    const categoryOrder = ["mana", "card_advantage", "interaction", "win_conditions"];
    
    // Group upgrades by category
    const upgradesByCategory: Record<string, typeof scoredUpgrades> = {
      mana: [],
      card_advantage: [],
      interaction: [],
      win_conditions: [],
    };
    
    for (const upgrade of scoredUpgrades) {
      const category = categorizeUpgrade(upgrade);
      upgradesByCategory[category].push(upgrade);
    }
    
    // Track removed cards globally across all phases
    const removedAcrossAllPhases = new Set<string>();
    
    // Build phases from categories (only include non-empty categories)
    for (const category of categoryOrder) {
      const categoryUpgrades = upgradesByCategory[category];
      if (categoryUpgrades.length === 0) continue;
      
      // Remove duplicates within category AND across previous phases
      const phaseUpgrades = [];
      let phasePowerGain = 0;
      
      for (const upgrade of categoryUpgrades) {
        // Skip if this card was already marked for removal in any previous phase
        if (upgrade.cardOut && removedAcrossAllPhases.has(upgrade.cardOut.name)) {
          continue;
        }
        
        phaseUpgrades.push(upgrade);
        if (upgrade.cardOut) {
          removedAcrossAllPhases.add(upgrade.cardOut.name);
        }
        phasePowerGain += upgrade.powerDelta.change;
      }
      
      if (phaseUpgrades.length === 0) continue;
      
      accumulatedPower += phasePowerGain;
      const phaseCost = phaseUpgrades.reduce((sum, u) => sum + u.cost, 0);
      accumulatedBudget += phaseCost;
      
      const phase: UpgradePhase = {
        phaseNumber: phaseNum,
        title: `${categoryTitles[category]}`,
        description: `${phaseUpgrades.length} upgrade${phaseUpgrades.length > 1 ? 's' : ''} · +${phasePowerGain.toFixed(1)} power`,
        estimatedCost: phaseCost,
        powerGain: phasePowerGain,
        targetPower: Math.min(accumulatedPower, targetPower),
        swaps: phaseUpgrades.map(u => ({
          cardOut: u.cardOut ?? { name: "Unknown", cmc: 0 } as Card,
          cardIn: u.cardIn,
          reason: u.reason,
          cost: u.cost,
          powerDelta: u.powerDelta,
        })),
      };
      
      phases.push(phase);
      phaseNum++;
      
      // Stop if target power reached
      if (accumulatedPower >= targetPower) {
        break;
      }
    }
  }
  
  // Budget mode: segment by budget constraint
  while (!isCollectionMode && accumulatedPower < targetPower && remainingUpgrades.length > 0) {
    // Budget mode: respect budget constraint
    const phaseUpgrades = [];
    let phaseCost = 0;
    let phasePowerGain = 0;
    const phaseBudget = Math.min(budgetConstraint / 3, budgetConstraint - accumulatedBudget);
    const removedThisPhase = new Set<string>();
    
    for (let i = 0; i < remainingUpgrades.length; i++) {
      const upgrade = remainingUpgrades[i];
      
      // Skip if this card was already marked for removal in this phase
      if (upgrade.cardOut && removedThisPhase.has(upgrade.cardOut.name)) {
        continue;
      }
      
      if (phaseCost + upgrade.cost <= phaseBudget) {
        phaseUpgrades.push(upgrade);
        if (upgrade.cardOut) {
          removedThisPhase.add(upgrade.cardOut.name);
        }
        phaseCost += upgrade.cost;
        phasePowerGain += upgrade.powerDelta.change;
        remainingUpgrades.splice(i, 1);
        i--;
      }
    }
    
    // Stop if budget exhausted
    if (accumulatedBudget + phaseCost >= budgetConstraint || phaseUpgrades.length === 0) {
      break;
    }
    
    accumulatedPower += phasePowerGain;
    accumulatedBudget += phaseCost;
    
    const phase: UpgradePhase = {
      phaseNumber: phaseNum,
      title: `Phase ${phaseNum}: ${phaseUpgrades.length} Upgrade${phaseUpgrades.length > 1 ? 's' : ''}`,
      description: `${phasePowerGain.toFixed(1)} power gain — $${phaseCost.toFixed(2)}`,
      estimatedCost: phaseCost,
      powerGain: phasePowerGain,
      targetPower: Math.min(accumulatedPower, targetPower),
      swaps: phaseUpgrades.map(u => ({
        cardOut: u.cardOut ?? { name: "Unknown", cmc: 0 } as Card,
        cardIn: u.cardIn,
        reason: u.reason,
        cost: u.cost,
        powerDelta: u.powerDelta,
      })),
    };
    
    phases.push(phase);
    phaseNum++;
  }
  
  // Generate summary with clear messaging about whether target was reached
  let summary: string;
  if (phases.length === 0) {
    summary = isCollectionMode
      ? `No improvements found in your collection for this deck.`
      : `No affordable upgrades available within $${budgetConstraint} budget.`;
  } else {
    const finalPower = Math.min(accumulatedPower, targetPower);
    const powerGap = targetPower - accumulatedPower;
    
    if (accumulatedPower >= targetPower) {
      // Target reached or exceeded
      summary = `${phases.length} phase${phases.length > 1 ? 's' : ''} to reach power ${finalPower.toFixed(1)}`;
    } else {
      // Target not reached
      summary = `${phases.length} phase${phases.length > 1 ? 's' : ''} to reach power ${finalPower.toFixed(1)} — ${powerGap > 0 ? `${powerGap.toFixed(1)} power short of target ${targetPower.toFixed(1)}` : ''}`;
      if (isCollectionMode) {
        summary += `. Your collection doesn't have enough high-impact cards to reach ${targetPower.toFixed(1)}.`;
      }
    }
    
    if (!isCollectionMode) {
      summary += ` — total cost $${accumulatedBudget.toFixed(2)}`;
    }
  }
  
  return {
    currentPower,
    targetPower,
    totalBudget: accumulatedBudget,
    phases,
    summary,
  };
}

// ─── Dynamic Thresholds ─────────────────────────────────────────────────────

const _STRATEGY_THRESHOLDS: Record<
  string,
  Record<string, [number, number]>
> = {
  aggro:    { ramp: [6, 8],   draw: [8, 10],  removal: [6, 8],   lands: [33, 35] },
  tokens:   { ramp: [8, 10],  draw: [8, 10],  removal: [7, 9],   lands: [34, 36] },
  combo:    { ramp: [12, 16], draw: [14, 18], removal: [8, 10],  lands: [30, 33] },
  midrange: { ramp: [10, 12], draw: [10, 12], removal: [9, 11],  lands: [36, 38] },
  control:  { ramp: [8, 10],  draw: [14, 18], removal: [12, 15], lands: [36, 38] },
  stax:     { ramp: [8, 10],  draw: [10, 12], removal: [10, 12], lands: [34, 36] },
  ramp:     { ramp: [14, 18], draw: [10, 12], removal: [8, 10],  lands: [38, 42] },
};

export function getThresholds(
  strategy: string,
): Record<string, [number, number]> {
  return (
    _STRATEGY_THRESHOLDS[strategy] ?? _STRATEGY_THRESHOLDS["midrange"]
  );
}

// ─── Theme Critical Mass ─────────────────────────────────────────────────────
// Number of cards needed for a theme to be "complete" and reliably execute its gameplan

export const THEME_CRITICAL_MASS: Record<string, number> = {
  "Tokens": 12,
  "Aristocrats": 10,
  "Voltron": 8,
  "Spellslinger": 15,
  "Graveyard": 8,
  "Landfall": 10,
  "+1/+1 Counters": 12,
  "Enchantress": 12,
  "Artifacts Matter": 15,
  "Combat": 10,
  "Tribal": 20,
  "Reanimator": 8,
  "Stax": 10,
  "Control": 15,
  "Combo": 8,
  "Midrange": 12,
};

// ─── Phase 4: Strategy Depth ─────────────────────────────────────────────────

/**
 * BRACKET_GUIDANCE - Multiplayer dynamics guidance for each power bracket
 * Helps players understand threat assessment, political considerations, and win timing
 */
export const BRACKET_GUIDANCE: Record<number, { label: string; political_notes: string; threat_assessment: string; win_timing: string }> = {
  1: {
    label: "Precon",
    political_notes: "Casual table talk, minimal politics. Focus on learning and having fun.",
    threat_assessment: "Board state matters most — count creatures and enchantments. Watch for commanders that grow exponentially.",
    win_timing: "Games last 10+ turns. Take your time building up — rushing can backfire as you'll run out of gas.",
  },
  2: {
    label: "Casual",
    political_notes: "Bargaining starts here — offer deals like 'I won't attack if you don't counter my spell.' Avoid kingmaking.",
    threat_assessment: "Track who's ahead on cards and mana. Player with most cards in hand is often the real threat.",
    win_timing: "Close games by turn 8-10. If you're far ahead by turn 6, expect to be targeted.",
  },
  3: {
    label: "Focused/Optimized",
    political_notes: "Politics are cutthroat — alliances shift fast. Watch for players sandbagging threats to look weak.",
    threat_assessment: "Count interaction — player with 7 cards in hand in blue? Probably has answers. Check for combo pieces in play.",
    win_timing: "Games end turn 6-8 (Focused) or 4-6 (Optimized). Hold interaction for game-winning plays, not every threat.",
  },
  4: {
    label: "cEDH",
    political_notes: "Minimal politics — this is a race. Focus on efficient sequencing and holding up interaction.",
    threat_assessment: "Know the meta combos. Track tutors and combo pieces. One resolved tutor often means GG next turn.",
    win_timing: "Win on turn 2-4 or disrupt others from winning. Every turn counts — mulliganing aggressively is correct.",
  },
};

/**
 * ARCHETYPE_PLAYPATTERNS - How to pilot each deck archetype
 * Provides concrete sequencing and decision-making advice
 */
export const ARCHETYPE_PLAYPATTERNS: Record<string, { mulligan: string; early_game: string; mid_game: string; late_game: string }> = {
  "Aggro": {
    mulligan: "Keep hands with 2-3 lands + early threats. Mulligan slow hands — you need to pressure early.",
    early_game: "Deploy threats aggressively. Attack the player with the least interaction or blockers.",
    mid_game: "If ahead, protect your board with counterspells/hexproof. If behind, pivot to disrupting the leader.",
    late_game: "You're likely out of cards — focus on alpha strikes or rebuilding with draw engines.",
  },
  "Midrange": {
    mulligan: "Keep hands with ramp + a 4-5 drop. Mulligan hands with only 6+ drops.",
    early_game: "Ramp and draw cards. Don't overextend into board wipes.",
    mid_game: "Deploy threats 1-2 at a time. Force opponents to use removal inefficiently.",
    late_game: "Grind with card advantage. You should have more cards and mana than opponents.",
  },
  "Control": {
    mulligan: "Keep hands with early interaction + a board wipe. Mulligan hands with only expensive spells.",
    early_game: "Answer the biggest threats — let small stuff slide. Save countermagic for haymakers.",
    mid_game: "Deploy your own threats once you've stabilized. Hold up interaction.",
    late_game: "You should have answered everything — now close with a resilient wincon.",
  },
  "Combo": {
    mulligan: "Aggressively mulligan for tutors, combo pieces, or protection. Combo decks want specific cards.",
    early_game: "Ramp and dig for your combo. Don't telegraph your pieces unless necessary.",
    mid_game: "Assemble your combo pieces. Wait for the right window — when opponents are tapped out or shields are down.",
    late_game: "If disrupted, pivot to value plays or try again. Always have a backup plan.",
  },
  "Stax": {
    mulligan: "Keep hands with early stax pieces (Rule of Law, Trinisphere, etc.) + lands. Mulligan slow hands.",
    early_game: "Deploy stax pieces that slow everyone down. Prioritize pieces that hurt your opponents more than you.",
    mid_game: "Lock the game down. Your opponents should struggle to cast spells while you grind them out.",
    late_game: "Close with incremental advantage — you've slowed the game to a crawl.",
  },
};

// ─── Theme & Weakness Detection ───────────────────────────────────────────────

export const THEME_DEFINITIONS: Record<string, string> = {
  Tokens:
    "Generates creature tokens to overwhelm through wide board presence.",
  Graveyard:
    "Uses the graveyard as a resource — reanimation, recursion, and flashback effects.",
  Aristocrats:
    "Sacrifices creatures for value — death triggers, life drain, and card advantage.",
  Voltron:
    "Grows one creature enormous through equipment or auras — usually the commander.",
  Spellslinger:
    "Gets value from casting instants and sorceries — cantrips, triggers, storm-style payoffs.",
  Landfall:
    "Triggers powerful effects whenever a land enters the battlefield.",
  "+1/+1 Counters":
    "Grows creatures with +1/+1 counters, proliferate, and counter synergies.",
  Enchantress:
    "Draws cards and gains value from casting enchantments.",
  "Artifacts Matter":
    "Synergies around casting and controlling artifacts — affinity, triggers, and recursion.",
  "Combat":
    "Gains value from attacking — menace, first/double strike, combat triggers, and exalted effects.",
};

const _THEME_THRESHOLDS: Record<string, number> = {
  Tokens: 8,
  Graveyard: 6,
  Aristocrats: 8,
  Voltron: 8,
  Spellslinger: 3,
  Landfall: 6,
  "+1/+1 Counters": 8,
  Enchantress: 2,
  "Artifacts Matter": 2,
  "Combat": 6,
};

// Minimum percentage of non-land cards that must match a theme (density gate)
const _THEME_DENSITY_MIN = 0.08;

function _cardFitsTheme(card: Card, theme: string): boolean {
  if (isLand(card)) return false;
  const oracle = card.oracle_text.toLowerCase();
  const tl = card.type_line.toLowerCase();

  switch (theme) {
    case "Tokens":
      return (
        oracle.includes("creature token") ||
        oracle.includes("populate") ||
        (oracle.includes("twice") && oracle.includes("token"))
      );
    case "Graveyard":
      return (
        [
          "from your graveyard",
          "from a graveyard",
          "flashback",
          "unearth",
          "escape",
          "embalm",
          "encore",
        ].some((kw) => oracle.includes(kw)) || oracle.includes("mill")
      );
    case "Aristocrats":
      return [
        "sacrifice a creature",
        "sacrifice another",
        "whenever a creature dies",
        "whenever a creature you control dies",
        "when this creature dies",
      ].some((kw) => oracle.includes(kw));
    case "Voltron":
      return (
        tl.includes("equipment") ||
        (tl.includes("aura") && oracle.includes("enchant creature")) ||
        oracle.includes("equipped creature") ||
        oracle.includes("enchanted creature gets")
      );
    case "Spellslinger":
      return [
        "whenever you cast an instant or sorcery",
        "whenever you cast a noncreature",
        "magecraft",
        "instant and sorcery cards",
      ].some((kw) => oracle.includes(kw));
    case "Landfall":
      return (
        oracle.includes("landfall") ||
        oracle.includes(
          "whenever a land enters the battlefield under your control"
        )
      );
    case "+1/+1 Counters":
      return [
        "put a +1/+1 counter",
        "+1/+1 counter on it",
        "proliferate",
        "modular",
        "evolve",
        // Multiplier effects — Corpsejack Menace: "twice that many +1/+1 counters are put on it"
        "twice that many +1/+1 counters",
        // Broad counter doublers — Doubling Season, Vorinclex: "twice that many of those counters"
        "twice that many of those counters",
        // Additive amplifiers — Hardened Scales, Conclave Mentor, Branching Evolution
        "that many plus one +1/+1",
        "one additional +1/+1 counter",
        // Placement triggers — "+1/+1 counters would be put on" (actual Scryfall wording)
        "+1/+1 counters would be put",
      ].some((kw) => oracle.includes(kw));
    case "Enchantress":
      return [
        "whenever you cast an enchantment",
        "whenever an enchantment enters",
      ].some((kw) => oracle.includes(kw));
    case "Artifacts Matter":
      return [
        "whenever you cast an artifact",
        "whenever an artifact enters",
        "affinity for artifacts",
      ].some((kw) => oracle.includes(kw));
    case "Combat":
      return (
        [
          "whenever a creature you control attacks",
          "whenever you attack",
          "attacking creatures you control",
          "combat damage",
          "battle cry",
          "exalted",
        ].some((kw) => oracle.includes(kw)) ||
        card.keywords.map((k) => k.toLowerCase()).some((k) =>
          ["first strike", "double strike", "menace", "exalted", "battle cry"].includes(k)
        )
      );
    default:
      return false;
  }
}

export function identifyThemes(deck: Deck): ThemeResult[] {
  const allCards = getAllCards(deck);
  const nonLands = allCards.filter((c) => !isLand(c));
  const nonLandCount = nonLands.reduce((sum, c) => sum + c.quantity, 0);

  const detected: ThemeResult[] = [];
  for (const [theme, threshold] of Object.entries(_THEME_THRESHOLDS)) {
    const matching = allCards
      .filter((c) => _cardFitsTheme(c, theme))
      .map((c) => c.name);
    if (matching.length < threshold) continue;

    // Density gate: theme cards must be >= 8% of non-land cards
    if (nonLandCount > 0 && matching.length / nonLandCount < _THEME_DENSITY_MIN) continue;

    // Ratio checks for payoff-based themes
    if (theme === "Spellslinger" && nonLandCount > 0) {
      const instSorc = nonLands
        .filter(
          (c) =>
            c.type_line.toLowerCase().includes("instant") ||
            c.type_line.toLowerCase().includes("sorcery")
        )
        .reduce((sum, c) => sum + c.quantity, 0);
      if (instSorc / nonLandCount < 0.3) continue;
    } else if (theme === "Enchantress" && nonLandCount > 0) {
      const enchCount = nonLands
        .filter((c) => c.type_line.toLowerCase().includes("enchantment"))
        .reduce((sum, c) => sum + c.quantity, 0);
      if (enchCount / nonLandCount < 0.25) continue;
    } else if (theme === "Artifacts Matter" && nonLandCount > 0) {
      const artCount = nonLands
        .filter((c) => c.type_line.toLowerCase().includes("artifact"))
        .reduce((sum, c) => sum + c.quantity, 0);
      if (artCount / nonLandCount < 0.3) continue;
    }

    detected.push({
      name: theme,
      count: matching.length,
      cards: matching.slice(0, 10),
      definition: THEME_DEFINITIONS[theme] ?? "",
    });
  }

  detected.sort((a, b) => b.count - a.count);
  return detected;
}

export function identifyWeaknesses(
  deck: Deck,
  strategy?: string,
  powerLevel?: number,
): WeaknessResult[] {
  const allCards = getAllCards(deck);
  const cardTypes = categorizeCardTypes(allCards);
  const lands = cardTypes["Lands"] ?? 0;
  const ramp = countRamp(allCards);
  const draw = countDraw(allCards);
  const removal = countRemoval(allCards);
  const boardWipes = countBoardWipes(allCards);
  const avgCmc = calculateAverageCmc(allCards);
  const exileRemoval = countExileRemoval(allCards);
  const ci = getDeckColorIdentity(deck);

  // Dynamic thresholds based on strategy, or static defaults
  let recRamp: number;
  let recDraw: number;
  let recRemoval: number;
  let recLands: [number, number];

  if (strategy) {
    const thresholds = getThresholds(strategy);
    recRamp = thresholds["ramp"][0];
    recDraw = thresholds["draw"][0];
    recRemoval = thresholds["removal"][0];
    recLands = thresholds["lands"];
  } else {
    recRamp = RECOMMENDED_RAMP;
    recDraw = RECOMMENDED_DRAW;
    recRemoval = RECOMMENDED_REMOVAL;
    recLands = RECOMMENDED_LANDS;
  }

  const weaknesses: WeaknessResult[] = [];

  if (lands < recLands[0]) {
    weaknesses.push({
      label: `Low land count (${lands} — recommend ${recLands[0]}–${recLands[1]})`,
      why: "Consistent mana is the foundation of Commander. Too few lands leads to mana screw and missed turns.",
      look_for:
        "Basic lands, utility lands, and dual lands that fit your color identity.",
      examples: [
        "Command Tower",
        "Exotic Orchard",
        "Terramorphic Expanse",
        "Evolving Wilds",
      ],
    });
  } else if (lands > recLands[1] + 4) {
    weaknesses.push({
      label: `High land count (${lands} — you may have too many)`,
      why: "Too many lands means fewer spells. Consider replacing some basics with ramp spells.",
      look_for:
        "Ramp spells that also thin your deck, reducing flood risk.",
      examples: _getColorFilteredExamples("ramp", ci),
    });
  }

  if (ramp < recRamp) {
    weaknesses.push({
      label: `Low ramp count (${ramp} — recommend ${recRamp}+ for ${strategy ?? "Commander"})`,
      why: "Ramp lets you play ahead of the curve and cast your threats before opponents can answer them.",
      look_for:
        "2-mana rocks, land tutors, and mana dorks that fix colors and accelerate your game plan.",
      examples: _getColorFilteredExamples("ramp", ci),
    });
  }

  if (draw < recDraw) {
    weaknesses.push({
      label: `Low card draw (${draw} — recommend ${recDraw}+ for ${strategy ?? "Commander"})`,
      why: "Card advantage is essential in a 100-card singleton format where consistency is low. Running out of cards means losing.",
      look_for:
        "Repeatable draw engines, cantrips, and draw-on-attack effects that trigger regularly.",
      examples: _getColorFilteredExamples("draw", ci),
    });
  }

  if (removal < recRemoval) {
    weaknesses.push({
      label: `Low removal (${removal} — recommend ${recRemoval}+ for ${strategy ?? "Commander"})`,
      why: "With 3 opponents, threats will come from multiple directions. Insufficient answers lets dangerous permanents snowball.",
      look_for:
        "Efficient single-target removal, exile-based answers for indestructible threats.",
      examples: _getColorFilteredExamples("removal", ci),
    });
  }

  // Exile removal quality check
  if (exileRemoval < 3 && removal >= recRemoval) {
    weaknesses.push({
      label: `Low exile-based removal (${exileRemoval} exile effects — mostly destroy)`,
      why: "Destroy-based removal doesn't handle indestructible, undying, or death-trigger threats. Exile answers these cleanly.",
      look_for:
        "Exile-based spot removal like Swords to Plowshares, Path to Exile, Generous Gift, Chaos Warp.",
      examples: _getColorFilteredExamples("removal", ci),
    });
  }

  if (boardWipes < RECOMMENDED_BOARD_WIPES) {
    weaknesses.push({
      label: `Low board wipes (${boardWipes} — recommend ${RECOMMENDED_BOARD_WIPES}+ for Commander)`,
      why: "Board wipes let you recover when opponents get ahead. Without them, a single player building a wide board can dominate.",
      look_for:
        "Mass removal that hits all creatures or all nonland permanents. Pair with indestructible threats to break symmetry.",
      examples: _getColorFilteredExamples("board_wipes", ci),
    });
  }

  if (avgCmc > HIGH_AVG_CMC_THRESHOLD) {
    weaknesses.push({
      label: `High average CMC (${avgCmc.toFixed(1)} — deck may be slow without extra ramp)`,
      why: "A high mana curve means you'll spend early turns doing little while faster decks develop boards.",
      look_for:
        "Cheap interaction, early ramp pieces, and cards with alternative costs or flash to play defensively.",
      examples: _getColorFilteredExamples("ramp", ci),
    });
  }

  return weaknesses;
}

// ─── Per-Card Role Map ────────────────────────────────────────────────────────

// Builds a map of per-card functional roles by scanning each card's oracle text
// once. Downstream consumers (_findCut, _isWeakCategoryCard, findCollectionImprovements)
// use this map instead of re-scanning oracle text on every call.
export function buildCardRoles(deck: Deck): Map<string, CardRoles> {
  const allThemes = Object.keys(_THEME_THRESHOLDS);
  const manaAdders = [
    "add {", "adds {", "add one mana", "add two mana", "add three mana", "add mana",
  ];
  const wipePhrases = [
    "destroy all creatures", "destroy all nonland", "destroy all permanents",
    "destroy all artifact", "exile all", "all creatures get -",
    "return all creatures", "return all nonland", "damage to each creature",
  ];
  const drawPhrases = [
    "draw a card", "draw cards", "draw two", "draw three",
    "draw x ", "draw that many", "draw an additional",
  ];

  const roles = new Map<string, CardRoles>();

  const allCards = getAllCards(deck);
  for (const card of allCards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    const tl = card.type_line.toLowerCase();

    const isRamp =
      manaAdders.some((p) => oracle.includes(p)) ||
      oracle.includes("treasure token") ||
      ((tl.includes("sorcery") || tl.includes("instant")) &&
        oracle.includes("search your library") &&
        oracle.includes("land"));

    const isDraw = drawPhrases.some((p) => oracle.includes(p));

    const isRemoval =
      oracle.includes("destroy target") ||
      oracle.includes("exile target") ||
      oracle.includes("deals damage to any target") ||
      oracle.includes("deals damage to target creature") ||
      (tl.includes("enchantment") && oracle.includes("loses all")) ||
      (oracle.includes("shuffle") &&
        oracle.includes("into") &&
        oracle.includes("library") &&
        oracle.includes("target"));

    const isBoardWipe =
      wipePhrases.some((p) => oracle.includes(p)) ||
      (oracle.includes("-1/-1 counter") && oracle.includes("each creature"));

    const isLegendaryOrGod =
      tl.includes("legendary") || tl.includes("god");

    const themes = allThemes.filter((theme) => _cardFitsTheme(card, theme));

    roles.set(card.name.toLowerCase(), {
      isRamp,
      isDraw,
      isRemoval,
      isBoardWipe,
      isLegendaryOrGod,
      themes,
    });
  }

  return roles;
}

export function generateDeckVerdict(
  analysis: DeckAnalysis
): string {
  const commander = analysis.commander ?? "This deck";
  const themes = analysis.theme_names ?? [];
  const weaknesses = analysis.weaknesses ?? [];
  const avgCmc = analysis.average_cmc ?? 0;
  const strategy = analysis.strategy;
  const powerLevel = analysis.power_level;

  // Strategy + theme sentence
  let themeSentence: string;
  if (strategy) {
    const strategyLabel = strategy.charAt(0).toUpperCase() + strategy.slice(1);
    if (themes.length >= 2) {
      themeSentence = `${commander} is a ${strategyLabel} deck leaning into ${themes[0]} and ${themes[1]} strategies.`;
    } else if (themes.length === 1) {
      themeSentence = `${commander} is a ${strategyLabel} deck with a ${themes[0]} theme.`;
    } else {
      themeSentence = `${commander} is a ${strategyLabel} deck.`;
    }
  } else {
    if (themes.length >= 2) {
      themeSentence = `${commander} leans into ${themes[0]} and ${themes[1]} strategies.`;
    } else if (themes.length === 1) {
      themeSentence = `${commander} leans into ${themes[0]} strategies.`;
    } else {
      themeSentence = `${commander} is a versatile commander without a dominant detected theme.`;
    }
  }

  // Power level note
  let powerNote = "";
  if (powerLevel != null) {
    powerNote = ` Power level: ${powerLevel}/10.`;
  }

  // Weakness sentence — get labels (handle both string and dict formats)
  const weaknessLabels = weaknesses.slice(0, 2).map((w) =>
    typeof w === "object" && w !== null && "label" in w
      ? (w as WeaknessResult).label
      : String(w)
  );

  const weaknessSentence =
    weaknessLabels.length > 0
      ? `Top priorities to address: ${weaknessLabels.join(" and ")}.`
      : "The deck has a solid foundation across all key metrics.";

  // Optional CMC note
  let cmcNote = "";
  if (avgCmc > HIGH_AVG_CMC_THRESHOLD) {
    cmcNote = ` At ${avgCmc.toFixed(1)} average CMC, prioritize early ramp to hit threats on curve.`;
  }

  return `${themeSentence}${powerNote} ${weaknessSentence}${cmcNote}`;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _evaluateCard(
  card: Card,
  weaknesses: WeaknessResult[],
  themes: ThemeResult[]
): [string, number] | null {
  const oracle = card.oracle_text.toLowerCase();
  const typeLine = card.type_line.toLowerCase();

  // Normalise weaknesses to joined label string for matching
  const weaknessText = weaknesses
    .map((w) =>
      typeof w === "object" && w !== null && "label" in w
        ? (w as WeaknessResult).label
        : String(w)
    )
    .join(" ");

  let reason: string | null = null;
  let baseScore = 0.5;

  if (weaknessText.includes("Low ramp")) {
    if (
      oracle.includes("add {") ||
      oracle.includes("adds {") ||
      oracle.includes("add mana") ||
      oracle.includes("treasure token") ||
      (oracle.includes("search your library") && oracle.includes("land"))
    ) {
      reason = "Adds ramp (deck needs more ramp)";
      baseScore = card.cmc <= 2 ? 0.9 : card.cmc <= 3 ? 0.7 : 0.5;
      if (typeLine.includes("enchantment") || typeLine.includes("artifact")) {
        baseScore += 0.1;
      }
      if (oracle.includes("treasure token")) {
        baseScore = Math.min(1.0, baseScore + 0.1);
      }
    }
  }

  if (weaknessText.includes("Low card draw")) {
    const drawPhrases = [
      "draw a card",
      "draw cards",
      "draw two",
      "draw three",
      "draw an additional",
    ];
    if (drawPhrases.some((p) => oracle.includes(p))) {
      reason = "Adds card draw (deck needs more draw)";
      baseScore = card.cmc <= 3 ? 0.9 : card.cmc <= 4 ? 0.7 : 0.5;
      if (typeLine.includes("enchantment") || typeLine.includes("artifact")) {
        baseScore = Math.min(1.0, baseScore + 0.2);
      }
      if (
        oracle.includes("draw an additional") ||
        oracle.includes("whenever")
      ) {
        baseScore = Math.min(1.0, baseScore + 0.1);
      }
    }
  }

  if (weaknessText.includes("Low removal")) {
    if (
      oracle.includes("destroy target") ||
      oracle.includes("exile target")
    ) {
      reason = "Adds removal (deck needs more removal)";
      baseScore = 0.7;
      const restrictions = [
        "nonblack",
        "nonwhite",
        "nonblue",
        "nonred",
        "nongreen",
        "nonartifact",
      ];
      if (!restrictions.some((r) => oracle.includes(r))) {
        baseScore += 0.2;
      }
      if (oracle.includes("exile target")) {
        baseScore = Math.min(1.0, baseScore + 0.1);
      }
    }
  }

  if (weaknessText.includes("Low board wipes")) {
    const wipePhrases = [
      "destroy all creatures",
      "destroy all nonland",
      "exile all",
      "damage to each creature",
    ];
    if (wipePhrases.some((p) => oracle.includes(p))) {
      reason = "Adds a board wipe (deck needs more wipes)";
      baseScore = 0.8;
      if (
        oracle.includes("destroy all creatures") ||
        oracle.includes("exile all creatures")
      ) {
        baseScore = 0.9;
      }
      if (
        oracle.includes("you control") ||
        oracle.includes("you don't control")
      ) {
        baseScore = 1.0;
      }
    }
  }

  if (weaknessText.includes("Low land count") && isLand(card)) {
    reason = "Adds a land (deck needs more lands)";
    baseScore = 0.6;
    if (oracle.trim()) {
      baseScore = 0.8;
    }
  }

  // Theme alignment
  const themeNames = themes.map((t) =>
    typeof t === "object" && t !== null && "name" in t
      ? (t as ThemeResult).name
      : String(t)
  );
  for (const themeName of themeNames) {
    if (_cardFitsTheme(card, themeName)) {
      reason = `Fits deck theme: ${themeName}`;
      baseScore = card.cmc <= 4 ? 0.9 : 0.7;
      break;
    }
  }

  // ─── Combo Enablement (NEW - Phase 2) ─────────────────────────────────────
  // Check if this card completes any known two-card combo
  const cardNameLower = card.name.toLowerCase();
  const comboPartners = KNOWN_COMBOS[cardNameLower];
  if (comboPartners && comboPartners.length > 0) {
    // This card is part of known combos - score it higher as it enables win conditions
    const partnerDisplay = comboPartners.slice(0, 2).join(", ");
    reason = `Combo piece — pairs with ${partnerDisplay}${comboPartners.length > 2 ? ", ..." : ""}`;
    baseScore = Math.max(baseScore, 0.85);
  }

  // ─── Theme Deepening (NEW - Phase 2) ───────────────────────────────────────
  // Check if this card deepens an existing theme toward critical mass
  for (const theme of themes) {
    const themeName = theme.name;
    const currentCount = theme.count || 0;
    const criticalMass = THEME_CRITICAL_MASS[themeName];
    
    if (criticalMass && currentCount < criticalMass) {
      // Theme exists but hasn't reached critical mass yet
      const gap = criticalMass - currentCount;
      
      // Check if this card fits the theme (simple keyword matching)
      const themeKeywords: Record<string, string[]> = {
        "Tokens": ["token", "create", "populate"],
        "Aristocrats": ["sacrifice", "dies", "death", "when .* dies"],
        "Voltron": ["equip", "aura", "attach", "equipped"],
        "Spellslinger": ["instant or sorcery", "whenever you cast", "prowess"],
        "Graveyard": ["graveyard", "flashback", "unearth", "reanimate"],
        "Landfall": ["landfall", "land enters"],
        "+1/+1 Counters": ["+1/+1 counter", "proliferate", "doubling season"],
        "Enchantress": ["enchantment", "constellation"],
        "Artifacts Matter": ["artifact", "affinity"],
        "Combat": ["attacking", "combat damage", "menace", "first strike"],
      };
      
      const keywords = themeKeywords[themeName] || [];
      const matchesTheme = keywords.some(kw => {
        const regex = new RegExp(kw, "i");
        return regex.test(oracle) || regex.test(typeLine);
      });
      
      if (matchesTheme) {
        const oldReason = reason;
        reason = `Deepens ${themeName} theme (${currentCount}/${criticalMass} → critical mass)`;
        // Higher score if close to critical mass
        const deepeningScore = gap <= 3 ? 0.8 : gap <= 6 ? 0.7 : 0.6;
        baseScore = Math.max(baseScore, deepeningScore);
        
        // If we already had a reason (e.g., fixes weakness), combine them
        if (oldReason && !oldReason.includes("Deepens")) {
          reason = `${oldReason} + deepens ${themeName} theme`;
          baseScore = Math.min(1.0, baseScore + 0.1);
        }
      }
    }
  }

  if (reason) {
    return [reason, Math.min(1.0, Math.max(0.0, baseScore))];
  }
  return null;
}

// Minimum oracle text length to consider a card as a non-essential cut candidate.
const _MIN_ORACLE_TEXT_FOR_CUT = 40;

// Returns true if the card functionally belongs to a category that is flagged as weak.
// Used to prevent _findCut from recommending cuts that would worsen an existing weakness.
// Pass `roles` (from buildCardRoles) to skip redundant oracle re-scanning.
export function _isWeakCategoryCard(
  card: Card,
  weakLabels: string[],
  roles?: CardRoles,
): boolean {
  if (weakLabels.length === 0) return false;

  if (roles) {
    if (weakLabels.some((l) => l.includes("Low ramp")) && roles.isRamp) return true;
    if (weakLabels.some((l) => l.includes("Low card draw")) && roles.isDraw) return true;
    if (
      weakLabels.some((l) => l.includes("Low removal") || l.includes("Low exile")) &&
      roles.isRemoval
    ) return true;
    return false;
  }

  // Fallback: oracle text scan (used when no roles map is available)
  const oracle = card.oracle_text.toLowerCase();
  const tl = card.type_line.toLowerCase();

  if (weakLabels.some((l) => l.includes("Low ramp")) && !isLand(card)) {
    if (
      oracle.includes("add {") ||
      oracle.includes("adds {") ||
      oracle.includes("add one mana") ||
      oracle.includes("add two mana") ||
      oracle.includes("add three mana") ||
      oracle.includes("add mana") ||
      oracle.includes("treasure token") ||
      ((tl.includes("sorcery") || tl.includes("instant")) &&
        oracle.includes("search your library") &&
        oracle.includes("land"))
    ) {
      return true;
    }
  }

  if (weakLabels.some((l) => l.includes("Low card draw"))) {
    const drawPhrases = [
      "draw a card", "draw cards", "draw two", "draw three",
      "draw x ", "draw that many", "draw an additional",
    ];
    if (drawPhrases.some((p) => oracle.includes(p))) return true;
  }

  if (weakLabels.some((l) => l.includes("Low removal") || l.includes("Low exile"))) {
    if (
      oracle.includes("destroy target") ||
      oracle.includes("exile target") ||
      oracle.includes("deals damage to any target") ||
      oracle.includes("deals damage to target creature") ||
      (tl.includes("enchantment") && oracle.includes("loses all"))
    ) {
      return true;
    }
  }

  return false;
}

export function _findCut(
  deck: Deck,
  incoming: Card,
  weaknesses?: WeaknessResult[],
  cardRoles?: Map<string, CardRoles>,
): [Card | null, string | null] {
  // Get commander names (case-insensitive)
  const commanderNames = new Set<string>();
  if (deck.commander) commanderNames.add(deck.commander.name.toLowerCase());
  if (deck.partner) commanderNames.add(deck.partner.name.toLowerCase());

  const weakLabels = (weaknesses ?? []).map((w) =>
    typeof w === "object" && w !== null && "label" in w
      ? (w as WeaknessResult).label
      : String(w)
  );

  const isCommander = (c: Card): boolean =>
    commanderNames.has(c.name.toLowerCase());

  // When roles map is available, use it directly — no redundant oracle/theme scanning
  const isOnTheme = cardRoles
    ? (c: Card): boolean => {
        const roles = cardRoles.get(c.name.toLowerCase());
        return roles ? roles.themes.length > 0 : false;
      }
    : (() => {
        const themes = identifyThemes(deck);
        const themeNames = themes.map((t) =>
          typeof t === "object" && t !== null && "name" in t
            ? (t as ThemeResult).name
            : String(t)
        );
        return (c: Card): boolean => themeNames.some((tn) => _cardFitsTheme(c, tn));
      })();

  const isLegendaryOrGod = (c: Card): boolean => {
    if (cardRoles) {
      return cardRoles.get(c.name.toLowerCase())?.isLegendaryOrGod ?? false;
    }
    const tl = c.type_line.toLowerCase();
    return tl.includes("legendary") || tl.includes("god");
  };

  const candidates = deck.mainboard.filter(
    (c) =>
      !isLand(c) &&
      c.oracle_text.length > _MIN_ORACLE_TEXT_FOR_CUT &&
      !isOnTheme(c) &&
      !isCommander(c) &&
      !isLegendaryOrGod(c) &&
      !_isWeakCategoryCard(c, weakLabels, cardRoles?.get(c.name.toLowerCase())),
  );

  // If no suitable candidates, explain why
  if (candidates.length === 0) {
    const nonLands = deck.mainboard.filter((c) => !isLand(c));
    if (nonLands.every((c) => isCommander(c) || isOnTheme(c) || isLegendaryOrGod(c))) {
      return [null, "All non-lands are commanders, legendary, or on-theme"];
    }
    return [null, "No suitable cuts found"];
  }

  // Prefer replacing cards of the same broad type
  const incomingType = incoming.type_line.toLowerCase();
  const broadTypes = [
    "creature",
    "instant",
    "sorcery",
    "enchantment",
    "artifact",
  ];
  const sameType = candidates.filter((c) =>
    broadTypes.some(
      (t) =>
        c.type_line.toLowerCase().includes(t) && incomingType.includes(t),
    )
  );

  const pool = sameType.length > 0 ? sameType : candidates;
  // Sort by CMC ascending — prefer cutting cheap filler rather than expensive payoffs
  pool.sort((a, b) => a.cmc - b.cmc);
  return [pool[0], null];
}
