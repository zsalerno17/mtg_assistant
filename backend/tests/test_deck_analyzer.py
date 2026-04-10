"""Tests for src/deck_analyzer.py"""

import pytest

from src.deck_analyzer import (
    analyze_deck,
    build_mana_curve,
    calculate_average_cmc,
    categorize_card_types,
    count_draw,
    count_ramp,
    count_removal,
    find_collection_improvements,
    identify_themes,
    identify_weaknesses,
)
from src.models import Card, Collection, Deck


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def _make_commander_deck(extra_cards=None):
    """Minimal Commander deck with a known commander."""
    commander = Card(
        name="Atraxa, Praetors' Voice",
        type_line="Legendary Creature — Phyrexian Angel Horror",
        color_identity=["W", "U", "B", "G"],
        cmc=4,
    )
    # 37 forests
    mainboard = [Card(name="Forest", type_line="Basic Land — Forest", quantity=37)]
    # 62 simple creatures
    mainboard.append(
        Card(
            name="Llanowar Elves",
            type_line="Creature — Elf Druid",
            oracle_text="Add {G}.",
            cmc=1,
            quantity=62,
        )
    )
    if extra_cards:
        mainboard.extend(extra_cards)
    return Deck(id="test", name="Test Deck", commander=commander, mainboard=mainboard)


# ─── Mana curve ───────────────────────────────────────────────────────────────

def test_build_mana_curve_excludes_lands():
    cards = [
        Card(name="Forest", type_line="Basic Land — Forest", cmc=0),
        Card(name="Sol Ring", type_line="Artifact", cmc=1),
        Card(name="Doom Blade", type_line="Instant", cmc=2),
    ]
    curve = build_mana_curve(cards)
    assert 0 not in curve or curve.get(0, 0) == 0  # lands excluded
    assert curve[1] == 1
    assert curve[2] == 1


def test_build_mana_curve_bins_high_cmc():
    cards = [Card(name="Eldrazi", type_line="Creature", cmc=15, quantity=2)]
    curve = build_mana_curve(cards)
    # CMC 15 should be binned to 8
    assert curve.get(8, 0) == 2


# ─── Average CMC ──────────────────────────────────────────────────────────────

def test_calculate_average_cmc_excludes_lands():
    cards = [
        Card(name="Forest", type_line="Basic Land — Forest", cmc=0, quantity=37),
        Card(name="Grizzly Bears", type_line="Creature", cmc=2, quantity=1),
    ]
    avg = calculate_average_cmc(cards)
    assert avg == 2.0


def test_calculate_average_cmc_empty():
    assert calculate_average_cmc([]) == 0.0


def test_calculate_average_cmc_only_lands():
    cards = [Card(name="Forest", type_line="Basic Land — Forest", cmc=0, quantity=40)]
    assert calculate_average_cmc(cards) == 0.0


# ─── Card type categorisation ─────────────────────────────────────────────────

def test_categorize_card_types():
    cards = [
        Card(name="Forest", type_line="Basic Land — Forest", quantity=37),
        Card(name="Llanowar Elves", type_line="Creature — Elf", quantity=5),
        Card(name="Doom Blade", type_line="Instant", quantity=3),
        Card(name="Sol Ring", type_line="Artifact", quantity=1),
    ]
    types = categorize_card_types(cards)
    assert types["Lands"] == 37
    assert types["Creatures"] == 5
    assert types["Instants"] == 3
    assert types["Artifacts"] == 1


# ─── Ramp / Draw / Removal counts ────────────────────────────────────────────

def test_count_ramp_mana_rock():
    cards = [Card(name="Sol Ring", type_line="Artifact", oracle_text="{T}: Add {C}{C}.")]
    assert count_ramp(cards) == 1


def test_count_ramp_land_tutor():
    cards = [
        Card(
            name="Rampant Growth",
            type_line="Sorcery",
            oracle_text="Search your library for a basic land card and put it onto the battlefield tapped.",
        )
    ]
    assert count_ramp(cards) == 1


def test_count_ramp_excludes_lands():
    cards = [Card(name="Forest", type_line="Basic Land — Forest", oracle_text="")]
    # Lands are not counted as ramp
    assert count_ramp(cards) == 0


def test_count_draw():
    cards = [
        Card(name="Divination", type_line="Sorcery", oracle_text="Draw two cards."),
        Card(name="Grizzly Bears", type_line="Creature", oracle_text=""),
    ]
    assert count_draw(cards) == 1


def test_count_removal():
    cards = [
        Card(name="Doom Blade", type_line="Instant", oracle_text="Destroy target nonblack creature."),
        Card(name="Swords to Plowshares", type_line="Instant", oracle_text="Exile target creature."),
        Card(name="Grizzly Bears", type_line="Creature", oracle_text=""),
    ]
    assert count_removal(cards) == 2


# ─── Theme detection ──────────────────────────────────────────────────────────

def test_identify_themes_tokens():
    deck = _make_commander_deck(
        extra_cards=[
            Card(name="Raise the Alarm", type_line="Instant", oracle_text="Create two 1/1 white Soldier creature tokens."),
            Card(name="Secure the Wastes", type_line="Instant", oracle_text="Create X 1/1 white Warrior creature tokens."),
            Card(name="Anointed Procession", type_line="Enchantment", oracle_text="If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead."),
        ]
    )
    themes = identify_themes(deck)
    assert "Tokens" in themes


# ─── Weakness detection ───────────────────────────────────────────────────────

def test_identify_weaknesses_low_lands():
    mainboard = [Card(name="Forest", type_line="Basic Land", quantity=20)]
    mainboard.extend(
        [Card(name="Grizzly Bears", type_line="Creature", cmc=2, quantity=79)]
    )
    commander = Card(name="Stompy", type_line="Legendary Creature", color_identity=["G"])
    deck = Deck(id="x", name="Test", commander=commander, mainboard=mainboard)
    weaknesses = identify_weaknesses(deck)
    assert any("Low land count" in w for w in weaknesses)


def test_identify_weaknesses_low_ramp():
    mainboard = [Card(name="Forest", type_line="Basic Land", quantity=37)]
    mainboard.extend([Card(name="Grizzly Bears", type_line="Creature", cmc=2, quantity=62)])
    commander = Card(name="Stompy", type_line="Legendary Creature", color_identity=["G"])
    deck = Deck(id="x", name="Test", commander=commander, mainboard=mainboard)
    weaknesses = identify_weaknesses(deck)
    assert any("Low ramp" in w for w in weaknesses)


# ─── Full analysis ────────────────────────────────────────────────────────────

def test_analyze_deck_keys():
    deck = _make_commander_deck()
    analysis = analyze_deck(deck)
    expected_keys = {
        "total_cards",
        "mana_curve",
        "average_cmc",
        "card_types",
        "color_distribution",
        "mana_source_count",
        "ramp_count",
        "draw_count",
        "removal_count",
        "interaction_count",
        "themes",
        "weaknesses",
    }
    assert expected_keys.issubset(analysis.keys())


def test_analyze_deck_total_cards():
    deck = _make_commander_deck()
    analysis = analyze_deck(deck)
    assert analysis["total_cards"] == deck.card_count


# ─── Collection improvements ──────────────────────────────────────────────────

def test_find_collection_improvements_excludes_existing():
    commander = Card(name="Stompy", type_line="Legendary Creature", color_identity=["G"])
    mainboard = [
        Card(name="Forest", type_line="Basic Land", quantity=37),
        Card(name="Llanowar Elves", type_line="Creature — Elf Druid", oracle_text="Add {G}.", cmc=1, quantity=62),
    ]
    deck = Deck(id="x", name="Test", commander=commander, mainboard=mainboard)

    # Collection contains a card already in the deck — should not be suggested
    collection = Collection(cards=[
        Card(name="Llanowar Elves", quantity=4, color_identity=["G"]),
        Card(name="Rampant Growth", quantity=1, color_identity=["G"],
             type_line="Sorcery",
             oracle_text="Search your library for a basic land card and put it onto the battlefield tapped."),
    ])

    suggestions = find_collection_improvements(deck, collection)
    suggested_names = [s[0].name for s in suggestions]
    assert "Llanowar Elves" not in suggested_names


def test_find_collection_improvements_respects_color_identity():
    commander = Card(name="Stompy", type_line="Legendary Creature", color_identity=["G"])
    mainboard = [Card(name="Forest", type_line="Basic Land", quantity=37)]
    deck = Deck(id="x", name="Test", commander=commander, mainboard=mainboard)

    # Blue card should NOT be suggested for a mono-green commander
    collection = Collection(cards=[
        Card(name="Counterspell", quantity=1, color_identity=["U"],
             type_line="Instant", oracle_text="Counter target spell."),
    ])
    suggestions = find_collection_improvements(deck, collection)
    assert len(suggestions) == 0
