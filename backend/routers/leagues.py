"""League/pod tracking endpoints for Commander Gauntlet-style weekly play."""

import re
import time
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, HttpUrl, validator, root_validator
from typing import Optional, List
from datetime import date, datetime, timezone
from uuid import UUID
from urllib.parse import urlparse

from auth import require_user_id, get_user_supabase_client

router = APIRouter(prefix="/leagues", tags=["leagues"])

# ============================================================================
# RATE LIMITING (in-memory, per-league game logging)
# ============================================================================

_game_log_timestamps: dict[str, list[float]] = defaultdict(list)
GAME_LOG_RATE_LIMIT = 10  # max games per league per hour
GAME_LOG_WINDOW = 3600  # 1 hour in seconds


# ============================================================================
# URL VALIDATION HELPERS (Security: prevent XSS/SSRF)
# ============================================================================

def sanitize_text(text: Optional[str], max_length: int = 5000) -> Optional[str]:
    """Sanitize text input: strip HTML tags, limit length."""
    if text is None:
        return None
    # Strip HTML tags to prevent stored XSS
    clean = re.sub(r'<[^>]+>', '', text)
    # Trim whitespace and enforce max length
    clean = clean.strip()[:max_length]
    return clean if clean else None


def validate_http_url(url: Optional[HttpUrl]) -> Optional[HttpUrl]:
    """
    Validate URL is using http/https and not pointing to localhost/internal IPs.
    Prevents XSS (javascript: scheme) and SSRF (file://, internal network access).
    """
    if url is None:
        return None
    
    parsed = urlparse(str(url))
    
    # Only allow http/https schemes
    if parsed.scheme not in ['http', 'https']:
        raise ValueError('URL must use http or https scheme')
    
    # Block localhost and internal IPs (SSRF prevention)
    blocked_hosts = [
        'localhost', '127.0.0.1', '0.0.0.0', '::1',
        '10.', '172.16.', '192.168.',  # Private IP ranges
    ]
    if parsed.hostname and any(parsed.hostname.startswith(blocked) for blocked in blocked_hosts):
        raise ValueError('URL cannot point to localhost or private network addresses')
    
    return url


def check_game_rate_limit(league_id: str):
    """Enforce rate limit: max 10 games/hour per league."""
    now = time.time()
    timestamps = _game_log_timestamps[league_id]
    # Remove timestamps older than the window
    _game_log_timestamps[league_id] = [t for t in timestamps if now - t < GAME_LOG_WINDOW]
    if len(_game_log_timestamps[league_id]) >= GAME_LOG_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: maximum {GAME_LOG_RATE_LIMIT} games per hour per league"
        )
    _game_log_timestamps[league_id].append(now)


async def verify_league_membership(league_id: str, user_id: str, supabase) -> str:
    """Verify user is a member of the league. Returns member_id. Raises 403 if not."""
    membership = supabase.table("league_members") \
        .select("id") \
        .eq("league_id", league_id) \
        .eq("user_id", user_id) \
        .execute()
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    return membership.data[0]["id"]


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class LeagueCreate(BaseModel):
    """Create a new league/season."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    season_start: date
    season_end: date
    status: str = Field(default="active", pattern="^(draft|active|completed)$")

    @root_validator(skip_on_failure=True)
    def validate_dates(cls, values):
        start = values.get('season_start')
        end = values.get('season_end')
        if start and end and end <= start:
            raise ValueError('season_end must be after season_start')
        return values

    @validator('name')
    def sanitize_name(cls, v):
        return sanitize_text(v, max_length=200)

    @validator('description')
    def sanitize_description(cls, v):
        return sanitize_text(v, max_length=5000)


class LeagueUpdate(BaseModel):
    """Update league metadata."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    season_start: Optional[date] = None
    season_end: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(draft|active|completed)$")

    @validator('name')
    def sanitize_name(cls, v):
        return sanitize_text(v, max_length=200) if v else v

    @validator('description')
    def sanitize_description(cls, v):
        return sanitize_text(v, max_length=5000) if v else v


class MemberJoin(BaseModel):
    """Join a league as a new member."""
    superstar_name: str = Field(..., min_length=1, max_length=100)
    entrance_music_url: Optional[HttpUrl] = None
    catchphrase: Optional[str] = Field(None, max_length=500)
    
    _validate_url = validator('entrance_music_url', allow_reuse=True)(validate_http_url)

    @validator('superstar_name')
    def sanitize_superstar_name(cls, v):
        return sanitize_text(v, max_length=100)

    @validator('catchphrase')
    def sanitize_catchphrase(cls, v):
        return sanitize_text(v, max_length=500) if v else v


class MemberUpdate(BaseModel):
    """Update member profile."""
    superstar_name: Optional[str] = Field(None, min_length=1, max_length=100)
    entrance_music_url: Optional[HttpUrl] = None
    catchphrase: Optional[str] = Field(None, max_length=500)
    current_title: Optional[str] = Field(None, max_length=100)
    
    _validate_url = validator('entrance_music_url', allow_reuse=True)(validate_http_url)

    @validator('superstar_name')
    def sanitize_superstar_name(cls, v):
        return sanitize_text(v, max_length=100) if v else v

    @validator('catchphrase')
    def sanitize_catchphrase(cls, v):
        return sanitize_text(v, max_length=500) if v else v
    
    @validator('current_title')
    def sanitize_current_title(cls, v):
        return sanitize_text(v, max_length=100) if v else v


class GameLog(BaseModel):
    """Log a new game session."""
    game_number: int = Field(..., ge=1)
    played_at: Optional[datetime] = None
    screenshot_url: Optional[HttpUrl] = None
    spicy_play_description: Optional[str] = Field(None, max_length=2000)
    spicy_play_winner_id: Optional[UUID] = None
    entrance_winner_id: Optional[UUID] = None
    notes: Optional[str] = Field(None, max_length=2000)
    
    _validate_url = validator('screenshot_url', allow_reuse=True)(validate_http_url)

    @validator('spicy_play_description')
    def sanitize_spicy_play(cls, v):
        return sanitize_text(v, max_length=2000) if v else v

    @validator('notes')
    def sanitize_notes(cls, v):
        return sanitize_text(v, max_length=2000) if v else v

    @validator('played_at')
    def normalize_timezone(cls, v):
        """Store all times in UTC."""
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)


class GameResultLog(BaseModel):
    """Individual player result for a game."""
    member_id: UUID
    deck_id: Optional[UUID] = None
    placement: int = Field(..., ge=1, le=10)  # Support up to 10-player pods
    
    # New scoring system: standard placement points
    earned_win: bool = False  # 1st = 3pts
    earned_second_place: bool = False  # 2nd = 2pts
    earned_third_place: bool = False  # 3rd = 1pt
    earned_entrance_bonus: bool = False  # +1pt bonus
    
    # Legacy fields for backward compatibility (deprecated)
    earned_first_blood: bool = False  # No longer used
    earned_last_stand: bool = False  # No longer used
    
    notes: Optional[str] = None


class GameWithResults(BaseModel):
    """Log a game and all player results in one request."""
    game: GameLog
    results: List[GameResultLog]


class VoteCast(BaseModel):
    """Cast a vote for a social award."""
    category: str = Field(..., pattern="^(entrance|spicy_play)$")
    nominee_id: UUID


# ============================================================================
# LEAGUE MANAGEMENT
# ============================================================================

@router.post("")
async def create_league(
    league: LeagueCreate,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Create a new league/season."""
    try:
        result = supabase.table("leagues").insert({
            "name": league.name,
            "description": league.description,
            "created_by": user_id,
            "season_start": league.season_start.isoformat(),
            "season_end": league.season_end.isoformat(),
            "status": league.status,
        }).execute()
        
        return {"league": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def list_leagues(
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """List all leagues the user is a member of or created, with member color identities."""
    try:
        # Get leagues where user is a member, with all members expanded
        result = supabase.table("leagues") \
            .select("*, league_members(*, user_profiles(display_name))") \
            .eq("league_members.user_id", user_id) \
            .execute()
        
        leagues = result.data or []
        
        # For each league, aggregate deck colors for each member
        for league in leagues:
            if not league.get("league_members"):
                continue
            
            try:
                # Fetch all game results with deck info for this league
                # (gracefully handle if color_identity column doesn't exist yet)
                game_results = supabase.table("league_game_results") \
                    .select("member_id, user_decks(color_identity), league_games!inner(league_id)") \
                    .eq("league_games.league_id", league["id"]) \
                    .execute()
                
                # Build a map of member_id -> set of colors
                member_colors = {}
                for result_row in (game_results.data or []):
                    member_id = result_row.get("member_id")
                    deck_data = result_row.get("user_decks")
                    if member_id and deck_data and isinstance(deck_data, dict):
                        colors = deck_data.get("color_identity", [])
                        if member_id not in member_colors:
                            member_colors[member_id] = set()
                        member_colors[member_id].update(colors)
                
                # Attach sorted color identity to each member
                for member in league["league_members"]:
                    colors = member_colors.get(member["id"], set())
                    # Sort in WUBRG order
                    sorted_colors = sorted(colors, key=lambda c: "WUBRG".index(c) if c in "WUBRG" else 99)
                    member["deck_color_identity"] = sorted_colors
            except Exception:
                # If color aggregation fails (e.g., column doesn't exist yet), 
                # just leave members without deck_color_identity
                for member in league["league_members"]:
                    member["deck_color_identity"] = []
        
        return {"leagues": leagues}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk/archive")
async def archive_completed_leagues(
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Archive all completed leagues (set status to 'completed' for expired active leagues)."""
    try:
        # Get user's active leagues where season_end has passed
        today = date.today().isoformat()
        
        result = supabase.table("leagues") \
            .select("id, name, league_members!inner(user_id)") \
            .eq("league_members.user_id", user_id) \
            .eq("status", "active") \
            .lt("season_end", today) \
            .execute()
        
        archived_ids = []
        for league in result.data:
            supabase.table("leagues") \
                .update({"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}) \
                .eq("id", league["id"]) \
                .eq("created_by", user_id) \
                .execute()
            archived_ids.append(league["id"])
        
        return {"archived": len(archived_ids), "league_ids": archived_ids}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{league_id}")
async def get_league(
    league_id: str,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Get league details."""
    try:
        await verify_league_membership(league_id, user_id, supabase)
        
        # Get league with members
        result = supabase.table("leagues") \
            .select("*, league_members(*, user_profiles(display_name))") \
            .eq("id", league_id) \
            .single() \
            .execute()
        
        return {"league": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{league_id}")
async def update_league(
    league_id: str,
    updates: LeagueUpdate,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Update league metadata (creator only)."""
    try:
        # Verify creator
        league = supabase.table("leagues") \
            .select("created_by") \
            .eq("id", league_id) \
            .single() \
            .execute()
        
        if league.data["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Only league creator can update")
        
        # Build update payload
        payload = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
        if "season_start" in payload:
            payload["season_start"] = payload["season_start"].isoformat()
        if "season_end" in payload:
            payload["season_end"] = payload["season_end"].isoformat()
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = supabase.table("leagues") \
            .update(payload) \
            .eq("id", league_id) \
            .execute()
        
        return {"league": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{league_id}")
async def delete_league(
    league_id: str,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Delete a league (creator only)."""
    try:
        # Verify creator
        league = supabase.table("leagues") \
            .select("created_by") \
            .eq("id", league_id) \
            .single() \
            .execute()
        
        if league.data["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Only league creator can delete")
        
        supabase.table("leagues").delete().eq("id", league_id).execute()
        return {"message": "League deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# LEAGUE MEMBERSHIP
# ============================================================================

@router.post("/{league_id}/members")
async def join_league(
    league_id: str,
    member: MemberJoin,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Join a league as a new member."""
    try:
        result = supabase.table("league_members").insert({
            "league_id": league_id,
            "user_id": user_id,
            "superstar_name": member.superstar_name,
            "entrance_music_url": member.entrance_music_url,
            "catchphrase": member.catchphrase,
        }).execute()
        
        return {"member": result.data[0]}
    except Exception as e:
        # Check for unique constraint violation
        if "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="Already a member of this league")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{league_id}/members")
async def list_members(
    league_id: str,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """List all members in a league."""
    try:
        await verify_league_membership(league_id, user_id, supabase)
        
        result = supabase.table("league_members") \
            .select("*, user_profiles(display_name, avatar_url)") \
            .eq("league_id", league_id) \
            .execute()
        
        return {"members": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{league_id}/members/{member_id}")
async def update_member(
    league_id: str,
    member_id: str,
    updates: MemberUpdate,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Update member profile (own profile only)."""
    try:
        # Verify it's the user's own member record
        member = supabase.table("league_members") \
            .select("user_id") \
            .eq("id", member_id) \
            .eq("league_id", league_id) \
            .single() \
            .execute()
        
        if member.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Can only update your own profile")
        
        payload = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
        
        result = supabase.table("league_members") \
            .update(payload) \
            .eq("id", member_id) \
            .execute()
        
        return {"member": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{league_id}/members/me")
async def leave_league(
    league_id: str,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Leave a league. Creator cannot leave (must delete league instead)."""
    try:
        # Verify membership
        member_id = await verify_league_membership(league_id, user_id, supabase)
        
        # Check if user is the creator
        league = supabase.table("leagues") \
            .select("created_by") \
            .eq("id", league_id) \
            .single() \
            .execute()
        
        if league.data["created_by"] == user_id:
            raise HTTPException(
                status_code=400,
                detail="League creator cannot leave. Delete the league instead."
            )
        
        # Delete the membership (game results are preserved for historical accuracy)
        supabase.table("league_members") \
            .delete() \
            .eq("id", member_id) \
            .execute()
        
        return {"message": "Successfully left the league"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# LEAGUE INVITE LINKS
# ============================================================================

@router.post("/{league_id}/invite")
async def generate_invite_link(
    league_id: str,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Generate an invite token for a league (creator only)."""
    try:
        # Verify creator
        league = supabase.table("leagues") \
            .select("created_by") \
            .eq("id", league_id) \
            .single() \
            .execute()
        
        if league.data["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Only league creator can generate invite links")
        
        import secrets
        token = secrets.token_urlsafe(32)
        
        # Store invite token
        result = supabase.table("league_invites").insert({
            "league_id": league_id,
            "token": token,
            "created_by": user_id,
        }).execute()
        
        return {"token": token, "invite": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/join/{invite_token}")
async def join_via_invite(
    invite_token: str,
    member: MemberJoin,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Join a league using an invite token."""
    try:
        # Look up the invite
        invite = supabase.table("league_invites") \
            .select("league_id, expires_at, used_count, max_uses") \
            .eq("token", invite_token) \
            .single() \
            .execute()
        
        if not invite.data:
            raise HTTPException(status_code=404, detail="Invalid invite link")
        
        league_id = invite.data["league_id"]
        
        # Check expiration
        if invite.data.get("expires_at"):
            from datetime import datetime as dt
            expires = dt.fromisoformat(invite.data["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expires:
                raise HTTPException(status_code=410, detail="Invite link has expired")
        
        # Check max uses
        if invite.data.get("max_uses") and invite.data.get("used_count", 0) >= invite.data["max_uses"]:
            raise HTTPException(status_code=410, detail="Invite link has reached maximum uses")
        
        # Check if already a member
        existing = supabase.table("league_members") \
            .select("id") \
            .eq("league_id", league_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Already a member of this league")
        
        # Join the league
        result = supabase.table("league_members").insert({
            "league_id": league_id,
            "user_id": user_id,
            "superstar_name": member.superstar_name,
            "entrance_music_url": str(member.entrance_music_url) if member.entrance_music_url else None,
            "catchphrase": member.catchphrase,
        }).execute()
        
        # Increment used_count
        supabase.table("league_invites") \
            .update({"used_count": (invite.data.get("used_count", 0) or 0) + 1}) \
            .eq("token", invite_token) \
            .execute()
        
        return {"member": result.data[0], "league_id": league_id}
    except HTTPException:
        raise
    except Exception as e:
        if "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="Already a member of this league")
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# GAME LOGGING
# ============================================================================

@router.post("/{league_id}/games")
async def log_game(
    league_id: str,
    game_data: GameWithResults,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Log a game session with all player results."""
    try:
        # Rate limiting: max 10 games/hour per league
        check_game_rate_limit(league_id)
        
        await verify_league_membership(league_id, user_id, supabase)
        
        # SECURITY FIX: Validate all member_ids belong to this league
        submitted_member_ids = {str(r.member_id) for r in game_data.results}
        valid_members = supabase.table("league_members") \
            .select("id, user_id") \
            .eq("league_id", league_id) \
            .in_("id", list(submitted_member_ids)) \
            .execute()
        
        valid_member_ids = {m["id"] for m in valid_members.data}
        invalid_members = submitted_member_ids - valid_member_ids
        
        if invalid_members:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid member_ids: {invalid_members}. All players must be league members."
            )
        
        # Create member_id -> user_id mapping for deck validation
        member_to_user = {m["id"]: m["user_id"] for m in valid_members.data}
        
        # SECURITY FIX: Validate deck ownership
        for result in game_data.results:
            if result.deck_id:
                deck = supabase.table("user_decks") \
                    .select("user_id") \
                    .eq("id", str(result.deck_id)) \
                    .single() \
                    .execute()
                
                if not deck.data:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Deck {result.deck_id} not found"
                    )
                
                expected_user = member_to_user[str(result.member_id)]
                if deck.data["user_id"] != expected_user:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Deck {result.deck_id} does not belong to member {result.member_id}"
                    )
        
        # VALIDATION: Check for duplicate placements
        placements = [r.placement for r in game_data.results]
        if len(placements) != len(set(placements)):
            raise HTTPException(
                status_code=400,
                detail="Each player must have a unique placement. Duplicate placements detected."
            )
        
        # 1. Create game record
        game = game_data.game
        game_record = supabase.table("league_games").insert({
            "league_id": league_id,
            "game_number": game.game_number,
            "played_at": game.played_at.isoformat() if game.played_at else datetime.now(timezone.utc).isoformat(),
            "screenshot_url": game.screenshot_url,
            "spicy_play_description": game.spicy_play_description,
            "spicy_play_winner_id": str(game.spicy_play_winner_id) if game.spicy_play_winner_id else None,
            "entrance_winner_id": str(game.entrance_winner_id) if game.entrance_winner_id else None,
            "notes": game.notes,
        }).execute()
        
        game_id = game_record.data[0]["id"]
        
        # 2. Create result records for each player
        results_to_insert = []
        for result in game_data.results:
            # FIXED SCORING SYSTEM: Standard placement points (3-2-1-0) + Entrance Bonus
            # Replaces broken First Blood/Last Stand system that created perverse incentives
            points = 0
            if result.earned_win:
                points += 3  # 1st place
            elif result.earned_second_place:
                points += 2  # 2nd place
            elif result.earned_third_place:
                points += 1  # 3rd place
            # 4th+ place = 0 points
            
            if result.earned_entrance_bonus:
                points += 1  # Social bonus
            
            results_to_insert.append({
                "game_id": game_id,
                "member_id": str(result.member_id),
                "deck_id": str(result.deck_id) if result.deck_id else None,
                "placement": result.placement,
                "earned_win": result.earned_win,
                "earned_first_blood": result.earned_first_blood,
                "earned_last_stand": result.earned_last_stand,
                "earned_entrance_bonus": result.earned_entrance_bonus,
                "total_points": points,
                "notes": result.notes,
            })
        
        results_records = supabase.table("league_game_results") \
            .insert(results_to_insert) \
            .execute()
        
        return {
            "game": game_record.data[0],
            "results": results_records.data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{league_id}/games")
async def list_games(
    league_id: str,
    page: int = 1,
    page_size: int = 20,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """List games in a league with pagination."""
    try:
        await verify_league_membership(league_id, user_id, supabase)
        
        # Clamp page_size to prevent abuse
        page_size = min(max(page_size, 1), 50)
        offset = (max(page, 1) - 1) * page_size
        
        result = supabase.table("league_games") \
            .select("*, league_game_results(*, league_members(superstar_name), user_decks(deck_name))") \
            .eq("league_id", league_id) \
            .order("game_number", desc=True) \
            .range(offset, offset + page_size - 1) \
            .execute()
        
        return {
            "games": result.data,
            "page": page,
            "page_size": page_size,
            "has_more": len(result.data) == page_size
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# STANDINGS
# ============================================================================

@router.get("/{league_id}/standings")
async def get_standings(
    league_id: str,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Get current standings for a league."""
    try:
        await verify_league_membership(league_id, user_id, supabase)
        
        # Use helper function from migration
        result = supabase.rpc("get_league_standings", {"league_uuid": league_id}).execute()
        
        return {"standings": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# VOTING
# ============================================================================

@router.post("/{league_id}/games/{game_id}/votes")
async def cast_vote(
    league_id: str,
    game_id: str,
    vote: VoteCast,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Cast or update a vote for a game award."""
    try:
        member_id = await verify_league_membership(league_id, user_id, supabase)
        
        # Verify game belongs to this league
        game = supabase.table("league_games") \
            .select("id") \
            .eq("id", game_id) \
            .eq("league_id", league_id) \
            .single() \
            .execute()
        if not game.data:
            raise HTTPException(status_code=404, detail="Game not found in this league")
        
        # Verify nominee is a league member
        nominee = supabase.table("league_members") \
            .select("id") \
            .eq("id", str(vote.nominee_id)) \
            .eq("league_id", league_id) \
            .execute()
        if not nominee.data:
            raise HTTPException(status_code=400, detail="Nominee is not a member of this league")
        
        # Upsert vote (one per voter per category per game)
        # Delete existing vote first, then insert
        supabase.table("league_game_votes") \
            .delete() \
            .eq("game_id", game_id) \
            .eq("voter_id", member_id) \
            .eq("category", vote.category) \
            .execute()
        
        result = supabase.table("league_game_votes").insert({
            "game_id": game_id,
            "voter_id": member_id,
            "category": vote.category,
            "nominee_id": str(vote.nominee_id),
        }).execute()
        
        return {"vote": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{league_id}/games/{game_id}/votes")
async def get_votes(
    league_id: str,
    game_id: str,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """Get vote tallies for a game."""
    try:
        await verify_league_membership(league_id, user_id, supabase)
        
        result = supabase.table("league_game_votes") \
            .select("*, league_members!league_game_votes_voter_id_fkey(superstar_name)") \
            .eq("game_id", game_id) \
            .execute()
        
        return {"votes": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
