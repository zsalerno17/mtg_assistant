#!/usr/bin/env python3
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load backend environment
backend_path = Path(__file__).parent.parent / "backend"
load_dotenv(backend_path / ".env")

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

# Get first deck from analyses
analysis = sb.table('analyses').select('deck_id').limit(1).execute()
if not analysis.data:
    print("❌ No analyses found!")
    sys.exit(1)

deck_id = analysis.data[0]['deck_id']
print(f'🔍 Checking deck: {deck_id}\n')

# Check cached deck
cached = sb.table('decks').select('data_json').eq('moxfield_id', deck_id).execute()

if not cached.data:
    print('❌ Deck not cached!')
    sys.exit(1)

deck_data = cached.data[0]['data_json']
cmdr = deck_data.get('commander', {})
partner = deck_data.get('partner', {})

print(f'✅ Found cached deck:')
print(f'   Name: {deck_data.get("name", "N/A")}')
print(f'   Commander: {cmdr.get("name", "N/A") if cmdr else "None"}')

if cmdr.get('image_uri'):
    print(f'   ✅ Commander image: {cmdr["image_uri"][:80]}...')
else:
    print(f'   ❌ Commander image: MISSING')

if partner:
    print(f'   Partner: {partner.get("name", "N/A")}')
    if partner.get('image_uri'):
        print(f'   ✅ Partner image: {partner["image_uri"][:80]}...')
    else:
        print(f'   ❌ Partner image: MISSING')
