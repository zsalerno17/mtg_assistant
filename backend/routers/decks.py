import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from auth import require_allowed_user
from src.moxfield import extract_deck_id, get_deck, get_deck_with_meta
from src.deck_analyzer import analyze_deck

router = APIRouter()


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


class FetchDeckRequest(BaseModel):
    url: str


class AnalyzeDeckRequest(BaseModel):
    moxfield_id: str
    force: bool = False


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
        "partner": {"name": deck.partner.name} if deck.partner else None,
        "mainboard": [{"name": c.name, "quantity": c.quantity} for c in deck.mainboard],
    }

    sb.table("decks").insert({"moxfield_id": deck_id, "data_json": deck_data}).execute()

    return {"deck_id": deck_id, "cached": False, "data": deck_data}


@router.post("/analyze")
def analyze(body: AnalyzeDeckRequest, user: dict = Depends(require_allowed_user)):
    """Run deck analysis and save result to user's analysis history.

    Deduplication: if the user already has an analysis for this deck and
    Moxfield reports the deck hasn't changed, returns the cached result immediately.
    """
    sb = _supabase()

    cached_deck = sb.table("decks").select("data_json").eq("moxfield_id", body.moxfield_id).execute()
    if not cached_deck.data:
        raise HTTPException(status_code=404, detail="Deck not found. Fetch it first.")

    # Check for an existing analysis for this user + deck
    existing = (
        sb.table("analyses")
        .select("id, result_json, deck_updated_at")
        .eq("user_id", user["user_id"])
        .eq("deck_id", body.moxfield_id)
        .execute()
    )

    # Re-fetch from Moxfield for fresh deck data and lastUpdatedAtUtc
    try:
        deck, last_updated_at = get_deck_with_meta(body.moxfield_id)
    except Exception as e:
        # If Moxfield is down but we have an existing analysis, return it
        if existing.data:
            return {"analysis": existing.data[0]["result_json"], "cached": True}
        raise HTTPException(status_code=502, detail=f"Could not load deck for analysis: {str(e)}")

    # Return cached analysis if deck content hasn't changed (unless force re-analysis requested)
    if not body.force and existing.data and existing.data[0].get("deck_updated_at") == last_updated_at:
        return {"analysis": existing.data[0]["result_json"], "cached": True}

    # Run fresh analysis
    result = analyze_deck(deck)

    moxfield_url = f"https://www.moxfield.com/decks/{body.moxfield_id}"
    deck_name = deck.name or cached_deck.data[0]["data_json"].get("name", body.moxfield_id)

    row = {
        "user_id": user["user_id"],
        "deck_id": body.moxfield_id,
        "result_json": result,
        "deck_name": deck_name,
        "moxfield_url": moxfield_url,
        "deck_updated_at": last_updated_at,
    }

    if existing.data:
        sb.table("analyses").update(row).eq("id", existing.data[0]["id"]).execute()
    else:
        sb.table("analyses").insert(row).execute()

    return {"analysis": result, "cached": False}
