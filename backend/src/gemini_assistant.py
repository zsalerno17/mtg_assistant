"""
Gemini 2.5 Flash AI assistant — replaces src/assistant.py (OpenAI).
All functions return plain strings (Markdown) except explain_scenarios()
which returns a structured dict for the before/after UI.
"""
from __future__ import annotations

import os
import json
from typing import Optional

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


def _ask(prompt: str) -> Optional[str]:
    client = _get_client()
    if client is None:
        return None
    try:
        from google.genai import types
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_INSTRUCTION,
                max_output_tokens=2500,
            ),
        )
        return response.text
    except Exception:
        return None


def _deck_context(deck, analysis: dict) -> str:
    commander = deck.commander.name if deck.commander else "Unknown"
    themes = ", ".join(analysis.get("themes", [])) or "None detected"
    weaknesses = ", ".join(analysis.get("weaknesses", [])) or "None"
    card_types = analysis.get("card_types", {})
    mainboard_names = [c.name for c in deck.mainboard]

    return f"""
Commander: {commander}
Format: {deck.format}
Themes: {themes}
Weaknesses: {weaknesses}
Average CMC: {analysis.get("average_cmc", "?")}
Lands: {card_types.get("Lands", 0)} | Creatures: {card_types.get("Creatures", 0)} | Instants: {card_types.get("Instants", 0)} | Sorceries: {card_types.get("Sorceries", 0)}
Ramp spells: {analysis.get("ramp_count", 0)} | Draw spells: {analysis.get("draw_count", 0)} | Removal: {analysis.get("removal_count", 0)}

Full decklist:
{chr(10).join(mainboard_names)}
""".strip()


def get_strategy_advice(deck, analysis: dict) -> str:
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
    return result or _fallback_strategy(deck, analysis)


def get_improvement_suggestions(deck, analysis: dict, collection_cards: list[dict]) -> str:
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
    return result or _fallback_improvements(deck, analysis)


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


# --- Rule-based fallbacks (used when GEMINI_API_KEY is not set) ---

def _fallback_strategy(deck, analysis: dict) -> str:
    commander = deck.commander.name if deck.commander else "your commander"
    themes = ", ".join(analysis.get("themes", [])) or "general value"
    weaknesses = analysis.get("weaknesses", [])
    weakness_text = "\n".join(f"- {w}" for w in weaknesses) if weaknesses else "- None identified"
    return f"""## Game Plan
This deck is built around **{commander}** and focuses on {themes}.

## Win Conditions
Play to your commander's strengths and overwhelm opponents through consistent execution.

## Weaknesses to Address
{weakness_text}

> Add a Gemini API key for detailed AI-powered strategy advice.
"""


def _fallback_improvements(deck, analysis: dict) -> str:
    weaknesses = analysis.get("weaknesses", [])
    urgent = "\n".join(f"- Address: {w}" for w in weaknesses) if weaknesses else "- Deck looks solid overall"
    return f"""## Urgent Fixes
{urgent}

## General Advice
- Ensure 36–38 lands for consistent mana
- Include 10+ ramp sources and 10+ card draw effects
- Add 8–10 removal spells

> Add a Gemini API key for personalised AI-powered improvement suggestions.
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
