/**
 * Gemini 2.5 Flash AI assistant — TypeScript port of backend/src/gemini_assistant.py.
 * All functions return {content, ai_enhanced} where content is structured JSON.
 */

import {
  GoogleGenerativeAI,
  type GenerativeModel,
} from "https://esm.sh/@google/generative-ai@0.21.0";
import type { Card, Deck } from "./models.ts";

// ---------------------------------------------------------------------------
// Client / model setup
// ---------------------------------------------------------------------------

let _genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (_genAI) return _genAI;
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  _genAI = new GoogleGenerativeAI(apiKey);
  return _genAI;
}

const SYSTEM_INSTRUCTION =
  "You are an expert Magic: The Gathering deck-building advisor with deep knowledge " +
  "of Commander/EDH strategy, card synergies, and competitive play patterns. " +
  "Give specific, actionable advice. Always reference actual card names. " +
  "Be concise but thorough.";

const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
];

// Cooldown: when all models are quota-exhausted, skip Gemini until this timestamp (ms)
let geminiCooldownUntil = 0;

// ---------------------------------------------------------------------------
// Core ask helper — tries each model in order, falls back on quota errors
// ---------------------------------------------------------------------------

async function ask(prompt: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const now = Date.now();
  if (now < geminiCooldownUntil) {
    const remaining = Math.round((geminiCooldownUntil - now) / 1000);
    console.log(
      `Gemini cooldown active (${remaining}s remaining) — using rule-based fallback`,
    );
    return null;
  }

  for (const modelName of MODEL_CHAIN) {
    try {
      const model: GenerativeModel = client.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          maxOutputTokens: 16384,
          temperature: 0.3,
        },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text();

      if (!text) {
        // Try extracting text from parts directly
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
          const parts = candidates[0].content?.parts ?? [];
          const texts = parts
            .filter((p) => p.text && !(p as Record<string, unknown>).thought)
            .map((p) => p.text!);
          text = texts.join("\n") || "";
        }
      }

      if (text) {
        console.log(
          `Gemini response via ${modelName} (${text.length} chars)`,
        );
        return text;
      }
    } catch (e: unknown) {
      const err = String(e);
      if (
        err.includes("429") ||
        err.includes("RESOURCE_EXHAUSTED") ||
        err.includes("503") ||
        err.includes("UNAVAILABLE")
      ) {
        console.warn(
          `Gemini ${modelName} unavailable (${(e as Error)?.name ?? "Error"}), trying next model`,
        );
        continue;
      }
      console.error(`Gemini API error on ${modelName}:`, e);
      return null;
    }
  }

  // All models hit quota/capacity — set 60-second cooldown
  geminiCooldownUntil = Date.now() + 60_000;
  console.warn(
    "All Gemini models exhausted quota/capacity — 60s cooldown set",
  );
  return null;
}

// ---------------------------------------------------------------------------
// Deck context builder
// ---------------------------------------------------------------------------

interface AnalysisDict {
  theme_names?: string[];
  weaknesses?: (string | { label: string })[];
  average_cmc?: number;
  card_types?: Record<string, number>;
  strategy?: string;
  power_level?: number;
  ramp_count?: number;
  draw_count?: number;
  removal_count?: number;
  board_wipe_count?: number;
  fast_mana_count?: number;
  exile_removal_count?: number;
  tutor_count?: number;
  counterspell_count?: number;
  [key: string]: unknown;
}

function deckContext(deck: Deck, analysis: AnalysisDict): string {
  const commanders: string[] = [];
  if (deck.commander) commanders.push(deck.commander.name);
  if (deck.partner) commanders.push(deck.partner.name);
  const commanderStr = commanders.length ? commanders.join(" & ") : "Unknown";

  const colors =
    (deck.commander?.color_identity ?? []).join(", ") || "Colorless";
  const themes = (analysis.theme_names ?? []).join(", ") || "None detected";
  const strategy = analysis.strategy ?? "midrange";
  const powerLevel = analysis.power_level;

  const rawWeaknesses = analysis.weaknesses ?? [];
  const weaknessLabels =
    rawWeaknesses
      .map((w) => (typeof w === "object" ? w.label : w))
      .join(", ") || "None";

  const cardTypes = analysis.card_types ?? {};
  const ramp = analysis.ramp_count ?? 0;
  const draw = analysis.draw_count ?? 0;
  const removal = analysis.removal_count ?? 0;
  const wipes = analysis.board_wipe_count ?? 0;
  const fastMana = analysis.fast_mana_count ?? 0;
  const exileRemoval = analysis.exile_removal_count ?? 0;
  const tutors = analysis.tutor_count ?? 0;
  const counterspells = analysis.counterspell_count ?? 0;

  const deckLines = deck.mainboard.map(
    (c) => `${c.name} [${c.type_line}] (CMC ${Math.round(c.cmc)})`,
  );

  const powerStr = powerLevel != null ? `${powerLevel}/10` : "Unknown";

  return `You are analyzing a **${strategy}** deck at power level **${powerStr}**.

Commander: ${commanderStr}
Color Identity: ${colors}
Format: ${deck.format}
Strategy: ${strategy}
Power Level: ${powerStr}
Themes: ${themes}
Weaknesses: ${weaknessLabels}
Average CMC: ${analysis.average_cmc ?? "?"}
Lands: ${cardTypes["Lands"] ?? 0} | Creatures: ${cardTypes["Creatures"] ?? 0} | Instants: ${cardTypes["Instants"] ?? 0} | Sorceries: ${cardTypes["Sorceries"] ?? 0}
Ramp: ${ramp} | Draw: ${draw} | Removal: ${removal} (exile-based: ${exileRemoval}) | Board Wipes: ${wipes}
Fast Mana: ${fastMana} | Tutors: ${tutors} | Counterspells: ${counterspells}

Full decklist:
${deckLines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// JSON parsing helper
// ---------------------------------------------------------------------------

function tryParseJson(raw: string): Record<string, unknown> | null {
  try {
    let clean = raw.trim();
    if (clean.startsWith("```json")) clean = clean.slice(7);
    else if (clean.startsWith("```")) clean = clean.slice(3);
    if (clean.endsWith("```")) clean = clean.slice(0, -3);
    clean = clean.trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API — getStrategyAdvice
// ---------------------------------------------------------------------------

export async function getStrategyAdvice(
  deck: Deck,
  analysis: AnalysisDict,
): Promise<{ content: Record<string, unknown>; ai_enhanced: boolean }> {
  const context = deckContext(deck, analysis);
  const prompt = `
Analyze this Commander deck and provide a comprehensive strategy guide.
Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

${context}

Return this exact JSON structure:
{
  "game_plan": "2-3 sentence overview of the deck's primary strategy",
  "win_conditions": [
    {"name": "Win con name", "description": "How it wins"}
  ],
  "key_cards": [
    {"name": "Card Name", "role": "What this card does for the deck"}
  ],
  "early_game": "Early game priorities (turns 1-3)",
  "mid_game": "Mid game priorities (turns 4-6)",
  "late_game": "Late game priorities (turns 7+)",
  "mulligan": "Mulligan strategy — what to keep, what to ship",
  "matchup_tips": [
    {"against": "Archetype or strategy", "advice": "How to play against it"}
  ]
}
`;

  const raw = await ask(prompt);
  if (raw) {
    const parsed = tryParseJson(raw);
    if (parsed && "game_plan" in parsed) {
      return { content: parsed, ai_enhanced: true };
    }
  }
  return { content: fallbackStrategy(deck, analysis), ai_enhanced: false };
}

// ---------------------------------------------------------------------------
// Public API — getImprovementSuggestions
// ---------------------------------------------------------------------------

export async function getImprovementSuggestions(
  deck: Deck,
  analysis: AnalysisDict,
  collectionCards: { name: string }[],
): Promise<{ content: Record<string, unknown>; ai_enhanced: boolean }> {
  const context = deckContext(deck, analysis);
  const owned = collectionCards.length
    ? collectionCards
        .slice(0, 100)
        .map((c) => c.name)
        .join(", ")
    : "Not provided";

  const prompt = `
Suggest improvements for this Commander deck. Prioritise cards the player already owns.
Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

${context}

Cards the player owns (from their collection):
${owned}

IMPORTANT RULES:
- urgent_fixes: cards to ADD that fix a critical gap (e.g. deck has 4 ramp but needs 10). No paired cut needed. Do NOT list cards already in the decklist above.
- swaps: paired cut→add recommendations. Each swap has one card to CUT (must be in the decklist above) and one card to ADD (must NOT be in the decklist). Include why the add is better for this deck than the cut. Include a category and price_tier on the add side.
- additions: unpaired cards to add that generally improve the deck (no specific cut). Do NOT list cards already in the decklist above. Include a price_tier for each.
- Limit each category to the top 8 most impactful suggestions, ordered by priority.

Return this exact JSON structure:
{
  "urgent_fixes": [
    {"card": "Card Name", "reason": "Why adding this addresses a weakness", "category": "ramp|draw|removal|wipes|lands"}
  ],
  "swaps": [
    {"cut": "Card To Remove", "add": "Card To Add", "reason": "Why this swap improves the deck", "category": "ramp|draw|removal|synergy|upgrade", "price_tier": "budget|mid|premium"}
  ],
  "additions": [
    {"card": "Card Name", "reason": "Why this improves the deck", "price_tier": "budget|mid|premium"}
  ]
}
`;

  const raw = await ask(prompt);
  if (raw) {
    const parsed = tryParseJson(raw);
    if (
      parsed &&
      ("urgent_fixes" in parsed || "swaps" in parsed || "additions" in parsed)
    ) {
      return { content: parsed, ai_enhanced: true };
    }
  }
  return { content: fallbackImprovements(deck, analysis), ai_enhanced: false };
}

// ---------------------------------------------------------------------------
// Public API — explainScenarios
// ---------------------------------------------------------------------------

export async function explainScenarios(
  deck: Deck,
  analysis: AnalysisDict,
  cardsToAdd: string[],
  cardsToRemove: string[],
): Promise<Record<string, unknown>> {
  const context = deckContext(deck, analysis);
  const adds = cardsToAdd.join(", ") || "None";
  const removes = cardsToRemove.join(", ") || "None";

  const prompt = `
A player wants to make the following changes to their Commander deck.
Analyse the impact and return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

${context}

Proposed changes:
- Add: ${adds}
- Remove: ${removes}

Return this exact JSON structure:
{
  "before": {
    "game_plan": "...",
    "win_conditions": ["...", "..."],
    "key_weaknesses": ["...", "..."],
    "play_style": "..."
  },
  "after": {
    "game_plan": "...",
    "win_conditions": ["...", "..."],
    "key_weaknesses": ["...", "..."],
    "play_style": "...",
    "changes_summary": "..."
  }
}
`;

  const raw = await ask(prompt);
  if (raw) {
    const parsed = tryParseJson(raw);
    if (parsed) return parsed;
  }

  return fallbackScenarios(deck, analysis, cardsToAdd, cardsToRemove);
}

// ---------------------------------------------------------------------------
// Rule-based fallbacks (used when Gemini is unavailable or rate-limited)
// ---------------------------------------------------------------------------

function fallbackStrategy(
  deck: Deck,
  analysis: AnalysisDict,
): Record<string, unknown> {
  const commander = deck.commander?.name ?? "your commander";
  const themes = (analysis.theme_names ?? []).join(", ") || "general value";
  const rawWeaknesses = analysis.weaknesses ?? [];
  const _weaknessLabels = rawWeaknesses.map((w) =>
    typeof w === "object" ? w.label : w,
  );
  const ramp = analysis.ramp_count ?? 0;
  const draw = analysis.draw_count ?? 0;
  const removal = analysis.removal_count ?? 0;
  const avgCmc = analysis.average_cmc ?? 0;

  const mulligan =
    (avgCmc as number) >= 3.5
      ? `With an average CMC of ${(avgCmc as number).toFixed(1)}, keep hands with at least 3 lands and 1-2 ramp sources.`
      : `With a relatively low average CMC of ${(avgCmc as number).toFixed(1)}, you can keep most 2-land hands if they have early plays.`;

  return {
    game_plan: `This deck is built around ${commander} and focuses on ${themes}. Leverage your commander's strengths to generate consistent advantage and close out games.`,
    win_conditions: [
      {
        name: "Commander synergy",
        description: `Use ${commander} to drive the deck's ${themes} strategy`,
      },
    ],
    key_cards: [],
    early_game: `Prioritize ramp and fixing. With ${ramp} ramp sources, you need to see at least one per opening hand.`,
    mid_game: `Deploy your key synergy pieces and commander. Use your ${removal} removal spells to handle the biggest threats.`,
    late_game: `Leverage card advantage (${draw} draw sources) to grind out value and close the game with your primary theme.`,
    mulligan,
    matchup_tips: [
      {
        against: "Aggro",
        advice:
          "Prioritize early blockers and removal. Don't let them snowball before you set up.",
      },
      {
        against: "Control",
        advice:
          "Don't overextend into board wipes. Bait countermagic with less critical spells.",
      },
    ],
  };
}

function fallbackImprovements(
  _deck: Deck,
  analysis: AnalysisDict,
): Record<string, unknown> {
  const ramp = analysis.ramp_count ?? 0;
  const draw = analysis.draw_count ?? 0;
  const removal = analysis.removal_count ?? 0;

  const urgentFixes: Record<string, string>[] = [];
  const swaps: Record<string, string>[] = [];
  const additions: Record<string, string>[] = [];

  if (ramp < 10) {
    urgentFixes.push({
      card: "Sol Ring",
      reason: `Deck needs more ramp sources (currently ${ramp})`,
      category: "ramp",
    });
    additions.push(
      {
        card: "Arcane Signet",
        reason: "Efficient 2-mana rock that fixes colors",
        price_tier: "budget",
      },
      {
        card: "Cultivate",
        reason: "Land ramp that fixes mana and thins the deck",
        price_tier: "budget",
      },
    );
  }
  if (draw < 10) {
    urgentFixes.push({
      card: "Phyrexian Arena",
      reason: `Deck needs more card draw (currently ${draw})`,
      category: "draw",
    });
    additions.push({
      card: "Rhystic Study",
      reason: "One of the best draw engines in Commander",
      price_tier: "premium",
    });
  }
  if (removal < 8) {
    urgentFixes.push({
      card: "Swords to Plowshares",
      reason: `Deck needs more removal (currently ${removal})`,
      category: "removal",
    });
    additions.push({
      card: "Beast Within",
      reason: "Versatile removal that hits any permanent",
      price_tier: "budget",
    });
  }

  return {
    urgent_fixes: urgentFixes,
    swaps,
    additions,
  };
}

function fallbackScenarios(
  _deck: Deck,
  analysis: AnalysisDict,
  adds: string[],
  removes: string[],
): Record<string, unknown> {
  return {
    before: {
      game_plan: "Current deck strategy based on existing card composition.",
      win_conditions: ["Commander damage", "Value engine"],
      key_weaknesses: analysis.weaknesses ?? [],
      play_style: "Midrange value",
    },
    after: {
      game_plan: "Adjusted strategy after proposed changes.",
      win_conditions: ["Commander damage", "Value engine"],
      key_weaknesses: [],
      play_style: "Midrange value",
      changes_summary: `Adding ${adds.join(", ") || "nothing"}; removing ${removes.join(", ") || "nothing"}.`,
    },
  };
}
