#!/usr/bin/env python3
"""Debug what Moxfield actually returns for commander image data."""
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
import cloudscraper

# Load environment
backend_path = Path(__file__).parent.parent / "backend"
load_dotenv(backend_path / ".env")

def _scraper():
    return cloudscraper.create_scraper(browser={"browser": "chrome", "platform": "darwin", "mobile": False})

deck_id = "C0p79fTob0C_xX3ojDTCMw"
url = f"https://api2.moxfield.com/v2/decks/all/{deck_id}"

print(f"🔍 Fetching raw Moxfield response for {deck_id}...\n")

scraper = _scraper()
response = scraper.get(url, timeout=30)
response.raise_for_status()
data = response.json()

print("📦 Commanders structure:")
commanders = data.get("commanders", {})
for key, entry in commanders.items():
    print(f"\n  Key: {key}")
    print(f"  Quantity: {entry.get('quantity')}")
    
    card = entry.get("card", {})
    print(f"  Card name: {card.get('name')}")
    
    # Check image_uris
    image_uris = card.get("image_uris")
    print(f"  image_uris: {image_uris}")
    
    # Check card_faces
    card_faces = card.get("card_faces")
    print(f"  card_faces: {bool(card_faces)}")
    if card_faces:
        print(f"    First face image_uris: {card_faces[0].get('image_uris')}")
    
    # Show all top-level keys
    print(f"  Available keys in 'card': {list(card.keys())[:15]}...")
