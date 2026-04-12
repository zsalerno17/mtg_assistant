#!/usr/bin/env python3
"""Simulate the get_library backend logic to see what's returned."""

import os
import json
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

print("🔍 Simulating get_library() backend logic...\n")

# Get all analyses
analyses_result = sb.table("analyses").select("*").execute()
analyses_by_deck = {a["deck_id"]: a for a in (analyses_result.data or [])}

# Get all user_decks
user_decks_result = sb.table("user_decks").select("*").execute()
user_deck_ids = {d["moxfield_id"] for d in (user_decks_result.data or [])}

result = []

# Backwards-compat: include analyses that have no user_decks entry
for deck_id, analysis in analyses_by_deck.items():
    if deck_id in user_deck_ids:
        continue
    rj = analysis["result_json"]
    
    # Try to get commander and partner images from cached deck data
    commander_image_uri = None
    partner_image_uri = None
    try:
        cached_deck = sb.table("decks").select("data_json").eq("moxfield_id", deck_id).execute()
        if cached_deck.data:
            deck_data = cached_deck.data[0].get("data_json", {})
            commander_obj = deck_data.get("commander")
            partner_obj = deck_data.get("partner")
            print(f"📦 Cached deck data for {deck_id}:")
            print(f"   commander: {json.dumps(commander_obj, indent=4)}")
            print(f"   partner: {json.dumps(partner_obj, indent=4)}")
            if commander_obj and isinstance(commander_obj, dict):
                commander_image_uri = commander_obj.get("image_uri")
                print(f"   ✅ Extracted commander_image_uri: {commander_image_uri}")
            if partner_obj and isinstance(partner_obj, dict):
                partner_image_uri = partner_obj.get("image_uri")
                print(f"   ✅ Extracted partner_image_uri: {partner_image_uri}")
    except Exception as e:
        print(f"❌ Error extracting images: {e}")
    
    deck_item = {
        "moxfield_id": deck_id,
        "deck_name": analysis.get("deck_name") or deck_id,
        "moxfield_url": analysis.get("moxfield_url"),
        "added_at": analysis["created_at"],
        "analyzed": True,
        "commander": rj.get("commander"),
        "commander_image_uri": commander_image_uri,
        "partner_image_uri": partner_image_uri,
        "format": "commander",
        "colors": rj.get("colors") or rj.get("color_identity"),
        "themes": rj.get("themes", []),
        "verdict": rj.get("verdict"),
        "power_level": rj.get("power_level"),
    }
    result.append(deck_item)

print(f"\n📊 Final result ({len(result)} decks):")
print(json.dumps(result, indent=2, default=str))
