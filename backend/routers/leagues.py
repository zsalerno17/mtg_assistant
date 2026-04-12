"""League/pod tracking endpoints for Commander Gauntlet-style weekly play."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, HttpUrl, validator
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from urllib.parse import urlparse

from auth import require_user_id, get_user_supabase_client

router = APIRouter(prefix="/leagues", tags=["leagues"])


# ============================================================================
# URL VALIDATION HELPERS (Security: prevent XSS/SSRF)
# ============================================================================

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


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class LeagueCreate(BaseModel):
    """Create a new league/season."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    season_start: date
    season_end: date
    status: str = Field(default="active", pattern="^(draft|active|completed)$")


class LeagueUpdate(BaseModel):
    """Update league metadata."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    season_start: Optional[date] = None
    season_end: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(draft|active|completed)$")


class MemberJoin(BaseModel):
    """Join a league as a new member."""
    superstar_name: str = Field(..., min_length=1, max_length=100)
    entrance_music_url: Optional[HttpUrl] = None
    catchphrase: Optional[str] = None
    
    _validate_url = validator('entrance_music_url', allow_reuse=True)(validate_http_url)


class MemberUpdate(BaseModel):
    """Update member profile."""
    superstar_name: Optional[str] = Field(None, min_length=1, max_length=100)
    entrance_music_url: Optional[HttpUrl] = None
    catchphrase: Optional[str] = None
    current_title: Optional[str] = None
    
    _validate_url = validator('entrance_music_url', allow_reuse=True)(validate_http_url)


class GameLog(BaseModel):
    """Log a new game session."""
    game_number: int = Field(..., ge=1)
    played_at: Optional[datetime] = None
    screenshot_url: Optional[HttpUrl] = None
    spicy_play_description: Optional[str] = None
    spicy_play_winner_id: Optional[UUID] = None
    entrance_winner_id: Optional[UUID] = None
    notes: Optional[str] = None
    
    _validate_url = validator('screenshot_url', allow_reuse=True)(validate_http_url)


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
    """List all leagues the user is a member of or created."""
    try:
        # Get leagues where user is a member
        result = supabase.table("leagues") \
            .select("*, league_members!inner(user_id)") \
            .eq("league_members.user_id", user_id) \
            .execute()
        
        return {"leagues": result.data}
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
        # Verify membership
        membership = supabase.table("league_members") \
            .select("id") \
            .eq("league_id", league_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this league")
        
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
        payload["updated_at"] = datetime.utcnow().isoformat()
        
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
        # Verify membership
        membership = supabase.table("league_members") \
            .select("id") \
            .eq("league_id", league_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this league")
        
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
        # Verify membership
        membership = supabase.table("league_members") \
            .select("id") \
            .eq("league_id", league_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this league")
        
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
            "played_at": game.played_at.isoformat() if game.played_at else datetime.utcnow().isoformat(),
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
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)
):
    """List all games in a league."""
    try:
        # Verify membership
        membership = supabase.table("league_members") \
            .select("id") \
            .eq("league_id", league_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this league")
        
        result = supabase.table("league_games") \
            .select("*, league_game_results(*, league_members(superstar_name), user_decks(deck_name))") \
            .eq("league_id", league_id) \
            .order("game_number", desc=True) \
            .execute()
        
        return {"games": result.data}
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
        # Verify membership
        membership = supabase.table("league_members") \
            .select("id") \
            .eq("league_id", league_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this league")
        
        # Use helper function from migration
        result = supabase.rpc("get_league_standings", {"league_uuid": league_id}).execute()
        
        return {"standings": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
