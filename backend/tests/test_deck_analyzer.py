"""Tests for src/deck_analyzer.py"""

import pytest

from src.deck_analyzer import (
    analyze_deck,
    build_mana_curve,
    calculate_average_cmc,
    categorize_card_types,
    count_board_wipes,
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
    cards = [Card(name="Sol Ring", type_line="Artifact", oracle_text="{T}: Add {C}{C}.", cmc=1)]
    assert count_ramp(cards) == 1


def test_count_ramp_land_tutor():
    cards = [
        Card(
            name="Rampant Growth",
            type_line="Sorcery",
            oracle_text="Search your library for a basic land card and put it onto the battlefield tapped.",
            cmc=2,
        )
    ]
    assert count_ramp(cards) == 1


def test_count_ramp_excludes_lands():
    cards = [Card(name="Forest", type_line="Basic Land — Forest", oracle_text="")]
    assert count_ramp(cards) == 0


def test_count_ramp_arcane_signet():
    """Arcane Signet uses 'add one mana' — must be detected."""
    cards = [Card(name="Arcane Signet", type_line="Artifact", oracle_text="{T}: Add one mana of any color in your commander's color identity.", cmc=2)]
    assert count_ramp(cards) == 1


def test_count_ramp_birds_of_paradise():
    cards = [Card(name="Birds of Paradise", type_line="Creature — Bird", oracle_text="{T}: Add one mana of any color.", cmc=1)]
    assert count_ramp(cards) == 1


def test_count_ramp_treasure_producer():
    cards = [Card(name="Dockside Extortionist", type_line="Creature — Goblin Pirate", oracle_text="When Dockside Extortionist enters the battlefield, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control.", cmc=2)]
    assert count_ramp(cards) == 1


def test_count_ramp_cmc_filter():
    """Cards costing 4+ should NOT count as ramp."""
    cards = [Card(name="Gilded Lotus", type_line="Artifact", oracle_text="{T}: Add three mana of any one color.", cmc=5)]
    assert count_ramp(cards) == 0


def test_count_draw():
    cards = [
        Card(name="Divination", type_line="Sorcery", oracle_text="Draw two cards."),
        Card(name="Grizzly Bears", type_line="Creature", oracle_text=""),
    ]
    assert count_draw(cards) == 1


def test_count_draw_additional():
    """'Draw an additional' pattern for Sylvan Library etc."""
    cards = [Card(name="Sylvan Library", type_line="Enchantment", oracle_text="At the beginning of your draw step, you may draw two additional cards.")]
    assert count_draw(cards) == 1


def test_count_removal():
    cards = [
        Card(name="Doom Blade", type_line="Instant", oracle_text="Destroy target nonblack creature."),
        Card(name="Swords to Plowshares", type_line="Instant", oracle_text="Exile target creature."),
        Card(name="Grizzly Bears", type_line="Creature", oracle_text=""),
    ]
    assert count_removal(cards) == 2


def test_count_removal_excludes_bounce():
    """Bounce (return target) should NOT be counted as removal in Commander."""
    cards = [Card(name="Unsummon", type_line="Instant", oracle_text="Return target creature to its owner's hand.")]
    assert count_removal(cards) == 0


def test_count_removal_enchantment_based():
    """Enchantment-based neutralization like Darksteel Mutation."""
    cards = [Card(name="Darksteel Mutation", type_line="Enchantment — Aura", oracle_text="Enchant creature\nEnchanted creature loses all abilities and is an Insect artifact creature with base power and toughness 0/1.")]
    assert count_removal(cards) == 1


def test_count_removal_tuck():
    """Tuck effects like Chaos Warp."""
    cards = [Card(name="Chaos Warp", type_line="Instant", oracle_text="The owner of target permanent shuffles it into their library, then reveals the top card of their library.")]
    assert count_removal(cards) == 1


def test_count_board_wipes():
    cards = [
        Card(name="Wrath of God", type_line="Sorcery", oracle_text="Destroy all creatures. They can't be regenerated."),
        Card(name="Blasphemous Act", type_line="Sorcery", oracle_text="Blasphemous Act costs {1} less to cast for each creature on the battlefield.\nBlasphemous Act deals 13 damage to each creature."),
        Card(name="Grizzly Bears", type_line="Creature", oracle_text=""),
    ]
    assert count_board_wipes(cards) == 2


# ─── Theme detection ──────────────────────────────────────────────────────────

def test_identify_themes_tokens():
    deck = _make_commander_deck(
        extra_cards=[
            Card(name="Raise the Alarm", type_line="Instant", oracle_text="Create two 1/1 white Soldier creature tokens."),
            Card(name="Secure the Wastes", type_line="Instant", oracle_text="Create X 1/1 white Warrior creature tokens."),
            Card(name="Anointed Procession", type_line="Enchantment", oracle_text="If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead."),
            Card(name="Hordeling Outburst", type_line="Sorcery", oracle_text="Create three 1/1 red Goblin creature tokens."),
            Card(name="Krenko, Mob Boss", type_line="Legendary Creature", oracle_text="Tap: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control."),
            Card(name="Avenger of Zendikar", type_line="Creature — Elemental", oracle_text="When Avenger of Zendikar enters the battlefield, create a 0/1 green Plant creature token for each land you control."),
            Card(name="Decree of Justice", type_line="Sorcery", oracle_text="Create X 4/4 white Angel creature tokens with flying."),
            Card(name="Martial Coup", type_line="Sorcery", oracle_text="Create X 1/1 white Soldier creature tokens."),
        ]
    )
    themes = identify_themes(deck)
    theme_names = [t["name"] for t in themes]
    assert "Tokens" in theme_names


# ─── Weakness detection ───────────────────────────────────────────────────────

def test_identify_weaknesses_low_lands():
    mainboard = [Card(name="Forest", type_line="Basic Land", quantity=20)]
    mainboard.extend(
        [Card(name="Grizzly Bears", type_line="Creature", cmc=2, quantity=79)]
    )
    commander = Card(name="Stompy", type_line="Legendary Creature", color_identity=["G"])
    deck = Deck(id="x", name="Test", commander=commander, mainboard=mainboard)
    weaknesses = identify_weaknesses(deck)
    labels = [w["label"] for w in weaknesses]
    assert any("Low land count" in lbl for lbl in labels)


def test_identify_weaknesses_low_ramp():
    mainboard = [Card(name="Forest", type_line="Basic Land", quantity=37)]
    mainboard.extend([Card(name="Grizzly Bears", type_line="Creature", cmc=2, quantity=62)])
    commander = Card(name="Stompy", type_line="Legendary Creature", color_identity=["G"])
    deck = Deck(id="x", name="Test", commander=commander, mainboard=mainboard)
    weaknesses = identify_weaknesses(deck)
    labels = [w["label"] for w in weaknesses]
    assert any("Low ramp" in lbl for lbl in labels)


def test_identify_weaknesses_low_board_wipes():
    """Deck with no board wipes should flag the weakness."""
    mainboard = [Card(name="Forest", type_line="Basic Land", quantity=37)]
    mainboard.extend([Card(name="Grizzly Bears", type_line="Creature", cmc=2, quantity=62)])
    commander = Card(name="Stompy", type_line="Legendary Creature", color_identity=["G"])
    deck = Deck(id="x", name="Test", commander=commander, mainboard=mainboard)
    weaknesses = identify_weaknesses(deck)
    labels = [w["label"] for w in weaknesses]
    assert any("Low board wipes" in lbl for lbl in labels)


def test_identify_weaknesses_color_filtered_examples():
    """Mono-blue deck should only get blue/colorless ramp examples."""
    mainboard = [Card(name="Island", type_line="Basic Land", quantity=37)]
    mainboard.extend([Card(name="Wind Drake", type_line="Creature", cmc=3, quantity=62)])
    commander = Card(name="Azami", type_line="Legendary Creature", color_identity=["U"])
    deck = Deck(id="x", name="Test", commander=commander, mainboard=mainboard)
    weaknesses = identify_weaknesses(deck)
    ramp_weakness = next((w for w in weaknesses if "Low ramp" in w["label"]), None)
    assert ramp_weakness is not None
    # Should not suggest green cards like Cultivate to a mono-blue deck
    for ex in ramp_weakness["examples"]:
        assert ex not in ["Cultivate", "Kodama's Reach", "Llanowar Elves", "Birds of Paradise"]


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
        "board_wipe_count",
        "interaction_count",
        "themes",
        "theme_names",
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
