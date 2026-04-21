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

export type ImprovementSuggestion = [
  Card,
  Card | null,
  string,
  number,
  string | null
];

// ─── Public API ──────────────────────────────────────────────────────────────

export function analyzeDeck(deck: Deck): DeckAnalysis {
  const allCards = getAllCards(deck);
  const themes = identifyThemes(deck);
  const commanders: string[] = [];
  if (deck.commander) commanders.push(deck.commander.name);
  if (deck.partner) commanders.push(deck.partner.name);

  const strategy = classifyStrategy(deck);
  const powerLevel = calculatePowerLevel(deck);

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
      const [cut, neverCutReason] = _findCut(deck, colCard);
      suggestions.push([colCard, cut, reason, score, neverCutReason]);
    }
  }

  // Sort by score descending, then return top 20
  suggestions.sort((a, b) => b[3] - a[3]);
  return suggestions.slice(0, 20);
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
  for (const card of cards) {
    if (isLand(card)) continue;
    const oracle = card.oracle_text.toLowerCase();
    if (drawPhrases.some((p) => oracle.includes(p))) {
      count += card.quantity;
    }
  }
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
  "breya, etherium shaper", "zur the enchanter", "the gitrog monster",
]);

export function getDeckBracket(powerLevel: number): { bracket: number; bracket_label: string } {
  if (powerLevel <= 3) return { bracket: 1, bracket_label: "Precon" };
  if (powerLevel <= 5) return { bracket: 2, bracket_label: "Casual" };
  if (powerLevel <= 7) return { bracket: 3, bracket_label: "Focused" };
  if (powerLevel <= 9) return { bracket: 3, bracket_label: "Optimized" };
  return { bracket: 4, bracket_label: "cEDH" };
}

export function calculatePowerLevel(deck: Deck): number {
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

  // Card draw density
  if (draw >= 12) score += 0.5;

  // Interaction density
  if (interaction >= 15) score += 0.5;

  // Low-interaction penalty (goldfish/pure combo with no answers)
  if (interaction < 8) score -= 0.5;

  // Commander power signals
  const commanderBonus = (name: string | undefined): number => {
    if (!name) return 0;
    const n = name.toLowerCase();
    if (_HIGH_POWER_COMMANDERS.has(n)) return 1.5;
    if (_STRONG_COMMANDERS.has(n)) return 0.75;
    return 0;
  };
  score += commanderBonus(deck.commander?.name);
  score += commanderBonus(deck.partner?.name);

  return Math.max(1, Math.min(10, Math.round(score)));
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

function getThresholds(
  strategy: string,
): Record<string, [number, number]> {
  return (
    _STRATEGY_THRESHOLDS[strategy] ?? _STRATEGY_THRESHOLDS["midrange"]
  );
}

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

  if (reason) {
    return [reason, Math.min(1.0, Math.max(0.0, baseScore))];
  }
  return null;
}

// Minimum oracle text length to consider a card as a non-essential cut candidate.
const _MIN_ORACLE_TEXT_FOR_CUT = 40;

function _findCut(
  deck: Deck,
  incoming: Card
): [Card | null, string | null] {
  const themes = identifyThemes(deck);
  const themeNames = themes.map((t) =>
    typeof t === "object" && t !== null && "name" in t
      ? (t as ThemeResult).name
      : String(t)
  );

  // Get commander names (case-insensitive)
  const commanderNames = new Set<string>();
  if (deck.commander) commanderNames.add(deck.commander.name.toLowerCase());
  if (deck.partner) commanderNames.add(deck.partner.name.toLowerCase());

  const isOnTheme = (c: Card): boolean =>
    themeNames.some((tn) => _cardFitsTheme(c, tn));

  const isCommander = (c: Card): boolean =>
    commanderNames.has(c.name.toLowerCase());

  const candidates = deck.mainboard.filter(
    (c) =>
      !isLand(c) &&
      c.oracle_text.length > _MIN_ORACLE_TEXT_FOR_CUT &&
      !isOnTheme(c) &&
      !isCommander(c)
  );

  // If no suitable candidates, explain why
  if (candidates.length === 0) {
    const nonLands = deck.mainboard.filter((c) => !isLand(c));
    if (nonLands.every((c) => isCommander(c) || isOnTheme(c))) {
      return [null, "All non-lands are commanders or on-theme"];
    }
    return [null, "No suitable cuts found"];
  }

  // Prefer replacing expensive cards of the same broad type
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
        c.type_line.toLowerCase().includes(t) && incomingType.includes(t)
    )
  );

  const pool = sameType.length > 0 ? sameType : candidates;
  // Sort by CMC descending — prefer cutting high-cost dead weight
  pool.sort((a, b) => b.cmc - a.cmc);
  return [pool[0], null];
}
