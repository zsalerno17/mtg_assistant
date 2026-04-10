"""
Auth dependency: verifies Supabase JWT and checks the allow-list.
Usage: add `user: dict = Depends(require_allowed_user)` to any protected route.
"""
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from supabase import create_client

bearer = HTTPBearer()

def _supabase():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_ANON_KEY"]
    return create_client(url, key)


def require_allowed_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    jwt_secret = os.environ["SUPABASE_JWT_SECRET"]

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing email claim",
        )

    sb = _supabase()
    result = sb.table("allowed_users").select("email").eq("email", email).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not authorized. Contact the administrator.",
        )

    return {"email": email, "user_id": payload.get("sub")}
