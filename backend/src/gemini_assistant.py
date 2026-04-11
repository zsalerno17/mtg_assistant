"""
Gemini 2.5 Flash AI assistant — replaces src/assistant.py (OpenAI).
All functions return plain strings (Markdown) except explain_scenarios()
which returns a structured dict for the before/after UI.
"""
from __future__ import annotations

import os
import logging
import json
import time
from typing import Optional

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return None
        from google import genai
        _client = genai.Client(api_key=api_key)
    return _client


_SYSTEM_INSTRUCTION = (
    "You are an expert Magic: The Gathering deck-building advisor with deep knowledge "
    "of Commander/EDH strategy, card synergies, and competitive play patterns. "
    "Give specific, actionable advice. Always reference actual card names. "
    "Be concise but thorough."
)


# Try models in priority order; fall back if quota/capacity exceeded
_MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"]

# Set to a future timestamp when all models are quota-exhausted; skips Gemini until then
_gemini_cooldown_until: float = 0.0


def _ask(prompt: str) -> Optional[str]:
    global _gemini_cooldown_until
    client = _get_client()
    if client is None:
        return None

    # Skip Gemini entirely during cooldown window (set after all models exhaust quota)
    now = time.time()
    if now < _gemini_cooldown_until:
        remaining = int(_gemini_cooldown_until - now)
        logger.info("Gemini cooldown active (%ds remaining) — using rule-based fallback", remaining)
        return None

    from google.genai import types
    for model in _MODEL_CHAIN:
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM_INSTRUCTION,
                    max_output_tokens=16384,
                ),
            )
            text = response.text
            if not text:
                # Extract text from parts directly (handles thinking-mode edge cases)
                if response.candidates:
                    parts = response.candidates[0].content.parts if response.candidates[0].content else []
                    texts = [p.text for p in parts if p.text and not getattr(p, 'thought', False)]
                    text = "\n".join(texts) or None
            if text:
                logger.info("Gemini response via %s (%d chars)", model, len(text))
                return text
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err or "503" in err or "UNAVAILABLE" in err:
                logger.warning("Gemini %s unavailable (%s), trying next model", model, type(e).__name__)
                continue
            logger.error("Gemini API error on %s: %s: %s", model, type(e).__name__, e)
            return None

    # All models hit quota/capacity — set 60-second cooldown
    _gemini_cooldown_until = time.time() + 60
    logger.warning("All Gemini models exhausted quota/capacity — 60s cooldown set")
    return None


def _deck_context(deck, analysis: dict) -> str:
    commander = deck.commander.name if deck.commander else "Unknown"
    themes = ", ".join(analysis.get("theme_names", [])) or "None detected"
    # Handle both old string format and new structured dict format
    raw_weaknesses = analysis.get("weaknesses", [])
    weakness_labels = ", ".join(
        w["label"] if isinstance(w, dict) else w for w in raw_weaknesses
    ) or "None"
    card_types = analysis.get("card_types", {})
    mainboard_names = [c.name for c in deck.mainboard]

    return f"""
Commander: {commander}
Format: {deck.format}
Themes: {themes}
Weaknesses: {weakness_labels}
Average CMC: {analysis.get("average_cmc", "?")}
Lands: {card_types.get("Lands", 0)} | Creatures: {card_types.get("Creatures", 0)} | Instants: {card_types.get("Instants", 0)} | Sorceries: {card_types.get("Sorceries", 0)}
Ramp spells: {analysis.get("ramp_count", 0)} | Draw spells: {analysis.get("draw_count", 0)} | Removal: {analysis.get("removal_count", 0)}

Full decklist:
{chr(10).join(mainboard_names)}
""".strip()


def get_strategy_advice(deck, analysis: dict) -> dict:
    """Returns {content: dict, ai_enhanced: bool}. Content is a structured JSON object."""
    context = _deck_context(deck, analysis)
    prompt = f"""
Analyze this Commander deck and provide a comprehensive strategy guide.
Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

{context}

Return this exact JSON structure:
{{
  "game_plan": "2-3 sentence overview of the deck's primary strategy",
  "win_conditions": [
    {{"name": "Win con name", "description": "How it wins"}}
  ],
  "key_cards": [
    {{"name": "Card Name", "role": "What this card does for the deck"}}
  ],
  "early_game": "Early game priorities (turns 1-3)",
  "mid_game": "Mid game priorities (turns 4-6)",
  "late_game": "Late game priorities (turns 7+)",
  "mulligan": "Mulligan strategy — what to keep, what to ship",
  "matchup_tips": [
    {{"against": "Archetype or strategy", "advice": "How to play against it"}}
  ]
}}
"""
    raw = _ask(prompt)
    if raw:
        parsed = _try_parse_json(raw)
        if parsed and "game_plan" in parsed:
            return {"content": parsed, "ai_enhanced": True}
    return {"content": _fallback_strategy(deck, analysis), "ai_enhanced": False}


def get_improvement_suggestions(deck, analysis: dict, collection_cards: list[dict]) -> dict:
    """Returns {content: dict, ai_enhanced: bool}. Content is a structured JSON object."""
    context = _deck_context(deck, analysis)
    owned = ", ".join(c["name"] for c in collection_cards[:100]) if collection_cards else "Not provided"

    prompt = f"""
Suggest improvements for this Commander deck. Prioritise cards the player already owns.
Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

{context}

Cards the player owns (from their collection):
{owned}

IMPORTANT RULES:
- urgent_fixes are cards to ADD to the deck that fix a critical weakness. Do NOT list cards already in the decklist above.
- cuts are cards currently in the deck that should be removed. Include the card's type.
- additions are cards to add that improve the deck overall. Do NOT list cards already in the decklist above.
- Limit each category to the top 5 most impactful suggestions, ordered by priority.

Return this exact JSON structure:
{{
  "urgent_fixes": [
    {{"card": "Card Name", "reason": "Why adding this addresses a weakness", "category": "ramp|draw|removal|wipes|lands"}}
  ],
  "cuts": [
    {{"card": "Card Name", "reason": "Why this should be cut", "type": "creature|instant|sorcery|enchantment|artifact|land|planeswalker"}}
  ],
  "additions": [
    {{"card": "Card Name", "reason": "Why this improves the deck"}}
  ],
  "staples_to_buy": [
    {{"card": "Card Name", "reason": "Why it's worth acquiring", "price_tier": "budget|mid|premium"}}
  ]
}}
"""
    raw = _ask(prompt)
    if raw:
        parsed = _try_parse_json(raw)
        if parsed and ("urgent_fixes" in parsed or "cuts" in parsed or "additions" in parsed):
            return {"content": parsed, "ai_enhanced": True}
    return {"content": _fallback_improvements(deck, analysis), "ai_enhanced": False}


def explain_scenarios(
    deck,
    analysis: dict,
    cards_to_add: list[str],
    cards_to_remove: list[str],
) -> dict:
    context = _deck_context(deck, analysis)
    adds = ", ".join(cards_to_add) or "None"
    removes = ", ".join(cards_to_remove) or "None"

    prompt = f"""
A player wants to make the following changes to their Commander deck.
Analyse the impact and return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

{context}

Proposed changes:
- Add: {adds}
- Remove: {removes}

Return this exact JSON structure:
{{
  "before": {{
    "game_plan": "...",
    "win_conditions": ["...", "..."],
    "key_weaknesses": ["...", "..."],
    "play_style": "..."
  }},
  "after": {{
    "game_plan": "...",
    "win_conditions": ["...", "..."],
    "key_weaknesses": ["...", "..."],
    "play_style": "...",
    "changes_summary": "..."
  }}
}}
"""
    raw = _ask(prompt)
    if raw:
        try:
            # Strip any accidental markdown fences
            clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            return json.loads(clean)
        except (json.JSONDecodeError, ValueError):
            pass

    return _fallback_scenarios(deck, analysis, cards_to_add, cards_to_remove)


# --- JSON parsing helper ---

def _try_parse_json(raw: str) -> Optional[dict]:
    """Try to extract a JSON object from Gemini's response."""
    try:
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        return None


# --- Rule-based fallbacks (used when Gemini is unavailable or rate-limited) ---

def _fallback_strategy(deck, analysis: dict) -> dict:
    commander = deck.commander.name if deck.commander else "your commander"
    themes = ", ".join(analysis.get("theme_names", [])) or "general value"
    weaknesses = analysis.get("weaknesses", [])
    weakness_labels = [w["label"] if isinstance(w, dict) else w for w in weaknesses]
    ramp = analysis.get("ramp_count", 0)
    draw = analysis.get("draw_count", 0)
    removal = analysis.get("removal_count", 0)
    avg_cmc = analysis.get("average_cmc", 0)

    mulligan = (
        f"With an average CMC of {avg_cmc:.1f}, keep hands with at least 3 lands and 1-2 ramp sources."
        if avg_cmc >= 3.5
        else f"With a relatively low average CMC of {avg_cmc:.1f}, you can keep most 2-land hands if they have early plays."
    )

    return {
        "game_plan": f"This deck is built around {commander} and focuses on {themes}. Leverage your commander's strengths to generate consistent advantage and close out games.",
        "win_conditions": [
            {"name": "Commander synergy", "description": f"Use {commander} to drive the deck's {themes} strategy"}
        ],
        "key_cards": [],
        "early_game": f"Prioritize ramp and fixing. With {ramp} ramp sources, you need to see at least one per opening hand.",
        "mid_game": f"Deploy your key synergy pieces and commander. Use your {removal} removal spells to handle the biggest threats.",
        "late_game": f"Leverage card advantage ({draw} draw sources) to grind out value and close the game with your primary theme.",
        "mulligan": mulligan,
        "matchup_tips": [
            {"against": "Aggro", "advice": "Prioritize early blockers and removal. Don't let them snowball before you set up."},
            {"against": "Control", "advice": "Don't overextend into board wipes. Bait countermagic with less critical spells."},
        ],
    }


def _fallback_improvements(deck, analysis: dict) -> dict:
    weaknesses = analysis.get("weaknesses", [])
    ramp = analysis.get("ramp_count", 0)
    draw = analysis.get("draw_count", 0)
    removal = analysis.get("removal_count", 0)

    urgent = []
    staples = []

    if ramp < 10:
        urgent.append({"card": "Sol Ring", "reason": "Deck needs more ramp sources (currently {})".format(ramp), "category": "ramp"})
        staples.extend([
            {"card": "Arcane Signet", "reason": "Efficient 2-mana rock that fixes colors", "price_tier": "budget"},
            {"card": "Cultivate", "reason": "Land ramp that fixes mana and thins the deck", "price_tier": "budget"},
        ])
    if draw < 10:
        urgent.append({"card": "Phyrexian Arena", "reason": "Deck needs more card draw (currently {})".format(draw), "category": "draw"})
        staples.append({"card": "Rhystic Study", "reason": "One of the best draw engines in Commander", "price_tier": "premium"})
    if removal < 8:
        urgent.append({"card": "Swords to Plowshares", "reason": "Deck needs more removal (currently {})".format(removal), "category": "removal"})
        staples.append({"card": "Beast Within", "reason": "Versatile removal that hits any permanent", "price_tier": "budget"})

    return {
        "urgent_fixes": urgent,
        "cuts": [],
        "additions": [],
        "staples_to_buy": staples,
    }


def _fallback_scenarios(deck, analysis: dict, adds: list[str], removes: list[str]) -> dict:
    return {
        "before": {
            "game_plan": "Current deck strategy based on existing card composition.",
            "win_conditions": ["Commander damage", "Value engine"],
            "key_weaknesses": analysis.get("weaknesses", []),
            "play_style": "Midrange value",
        },
        "after": {
            "game_plan": "Adjusted strategy after proposed changes.",
            "win_conditions": ["Commander damage", "Value engine"],
            "key_weaknesses": [],
            "play_style": "Midrange value",
            "changes_summary": f"Adding {', '.join(adds) or 'nothing'}; removing {', '.join(removes) or 'nothing'}.",
        },
    }
