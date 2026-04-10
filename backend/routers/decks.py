import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from auth import require_allowed_user
from src.moxfield import extract_deck_id, get_deck
from src.deck_analyzer import analyze_deck

router = APIRouter()


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


class FetchDeckRequest(BaseModel):
    url: str


class AnalyzeDeckRequest(BaseModel):
    moxfield_id: str


@router.post("/fetch")
def fetch_deck(body: FetchDeckRequest, user: dict = Depends(require_allowed_user)):
    """Fetch a deck from Moxfield and cache it in Supabase."""
    try:
        deck_id = extract_deck_id(body.url)
    except Exception:
        deck_id = None
    if not deck_id:
        raise HTTPException(status_code=400, detail="Invalid Moxfield URL or deck ID")

    sb = _supabase()

    # Return cached version if available
    cached = sb.table("decks").select("*").eq("moxfield_id", deck_id).execute()
    if cached.data:
        return {"deck_id": deck_id, "cached": True, "data": cached.data[0]["data_json"]}

    # Fetch fresh from Moxfield
    try:
        deck = get_deck(deck_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Moxfield fetch failed: {str(e)}")

    # Serialize deck to dict for storage
    deck_data = {
        "id": deck.id,
        "name": deck.name,
        "format": deck.format,
        "commander": {"name": deck.commander.name} if deck.commander else None,
        "mainboard": [{"name": c.name, "quantity": c.quantity} for c in deck.mainboard],
    }

    sb.table("decks").insert({"moxfield_id": deck_id, "data_json": deck_data}).execute()

    return {"deck_id": deck_id, "cached": False, "data": deck_data}


@router.post("/analyze")
def analyze(body: AnalyzeDeckRequest, user: dict = Depends(require_allowed_user)):
    """Run deck analysis and save result to user's analysis history."""
    sb = _supabase()

    cached = sb.table("decks").select("*").eq("moxfield_id", body.moxfield_id).execute()
    if not cached.data:
        raise HTTPException(status_code=404, detail="Deck not found. Fetch it first.")

    deck_data = cached.data[0]["data_json"]

    # Rebuild deck object from Moxfield for analysis
    try:
        deck = get_deck(body.moxfield_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not load deck for analysis: {str(e)}")

    result = analyze_deck(deck)

    sb.table("analyses").insert({
        "user_id": user["user_id"],
        "deck_id": body.moxfield_id,
        "result_json": result,
    }).execute()

    return {"analysis": result}
