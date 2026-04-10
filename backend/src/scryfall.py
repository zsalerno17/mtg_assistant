"""Scryfall API client for card lookups and searches."""

import time
from typing import Any, Dict, List, Optional

import requests

from .models import Card

SCRYFALL_API_BASE = "https://api.scryfall.com"
# Scryfall requests a 50–100 ms delay between requests
_REQUEST_DELAY = 0.1


def _get(url: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict]:
    """GET request to Scryfall with rate-limit courtesy delay."""
    time.sleep(_REQUEST_DELAY)
    try:
        response = requests.get(url, params=params, timeout=15)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return None


def get_card_by_name(name: str) -> Optional[Card]:
    """Fetch detailed card data from Scryfall by (exact or fuzzy) name."""
    url = f"{SCRYFALL_API_BASE}/cards/named"
    data = _get(url, {"exact": name})
    if data is None:
        # Try fuzzy match
        data = _get(url, {"fuzzy": name})
    if data is None:
        return None
    return _parse_card(data)


def search_cards(query: str, order: str = "edhrec", page: int = 1) -> List[Card]:
    """Run a Scryfall search query and return matching cards."""
    url = f"{SCRYFALL_API_BASE}/cards/search"
    data = _get(url, {"q": query, "order": order, "page": page})
    if data is None:
        return []
    return [_parse_card(c) for c in data.get("data", [])]


def get_commander_suggestions(
    color_identity: List[str],
    themes: Optional[List[str]] = None,
    max_results: int = 20,
) -> List[Card]:
    """Get cards that fit within a commander's color identity and themes."""
    if not color_identity:
        return []

    color_str = "".join(color_identity).upper()
    # id<= means "within this color identity"
    query = f"id<={color_str} format:commander"

    if themes:
        # Add an oracle text filter for at most 3 themes
        theme_parts = " OR ".join(f'o:"{t}"' for t in themes[:3])
        query += f" ({theme_parts})"

    cards = search_cards(query, order="edhrec")
    return cards[:max_results]


def _parse_card(data: Dict[str, Any]) -> Card:
    """Convert a Scryfall card JSON dict into a Card model."""
    # Double-faced cards may not have top-level image_uris
    image_uris = data.get("image_uris") or {}
    oracle_text = data.get("oracle_text", "")

    if not image_uris and data.get("card_faces"):
        image_uris = data["card_faces"][0].get("image_uris", {})
    if not oracle_text and data.get("card_faces"):
        oracle_text = data["card_faces"][0].get("oracle_text", "")

    return Card(
        name=data.get("name", ""),
        quantity=1,
        mana_cost=data.get("mana_cost", ""),
        cmc=float(data.get("cmc", 0)),
        type_line=data.get("type_line", ""),
        oracle_text=oracle_text,
        colors=data.get("colors", []),
        color_identity=data.get("color_identity", []),
        keywords=data.get("keywords", []),
        rarity=data.get("rarity", ""),
        set_code=data.get("set", ""),
        image_uri=image_uris.get("normal", ""),
        scryfall_id=data.get("id", ""),
    )
