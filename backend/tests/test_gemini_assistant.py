"""
Tests for Gemini AI assistant functionality.
Focuses on key_cards validation to ensure AI suggestions are filtered
against actual deck contents.
"""
import json
from unittest.mock import patch, MagicMock
import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.gemini_assistant import get_strategy_advice
from src.models import Deck, Card


def test_key_cards_validation_filters_invalid_cards():
    """Ensure key_cards are validated against actual deck list"""
    # Create mock deck with known cards
    deck = Deck(
        id="test-deck-1",
        name="Test Deck",
        commander=Card(name="Atraxa, Praetors' Voice", type_line="Creature", cmc=4),
        mainboard=[
            Card(name="Sol Ring", type_line="Artifact", cmc=1),
            Card(name="Cyclonic Rift", type_line="Instant", cmc=2),
            Card(name="Rhystic Study", type_line="Enchantment", cmc=3),
        ]
    )
    
    # Mock AI response with valid and invalid cards
    mock_response = json.dumps({
        "game_plan": "Control the board with interaction and draw cards",
        "key_cards": [
            {"name": "Sol Ring", "role": "Mana acceleration"},
            {"name": "Mana Crypt", "role": "Fast mana"},  # NOT IN DECK
            {"name": "Rhystic Study", "role": "Card draw"},
            {"name": "Demonic Tutor", "role": "Tutoring"},  # NOT IN DECK
        ],
        "early_game": "Ramp and setup",
        "mid_game": "Control the board",
        "late_game": "Close out the game",
        "mulligan": "Keep hands with ramp",
        "win_conditions": [],
        "matchup_tips": []
    })
    
    with patch('src.gemini_assistant._ask', return_value=mock_response):
        result = get_strategy_advice(deck, {})
        
        # Should filter out cards not in deck
        assert result["ai_enhanced"] == True
        assert len(result["content"]["key_cards"]) == 2
        card_names = [kc["name"] for kc in result["content"]["key_cards"]]
        assert "Sol Ring" in card_names
        assert "Rhystic Study" in card_names
        assert "Mana Crypt" not in card_names
        assert "Demonic Tutor" not in card_names


def test_key_cards_validation_handles_empty_list():
    """Ensure validation handles case where AI suggests no key cards"""
    deck = Deck(
        id="test-deck-2",
        name="Test Deck",
        commander=Card(name="Atraxa, Praetors' Voice", type_line="Creature", cmc=4),
        mainboard=[
            Card(name="Sol Ring", type_line="Artifact", cmc=1),
        ]
    )
    
    mock_response = json.dumps({
        "game_plan": "Basic strategy",
        "key_cards": [],
        "early_game": "Ramp",
        "mid_game": "Play",
        "late_game": "Win",
        "mulligan": "Standard",
        "win_conditions": [],
        "matchup_tips": []
    })
    
    with patch('src.gemini_assistant._ask', return_value=mock_response):
        result = get_strategy_advice(deck, {})
        
        assert result["ai_enhanced"] == True
        assert result["content"]["key_cards"] == []


def test_key_cards_validation_handles_all_invalid():
    """Ensure validation handles case where all AI suggestions are invalid"""
    deck = Deck(
        id="test-deck-3",
        name="Test Deck",
        commander=Card(name="Atraxa, Praetors' Voice", type_line="Creature", cmc=4),
        mainboard=[
            Card(name="Sol Ring", type_line="Artifact", cmc=1),
        ]
    )
    
    # All suggested cards are NOT in deck
    mock_response = json.dumps({
        "game_plan": "Strategy",
        "key_cards": [
            {"name": "Mana Crypt", "role": "Fast mana"},
            {"name": "Demonic Tutor", "role": "Tutoring"},
        ],
        "early_game": "Ramp",
        "mid_game": "Play",
        "late_game": "Win",
        "mulligan": "Standard",
        "win_conditions": [],
        "matchup_tips": []
    })
    
    with patch('src.gemini_assistant._ask', return_value=mock_response):
        result = get_strategy_advice(deck, {})
        
        assert result["ai_enhanced"] == True
        # All cards filtered out, should be empty list
        assert result["content"]["key_cards"] == []


def test_key_cards_validation_preserves_other_fields():
    """Ensure validation doesn't affect other response fields"""
    deck = Deck(
        id="test-deck-4",
        name="Test Deck",
        commander=Card(name="Atraxa, Praetors' Voice", type_line="Creature", cmc=4),
        mainboard=[
            Card(name="Sol Ring", type_line="Artifact", cmc=1),
        ]
    )
    
    mock_response = json.dumps({
        "game_plan": "Specific game plan text",
        "key_cards": [
            {"name": "Sol Ring", "role": "Mana"},
            {"name": "Fake Card", "role": "Nothing"},  # NOT IN DECK
        ],
        "early_game": "Early strategy",
        "mid_game": "Mid strategy",
        "late_game": "Late strategy",
        "mulligan": "Mulligan guide",
        "win_conditions": [{"name": "Win", "description": "How to win"}],
        "matchup_tips": [{"against": "Aggro", "advice": "Survive"}]
    })
    
    with patch('src.gemini_assistant._ask', return_value=mock_response):
        result = get_strategy_advice(deck, {})
        
        # Check other fields are preserved
        assert result["content"]["game_plan"] == "Specific game plan text"
        assert result["content"]["early_game"] == "Early strategy"
        assert result["content"]["mid_game"] == "Mid strategy"
        assert result["content"]["late_game"] == "Late strategy"
        assert result["content"]["mulligan"] == "Mulligan guide"
        assert len(result["content"]["win_conditions"]) == 1
        assert len(result["content"]["matchup_tips"]) == 1
        # Only key_cards should be filtered
        assert len(result["content"]["key_cards"]) == 1
        assert result["content"]["key_cards"][0]["name"] == "Sol Ring"


def test_fallback_when_ai_fails():
    """Ensure fallback strategy is used when AI fails"""
    deck = Deck(
        id="test-deck-5",
        name="Test Deck",
        commander=Card(name="Atraxa, Praetors' Voice", type_line="Creature", cmc=4),
        mainboard=[
            Card(name="Sol Ring", type_line="Artifact", cmc=1),
        ]
    )
    
    # AI returns None (failure case)
    with patch('src.gemini_assistant._ask', return_value=None):
        result = get_strategy_advice(deck, {})
        
        assert result["ai_enhanced"] == False
        assert "content" in result
