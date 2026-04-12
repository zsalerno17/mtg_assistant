import os
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from supabase import create_client

from auth import require_allowed_user
from src.collection import parse_moxfield_csv, parse_text_list
from src.scryfall import get_card_by_name

router = APIRouter()


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


@router.post("/upload")
async def upload_collection(
    file: UploadFile = File(...),
    user: dict = Depends(require_allowed_user),
):
    """Parse a Moxfield CSV export and upsert the user's collection."""
    content = (await file.read()).decode("utf-8")

    if file.filename and file.filename.endswith(".csv"):
        collection = parse_moxfield_csv(content)
    else:
        collection = parse_text_list(content)

    if not collection.cards:
        raise HTTPException(status_code=400, detail="No cards parsed from file. Check the format.")

    # Enrich cards with Scryfall data
    enriched = []
    for i, card in enumerate(collection.cards):
        scryfall_card = get_card_by_name(card.name)
        if scryfall_card:
            scryfall_card.quantity = card.quantity
            enriched.append(scryfall_card)
        else:
            # Keep stub card if Scryfall lookup fails
            enriched.append(card)
        
        # Rate limit: 10 requests/sec (Scryfall allows 10/sec max)
        if i < len(collection.cards) - 1:  # Don't sleep after last card
            time.sleep(0.11)

    # Store enriched card data
    cards_data = [
        {
            "name": c.name,
            "quantity": c.quantity,
            "cmc": c.cmc,
            "type_line": c.type_line,
            "oracle_text": c.oracle_text,
            "color_identity": c.color_identity,
        }
        for c in enriched
    ]

    sb = _supabase()
    sb.table("collections").upsert(
        {"user_id": user["user_id"], "cards_json": cards_data},
        on_conflict="user_id",
    ).execute()

    return {"cards_imported": len(cards_data)}


@router.get("/")
def get_collection(user: dict = Depends(require_allowed_user)):
    """Return the authenticated user's stored collection."""
    sb = _supabase()
    result = sb.table("collections").select("cards_json, updated_at").eq("user_id", user["user_id"]).execute()

    if not result.data:
        return {"cards": [], "updated_at": None}

    return {"cards": result.data[0]["cards_json"], "updated_at": result.data[0]["updated_at"]}


@router.get("/summary")
def get_collection_summary(user: dict = Depends(require_allowed_user)):
    """Return card count and last updated timestamp without fetching all card data."""
    sb = _supabase()
    result = sb.table("collections").select("cards_json, updated_at").eq("user_id", user["user_id"]).execute()

    if not result.data:
        return {"count": 0, "last_updated": None}

    cards = result.data[0]["cards_json"] or []
    count = sum(c.get("quantity", 1) for c in cards)
    return {"count": count, "last_updated": result.data[0]["updated_at"]}
