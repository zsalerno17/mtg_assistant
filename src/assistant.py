"""AI-powered assistant for MTG Commander deck advice.

Uses the OpenAI Chat API when OPENAI_API_KEY is set; falls back to rule-based
responses otherwise so the app is always usable without an API key.
"""

from __future__ import annotations

import os
from typing import List, Optional, Tuple

from .models import Card, Deck

try:
    from openai import OpenAI as _OpenAI

    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False

_MODEL = "gpt-4o-mini"
_SYSTEM_PROMPT = (
    "You are an expert Magic: The Gathering Commander (EDH) player and deck builder. "
    "Provide clear, concise, actionable advice tailored to the Commander format. "
    "Use plain language and structure your response with clear sections."
)


# ─── Public API ───────────────────────────────────────────────────────────────


def get_strategy_advice(deck: Deck, analysis: dict) -> str:
    """Return a strategy guide for the deck."""
    context = _deck_context(deck, analysis)
    prompt = f"""{context}

Provide a strategy guide covering:
1. How this deck wants to play (game plan)
2. Key strategic lines / win conditions
3. Mulligan strategy (what to keep in your opening hand)
4. How to handle aggro, control, and combo opponents
5. Three to five cards that are highest priority to resolve early

Keep each section to 2–4 sentences."""

    return _ask(prompt) or _rule_based_strategy(deck, analysis)


def get_improvement_suggestions(
    deck: Deck,
    analysis: dict,
    collection_improvements: List[Tuple[Card, Optional[Card], str]],
) -> str:
    """Return targeted improvement recommendations."""
    context = _deck_context(deck, analysis)
    collection_lines = _format_collection_suggestions(collection_improvements)

    prompt = f"""{context}
{collection_lines}
Provide improvement recommendations:
1. Which weaknesses are most urgent to fix, and how
2. Evaluate the collection suggestions above — rank the top 3 by priority and explain why
3. Name 3–5 powerful Commander staples (not already in the deck) that would make it stronger
4. Describe the overall impact these changes have on power level and consistency"""

    return _ask(prompt) or _rule_based_improvements(deck, analysis, collection_improvements)


def explain_deck_changes(
    deck: Deck,
    cards_to_add: List[Card],
    cards_to_remove: List[Card],
) -> str:
    """Explain the impact of a proposed set of deck changes."""
    commander_name = deck.commander.name if deck.commander else deck.name
    adds = "\n".join(f"  + {c.name} ({c.type_line})" for c in cards_to_add) or "  (none)"
    removes = "\n".join(f"  - {c.name} ({c.type_line})" for c in cards_to_remove) or "  (none)"

    prompt = f"""Commander: {commander_name}

Proposed changes:
ADDING:
{adds}

REMOVING:
{removes}

Explain:
1. How these changes affect the deck's strategy and game plan
2. Synergies gained or lost
3. Power level / consistency impact
4. Whether you recommend these changes and why"""

    return _ask(prompt) or _rule_based_changes(deck, cards_to_add, cards_to_remove)


# ─── OpenAI helpers ───────────────────────────────────────────────────────────


def _get_client() -> Optional["_OpenAI"]:
    if not _OPENAI_AVAILABLE:
        return None
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    return _OpenAI(api_key=api_key)


def _ask(prompt: str) -> Optional[str]:
    """Send prompt to OpenAI and return the response text, or None on failure."""
    client = _get_client()
    if client is None:
        return None
    try:
        response = client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=900,
        )
        return response.choices[0].message.content
    except Exception:
        return None


# ─── Context builders ─────────────────────────────────────────────────────────


def _deck_context(deck: Deck, analysis: dict) -> str:
    commander_name = deck.commander.name if deck.commander else "Unknown"
    themes = ", ".join(analysis.get("themes", [])) or "None identified"
    weaknesses = "\n".join(f"  - {w}" for w in analysis.get("weaknesses", [])) or "  None"
    card_types = analysis.get("card_types", {})
    avg_cmc = analysis.get("average_cmc", 0)

    types_str = ", ".join(f"{k}: {v}" for k, v in card_types.items())
    return (
        f"Commander: {commander_name}\n"
        f"Themes: {themes}\n"
        f"Average CMC: {avg_cmc}\n"
        f"Card types: {types_str}\n"
        f"Weaknesses:\n{weaknesses}"
    )


def _format_collection_suggestions(
    suggestions: List[Tuple[Card, Optional[Card], str]],
) -> str:
    if not suggestions:
        return ""
    lines = ["\nCards from user's collection that could improve the deck:"]
    for col_card, cut, reason in suggestions[:10]:
        cut_name = cut.name if cut else "a flex slot"
        lines.append(f"  ADD {col_card.name}  →  replace {cut_name}  ({reason})")
    return "\n".join(lines) + "\n"


# ─── Rule-based fallbacks ─────────────────────────────────────────────────────


def _rule_based_strategy(deck: Deck, analysis: dict) -> str:
    commander_name = deck.commander.name if deck.commander else deck.name
    themes = analysis.get("themes", [])
    weaknesses = analysis.get("weaknesses", [])
    avg_cmc = analysis.get("average_cmc", 0.0)

    lines = [f"## Strategy Guide — {commander_name}\n"]

    if themes:
        lines.append(f"**Primary strategy**: {', '.join(themes[:2])}.")

    if avg_cmc < 2.5:
        lines.append("**Pace**: Fast and aggressive — apply pressure from turn 1.")
    elif avg_cmc < 3.5:
        lines.append("**Pace**: Mid-range — balance early plays with powerful late threats.")
    else:
        lines.append("**Pace**: Slower / controlling — prioritise ramp in the first few turns.")

    if weaknesses:
        lines.append("\n**Areas to watch:**")
        for w in weaknesses:
            lines.append(f"  - {w}")

    lines.append(
        "\n*Tip: Set an OpenAI API key in the sidebar to get detailed AI-powered strategy advice.*"
    )
    return "\n".join(lines)


def _rule_based_improvements(
    deck: Deck,
    analysis: dict,
    collection_improvements: List[Tuple[Card, Optional[Card], str]],
) -> str:
    weaknesses = analysis.get("weaknesses", [])
    lines = ["## Deck Improvement Suggestions\n"]

    if weaknesses:
        lines.append("**Priority weaknesses to address:**")
        for w in weaknesses:
            lines.append(f"  - {w}")

    if collection_improvements:
        lines.append("\n**From your collection:**")
        for col_card, cut, reason in collection_improvements[:10]:
            cut_name = cut.name if cut else "a flex slot"
            lines.append(f"  - **{col_card.name}** → cut *{cut_name}* — {reason}")

    lines.append(
        "\n*Set an OpenAI API key in the sidebar to get detailed AI-powered suggestions.*"
    )
    return "\n".join(lines)


def _rule_based_changes(
    deck: Deck,
    cards_to_add: List[Card],
    cards_to_remove: List[Card],
) -> str:
    lines = ["## Proposed Changes Analysis\n"]

    if cards_to_add:
        lines.append("**Adding:**")
        for c in cards_to_add:
            lines.append(f"  + {c.name} ({c.type_line})")

    if cards_to_remove:
        lines.append("\n**Removing:**")
        for c in cards_to_remove:
            lines.append(f"  - {c.name} ({c.type_line})")

    net = len(cards_to_add) - len(cards_to_remove)
    if net == 0:
        lines.append("\n**Net change**: Deck stays at 100 cards. ✓")
    elif net > 0:
        lines.append(f"\n**Net change**: +{net} cards — remember to cut {net} more cards.")
    else:
        lines.append(f"\n**Net change**: {net} cards — remember to add {abs(net)} more.")

    lines.append(
        "\n*Set an OpenAI API key in the sidebar to get detailed AI-powered change analysis.*"
    )
    return "\n".join(lines)
