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
    weaknesses_raw = identify_weaknesses(deck)
    commanders = []
    if deck.commander:
        commanders.append(deck.commander.name)
    if deck.partner:
        commanders.append(deck.partner.name)

    strategy = classify_strategy(deck)
    power_level = calculate_power_level(deck)

    # Recalculate weaknesses with dynamic thresholds
    weaknesses = identify_weaknesses(deck, strategy=strategy, power_level=power_level)

    partial = {
        "commander": " & ".join(commanders) if commanders else None,
        "colors": list(deck.color_identity),
        "total_cards": deck.card_count,
        "strategy": strategy,
        "power_level": power_level,
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
        "tutor_count": count_tutors(all_cards),
        "counterspell_count": count_counterspells(all_cards),
        "fast_mana_count": count_fast_mana(all_cards),
        "exile_removal_count": count_exile_removal(all_cards),
        "themes": themes,
        "theme_names": [t["name"] for t in themes],
        "weaknesses": weaknesses,
    }
    partial["verdict"] = generate_deck_verdict(partial)
    return partial


def find_collection_improvements(
    deck: Deck, collection: Collection
) -> List[Tuple[Card, Optional[Card], str, float, Optional[str]]]:
    """Find cards in *collection* that could improve *deck*.

    Returns a list of (collection_card, card_to_cut_or_None, reason, score, never_cut_reason) tuples,
    sorted by score (descending), capped at 20 suggestions.
    """
    deck_names = {c.name.lower() for c in deck.all_cards}
    commander_colors = set(deck.color_identity)
    weaknesses = identify_weaknesses(deck)
    themes = identify_themes(deck)

    suggestions: List[Tuple[Card, Optional[Card], str, float, Optional[str]]] = []

    for col_card in collection.cards:
        # Skip if already in deck
        if col_card.name.lower() in deck_names:
            continue

        # Enforce color identity (colorless cards are always fine)
        card_colors = set(col_card.color_identity)
        if card_colors and not card_colors.issubset(commander_colors):
            continue

        result = _evaluate_card(col_card, weaknesses, themes)
        if result:
            reason, score = result
            cut, never_cut_reason = _find_cut(deck, col_card)
            suggestions.append((col_card, cut, reason, score, never_cut_reason))

    # Sort by score descending, then return top 20
    suggestions.sort(key=lambda x: x[3], reverse=True)
    return suggestions[:20]


def scenarios_fallback(deck: Deck, adds: List[str], removes: List[str]) -> Dict:
    """Rule-based stat diff for proposed deck changes. No AI required.

    Returns before/after/delta stats and a template-driven verdict sentence.
    """
    # Build a mutable copy of the mainboard as name->card map (case-insensitive)
    card_map: Dict[str, Card] = {c.name.lower(): c for c in deck.all_cards}

    # Current stats
    all_cards = list(deck.all_cards)
    before_lands = count_mana_sources(all_cards)
    before_ramp = count_ramp(all_cards)
    before_draw = count_draw(all_cards)
    before_avg_cmc = calculate_average_cmc(all_cards)

    # Apply changes: find matching cards from the deck for removals
    modified = list(all_cards)
    removed_cards: List[Card] = []
    for name in removes:
        key = name.strip().lower()
        match = card_map.get(key)
        if match and match in modified:
            modified.remove(match)
            removed_cards.append(match)

    # For adds, construct minimal placeholder cards from oracle text if possible
    # We only know the name, so compute deltas based on whether each added name
    # matches known ramp/draw patterns (we can't without oracle text).
    # Instead, track delta from removals only, then annotate adds as unknowns.
    added_cards: List[Card] = []
    for name in adds:
        # Create a stub card — oracle text unknown at this stage.
        # We'll compute net delta purely from what we know (removed cards).
        added_cards.append(Card(name=name.strip(), quantity=1))

    after_cards = modified + added_cards

    after_lands = count_mana_sources(after_cards)
    after_ramp = count_ramp(after_cards)
    after_draw = count_draw(after_cards)
    after_avg_cmc = calculate_average_cmc(after_cards)

    delta_lands = after_lands - before_lands
    delta_ramp = after_ramp - before_ramp
    delta_draw = after_draw - before_draw
    delta_cmc = round(after_avg_cmc - before_avg_cmc, 2)

    # Template-driven verdict
    parts: List[str] = []
    if delta_ramp > 0:
        parts.append(f"ramp improves by {delta_ramp}")
    elif delta_ramp < 0:
        parts.append(f"ramp decreases by {abs(delta_ramp)}")
    if delta_draw > 0:
        parts.append(f"card draw improves by {delta_draw}")
    elif delta_draw < 0:
        parts.append(f"card draw decreases by {abs(delta_draw)}")
    if delta_lands != 0:
        direction = "up" if delta_lands > 0 else "down"
        parts.append(f"mana sources go {direction} by {abs(delta_lands)}")
    if delta_cmc > 0.05:
        parts.append(f"average CMC rises by {delta_cmc:.2f}")
    elif delta_cmc < -0.05:
        parts.append(f"average CMC drops by {abs(delta_cmc):.2f}")

    if parts:
        verdict = "Net effect: " + ", ".join(parts) + "."
    else:
        verdict = "These changes have minimal measurable impact on ramp, draw, lands, or average CMC."

    return {
        "before": {
            "land_count": before_lands,
            "ramp_count": before_ramp,
            "draw_count": before_draw,
            "avg_cmc": before_avg_cmc,
        },
        "after": {
            "land_count": after_lands,
            "ramp_count": after_ramp,
            "draw_count": after_draw,
            "avg_cmc": after_avg_cmc,
        },
        "delta": {
            "land_count": delta_lands,
            "ramp_count": delta_ramp,
            "draw_count": delta_draw,
            "avg_cmc": delta_cmc,
        },
        "verdict": verdict,
    }


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


def count_tutors(cards: List[Card]) -> int:
    """Count tutor effects (search library for non-land cards)."""
    count = 0
    for card in cards:
        if card.is_land:
            continue
        oracle = card.oracle_text.lower()
        if "search your library" in oracle:
            # Exclude land-only tutors (those are ramp, not combo tutors)
            if "land" in oracle and not any(kw in oracle for kw in ("card", "creature", "instant", "sorcery", "artifact", "enchantment")):
                continue
            count += card.quantity
    return count


def count_counterspells(cards: List[Card]) -> int:
    """Count counterspell effects."""
    count = 0
    for card in cards:
        if card.is_land:
            continue
        oracle = card.oracle_text.lower()
        if "counter target" in oracle and ("spell" in oracle or "ability" in oracle):
            count += card.quantity
    return count


def count_fast_mana(cards: List[Card]) -> int:
    """Count fast mana (CMC <= 1 non-land mana producers + specific premium rocks)."""
    _FAST_MANA_NAMES = {
        "sol ring", "mana crypt", "mana vault", "chrome mox", "mox diamond",
        "jeweled lotus", "lotus petal", "simian spirit guide", "elvish spirit guide",
        "dark ritual", "cabal ritual", "rite of flame", "desperate ritual",
        "pyretic ritual", "seething song",
    }
    count = 0
    for card in cards:
        if card.is_land:
            continue
        if card.name.lower() in _FAST_MANA_NAMES:
            count += card.quantity
        elif card.cmc <= 1:
            oracle = card.oracle_text.lower()
            tl = card.type_line.lower()
            # 0-1 CMC mana dorks
            if "creature" in tl and ("add {" in oracle or "add one mana" in oracle):
                count += card.quantity
    return count


def count_stax_pieces(cards: List[Card]) -> int:
    """Count stax / hatebear effects."""
    _STAX_PHRASES = (
        "opponents can't",
        "each opponent",
        "players can't",
        "nonland permanent an opponent",
        "costs {1} more",
        "costs {2} more",
        "rule of law",
        "can't cast more than",
        "can't search",
    )
    _STAX_NAMES = {
        "thalia, guardian of thraben", "drannith magistrate",
        "eidolon of the great revel", "archon of emeria",
        "collector ouphe", "null rod", "stony silence",
        "rest in peace", "grafdigger's cage", "torpor orb",
        "cursed totem", "winter orb", "static orb",
        "blood moon", "back to basics", "stranglehold",
    }
    count = 0
    for card in cards:
        if card.is_land:
            continue
        if card.name.lower() in _STAX_NAMES:
            count += card.quantity
            continue
        oracle = card.oracle_text.lower()
        if any(p in oracle for p in _STAX_PHRASES):
            count += card.quantity
    return count


def count_token_generators(cards: List[Card]) -> int:
    """Count cards that create creature tokens."""
    count = 0
    for card in cards:
        if card.is_land:
            continue
        oracle = card.oracle_text.lower()
        if "creature token" in oracle or "populate" in oracle:
            count += card.quantity
    return count


def count_exile_removal(cards: List[Card]) -> int:
    """Count exile-based single-target removal."""
    count = 0
    for card in cards:
        if card.is_land:
            continue
        oracle = card.oracle_text.lower()
        if "exile target" in oracle:
            count += card.quantity
    return count


# ─── Strategy Classification ──────────────────────────────────────────────────

STRATEGY_CATEGORIES = ("aggro", "tokens", "combo", "midrange", "control", "stax", "ramp")


def classify_strategy(deck: Deck) -> str:
    """Classify a Commander deck into a primary strategy archetype.

    Uses heuristic signals from card composition. Returned value is one of:
    aggro, tokens, combo, midrange, control, stax, ramp.
    """
    all_cards = deck.all_cards
    non_lands = [c for c in all_cards if not c.is_land]
    avg_cmc = calculate_average_cmc(all_cards)

    tutor_count = count_tutors(all_cards)
    counter_count = count_counterspells(all_cards)
    fast_mana_count = count_fast_mana(all_cards)
    token_count = count_token_generators(all_cards)
    stax_count = count_stax_pieces(all_cards)
    draw_count = count_draw(all_cards)

    # Count creatures vs noncreature spells
    creature_count = sum(c.quantity for c in non_lands if c.is_creature)
    instant_sorcery_count = sum(
        c.quantity for c in non_lands
        if "instant" in c.type_line.lower() or "sorcery" in c.type_line.lower()
    )

    # Score each strategy
    scores: Dict[str, float] = {s: 0.0 for s in STRATEGY_CATEGORIES}

    # Combo signals
    scores["combo"] += tutor_count * 1.5
    scores["combo"] += fast_mana_count * 1.0
    if avg_cmc <= 2.5:
        scores["combo"] += 3.0

    # Control signals
    scores["control"] += counter_count * 2.0
    scores["control"] += draw_count * 0.3
    if instant_sorcery_count > creature_count:
        scores["control"] += 3.0

    # Stax signals
    scores["stax"] += stax_count * 3.0

    # Token signals
    scores["tokens"] += token_count * 1.5
    if token_count >= 8:
        scores["tokens"] += 3.0

    # Aggro signals
    if avg_cmc <= 2.8:
        scores["aggro"] += 3.0
    if creature_count >= 30:
        scores["aggro"] += 3.0
    scores["aggro"] += creature_count * 0.1

    # Ramp signals
    ramp_count = count_ramp(all_cards)
    if avg_cmc >= 3.8:
        scores["ramp"] += 3.0
    scores["ramp"] += ramp_count * 0.5
    if ramp_count >= 14:
        scores["ramp"] += 3.0

    # Midrange is the default fallback — gets minor bonus for balanced builds
    scores["midrange"] += 2.0  # slight baseline
    if 2.8 < avg_cmc < 3.8:
        scores["midrange"] += 2.0
    if 20 <= creature_count <= 30:
        scores["midrange"] += 1.0

    return max(scores, key=scores.get)


# ─── Power Level Detection ────────────────────────────────────────────────────


def calculate_power_level(deck: Deck) -> int:
    """Calculate a 4-10 power level score for a Commander deck.

    Additive from a base of 4, capped at 10.
    """
    all_cards = deck.all_cards
    avg_cmc = calculate_average_cmc(all_cards)

    fast_mana = count_fast_mana(all_cards)
    tutors = count_tutors(all_cards)
    counters = count_counterspells(all_cards)
    draw = count_draw(all_cards)
    interaction = count_interaction(all_cards)

    score = 4.0

    # Fast mana: +0.5 each, max +2
    score += min(fast_mana * 0.5, 2.0)

    # Tutors: +0.4 each, max +2
    score += min(tutors * 0.4, 2.0)

    # Counterspells: +0.3 each, max +1.5
    score += min(counters * 0.3, 1.5)

    # CMC efficiency
    if avg_cmc <= 2.5:
        score += 1.0
    elif avg_cmc >= 4.0:
        score -= 1.0

    # Card draw density
    if draw >= 12:
        score += 0.5

    # Interaction density
    if interaction >= 15:
        score += 0.5

    return max(4, min(10, round(score)))


# ─── Dynamic Thresholds ──────────────────────────────────────────────────────

# (min, max) recommended counts by strategy
_STRATEGY_THRESHOLDS: Dict[str, Dict[str, Tuple[int, int]]] = {
    "aggro":    {"ramp": (6, 8),   "draw": (8, 10),  "removal": (6, 8),   "lands": (33, 35)},
    "tokens":   {"ramp": (8, 10),  "draw": (8, 10),  "removal": (7, 9),   "lands": (34, 36)},
    "combo":    {"ramp": (12, 16), "draw": (14, 18), "removal": (8, 10),  "lands": (30, 33)},
    "midrange": {"ramp": (10, 12), "draw": (10, 12), "removal": (9, 11),  "lands": (36, 38)},
    "control":  {"ramp": (8, 10),  "draw": (14, 18), "removal": (12, 15), "lands": (36, 38)},
    "stax":     {"ramp": (8, 10),  "draw": (10, 12), "removal": (10, 12), "lands": (34, 36)},
    "ramp":     {"ramp": (14, 18), "draw": (10, 12), "removal": (8, 10),  "lands": (38, 42)},
}


def get_thresholds(strategy: str) -> Dict[str, Tuple[int, int]]:
    """Return recommended count ranges for a given strategy."""
    return _STRATEGY_THRESHOLDS.get(strategy, _STRATEGY_THRESHOLDS["midrange"])


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
    "Graveyard": 6,
    "Aristocrats": 8,
    "Voltron": 8,
    "Spellslinger": 3,
    "Landfall": 6,
    "+1/+1 Counters": 8,
    "Enchantress": 2,
    "Artifacts Matter": 2,
}

# Minimum percentage of non-land cards that must match a theme (density gate)
_THEME_DENSITY_MIN = 0.08


def _card_fits_theme(card: Card, theme: str) -> bool:
    """Return True if a single card contributes to the named theme."""
    if card.is_land:
        return False
    oracle = card.oracle_text.lower()
    tl = card.type_line.lower()

    if theme == "Tokens":
        # Only count creature token production, not incidental Clue/Food/Treasure tokens
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

        # Density gate: theme cards must be >= 8% of non-land cards
        if non_land_count > 0 and len(matching) / non_land_count < _THEME_DENSITY_MIN:
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


def identify_weaknesses(deck: Deck, strategy: Optional[str] = None, power_level: Optional[int] = None) -> List[Dict]:
    """Return structured weakness dicts with color-filtered example suggestions.

    If strategy is provided, uses dynamic thresholds. Otherwise falls back to
    static defaults for backwards compatibility.
    """
    all_cards = deck.all_cards
    card_types = categorize_card_types(all_cards)
    lands = card_types.get("Lands", 0)
    ramp = count_ramp(all_cards)
    draw = count_draw(all_cards)
    removal = count_removal(all_cards)
    board_wipes = count_board_wipes(all_cards)
    avg_cmc = calculate_average_cmc(all_cards)
    exile_removal = count_exile_removal(all_cards)
    ci = deck.color_identity or []

    # Dynamic thresholds based on strategy, or static defaults
    if strategy:
        thresholds = get_thresholds(strategy)
        rec_ramp = thresholds["ramp"][0]
        rec_draw = thresholds["draw"][0]
        rec_removal = thresholds["removal"][0]
        rec_lands = thresholds["lands"]
    else:
        rec_ramp = RECOMMENDED_RAMP
        rec_draw = RECOMMENDED_DRAW
        rec_removal = RECOMMENDED_REMOVAL
        rec_lands = RECOMMENDED_LANDS

    weaknesses = []

    if lands < rec_lands[0]:
        weaknesses.append({
            "label": f"Low land count ({lands} — recommend {rec_lands[0]}–{rec_lands[1]})",
            "why": "Consistent mana is the foundation of Commander. Too few lands leads to mana screw and missed turns.",
            "look_for": "Basic lands, utility lands, and dual lands that fit your color identity.",
            "examples": ["Command Tower", "Exotic Orchard", "Terramorphic Expanse", "Evolving Wilds"],
        })
    elif lands > rec_lands[1] + 4:
        weaknesses.append({
            "label": f"High land count ({lands} — you may have too many)",
            "why": "Too many lands means fewer spells. Consider replacing some basics with ramp spells.",
            "look_for": "Ramp spells that also thin your deck, reducing flood risk.",
            "examples": _get_color_filtered_examples("ramp", ci),
        })

    if ramp < rec_ramp:
        weaknesses.append({
            "label": f"Low ramp count ({ramp} — recommend {rec_ramp}+ for {strategy or 'Commander'})",
            "why": "Ramp lets you play ahead of the curve and cast your threats before opponents can answer them.",
            "look_for": "2-mana rocks, land tutors, and mana dorks that fix colors and accelerate your game plan.",
            "examples": _get_color_filtered_examples("ramp", ci),
        })

    if draw < rec_draw:
        weaknesses.append({
            "label": f"Low card draw ({draw} — recommend {rec_draw}+ for {strategy or 'Commander'})",
            "why": "Card advantage is essential in a 100-card singleton format where consistency is low. Running out of cards means losing.",
            "look_for": "Repeatable draw engines, cantrips, and draw-on-attack effects that trigger regularly.",
            "examples": _get_color_filtered_examples("draw", ci),
        })

    if removal < rec_removal:
        weaknesses.append({
            "label": f"Low removal ({removal} — recommend {rec_removal}+ for {strategy or 'Commander'})",
            "why": "With 3 opponents, threats will come from multiple directions. Insufficient answers lets dangerous permanents snowball.",
            "look_for": "Efficient single-target removal, exile-based answers for indestructible threats.",
            "examples": _get_color_filtered_examples("removal", ci),
        })

    # Exile removal quality check (Phase 34D)
    if exile_removal < 3 and removal >= rec_removal:
        weaknesses.append({
            "label": f"Low exile-based removal ({exile_removal} exile effects — mostly destroy)",
            "why": "Destroy-based removal doesn't handle indestructible, undying, or death-trigger threats. Exile answers these cleanly.",
            "look_for": "Exile-based spot removal like Swords to Plowshares, Path to Exile, Generous Gift, Chaos Warp.",
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
    strategy = analysis.get("strategy")
    power_level = analysis.get("power_level")

    # Strategy + theme sentence
    if strategy:
        strategy_label = strategy.capitalize()
        if len(themes) >= 2:
            theme_sentence = f"{commander} is a {strategy_label} deck leaning into {themes[0]} and {themes[1]} strategies."
        elif len(themes) == 1:
            theme_sentence = f"{commander} is a {strategy_label} deck with a {themes[0]} theme."
        else:
            theme_sentence = f"{commander} is a {strategy_label} deck."
    else:
        if len(themes) >= 2:
            theme_sentence = f"{commander} leans into {themes[0]} and {themes[1]} strategies."
        elif len(themes) == 1:
            theme_sentence = f"{commander} leans into {themes[0]} strategies."
        else:
            theme_sentence = f"{commander} is a versatile commander without a dominant detected theme."

    # Power level note
    power_note = ""
    if power_level is not None:
        power_note = f" Power level: {power_level}/10."

    # Weakness sentence
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

    return f"{theme_sentence}{power_note} {weakness_sentence}{cmc_note}"


# ─── Private helpers ──────────────────────────────────────────────────────────


def _evaluate_card(
    card: Card, weaknesses: List, themes: List[Dict]
) -> Optional[Tuple[str, float]]:
    """Return (reason, score) if *card* addresses a weakness or fits a theme.
    
    Score is 0.0-1.0 based on:
    - CMC efficiency (lower is better for ramp/draw)
    - Unconditional vs conditional (color restrictions reduce score)
    - Repeatable vs one-shot (permanents score higher than instants/sorceries)
    """
    oracle = card.oracle_text.lower()
    type_line = card.type_line.lower()

    # Normalise weaknesses to list of label strings for matching
    weakness_text = " ".join(
        w["label"] if isinstance(w, dict) else w for w in weaknesses
    )

    reason = None
    base_score = 0.5  # Default score

    if "Low ramp" in weakness_text:
        if ("add {" in oracle or "adds {" in oracle or "add mana" in oracle
                or "treasure token" in oracle
                or ("search your library" in oracle and "land" in oracle)):
            reason = "Adds ramp (deck needs more ramp)"
            # CMC efficiency: prefer CMC <= 2 for ramp
            base_score = 0.9 if card.cmc <= 2 else (0.7 if card.cmc <= 3 else 0.5)
            # Repeatable (enchantment/artifact) vs one-shot (instant/sorcery)
            if "enchantment" in type_line or "artifact" in type_line:
                base_score += 0.1
            # Treasure tokens are excellent repeatable value
            if "treasure token" in oracle:
                base_score = min(1.0, base_score + 0.1)

    if "Low card draw" in weakness_text:
        if any(p in oracle for p in (
            "draw a card", "draw cards", "draw two", "draw three", "draw an additional",
        )):
            reason = "Adds card draw (deck needs more draw)"
            # CMC efficiency: prefer CMC <= 3 for draw
            base_score = 0.9 if card.cmc <= 3 else (0.7 if card.cmc <= 4 else 0.5)
            # Repeatable draw engines score much higher
            if "enchantment" in type_line or "artifact" in type_line:
                base_score = min(1.0, base_score + 0.2)
            # "Draw additional" implies ongoing value
            if "draw an additional" in oracle or "whenever" in oracle:
                base_score = min(1.0, base_score + 0.1)

    if "Low removal" in weakness_text:
        if any(p in oracle for p in ("destroy target", "exile target")):
            reason = "Adds removal (deck needs more removal)"
            base_score = 0.7
            # Unconditional removal (no color/type restrictions) scores higher
            if not any(restrict in oracle for restrict in ("nonblack", "nonwhite", "nonblue", "nonred", "nongreen", "nonartifact")):
                base_score += 0.2
            # Exile is better than destroy
            if "exile target" in oracle:
                base_score = min(1.0, base_score + 0.1)

    if "Low board wipes" in weakness_text:
        if any(p in oracle for p in (
            "destroy all creatures", "destroy all nonland", "exile all",
            "damage to each creature",
        )):
            reason = "Adds a board wipe (deck needs more wipes)"
            base_score = 0.8
            # Unconditional wipes score higher
            if "destroy all creatures" in oracle or "exile all creatures" in oracle:
                base_score = 0.9
            # One-sided wipes are premium
            if "you control" in oracle or "you don't control" in oracle:
                base_score = 1.0

    if "Low land count" in weakness_text and card.is_land:
        reason = "Adds a land (deck needs more lands)"
        base_score = 0.6
        # Utility lands score higher than basics
        if oracle.strip():  # Has oracle text = not a basic land
            base_score = 0.8

    # Theme alignment — themes are now dicts with "name" key
    theme_names = [t["name"] if isinstance(t, dict) else t for t in themes]
    for theme_name in theme_names:
        if _card_fits_theme(card, theme_name):
            reason = f"Fits deck theme: {theme_name}"
            # Theme cards score high if low CMC, decent otherwise
            base_score = 0.9 if card.cmc <= 4 else 0.7
            break

    if reason:
        return (reason, min(1.0, max(0.0, base_score)))  # Clamp to [0.0, 1.0]
    return None


# Minimum oracle text length to consider a card as a non-essential cut candidate.
_MIN_ORACLE_TEXT_FOR_CUT = 40


def _find_cut(deck: Deck, incoming: Card) -> Tuple[Optional[Card], Optional[str]]:
    """Heuristically pick a card from the deck to replace with *incoming*.

    Returns (cut_card, never_cut_reason).
    - If a suitable cut is found: (Card, None)
    - If no cut found: (None, reason_string)

    Avoids cutting:
    - Commanders
    - On-theme cards
    - Cheap utility pieces
    """
    themes = identify_themes(deck)
    theme_names = [t["name"] if isinstance(t, dict) else t for t in themes]
    
    # Get commander names (case-insensitive)
    commander_names = set()
    if deck.commander:
        commander_names.add(deck.commander.name.lower())
    if deck.partner:
        commander_names.add(deck.partner.name.lower())

    def _is_on_theme(c: Card) -> bool:
        return any(_card_fits_theme(c, tn) for tn in theme_names)
    
    def _is_commander(c: Card) -> bool:
        return c.name.lower() in commander_names

    candidates = [
        c for c in deck.mainboard
        if not c.is_land
        and len(c.oracle_text) > _MIN_ORACLE_TEXT_FOR_CUT
        and not _is_on_theme(c)
        and not _is_commander(c)
    ]
    
    # If no suitable candidates, explain why
    if not candidates:
        # Check if all non-lands are commanders or on-theme
        non_lands = [c for c in deck.mainboard if not c.is_land]
        if all(_is_commander(c) or _is_on_theme(c) for c in non_lands):
            return (None, "All non-lands are commanders or on-theme")
        return (None, "No suitable cuts found")

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
    # Sort by CMC descending — prefer cutting high-cost dead weight
    pool.sort(key=lambda c: c.cmc, reverse=True)
    return (pool[0], None)
