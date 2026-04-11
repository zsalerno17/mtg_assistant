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
RECOMMENDED_BOARD_WIPES = 2
HIGH_AVG_CMC_THRESHOLD = 3.5

# Color-aware staple recommendations for weakness examples.
# "*" = colorless (always legal in any deck).
_COLOR_STAPLES = {
    "ramp": {
        "W": ["Smothering Tithe", "Knight of the White Orchid", "Archaeomancer's Map"],
        "U": [],
        "B": ["Dark Ritual", "Crypt Ghast", "Black Market Connections"],
        "R": ["Dockside Extortionist", "Jeska's Will", "Curse of Opulence"],
        "G": ["Cultivate", "Kodama's Reach", "Nature's Lore", "Llanowar Elves", "Birds of Paradise"],
        "*": ["Sol Ring", "Arcane Signet", "Fellwar Stone", "Mind Stone"],
    },
    "draw": {
        "W": ["Esper Sentinel", "Welcoming Vampire", "Mentor of the Meek"],
        "U": ["Rhystic Study", "Mystic Remora", "Fact or Fiction"],
        "B": ["Phyrexian Arena", "Sign in Blood", "Night's Whisper", "Read the Bones"],
        "R": ["Faithless Looting", "Light Up the Stage"],
        "G": ["Beast Whisperer", "Guardian Project", "Harmonize", "Sylvan Library"],
        "*": ["Skullclamp"],
    },
    "removal": {
        "W": ["Swords to Plowshares", "Path to Exile", "Generous Gift"],
        "U": ["Reality Shift", "Rapid Hybridization", "Pongify"],
        "B": ["Go for the Throat", "Infernal Grasp", "Feed the Swarm"],
        "R": ["Chaos Warp", "Abrade", "Vandalblast"],
        "G": ["Beast Within", "Nature's Claim"],
        "*": [],
    },
    "board_wipes": {
        "W": ["Wrath of God", "Farewell", "Austere Command"],
        "U": ["Cyclonic Rift", "Flood of Tears"],
        "B": ["Damnation", "Toxic Deluge", "Black Sun's Zenith"],
        "R": ["Blasphemous Act", "Chain Reaction"],
        "G": ["Bane of Progress"],
        "*": ["Oblivion Stone", "Nevinyrral's Disk", "All Is Dust"],
    },
}


def _get_color_filtered_examples(category: str, color_identity: List[str]) -> List[str]:
    """Return up to 5 example cards filtered by deck's color identity."""
    staples = _COLOR_STAPLES.get(category, {})
    examples = list(staples.get("*", []))
    for color in color_identity:
        examples.extend(staples.get(color, []))
    seen: set = set()
    unique: List[str] = []
    for card in examples:
        if card not in seen:
            seen.add(card)
            unique.append(card)
    return unique[:5]


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
        "board_wipe_count": count_board_wipes(all_cards),
        "interaction_count": count_interaction(all_cards),
        "themes": themes,
        "theme_names": [t["name"] for t in themes],
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
            if any(p in oracle for p in (
                    "add {", "adds {", "add one mana", "add two mana",
                    "add three mana", "add mana", "produces mana",
                    "treasure token")):
                count += card.quantity
    return count


def count_ramp(cards: List[Card]) -> int:
    """Count mana acceleration: rocks/dorks/treasures (CMC ≤ 3) and land tutors (CMC ≤ 3)."""
    count = 0
    for card in cards:
        if card.is_land:
            continue
        if card.cmc > 3:
            continue
        oracle = card.oracle_text.lower()
        tl = card.type_line.lower()
        # Mana rocks / dorks: "add {X}", "adds {X}", "add one/two/three mana"
        if any(p in oracle for p in (
                "add {", "adds {", "add one mana", "add two mana",
                "add three mana", "add mana")):
            count += card.quantity
        # Treasure producers
        elif "treasure token" in oracle:
            count += card.quantity
        # Land tutors (instants/sorceries that search for lands)
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
        "draw two",
        "draw three",
        "draw x ",
        "draw that many",
        "draw an additional",
    )
    count = 0
    for card in cards:
        if card.is_land:
            continue
        oracle = card.oracle_text.lower()
        if any(p in oracle for p in draw_phrases):
            count += card.quantity
    return count


def count_removal(cards: List[Card]) -> int:
    """Count single-target removal (not bounce — bounce is unreliable in Commander)."""
    count = 0
    for card in cards:
        if card.is_land:
            continue
        oracle = card.oracle_text.lower()
        tl = card.type_line.lower()
        # Direct destroy/exile
        if "destroy target" in oracle or "exile target" in oracle:
            count += card.quantity
        # Damage-based removal
        elif ("deals damage to any target" in oracle
              or "deals damage to target creature" in oracle):
            count += card.quantity
        # Enchantment-based neutralization (Darksteel Mutation, Kenrith's Transformation)
        elif "enchantment" in tl and "loses all" in oracle:
            count += card.quantity
        # Tuck effects (Chaos Warp, Oblation)
        elif ("shuffle" in oracle and "into" in oracle
              and "library" in oracle and "target" in oracle):
            count += card.quantity
    return count


def count_board_wipes(cards: List[Card]) -> int:
    """Count board-clearing effects (wraths, mass exile, mass bounce, mass damage)."""
    wipe_phrases = (
        "destroy all creatures",
        "destroy all nonland",
        "destroy all permanents",
        "destroy all artifact",
        "exile all",
        "all creatures get -",
        "return all creatures",
        "return all nonland",
    )
    count = 0
    for card in cards:
        if card.is_land:
            continue
        oracle = card.oracle_text.lower()
        if any(p in oracle for p in wipe_phrases):
            count += card.quantity
        elif "damage to each creature" in oracle:
            count += card.quantity
        elif "-1/-1 counter" in oracle and "each creature" in oracle:
            count += card.quantity
    return count


def count_interaction(cards: List[Card]) -> int:
    """Count instants/sorceries that interact (removal, counterspells, bounce)."""
    interaction_phrases = (
        "destroy target",
        "exile target",
        "return target",
        "counter target",
        "deals damage to any target",
        "deals damage to target creature",
    )
    count = 0
    for card in cards:
        tl = card.type_line.lower()
        if "instant" not in tl and "sorcery" not in tl:
            continue
        oracle = card.oracle_text.lower()
        if any(p in oracle for p in interaction_phrases):
            count += card.quantity
    return count


# ─── Theme & Weakness Detection ───────────────────────────────────────────────

THEME_DEFINITIONS: Dict[str, str] = {
    "Tokens": "Generates creature tokens to overwhelm through wide board presence.",
    "Graveyard": "Uses the graveyard as a resource — reanimation, recursion, and flashback effects.",
    "Aristocrats": "Sacrifices creatures for value — death triggers, life drain, and card advantage.",
    "Voltron": "Grows one creature enormous through equipment or auras — usually the commander.",
    "Spellslinger": "Gets value from casting instants and sorceries — cantrips, triggers, storm-style payoffs.",
    "Landfall": "Triggers powerful effects whenever a land enters the battlefield.",
    "+1/+1 Counters": "Grows creatures with +1/+1 counters, proliferate, and counter synergies.",
    "Enchantress": "Draws cards and gains value from casting enchantments.",
    "Artifacts Matter": "Synergies around casting and controlling artifacts — affinity, triggers, and recursion.",
}

# Minimum card counts to declare a theme present.
_THEME_THRESHOLDS: Dict[str, int] = {
    "Tokens": 8,
    "Graveyard": 7,
    "Aristocrats": 8,
    "Voltron": 8,
    "Spellslinger": 3,
    "Landfall": 6,
    "+1/+1 Counters": 8,
    "Enchantress": 2,
    "Artifacts Matter": 2,
}


def _card_fits_theme(card: Card, theme: str) -> bool:
    """Return True if a single card contributes to the named theme."""
    if card.is_land:
        return False
    oracle = card.oracle_text.lower()
    tl = card.type_line.lower()

    if theme == "Tokens":
        return ("creature token" in oracle or "populate" in oracle
                or ("twice" in oracle and "token" in oracle))
    elif theme == "Graveyard":
        return any(kw in oracle for kw in (
            "from your graveyard", "from a graveyard", "flashback",
            "unearth", "escape", "embalm", "encore",
        )) or ("mill" in oracle)
    elif theme == "Aristocrats":
        return any(kw in oracle for kw in (
            "sacrifice a creature", "sacrifice another",
            "whenever a creature dies", "whenever a creature you control dies",
            "when this creature dies",
        ))
    elif theme == "Voltron":
        return ("equipment" in tl
                or ("aura" in tl and "enchant creature" in oracle)
                or "equipped creature" in oracle
                or "enchanted creature gets" in oracle)
    elif theme == "Spellslinger":
        return any(kw in oracle for kw in (
            "whenever you cast an instant or sorcery",
            "whenever you cast a noncreature",
            "magecraft",
            "instant and sorcery cards",
        ))
    elif theme == "Landfall":
        return ("landfall" in oracle
                or "whenever a land enters the battlefield under your control" in oracle)
    elif theme == "+1/+1 Counters":
        return any(kw in oracle for kw in (
            "put a +1/+1 counter", "+1/+1 counter on it",
            "proliferate", "modular", "evolve",
        ))
    elif theme == "Enchantress":
        return any(kw in oracle for kw in (
            "whenever you cast an enchantment",
            "whenever an enchantment enters",
        ))
    elif theme == "Artifacts Matter":
        return any(kw in oracle for kw in (
            "whenever you cast an artifact",
            "whenever an artifact enters",
            "affinity for artifacts",
        ))
    return False


def identify_themes(deck: Deck) -> List[Dict]:
    """Identify themes via per-card counting.

    Returns a list of dicts: [{name, count, cards, definition}],
    sorted by card count descending.
    """
    all_cards = deck.all_cards
    non_lands = [c for c in all_cards if not c.is_land]
    non_land_count = sum(c.quantity for c in non_lands)

    detected: List[Dict] = []
    for theme, threshold in _THEME_THRESHOLDS.items():
        matching = [c.name for c in all_cards if _card_fits_theme(c, theme)]
        if len(matching) < threshold:
            continue

        # Ratio checks for payoff-based themes
        if theme == "Spellslinger" and non_land_count > 0:
            inst_sorc = sum(
                c.quantity for c in non_lands
                if "instant" in c.type_line.lower() or "sorcery" in c.type_line.lower()
            )
            if inst_sorc / non_land_count < 0.30:
                continue
        elif theme == "Enchantress" and non_land_count > 0:
            ench_count = sum(
                c.quantity for c in non_lands if "enchantment" in c.type_line.lower()
            )
            if ench_count / non_land_count < 0.25:
                continue
        elif theme == "Artifacts Matter" and non_land_count > 0:
            art_count = sum(
                c.quantity for c in non_lands if "artifact" in c.type_line.lower()
            )
            if art_count / non_land_count < 0.30:
                continue

        detected.append({
            "name": theme,
            "count": len(matching),
            "cards": matching[:10],
            "definition": THEME_DEFINITIONS.get(theme, ""),
        })

    detected.sort(key=lambda t: t["count"], reverse=True)
    return detected


def identify_weaknesses(deck: Deck) -> List[Dict]:
    """Return structured weakness dicts with color-filtered example suggestions."""
    all_cards = deck.all_cards
    card_types = categorize_card_types(all_cards)
    lands = card_types.get("Lands", 0)
    ramp = count_ramp(all_cards)
    draw = count_draw(all_cards)
    removal = count_removal(all_cards)
    board_wipes = count_board_wipes(all_cards)
    avg_cmc = calculate_average_cmc(all_cards)
    ci = deck.color_identity or []

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
            "examples": _get_color_filtered_examples("ramp", ci),
        })

    if ramp < RECOMMENDED_RAMP:
        weaknesses.append({
            "label": f"Low ramp count ({ramp} — recommend {RECOMMENDED_RAMP}+ for Commander)",
            "why": "Ramp lets you play ahead of the curve and cast your threats before opponents can answer them.",
            "look_for": "2-mana rocks, land tutors, and mana dorks that fix colors and accelerate your game plan.",
            "examples": _get_color_filtered_examples("ramp", ci),
        })

    if draw < RECOMMENDED_DRAW:
        weaknesses.append({
            "label": f"Low card draw ({draw} — recommend {RECOMMENDED_DRAW}+ for Commander)",
            "why": "Card advantage is essential in a 100-card singleton format where consistency is low. Running out of cards means losing.",
            "look_for": "Repeatable draw engines, cantrips, and draw-on-attack effects that trigger regularly.",
            "examples": _get_color_filtered_examples("draw", ci),
        })

    if removal < RECOMMENDED_REMOVAL:
        weaknesses.append({
            "label": f"Low removal ({removal} — recommend {RECOMMENDED_REMOVAL}+ for Commander)",
            "why": "With 3 opponents, threats will come from multiple directions. Insufficient answers lets dangerous permanents snowball.",
            "look_for": "Efficient single-target removal, exile-based answers for indestructible threats.",
            "examples": _get_color_filtered_examples("removal", ci),
        })

    if board_wipes < RECOMMENDED_BOARD_WIPES:
        weaknesses.append({
            "label": f"Low board wipes ({board_wipes} — recommend {RECOMMENDED_BOARD_WIPES}+ for Commander)",
            "why": "Board wipes let you recover when opponents get ahead. Without them, a single player building a wide board can dominate.",
            "look_for": "Mass removal that hits all creatures or all nonland permanents. Pair with indestructible threats to break symmetry.",
            "examples": _get_color_filtered_examples("board_wipes", ci),
        })

    if avg_cmc > HIGH_AVG_CMC_THRESHOLD:
        weaknesses.append({
            "label": f"High average CMC ({avg_cmc:.1f} — deck may be slow without extra ramp)",
            "why": "A high mana curve means you'll spend early turns doing little while faster decks develop boards.",
            "look_for": "Cheap interaction, early ramp pieces, and cards with alternative costs or flash to play defensively.",
            "examples": _get_color_filtered_examples("ramp", ci),
        })

    return weaknesses


def generate_deck_verdict(analysis: Dict) -> str:
    """Generate a 2–3 sentence rule-based summary of the deck's strengths and top priorities."""
    commander = analysis.get("commander") or "This deck"
    themes = analysis.get("theme_names", [])
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
    card: Card, weaknesses: List, themes: List[Dict]
) -> Optional[str]:
    """Return a reason string if *card* addresses a weakness or fits a theme."""
    oracle = card.oracle_text.lower()

    # Normalise weaknesses to list of label strings for matching
    weakness_text = " ".join(
        w["label"] if isinstance(w, dict) else w for w in weaknesses
    )

    if "Low ramp" in weakness_text:
        if ("add {" in oracle or "adds {" in oracle or "add mana" in oracle
                or "treasure token" in oracle
                or ("search your library" in oracle and "land" in oracle)):
            return "Adds ramp (deck needs more ramp)"

    if "Low card draw" in weakness_text:
        if any(p in oracle for p in (
            "draw a card", "draw cards", "draw two", "draw three", "draw an additional",
        )):
            return "Adds card draw (deck needs more draw)"

    if "Low removal" in weakness_text:
        if any(p in oracle for p in ("destroy target", "exile target")):
            return "Adds removal (deck needs more removal)"

    if "Low board wipes" in weakness_text:
        if any(p in oracle for p in (
            "destroy all creatures", "destroy all nonland", "exile all",
            "damage to each creature",
        )):
            return "Adds a board wipe (deck needs more wipes)"

    if "Low land count" in weakness_text and card.is_land:
        return "Adds a land (deck needs more lands)"

    # Theme alignment — themes are now dicts with "name" key
    theme_names = [t["name"] if isinstance(t, dict) else t for t in themes]
    for theme_name in theme_names:
        if _card_fits_theme(card, theme_name):
            return f"Fits deck theme: {theme_name}"

    return None


# Minimum oracle text length to consider a card as a non-essential cut candidate.
_MIN_ORACLE_TEXT_FOR_CUT = 40


def _find_cut(deck: Deck, incoming: Card) -> Optional[Card]:
    """Heuristically pick a card from the deck to replace with *incoming*.

    Avoids cutting on-theme cards or cheap utility pieces.
    """
    themes = identify_themes(deck)
    theme_names = [t["name"] if isinstance(t, dict) else t for t in themes]

    def _is_on_theme(c: Card) -> bool:
        return any(_card_fits_theme(c, tn) for tn in theme_names)

    candidates = [
        c for c in deck.mainboard
        if not c.is_land
        and len(c.oracle_text) > _MIN_ORACLE_TEXT_FOR_CUT
        and not _is_on_theme(c)
    ]
    # Fallback: if every non-land is on-theme, allow all non-lands
    if not candidates:
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
