"""
Auth dependency: verifies Supabase JWT and checks the allow-list.
Usage: add `user: dict = Depends(require_allowed_user)` to any protected route.
"""
import os
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

logger = logging.getLogger(__name__)
bearer = HTTPBearer()


def _supabase():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_ANON_KEY"]
    return create_client(url, key)


def _service_supabase():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def require_allowed_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials

    # Use Supabase's own auth.get_user() to verify the token — avoids algorithm
    # compatibility issues with python-jose and Supabase's JWT format.
    sb = _supabase()
    try:
        response = sb.auth.get_user(token)
        user = response.user
    except Exception as e:
        logger.warning("Supabase get_user failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    email = user.email
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing email claim",
        )

    # Query allowed_users using service role key (bypasses RLS).
    srv_sb = _service_supabase()
    result = srv_sb.table("allowed_users").select("email").eq("email", email).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not authorized. Contact the administrator.",
        )

    return {"email": email, "user_id": user.id}
