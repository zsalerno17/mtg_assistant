#!/usr/bin/env python3
"""Refresh cached deck data to include commander image_uri."""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
import sys

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from src.moxfield import get_deck

# Load environment variables
backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("🔍 Finding decks with old cached data...")

# Get all cached decks
cached_decks = sb.table("decks").select("*").execute()

refreshed = 0
for deck_cache in cached_decks.data:
    deck_id = deck_cache["moxfield_id"]
    deck_data = deck_cache.get("data_json", {})
    commander = deck_data.get("commander", {})
    
    # Check if commander object exists but doesn't have image_uri
    if commander and isinstance(commander, dict):
        if "name" in commander and "image_uri" not in commander:
            print(f"\n⚡ Refreshing {deck_data.get('name', deck_id)}...")
            print(f"   Current commander: {commander}")
            
            # Re-fetch from Moxfield
            try:
                fresh_deck = get_deck(deck_id)
                
                print(f"   DEBUG: fresh_deck.name = {fresh_deck.name}")
                print(f"   DEBUG: fresh_deck.commander = {fresh_deck.commander}")
                if fresh_deck.commander:
                    print(f"   DEBUG: fresh_deck.commander.name = {fresh_deck.commander.name}")
                    print(f"   DEBUG: fresh_deck.commander.image_uri = {fresh_deck.commander.image_uri}")
                
                # Parse to dict for storage
                deck_dict = {
                    "name": fresh_deck.name,
                    "commander": {
                        "name": fresh_deck.commander.name,
                        "image_uri": fresh_deck.commander.image_uri,
                    } if fresh_deck.commander else None,
                    "partner": {
                        "name": fresh_deck.partner.name,
                        "image_uri": fresh_deck.partner.image_uri,
                    } if fresh_deck.partner else None,
                    "color_identity": fresh_deck.color_identity,
                }
                
                # Update cache
                sb.table("decks").update({
                    "data_json": deck_dict
                }).eq("moxfield_id", deck_id).execute()
                
                print(f"   ✅ Updated! New commander image: {fresh_deck.commander.image_uri if fresh_deck.commander else 'None'}")
                refreshed += 1
                
            except Exception as e:
                print(f"   ❌ Failed: {e}")

print(f"\n✅ Refreshed {refreshed} cached deck(s)")
