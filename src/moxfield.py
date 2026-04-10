"""Moxfield API client for fetching deck and collection data."""

import re
from typing import Any, Dict, Optional

import requests

from .models import Card, Deck

MOXFIELD_API_BASE = "https://api2.moxfield.com/v2"
REQUEST_HEADERS = {
    "User-Agent": "MTGAssistant/1.0 (deck analysis tool)",
    "Accept": "application/json",
}


def extract_deck_id(url: str) -> Optional[str]:
    """Extract the public deck ID from a Moxfield URL.

    Supports formats:
    - https://www.moxfield.com/decks/AbCdEfGh
    - https://moxfield.com/decks/AbCdEfGh
    - AbCdEfGh  (raw ID passed directly)
    """
    url = url.strip()
    match = re.search(r"moxfield\.com/decks/([A-Za-z0-9_-]+)", url)
    if match:
        return match.group(1)
    # If it looks like a raw ID (no slashes, no spaces)
    if re.match(r"^[A-Za-z0-9_-]+$", url):
        return url
    return None


def get_deck(deck_id: str) -> Deck:
    """Fetch a deck from Moxfield by its public ID.

    Raises:
        requests.HTTPError: if the API returns a non-2xx status.
        ValueError: if the response cannot be parsed.
    """
    url = f"{MOXFIELD_API_BASE}/decks/all/{deck_id}"
    response = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
    response.raise_for_status()
    return parse_moxfield_deck(response.json())


def parse_moxfield_deck(data: Dict[str, Any]) -> Deck:
    """Parse a Moxfield deck API response dict into a Deck object."""
    deck_id = data.get("publicId") or data.get("id", "")
    name = data.get("name", "Unknown Deck")

    # Commanders
    commanders_raw = data.get("commanders", {})
    commander_list = list(commanders_raw.values())
    commander = parse_moxfield_card(commander_list[0]) if len(commander_list) >= 1 else None
    partner = parse_moxfield_card(commander_list[1]) if len(commander_list) >= 2 else None

    # Mainboard
    mainboard = [
        parse_moxfield_card(entry) for entry in data.get("mainboard", {}).values()
    ]

    # Sideboard
    sideboard = [
        parse_moxfield_card(entry) for entry in data.get("sideboard", {}).values()
    ]

    return Deck(
        id=deck_id,
        name=name,
        commander=commander,
        partner=partner,
        mainboard=mainboard,
        sideboard=sideboard,
        format=data.get("format", "commander"),
        description=data.get("description", ""),
    )


def parse_moxfield_card(entry: Dict[str, Any]) -> Card:
    """Parse a single card entry from a Moxfield deck response."""
    quantity = entry.get("quantity", 1)
    card = entry.get("card", {})

    # Prefer the top-level image_uris; fall back to card_faces[0]
    image_uris = card.get("image_uris") or {}
    if not image_uris and card.get("card_faces"):
        image_uris = card["card_faces"][0].get("image_uris", {})

    oracle_text = card.get("oracle_text", "")
    if not oracle_text and card.get("card_faces"):
        oracle_text = card["card_faces"][0].get("oracle_text", "")

    return Card(
        name=card.get("name", ""),
        quantity=quantity,
        mana_cost=card.get("mana_cost", ""),
        cmc=float(card.get("cmc", 0)),
        type_line=card.get("type_line", ""),
        oracle_text=oracle_text,
        colors=card.get("colors", []),
        color_identity=card.get("color_identity", []),
        keywords=card.get("keywords", []),
        rarity=card.get("rarity", ""),
        set_code=card.get("set", ""),
        image_uri=image_uris.get("normal", ""),
        scryfall_id=card.get("scryfall_id", ""),
    )
