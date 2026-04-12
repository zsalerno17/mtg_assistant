#!/usr/bin/env python3
"""Debug script to check user_decks data."""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from backend/.env
backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("🔍 Fetching ALL user_decks data...")
user_decks_result = sb.table("user_decks").select("*").limit(10).execute()

print(f"\n📊 user_decks table: {len(user_decks_result.data or [])} entries")
if user_decks_result.data:
    for deck in user_decks_result.data:
        print(f"  - {deck.get('deck_name')} | commander_image_uri: {deck.get('commander_image_uri')}")

print("\n🔍 Fetching analyses data...")
analyses_result = sb.table("analyses").select("*").limit(10).execute()

print(f"\n📊 analyses table: {len(analyses_result.data or [])} entries")
if analyses_result.data:
    import json
    for analysis in analyses_result.data:
        deck_id = analysis.get("deck_id")
        rj = analysis.get("result_json", {})
        commander = rj.get("commander")
        print(f"\n  Deck: {analysis.get('deck_name')}")
        print(f"  Deck ID: {deck_id}")
        print(f"  Commander in result_json: {commander}")
        
        # Check if we have cached deck data for this
        if deck_id:
            print(f"\n  🔍 Checking decks table for {deck_id}...")
            deck_cache = sb.table("decks").select("*").eq("moxfield_id", deck_id).execute()
            if deck_cache.data:
                deck_data = deck_cache.data[0].get("data_json", {})
                deck_commander = deck_data.get("commander")
                deck_partner = deck_data.get("partner")
                print(f"  Cached deck commander: {json.dumps(deck_commander, indent=4)}")
                print(f"  Cached deck partner: {json.dumps(deck_partner, indent=4)}")
            else:
                print(f"  ❌ No cached deck data")
else:
    print("❌ No analyses found")
