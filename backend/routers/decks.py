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


class AddToLibraryRequest(BaseModel):
    url: str


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
        "commander": {
            "name": deck.commander.name,
            "image_uri": deck.commander.image_uri,
        } if deck.commander else None,
        "partner": {
            "name": deck.partner.name,
            "image_uri": deck.partner.image_uri,
        } if deck.partner else None,
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


@router.post("/library")
def add_to_library(body: AddToLibraryRequest, user: dict = Depends(require_allowed_user)):
    """Add a deck to the user's library. No AI analysis — just stores deck metadata.

    Idempotent: adding the same deck twice updates the name but does not create a duplicate.
    """
    try:
        deck_id = extract_deck_id(body.url)
    except Exception:
        deck_id = None
    if not deck_id:
        raise HTTPException(status_code=400, detail="Invalid Moxfield URL or deck ID")

    sb = _supabase()

    # Ensure deck data is in the global cache (required for future analysis)
    cached = sb.table("decks").select("data_json").eq("moxfield_id", deck_id).execute()
    if cached.data:
        deck_data = cached.data[0]["data_json"]
    else:
        try:
            deck = get_deck(deck_id)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Moxfield fetch failed: {str(e)}")
        deck_data = {
            "id": deck.id,
            "name": deck.name,
            "format": deck.format,
            "commander": {
                "name": deck.commander.name,
                "image_uri": deck.commander.image_uri,
            } if deck.commander else None,
            "partner": {
                "name": deck.partner.name,
                "image_uri": deck.partner.image_uri,
            } if deck.partner else None,
            "mainboard": [{"name": c.name, "quantity": c.quantity} for c in deck.mainboard],
        }
        sb.table("decks").insert({"moxfield_id": deck_id, "data_json": deck_data}).execute()

    moxfield_url = f"https://www.moxfield.com/decks/{deck_id}"
    deck_name = deck_data.get("name") or deck_id
    
    # Extract commander and partner image URIs if available
    commander_image_uri = None
    partner_image_uri = None
    commander_data = deck_data.get("commander")
    partner_data = deck_data.get("partner")
    if commander_data and isinstance(commander_data, dict):
        commander_image_uri = commander_data.get("image_uri")
    if partner_data and isinstance(partner_data, dict):
        partner_image_uri = partner_data.get("image_uri")

    row = {
        "user_id": user["user_id"],
        "moxfield_id": deck_id,
        "deck_name": deck_name,
        "moxfield_url": moxfield_url,
        "commander_image_uri": commander_image_uri,
        "partner_image_uri": partner_image_uri,
        "format": deck_data.get("format", "commander"),
    }
    sb.table("user_decks").upsert(row, on_conflict="user_id,moxfield_id").execute()

    return {"moxfield_id": deck_id, "deck_name": deck_name}


@router.get("/library")
def get_library(user: dict = Depends(require_allowed_user)):
    """Return the user's deck library with analysis status.

    Backwards-compatible: analyses that exist before the user_decks table was
    added are included as synthetic library entries so existing users don't lose
    access to their decks.
    """
    sb = _supabase()
    user_id = user["user_id"]

    # Fetch user's library rows and all their analyses in parallel
    decks_res = sb.table("user_decks").select("*").eq("user_id", user_id).execute()
    analyses_res = sb.table("analyses").select("*").eq("user_id", user_id).execute()

    user_decks = decks_res.data or []
    analyses = analyses_res.data or []

    # Index analyses by deck_id, keeping only the most recent per deck
    analyses_by_deck: dict = {}
    for a in analyses:
        deck_id = a["deck_id"]
        if deck_id not in analyses_by_deck or a["created_at"] > analyses_by_deck[deck_id]["created_at"]:
            analyses_by_deck[deck_id] = a

    user_deck_ids = {d["moxfield_id"] for d in user_decks}

    result = []

    # Library decks with optional analysis overlay
    for deck in user_decks:
        mid = deck["moxfield_id"]
        analysis = analyses_by_deck.get(mid)
        rj = analysis["result_json"] if analysis else {}
        result.append({
            "moxfield_id": mid,
            "deck_name": deck["deck_name"],
            "moxfield_url": deck["moxfield_url"],
            "added_at": deck["added_at"],
            "analyzed": analysis is not None,
            "commander": rj.get("commander"),
            "commander_image_uri": deck.get("commander_image_uri"),
            "partner_image_uri": deck.get("partner_image_uri"),
            "format": deck.get("format", "commander"),
            "colors": rj.get("colors") or rj.get("color_identity"),
            "themes": rj.get("themes", []),
            "verdict": rj.get("verdict"),
            "power_level": rj.get("power_level"),
        })

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
                if commander_obj and isinstance(commander_obj, dict):
                    commander_image_uri = commander_obj.get("image_uri")
                if partner_obj and isinstance(partner_obj, dict):
                    partner_image_uri = partner_obj.get("image_uri")
        except Exception:
            pass  # Silently fail for legacy entries
        
        result.append({
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
        })

    result.sort(key=lambda x: x.get("added_at") or "", reverse=True)
    return {"decks": result}
