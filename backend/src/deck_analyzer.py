"""Deck analysis engine for Commander decks."""

from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from .models import Card, Collection, Deck

# ─── Constants ────────────────────────────────────────────────────────────────

COLOR_NAMES = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}

# Recommended minimums for Commander (100-card singleton)
RECOMMENDED_LANDS = (36, 38)
RECOMMENDED_RAMP = 10
RECOMMENDED_DRAW = 10
RECOMMENDED_REMOVAL = 8
HIGH_AVG_CMC_THRESHOLD = 3.5


# ─── Public API ───────────────────────────────────────────────────────────────


def analyze_deck(deck: Deck) -> Dict:
    """Analyse a Commander deck and return a comprehensive metrics dict."""
    all_cards = deck.all_cards
    themes = identify_themes(deck)
    weaknesses = identify_weaknesses(deck)
    partial = {
        "commander": deck.commander.name if deck.commander else None,
        "total_cards": deck.card_count,
        "mana_curve": build_mana_curve(all_cards),
        "average_cmc": calculate_average_cmc(all_cards),
        "card_types": categorize_card_types(all_cards),
        "color_distribution": get_color_distribution(all_cards),
        "mana_source_count": count_mana_sources(all_cards),
        "ramp_count": count_ramp(all_cards),
        "draw_count": count_draw(all_cards),
        "removal_count": count_removal(all_cards),
        "interaction_count": count_interaction(all_cards),
        "themes": themes,
        "weaknesses": weaknesses,
    }
    partial["verdict"] = generate_deck_verdict(partial)
    return partial


def find_collection_improvements(
    deck: Deck, collection: Collection
) -> List[Tuple[Card, Optional[Card], str]]:
    """Find cards in *collection* that could improve *deck*.

    Returns a list of (collection_card, card_to_cut_or_None, reason) triples,
    sorted by relevance, capped at 20 suggestions.
    """
    deck_names = {c.name.lower() for c in deck.all_cards}
    commander_colors = set(deck.color_identity)
    weaknesses = identify_weaknesses(deck)
    themes = identify_themes(deck)

    suggestions: List[Tuple[Card, Optional[Card], str]] = []

    for col_card in collection.cards:
        # Skip if already in deck
        if col_card.name.lower() in deck_names:
            continue

        # Enforce color identity (colorless cards are always fine)
        card_colors = set(col_card.color_identity)
        if card_colors and not card_colors.issubset(commander_colors):
            continue

        reason = _evaluate_card(col_card, weaknesses, themes)
        if reason:
            cut = _find_cut(deck, col_card)
            suggestions.append((col_card, cut, reason))

    return suggestions[:20]


# ─── Mana Curve & CMC ─────────────────────────────────────────────────────────


def build_mana_curve(cards: List[Card]) -> Dict[int, int]:
    """Build {cmc: count} dict for non-land cards."""
    curve: Dict[int, int] = defaultdict(int)
    for card in cards:
        if not card.is_land:
            cmc = min(int(card.cmc), 8)  # bin 8+ together
            curve[cmc] += card.quantity
    return dict(sorted(curve.items()))


def calculate_average_cmc(cards: List[Card]) -> float:
    """Average CMC of non-land cards, weighted by quantity."""
    non_lands = [c for c in cards if not c.is_land]
    total = sum(c.cmc * c.quantity for c in non_lands)
    count = sum(c.quantity for c in non_lands)
    return round(total / count, 2) if count else 0.0


# ─── Card Type Breakdown ──────────────────────────────────────────────────────


def categorize_card_types(cards: List[Card]) -> Dict[str, int]:
    """Count cards grouped by broad type."""
    types: Dict[str, int] = defaultdict(int)
    for card in cards:
        tl = card.type_line.lower()
        if "land" in tl:
            types["Lands"] += card.quantity
        elif "creature" in tl:
            types["Creatures"] += card.quantity
        elif "instant" in tl:
            types["Instants"] += card.quantity
        elif "sorcery" in tl:
            types["Sorceries"] += card.quantity
        elif "enchantment" in tl:
            types["Enchantments"] += card.quantity
        elif "artifact" in tl:
            types["Artifacts"] += card.quantity
        elif "planeswalker" in tl:
            types["Planeswalkers"] += card.quantity
        elif tl:
            types["Other"] += card.quantity
    return dict(types)


def get_color_distribution(cards: List[Card]) -> Dict[str, int]:
    """Count pip appearances per color across non-land cards."""
    dist: Dict[str, int] = defaultdict(int)
    for card in cards:
        if card.is_land:
            continue
        for color in card.color_identity:
            label = COLOR_NAMES.get(color, color)
            dist[label] += card.quantity
    return dict(dist)


# ─── Resource Counts ──────────────────────────────────────────────────────────


def count_mana_sources(cards: List[Card]) -> int:
    """Count lands plus mana-producing non-land cards."""
    count = 0
    for card in cards:
        if card.is_land:
            count += card.quantity
        else:
            oracle = card.oracle_text.lower()
            if "add {" in oracle or "adds {" in oracle or "produces mana" in oracle:
                count += card.quantity
    return count


def count_ramp(cards: List[Card]) -> int:
    """Count cards that accelerate mana (rocks, dorks, land search)."""
    count = 0
    for card in cards:
        if card.is_land:
            continue
        oracle = card.oracle_text.lower()
        tl = card.type_line.lower()
        # Mana rocks / enchantments / creatures that add mana
        if "add {" in oracle or "adds {" in oracle:
            count += card.quantity
        # Land tutors
        elif ("sorcery" in tl or "instant" in tl) and (
            "search your library" in oracle and "land" in oracle
        ):
            count += card.quantity
    return count


def count_draw(cards: List[Card]) -> int:
    """Count card draw / card advantage effects."""
    draw_phrases = (
        "draw a card",
        "draw cards",
        "draw two cards",
        "draw three cards",
        "draw x cards",
        "draw that many",
    )
    count = 0
    for card in cards:
        oracle = card.oracle_text.lower()
        if any(p in oracle for p in draw_phrases):
            count += card.quantity
    return count


def count_removal(cards: List[Card]) -> int:
    """Count single-target removal spells."""
    removal_phrases = (
        "destroy target",
        "exile target",
        "return target",
        "deals damage to target creature",
        "deals damage to any target",
    )
    count = 0
    for card in cards:
        oracle = card.oracle_text.lower()
        if any(p in oracle for p in removal_phrases):
            count += card.quantity
    return count


def count_interaction(cards: List[Card]) -> int:
    """Count instants/sorceries that interact (removal + counterspells)."""
    interaction_phrases = (
        "destroy target",
        "exile target",
        "counter target spell",
        "counter spell",
        "deals damage to any target",
    )
    count = 0
    for card in cards:
        if "instant" not in card.type_line.lower() and "sorcery" not in card.type_line.lower():
            continue
        oracle = card.oracle_text.lower()
        if any(p in oracle for p in interaction_phrases):
            count += card.quantity
    return count


# ─── Theme & Weakness Detection ───────────────────────────────────────────────

_THEME_KEYWORDS: Dict[str, List[str]] = {
    "Tokens": ["create", "token", "populate"],
    "Graveyard": ["graveyard", "return from", "flashback", "unearth", "mill"],
    "Aristocrats": ["sacrifice", "dies", "when a creature dies"],
    "Aggro": ["haste", "first strike", "double strike", "trample"],
    "Control": ["counter target", "destroy all", "exile all", "return to hand"],
    "Voltron": ["equipment", "aura", "enchant creature", "attach"],
    "Spellslinger": ["whenever you cast", "instant or sorcery"],
    "Landfall": ["landfall", "whenever a land enters"],
    "Tribal": ["each other", "of the chosen type", "gains all abilities"],
    "Combo": ["win the game", "infinite", "untap all"],
}

THEME_DEFINITIONS: Dict[str, str] = {
    "Tokens": "Generates creature tokens to overwhelm through wide board presence.",
    "Graveyard": "Uses the graveyard as a resource — reanimation, recursion, and flashback effects.",
    "Aristocrats": "Sacrifices creatures for value — death triggers, life drain, and card advantage.",
    "Aggro": "Fast creatures with evasion and combat bonuses; aims to win through early pressure.",
    "Control": "Answers threats with counterspells, wraths, and removal to dominate the late game.",
    "Voltron": "Grows one creature enormous through equipment or auras — usually the commander.",
    "Spellslinger": "Gets value from casting instants and sorceries — cantrips, triggers, storm-style payoffs.",
    "Landfall": "Triggers powerful effects whenever a land enters the battlefield.",
    "Tribal": "Synergies between creatures of the same type — lords, shared abilities, tribal payoffs.",
    "Combo": "Assembles specific card combinations to generate infinite loops or win the game immediately.",
}


def identify_themes(deck: Deck) -> List[str]:
    """Identify dominant strategies/themes in the deck."""
    all_text = " ".join(
        c.oracle_text.lower() + " " + c.type_line.lower() for c in deck.all_cards
    )
    themes = []
    for theme, keywords in _THEME_KEYWORDS.items():
        if sum(1 for kw in keywords if kw in all_text) >= 2:
            themes.append(theme)
    return themes


def identify_weaknesses(deck: Deck) -> List[Dict]:
    """Return a list of structured weakness dicts with label, why, look_for, examples."""
    all_cards = deck.all_cards
    card_types = categorize_card_types(all_cards)
    lands = card_types.get("Lands", 0)
    ramp = count_ramp(all_cards)
    draw = count_draw(all_cards)
    removal = count_removal(all_cards)
    avg_cmc = calculate_average_cmc(all_cards)

    weaknesses = []

    if lands < RECOMMENDED_LANDS[0]:
        weaknesses.append({
            "label": f"Low land count ({lands} — recommend {RECOMMENDED_LANDS[0]}–{RECOMMENDED_LANDS[1]})",
            "why": "Consistent mana is the foundation of Commander. Too few lands leads to mana screw and missed turns.",
            "look_for": "Basic lands, utility lands, and dual lands that fit your color identity.",
            "examples": ["Command Tower", "Exotic Orchard", "Terramorphic Expanse", "Evolving Wilds"],
        })
    elif lands > 42:
        weaknesses.append({
            "label": f"High land count ({lands} — you may have too many)",
            "why": "Too many lands means fewer spells. Consider replacing some basics with ramp spells.",
            "look_for": "Ramp spells that also thin your deck, reducing flood risk.",
            "examples": ["Cultivate", "Kodama's Reach", "Skyshroud Claim", "Nature's Lore"],
        })

    if ramp < RECOMMENDED_RAMP:
        weaknesses.append({
            "label": f"Low ramp count ({ramp} — recommend {RECOMMENDED_RAMP}+ for Commander)",
            "why": "Ramp lets you play ahead of the curve and cast your threats before opponents can answer them.",
            "look_for": "2-mana rocks, land tutors, and mana dorks that fix colors and accelerate your game plan.",
            "examples": ["Sol Ring", "Arcane Signet", "Cultivate", "Kodama's Reach", "Rampant Growth"],
        })

    if draw < RECOMMENDED_DRAW:
        weaknesses.append({
            "label": f"Low card draw ({draw} — recommend {RECOMMENDED_DRAW}+ for Commander)",
            "why": "Card advantage is essential in a 100-card singleton format where consistency is low. Running out of cards means losing.",
            "look_for": "Repeatable draw engines, cantrips, and draw-on-attack effects that trigger regularly.",
            "examples": ["Rhystic Study", "Phyrexian Arena", "Harmonize", "Sign in Blood", "Night's Whisper"],
        })

    if removal < RECOMMENDED_REMOVAL:
        weaknesses.append({
            "label": f"Low removal ({removal} — recommend {RECOMMENDED_REMOVAL}+ for Commander)",
            "why": "With 3 opponents, threats will come from multiple directions. Insufficient answers lets dangerous permanents snowball.",
            "look_for": "Efficient single-target removal, board wipes (1–2 minimum), and exile-based answers for indestructible threats.",
            "examples": ["Swords to Plowshares", "Path to Exile", "Generous Gift", "Beast Within", "Chaos Warp"],
        })

    if avg_cmc > HIGH_AVG_CMC_THRESHOLD:
        weaknesses.append({
            "label": f"High average CMC ({avg_cmc:.1f} — deck may be slow without extra ramp)",
            "why": "A high mana curve means you'll spend early turns doing little while faster decks develop boards.",
            "look_for": "Cheap interaction, early ramp pieces, and cards with alternative costs or flash to play defensively.",
            "examples": ["Sol Ring", "Arcane Signet", "Lightning Greaves", "Swiftfoot Boots"],
        })

    return weaknesses


def generate_deck_verdict(analysis: Dict) -> str:
    """Generate a 2–3 sentence rule-based summary of the deck's strengths and top priorities."""
    commander = analysis.get("commander") or "This deck"
    themes = analysis.get("themes", [])
    weaknesses = analysis.get("weaknesses", [])
    avg_cmc = analysis.get("average_cmc", 0)

    # Theme sentence
    if len(themes) >= 2:
        theme_str = f"{themes[0]} and {themes[1]}"
    elif len(themes) == 1:
        theme_str = themes[0]
    else:
        theme_str = None

    if theme_str:
        theme_sentence = f"{commander} leans into {theme_str} strategies."
    else:
        theme_sentence = f"{commander} is a versatile commander without a dominant detected theme."

    # Weakness sentence — get labels (handle both string and dict formats)
    weakness_labels = [
        w["label"] if isinstance(w, dict) else w for w in weaknesses[:2]
    ]
    if weakness_labels:
        weakness_sentence = f"Top priorities to address: {' and '.join(weakness_labels)}."
    else:
        weakness_sentence = "The deck has a solid foundation across all key metrics."

    # Optional CMC note
    cmc_note = ""
    if avg_cmc > HIGH_AVG_CMC_THRESHOLD:
        cmc_note = f" At {avg_cmc:.1f} average CMC, prioritize early ramp to hit threats on curve."

    return f"{theme_sentence} {weakness_sentence}{cmc_note}"


# ─── Private helpers ──────────────────────────────────────────────────────────


def _evaluate_card(
    card: Card, weaknesses: List, themes: List[str]
) -> Optional[str]:
    """Return a reason string if *card* addresses a weakness or fits a theme."""
    oracle = card.oracle_text.lower()
    tl = card.type_line.lower()

    # Normalise weaknesses to list of label strings for matching
    weakness_text = " ".join(
        w["label"] if isinstance(w, dict) else w for w in weaknesses
    )

    if "Low ramp" in weakness_text:
        if "add {" in oracle or "adds {" in oracle or (
            "search your library" in oracle and "land" in oracle
        ):
            return "Adds ramp (deck needs more ramp)"

    if "Low card draw" in weakness_text:
        if any(p in oracle for p in ("draw a card", "draw cards", "draw two", "draw three")):
            return "Adds card draw (deck needs more draw)"

    if "Low removal" in weakness_text:
        if any(p in oracle for p in ("destroy target", "exile target")):
            return "Adds removal (deck needs more removal)"

    if "Low land count" in weakness_text and card.is_land:
        return "Adds a land (deck needs more lands)"

    # Theme alignment
    for theme in themes:
        kws = _THEME_KEYWORDS.get(theme, [])
        if any(kw in oracle or kw in tl for kw in kws):
            return f"Fits deck theme: {theme}"

    return None


# Minimum oracle text length to consider a card as a non-essential cut candidate.
# Very short oracle texts (e.g. "{T}: Add {G}.") are typically simple utility
# cards that are core to most decks and should not be suggested as cuts.
_MIN_ORACLE_TEXT_FOR_CUT = 40


def _find_cut(deck: Deck, incoming: Card) -> Optional[Card]:
    """Heuristically pick a card from the deck to replace with *incoming*."""
    candidates = [
        c for c in deck.mainboard
        if not c.is_land and len(c.oracle_text) > _MIN_ORACLE_TEXT_FOR_CUT
    ]
    if not candidates:
        return None

    # Prefer replacing expensive cards of the same broad type
    incoming_type = incoming.type_line.lower()
    same_type = [
        c for c in candidates
        if any(
            t in c.type_line.lower()
            for t in ("creature", "instant", "sorcery", "enchantment", "artifact")
            if t in incoming_type
        )
    ]
    pool = same_type if same_type else candidates
    pool.sort(key=lambda c: c.cmc, reverse=True)
    return pool[0]
