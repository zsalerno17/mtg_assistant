#!/usr/bin/env python3
"""Check raw URL data."""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

cached_deck = sb.table("decks").select("data_json").eq("moxfield_id", "C0p79fTob0C_xX3ojDTCMw").execute()
if cached_deck.data:
    deck_data = cached_deck.data[0].get("data_json", {})
    commander_obj = deck_data.get("commander")
    partner_obj = deck_data.get("partner")
    
    c_uri = commander_obj.get("image_uri") if commander_obj else None
    p_uri = partner_obj.get("image_uri") if partner_obj else None
    
    print(f"Commander URI type: {type(c_uri)}")
    print(f"Commander URI repr: {repr(c_uri)}")
    print(f"Commander URI len: {len(c_uri) if c_uri else 0}")
    
    print(f"\nPartner URI type: {type(p_uri)}")
    print(f"Partner URI repr: {repr(p_uri)}")
    print(f"Partner URI len: {len(p_uri) if p_uri else 0}")
    
    if c_uri:
        print(f"\n✅ Commander URL is valid: {c_uri.startswith('http')}")
        print(f"   Has newlines: {chr(10) in c_uri}")
        print(f"   Has carriage returns: {chr(13) in c_uri}")
        
    if p_uri:
        print(f"\n✅ Partner URL is valid: {p_uri.startswith('http')}")
        print(f"   Has newlines: {chr(10) in p_uri}")
        print(f"   Has carriage returns: {chr(13) in p_uri}")
