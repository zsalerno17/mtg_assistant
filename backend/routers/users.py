"""
Users router — profile read/update endpoints.
GET  /api/users/profile  → returns the authenticated user's profile (username, avatar_url)
PUT  /api/users/profile  → upserts username and/or avatar_url
"""
import os
import re
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from auth import require_allowed_user

logger = logging.getLogger(__name__)
router = APIRouter()

USERNAME_RE = re.compile(r'^[a-zA-Z0-9_-]{3,20}$')


def _service_supabase():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/profile")
async def get_profile(user: dict = Depends(require_allowed_user)):
    """Return the authenticated user's profile. Returns nulls if no profile row exists yet."""
    sb = _service_supabase()
    result = (
        sb.table("user_profiles")
        .select("username, avatar_url, updated_at")
        .eq("user_id", user["user_id"])
        .execute()
    )
    if result.data:
        return result.data[0]
    return {"username": None, "avatar_url": None, "updated_at": None}


@router.put("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(require_allowed_user)):
    """Update username and/or avatar_url. Only provided fields are changed."""
    # Validate username format
    if body.username is not None:
        if not USERNAME_RE.match(body.username):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Username must be 3–20 characters: letters, numbers, hyphens, and underscores only.",
            )

    # Validate avatar_url is from our Supabase Storage (prevent storing arbitrary external URLs)
    if body.avatar_url is not None:
        supabase_url = os.environ.get("SUPABASE_URL", "")
        allowed_prefix = f"{supabase_url}/storage/v1/object/public/avatars/"
        if not body.avatar_url.startswith(allowed_prefix):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="avatar_url must be a Supabase Storage URL in the avatars bucket.",
            )
        if len(body.avatar_url) > 500:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="avatar_url is too long.",
            )

    sb = _service_supabase()
    now = datetime.now(timezone.utc).isoformat()

    # Check if a profile row already exists
    existing = (
        sb.table("user_profiles")
        .select("user_id")
        .eq("user_id", user["user_id"])
        .execute()
    )

    try:
        if existing.data:
            # Update: only touch the fields that were provided
            patch = {"updated_at": now}
            if body.username is not None:
                patch["username"] = body.username
            if body.avatar_url is not None:
                patch["avatar_url"] = body.avatar_url
            sb.table("user_profiles").update(patch).eq("user_id", user["user_id"]).execute()
        else:
            # Insert new profile row
            sb.table("user_profiles").insert({
                "user_id": user["user_id"],
                "username": body.username,
                "avatar_url": body.avatar_url,
                "updated_at": now,
            }).execute()
    except Exception as e:
        logger.error("Profile update failed for user %s: %s", user["user_id"], e)
        err_str = str(e).lower()
        if "username" in err_str and ("unique" in err_str or "duplicate" in err_str):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That username is already taken.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile.",
        )

    # Return the updated profile
    updated = (
        sb.table("user_profiles")
        .select("username, avatar_url, updated_at")
        .eq("user_id", user["user_id"])
        .execute()
    )
    return updated.data[0] if updated.data else {"username": body.username, "avatar_url": body.avatar_url, "updated_at": now}
