#!/usr/bin/env python3
"""Fetch commander images from Scryfall and update deck cache."""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
import requests
import time

# Load environment variables
backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

deck_id = "C0p79fTob0C_xX3ojDTCMw"

print(f"🔍 Fetching cached deck: {deck_id}")

# Get cached deck
result = sb.table("decks").select("*").eq("moxfield_id", deck_id).execute()
if not result.data:
    print("❌ Deck not found in cache")
    exit(1)

deck_data = result.data[0].get("data_json", {})
print(f"📦 Deck name: {deck_data.get('name')}")

# Get commander with scryfall IDs
commander = deck_data.get("commander", {})
partner = deck_data.get("partner", {})

print(f"\n📊 Commander: {commander.get('name')}")

# Look up images from Scryfall using card names
def get_image_from_scryfall(card_name: str) -> str:
    """Fetch card image URI from Scryfall."""
    url = "https://api.scryfall.com/cards/named"
    params = {"exact": card_name}
    
    time.sleep(0.1)  # Scryfall rate limit courtesy
    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        card_data = response.json()
        
        # Get image - prefer image_uris, fall back to first card_face
        image_uris = card_data.get("image_uris")
        if image_uris:
            return image_uris.get("normal", "")
        
        # Try card_faces for split/transform cards
        card_faces = card_data.get("card_faces", [])
        if card_faces and card_faces[0].get("image_uris"):
            return card_faces[0]["image_uris"].get("normal", "")
        
        return ""
    except Exception as e:
        print(f"❌ Error fetching {card_name}: {e}")
        return ""

# Fetch images
if commander.get("name"):
    print(f"\n⚡ Looking up commander image from Scryfall...")
    commander_image = get_image_from_scryfall(commander["name"])
    print(f"   Image: {commander_image[:80]}..." if len(commander_image) > 80 else f"   Image: {commander_image}")
    commander["image_uri"] = commander_image

if partner.get("name"):
    print(f"\n⚡ Looking up partner image from Scryfall...")
    partner_image = get_image_from_scryfall(partner["name"])
    print(f"   Image: {partner_image[:80]}..." if len(partner_image) > 80 else f"   Image: {partner_image}")
    partner["image_uri"] = partner_image

# Update cache
print(f"\n💾 Updating cache...")
sb.table("decks").update({
    "data_json": deck_data
}).eq("moxfield_id", deck_id).execute()

print("✅ Done! Cached deck data updated with commander images")
