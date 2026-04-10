"""Tests for src/moxfield.py"""

import pytest

from src.moxfield import extract_deck_id, parse_moxfield_deck


class TestExtractDeckId:
    def test_full_url(self):
        url = "https://www.moxfield.com/decks/AbCdEfGhIj"
        assert extract_deck_id(url) == "AbCdEfGhIj"

    def test_url_without_www(self):
        url = "https://moxfield.com/decks/XyZ123"
        assert extract_deck_id(url) == "XyZ123"

    def test_url_with_trailing_slash(self):
        url = "https://www.moxfield.com/decks/TestId/"
        assert extract_deck_id(url) == "TestId"

    def test_raw_id(self):
        assert extract_deck_id("AbCdEfGhIj") == "AbCdEfGhIj"

    def test_invalid_url(self):
        assert extract_deck_id("not a url at all!") is None

    def test_empty_string(self):
        assert extract_deck_id("") is None


class TestParseMoxfieldDeck:
    def _sample_card_entry(self, name="Sol Ring", cmc=1, type_line="Artifact"):
        return {
            "quantity": 1,
            "card": {
                "name": name,
                "mana_cost": "{1}",
                "cmc": cmc,
                "type_line": type_line,
                "oracle_text": "{T}: Add {C}{C}.",
                "colors": [],
                "color_identity": [],
                "keywords": [],
                "rarity": "uncommon",
                "set": "c21",
                "image_uris": {"normal": "https://example.com/sol_ring.jpg"},
                "scryfall_id": "abc123",
            },
        }

    def _sample_commander_entry(self):
        return {
            "quantity": 1,
            "card": {
                "name": "Atraxa, Praetors' Voice",
                "mana_cost": "{W}{U}{B}{G}",
                "cmc": 4.0,
                "type_line": "Legendary Creature — Phyrexian Angel Horror",
                "oracle_text": "Flying, vigilance, deathtouch, lifelink.",
                "colors": ["W", "U", "B", "G"],
                "color_identity": ["W", "U", "B", "G"],
                "keywords": ["Flying", "Vigilance", "Deathtouch", "Lifelink"],
                "rarity": "mythic",
                "set": "c16",
                "image_uris": {"normal": "https://example.com/atraxa.jpg"},
                "scryfall_id": "def456",
            },
        }

    def _sample_deck_data(self):
        return {
            "publicId": "TestPublicId",
            "name": "Atraxa Superfriends",
            "format": "commander",
            "description": "Test description",
            "commanders": {"Atraxa, Praetors' Voice": self._sample_commander_entry()},
            "mainboard": {"Sol Ring": self._sample_card_entry()},
            "sideboard": {},
        }

    def test_deck_name(self):
        deck = parse_moxfield_deck(self._sample_deck_data())
        assert deck.name == "Atraxa Superfriends"

    def test_deck_id(self):
        deck = parse_moxfield_deck(self._sample_deck_data())
        assert deck.id == "TestPublicId"

    def test_commander_parsed(self):
        deck = parse_moxfield_deck(self._sample_deck_data())
        assert deck.commander is not None
        assert deck.commander.name == "Atraxa, Praetors' Voice"
        assert "W" in deck.commander.color_identity

    def test_mainboard_parsed(self):
        deck = parse_moxfield_deck(self._sample_deck_data())
        assert len(deck.mainboard) == 1
        assert deck.mainboard[0].name == "Sol Ring"

    def test_format(self):
        deck = parse_moxfield_deck(self._sample_deck_data())
        assert deck.format == "commander"

    def test_no_commander(self):
        data = self._sample_deck_data()
        data["commanders"] = {}
        deck = parse_moxfield_deck(data)
        assert deck.commander is None

    def test_double_faced_card_image(self):
        entry = {
            "quantity": 1,
            "card": {
                "name": "Delver of Secrets // Insectile Aberration",
                "mana_cost": "{U}",
                "cmc": 1.0,
                "type_line": "Creature — Human Wizard",
                "oracle_text": "",
                "colors": ["U"],
                "color_identity": ["U"],
                "keywords": [],
                "rarity": "uncommon",
                "set": "isd",
                "card_faces": [
                    {
                        "image_uris": {"normal": "https://example.com/delver_front.jpg"},
                        "oracle_text": "At the beginning of your upkeep, look at the top card of your library.",
                    }
                ],
            },
        }
        data = self._sample_deck_data()
        data["mainboard"]["Delver of Secrets"] = entry
        deck = parse_moxfield_deck(data)
        delver = next(c for c in deck.mainboard if "Delver" in c.name)
        assert delver.image_uri == "https://example.com/delver_front.jpg"
