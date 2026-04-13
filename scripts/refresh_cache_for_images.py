#!/usr/bin/env python3
"""
Re-fetch decks from Moxfield to update cached data with commander images.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from src.moxfield import get_deck

# Load environment
load_dotenv(backend_path / ".env")
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

# Get all deck IDs from analyses
print("🔍 Finding decks to refresh...")
analyses = sb.table('analyses').select('deck_id').execute()
deck_ids = [a['deck_id'] for a in analyses.data]

print(f"🔄 Refreshing {len(deck_ids)} cached deck(s)...\n")

for deck_id in deck_ids:
    print(f"  Fetching {deck_id} from Moxfield...")
    try:
        # Re-fetch from Moxfield
        deck = get_deck(deck_id)
        
        # Serialize commander
        commander_data = None
        if deck.commander:
            commander_data = {
                'name': deck.commander.name,
                'quantity': deck.commander.quantity,
                'mana_cost': deck.commander.mana_cost,
                'cmc': deck.commander.cmc,
                'type_line': deck.commander.type_line,
                'oracle_text': deck.commander.oracle_text,
                'colors': deck.commander.colors,
                'color_identity': deck.commander.color_identity,
                'keywords': deck.commander.keywords,
                'rarity': deck.commander.rarity,
                'set_code': deck.commander.set_code,
                'image_uri': deck.commander.image_uri,
                'scryfall_id': deck.commander.scryfall_id,
            }
        
        # Serialize partner
        partner_data = None
        if deck.partner:
            partner_data = {
                'name': deck.partner.name,
                'quantity': deck.partner.quantity,
                'mana_cost': deck.partner.mana_cost,
                'cmc': deck.partner.cmc,
                'type_line': deck.partner.type_line,
                'oracle_text': deck.partner.oracle_text,
                'colors': deck.partner.colors,
                'color_identity': deck.partner.color_identity,
                'keywords': deck.partner.keywords,
                'rarity': deck.partner.rarity,
                'set_code': deck.partner.set_code,
                'image_uri': deck.partner.image_uri,
                'scryfall_id': deck.partner.scryfall_id,
            }
        
        # Build deck data
        deck_data = {
            'id': deck.id,
            'name': deck.name,
            'format': deck.format,
            'commander': commander_data,
            'partner': partner_data,
            'mainboard': [],  # Skip for speed
            'sideboard': [],
        }
        
        # Update cache
        sb.table('decks').update({'data_json': deck_data}).eq('moxfield_id', deck_id).execute()
        
        cmdr_img = 'YES' if (commander_data and commander_data.get('image_uri')) else 'NO'
        partner_img = 'YES' if (partner_data and partner_data.get('image_uri')) else 'NO'
        print(f"  ✅ {deck.name} | Commander img: {cmdr_img} | Partner img: {partner_img}")
        
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n✅ Cache refresh complete! Refresh your browser to see commander images.")
