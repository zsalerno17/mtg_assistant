"""Tests for src/models.py"""

import pytest

from src.models import Card, Collection, Deck


class TestCard:
    def test_defaults(self):
        card = Card(name="Sol Ring")
        assert card.name == "Sol Ring"
        assert card.quantity == 1
        assert card.cmc == 0.0
        assert card.colors == []

    def test_is_land_true(self):
        card = Card(name="Forest", type_line="Basic Land — Forest")
        assert card.is_land is True

    def test_is_land_false(self):
        card = Card(name="Sol Ring", type_line="Artifact")
        assert card.is_land is False

    def test_is_creature(self):
        card = Card(name="Llanowar Elves", type_line="Creature — Elf Druid")
        assert card.is_creature is True
        assert card.is_land is False

    def test_repr(self):
        card = Card(name="Dark Ritual", quantity=1, cmc=1.0)
        assert "Dark Ritual" in repr(card)


class TestDeck:
    def _make_deck(self):
        commander = Card(
            name="Atraxa, Praetors' Voice",
            type_line="Legendary Creature — Phyrexian Angel Horror",
            color_identity=["W", "U", "B", "G"],
        )
        mainboard = [
            Card(name="Sol Ring", type_line="Artifact", quantity=1),
            Card(name="Forest", type_line="Basic Land — Forest", quantity=1),
        ]
        return Deck(id="test123", name="Test Deck", commander=commander, mainboard=mainboard)

    def test_all_cards_includes_commander(self):
        deck = self._make_deck()
        names = [c.name for c in deck.all_cards]
        assert "Atraxa, Praetors' Voice" in names

    def test_card_count(self):
        deck = self._make_deck()
        # commander (1) + 2 mainboard cards (each qty 1)
        assert deck.card_count == 3

    def test_color_identity_from_commander(self):
        deck = self._make_deck()
        assert set(deck.color_identity) == {"W", "U", "B", "G"}

    def test_color_identity_no_commander(self):
        deck = Deck(id="x", name="No commander")
        assert deck.color_identity == []

    def test_repr(self):
        deck = self._make_deck()
        assert "Test Deck" in repr(deck)

    def test_partner(self):
        commander = Card(name="Cazur, Ruthless Stalker", type_line="Legendary Creature", color_identity=["B", "G"])
        partner = Card(name="Ukkima, Stalking Shadow", type_line="Legendary Creature", color_identity=["U", "B"])
        deck = Deck(id="y", name="Partners", commander=commander, partner=partner)
        names = [c.name for c in deck.all_cards]
        assert "Cazur, Ruthless Stalker" in names
        assert "Ukkima, Stalking Shadow" in names


class TestCollection:
    def test_get_card_case_insensitive(self):
        col = Collection(cards=[Card(name="Sol Ring"), Card(name="Arcane Signet")])
        found = col.get_card("sol ring")
        assert found is not None
        assert found.name == "Sol Ring"

    def test_get_card_missing(self):
        col = Collection(cards=[Card(name="Sol Ring")])
        assert col.get_card("Lightning Bolt") is None

    def test_has_card(self):
        col = Collection(cards=[Card(name="Sol Ring")])
        assert col.has_card("Sol Ring") is True
        assert col.has_card("Force of Will") is False

    def test_total_cards(self):
        col = Collection(cards=[Card(name="Sol Ring", quantity=4), Card(name="Forest", quantity=10)])
        assert col.total_cards == 14
