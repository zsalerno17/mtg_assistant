import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from supabase import create_client

from auth import require_allowed_user
from src.collection import parse_moxfield_csv, parse_text_list

router = APIRouter()


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@router.post("/upload")
async def upload_collection(
    file: UploadFile = File(...),
    user: dict = Depends(require_allowed_user),
):
    """Parse a Moxfield CSV export and upsert the user's collection."""
    content = (await file.read()).decode("utf-8")

    if file.filename and file.filename.endswith(".csv"):
        cards = parse_moxfield_csv(content)
    else:
        cards = parse_text_list(content)

    if not cards:
        raise HTTPException(status_code=400, detail="No cards parsed from file. Check the format.")

    cards_data = [{"name": c.name, "quantity": c.quantity} for c in cards]

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
