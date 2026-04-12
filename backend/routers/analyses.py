import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from auth import require_allowed_user

router = APIRouter()


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


@router.get("/history")
def get_history(
    page: int = 1,
    user: dict = Depends(require_allowed_user),
):
    """Return paginated analysis history for the current user."""
    sb = _supabase()
    page_size = 10
    offset = (page - 1) * page_size

    result = (
        sb.table("analyses")
        .select("id, deck_id, deck_name, moxfield_url, deck_updated_at, result_json, created_at")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    analyses = []
    for row in result.data:
        rj = row.get("result_json") or {}
        analyses.append({
            **row,
            "verdict": rj.get("verdict"),
        })

    return {"analyses": analyses, "page": page}
