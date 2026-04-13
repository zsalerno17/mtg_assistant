#!/usr/bin/env python3
"""
Backfill commander images for existing user_decks entries.

This script:
1. Finds all user_decks entries with null commander_image_uri
2. Looks up the commander image from the cached decks table
3. Updates user_decks with the image URI

Usage:
    python3 scripts/backfill_commander_images.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
"""

import os
import sys
from pathlib import Path

# Add backend to path so we can import from it
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from supabase import create_client
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(backend_path / ".env")


def main():
    # Initialize Supabase client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)
    
    sb = create_client(supabase_url, supabase_key)
    
    # Fetch all user_decks entries without commander images
    print("🔍 Fetching user_decks without commander images...")
    result = sb.table("user_decks").select("*").is_("commander_image_uri", "null").execute()
    user_decks = result.data or []
    
    if not user_decks:
        print("✅ All user_decks already have commander images!")
        return
    
    print(f"📋 Found {len(user_decks)} user_decks entries to backfill")
    
    updated = 0
    skipped = 0
    errors = 0
    
    for deck in user_decks:
        moxfield_id = deck["moxfield_id"]
        user_id = deck["user_id"]
        
        try:
            # Look up cached deck data
            cached = sb.table("decks").select("data_json").eq("moxfield_id", moxfield_id).execute()
            
            if not cached.data:
                print(f"⚠️  Skipping {moxfield_id} - no cached deck data")
                skipped += 1
                continue
            
            deck_data = cached.data[0]["data_json"]
            
            # Extract commander and partner image URIs
            commander_image_uri = None
            partner_image_uri = None
            format_val = deck_data.get("format", "commander")
            
            commander_data = deck_data.get("commander")
            if commander_data and isinstance(commander_data, dict):
                commander_image_uri = commander_data.get("image_uri")
            
            partner_data = deck_data.get("partner")
            if partner_data and isinstance(partner_data, dict):
                partner_image_uri = partner_data.get("image_uri")
            
            # Update user_decks entry
            update_data = {"format": format_val}
            if commander_image_uri:
                update_data["commander_image_uri"] = commander_image_uri
            if partner_image_uri:
                update_data["partner_image_uri"] = partner_image_uri
            
            sb.table("user_decks").update(update_data).eq("user_id", user_id).eq("moxfield_id", moxfield_id).execute()
            
            images = []
            if commander_image_uri:
                images.append("commander")
            if partner_image_uri:
                images.append("partner")
            status = "✅" if images else "⚠️ "
            print(f"{status} Updated {moxfield_id} (user {user_id[:8]}...): {', '.join(images) if images else 'no images'}")
            updated += 1
            
        except Exception as e:
            print(f"❌ Error updating {moxfield_id}: {e}")
            errors += 1
    
    print("\n" + "="*60)
    print(f"✅ Backfill complete!")
    print(f"   Updated: {updated}")
    print(f"   Skipped: {skipped}")
    print(f"   Errors:  {errors}")
    print("="*60)


if __name__ == "__main__":
    main()
