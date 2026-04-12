#!/usr/bin/env python3
"""Debug Moxfield API response for a specific deck."""

import cloudscraper
import json

deck_id = "C0p79fTob0C_xX3ojDTCMw"
url = f"https://api2.moxfield.com/v2/decks/all/{deck_id}"

print(f"🔍 Fetching deck from Moxfield: {deck_id}\n")

try:
    scraper = cloudscraper.create_scraper()
    response = scraper.get(url, timeout=30)
    response.raise_for_status()
    data = response.json()
    
    # Print commander data
    print("📊 Commanders in response:")
    commanders = data.get("commanders", {})
    for key, entry in commanders.items():
        card = entry.get("card", {})
        print(f"\n  Position: {key}")
        print(f"  Card name: {card.get('name')}")
        print(f"  Scryfall ID: {card.get('scryfall_id', 'MISSING')}")
        print(f"  Has image_uris: {'image_uris' in card}")
        if 'image_uris' in card:
            print(f"  image_uris keys: {list(card['image_uris'].keys())}")
            print(f"  normal image: {card['image_uris'].get('normal', 'MISSING')}")
        print(f"  Has card_faces: {'card_faces' in card}")
        if 'card_faces' in card:
            print(f"  Number of faces: {len(card['card_faces'])}")
            if card['card_faces']:
                face = card['card_faces'][0]
                print(f"  Face 0 has image_uris: {'image_uris' in face}")
                if 'image_uris' in face:
                    print(f"  Face 0 image_uris keys: {list(face['image_uris'].keys())}")
                    print(f"  Face 0 normal image: {face['image_uris'].get('normal', 'MISSING')}")
        
except Exception as e:
    print(f"❌ Error: {e}")
