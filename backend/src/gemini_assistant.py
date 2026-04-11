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
    themes = ", ".join(analysis.get("themes", [])) or "None detected"
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
    """Returns {content: str, ai_enhanced: bool}."""
    context = _deck_context(deck, analysis)
    prompt = f"""
Analyze this Commander deck and provide a comprehensive strategy guide.

{context}

Cover these sections with headers:
## Game Plan
## Win Conditions
## Mulligan Strategy
## Key Cards
## Matchup Advice (general)
## Early / Mid / Late Game Priorities
"""
    result = _ask(prompt)
    if result:
        return {"content": result, "ai_enhanced": True}
    return {"content": _fallback_strategy(deck, analysis), "ai_enhanced": False}


def get_improvement_suggestions(deck, analysis: dict, collection_cards: list[dict]) -> dict:
    """Returns {content: str, ai_enhanced: bool}."""
    context = _deck_context(deck, analysis)
    owned = ", ".join(c["name"] for c in collection_cards[:100]) if collection_cards else "Not provided"

    prompt = f"""
Suggest improvements for this Commander deck. Prioritise cards the player already owns.

{context}

Cards the player owns (from their collection):
{owned}

Structure your response with:
## Urgent Fixes (address weaknesses first)
## Collection Pickups (owned cards that fit)
## High-Impact Staples (cards worth acquiring)
## Suggested Cuts (what to remove to make room)

For each suggestion explain WHY it improves the deck.
"""
    result = _ask(prompt)
    if result:
        return {"content": result, "ai_enhanced": True}
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


# --- Rule-based fallbacks (used when Gemini is unavailable or rate-limited) ---

def _fallback_strategy(deck, analysis: dict) -> str:
    commander = deck.commander.name if deck.commander else "your commander"
    themes = ", ".join(analysis.get("themes", [])) or "general value"
    weaknesses = analysis.get("weaknesses", [])
    weakness_labels = [w["label"] if isinstance(w, dict) else w for w in weaknesses]
    weakness_text = "\n".join(f"- {w}" for w in weakness_labels) if weakness_labels else "- None identified"
    ramp = analysis.get("ramp_count", 0)
    draw = analysis.get("draw_count", 0)
    removal = analysis.get("removal_count", 0)
    avg_cmc = analysis.get("average_cmc", 0)

    mulligan = (
        f"With an average CMC of {avg_cmc:.1f}, keep hands with at least 3 lands and 1–2 ramp sources."
        if avg_cmc >= 3.5
        else f"With a relatively low average CMC of {avg_cmc:.1f}, you can keep most 2-land hands if they have early plays."
    )

    return f"""## Game Plan
This deck is built around **{commander}** and focuses on {themes}. The goal is to leverage your commander's strengths to generate consistent advantage and close out games.

## Win Conditions
Play to your commander's abilities and the deck's primary theme ({themes}). Look to establish board dominance through your key synergies and overwhelm opponents in the mid-to-late game.

## Mulligan Strategy
{mulligan} Prioritize hands that can play into your theme early. With {ramp} ramp sources in the deck, you need to see at least one per opening hand in high-CMC decks.

## Key Numbers to Know
- **Ramp:** {ramp} ({"adequate" if ramp >= 10 else "below the recommended 10+ for Commander"})
- **Card Draw:** {draw} ({"adequate" if draw >= 10 else "below the recommended 10+ for Commander"})
- **Removal:** {removal} ({"adequate" if removal >= 8 else "below the recommended 8+ for Commander"})

## Weaknesses to Address
{weakness_text}
"""


def _fallback_improvements(deck, analysis: dict) -> str:
    weaknesses = analysis.get("weaknesses", [])
    weakness_labels = [w["label"] if isinstance(w, dict) else w for w in weaknesses]
    urgent = "\n".join(f"- Address: {w}" for w in weakness_labels) if weakness_labels else "- Deck looks solid overall"
    ramp = analysis.get("ramp_count", 0)
    draw = analysis.get("draw_count", 0)
    removal = analysis.get("removal_count", 0)

    ramp_advice = (
        "\n### Ramp\n- Sol Ring, Arcane Signet, Cultivate, Kodama's Reach, Rampant Growth\n- Target: 10+ ramp sources\n"
        if ramp < 10 else ""
    )
    draw_advice = (
        "\n### Card Draw\n- Rhystic Study, Phyrexian Arena, Painful Truths, Sign in Blood, Night's Whisper\n- Target: 10+ draw effects\n"
        if draw < 10 else ""
    )
    removal_advice = (
        "\n### Removal\n- Swords to Plowshares, Path to Exile, Beast Within, Generous Gift, Chaos Warp\n- Target: 8+ removal spells\n"
        if removal < 8 else ""
    )

    return f"""## Urgent Fixes
{urgent}
## Priority Additions
{ramp_advice}{draw_advice}{removal_advice}
## General Advice
- Ensure 36–38 lands for consistent mana
- Include 10+ ramp sources and 10+ card draw effects
- Add 8–10 removal spells
"""


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
