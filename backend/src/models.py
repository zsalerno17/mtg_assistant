"""Data models for the MTG Commander Assistant."""

from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class Card:
    """Represents a Magic: The Gathering card."""

    name: str
    quantity: int = 1
    mana_cost: str = ""
    cmc: float = 0.0
    type_line: str = ""
    oracle_text: str = ""
    colors: List[str] = field(default_factory=list)
    color_identity: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    rarity: str = ""
    set_code: str = ""
    image_uri: str = ""
    scryfall_id: str = ""

    @property
    def is_land(self) -> bool:
        return "land" in self.type_line.lower()

    @property
    def is_creature(self) -> bool:
        return "creature" in self.type_line.lower()

    def __repr__(self) -> str:
        return f"Card(name={self.name!r}, quantity={self.quantity}, cmc={self.cmc})"


@dataclass
class Deck:
    """Represents a Commander deck."""

    id: str
    name: str
    commander: Optional[Card] = None
    partner: Optional[Card] = None
    mainboard: List[Card] = field(default_factory=list)
    sideboard: List[Card] = field(default_factory=list)
    format: str = "commander"
    description: str = ""

    @property
    def all_cards(self) -> List[Card]:
        """All cards in the deck (commanders + mainboard)."""
        cards: List[Card] = []
        if self.commander:
            cards.append(self.commander)
        if self.partner:
            cards.append(self.partner)
        cards.extend(self.mainboard)
        return cards

    @property
    def card_count(self) -> int:
        return sum(c.quantity for c in self.all_cards)

    @property
    def color_identity(self) -> List[str]:
        if self.commander:
            return self.commander.color_identity
        return []

    def __repr__(self) -> str:
        commander_name = self.commander.name if self.commander else "No Commander"
        return f"Deck(name={self.name!r}, commander={commander_name!r}, cards={self.card_count})"


@dataclass
class Collection:
    """Represents a user's card collection."""

    cards: List[Card] = field(default_factory=list)

    def get_card(self, name: str) -> Optional[Card]:
        for card in self.cards:
            if card.name.lower() == name.lower():
                return card
        return None

    def has_card(self, name: str) -> bool:
        return self.get_card(name) is not None

    @property
    def total_cards(self) -> int:
        return sum(c.quantity for c in self.cards)

    def __repr__(self) -> str:
        return f"Collection(unique_cards={len(self.cards)}, total={self.total_cards})"
