"""League/pod tracking endpoints for Commander Gauntlet-style weekly play."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

from auth import require_user_id, get_supabase_client

router = APIRouter(prefix="/leagues", tags=["leagues"])


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
    entrance_music_url: Optional[str] = None
    catchphrase: Optional[str] = None


class MemberUpdate(BaseModel):
    """Update member profile."""
    superstar_name: Optional[str] = Field(None, min_length=1, max_length=100)
    entrance_music_url: Optional[str] = None
    catchphrase: Optional[str] = None
    current_title: Optional[str] = None


class GameLog(BaseModel):
    """Log a new game session."""
    game_number: int = Field(..., ge=1)
    played_at: Optional[datetime] = None
    screenshot_url: Optional[str] = None
    spicy_play_description: Optional[str] = None
    spicy_play_winner_id: Optional[UUID] = None
    entrance_winner_id: Optional[UUID] = None
    notes: Optional[str] = None


class GameResultLog(BaseModel):
    """Individual player result for a game."""
    member_id: UUID
    deck_id: Optional[UUID] = None
    placement: int = Field(..., ge=1, le=10)  # Support up to 10-player pods
    earned_win: bool = False
    earned_first_blood: bool = False
    earned_last_stand: bool = False
    earned_entrance_bonus: bool = False
    notes: Optional[str] = None


class GameWithResults(BaseModel):
    """Log a game and all player results in one request."""
    game: GameLog
    results: List[GameResultLog]


# ============================================================================
# LEAGUE MANAGEMENT
# ============================================================================

@router.post("")
async def create_league(league: LeagueCreate, user_id: str = Depends(require_user_id)):
    """Create a new league/season."""
    supabase = get_supabase_client()
    
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
async def list_leagues(user_id: str = Depends(require_user_id)):
    """List all leagues the user is a member of or created."""
    supabase = get_supabase_client()
    
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
async def get_league(league_id: str, user_id: str = Depends(require_user_id)):
    """Get league details."""
    supabase = get_supabase_client()
    
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
    user_id: str = Depends(require_user_id)
):
    """Update league metadata (creator only)."""
    supabase = get_supabase_client()
    
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
async def delete_league(league_id: str, user_id: str = Depends(require_user_id)):
    """Delete a league (creator only)."""
    supabase = get_supabase_client()
    
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
    user_id: str = Depends(require_user_id)
):
    """Join a league as a new member."""
    supabase = get_supabase_client()
    
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
async def list_members(league_id: str, user_id: str = Depends(require_user_id)):
    """List all members in a league."""
    supabase = get_supabase_client()
    
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
    user_id: str = Depends(require_user_id)
):
    """Update member profile (own profile only)."""
    supabase = get_supabase_client()
    
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
    user_id: str = Depends(require_user_id)
):
    """Log a game session with all player results."""
    supabase = get_supabase_client()
    
    try:
        # Verify membership
        membership = supabase.table("league_members") \
            .select("id") \
            .eq("league_id", league_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Not a member of this league")
        
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
            # Calculate total points
            points = 0
            if result.earned_win:
                points += 3
            if result.earned_first_blood:
                points += 1
            if result.earned_last_stand:
                points += 1
            if result.earned_entrance_bonus:
                points += 1
            
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
async def list_games(league_id: str, user_id: str = Depends(require_user_id)):
    """List all games in a league."""
    supabase = get_supabase_client()
    
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
async def get_standings(league_id: str, user_id: str = Depends(require_user_id)):
    """Get current standings for a league."""
    supabase = get_supabase_client()
    
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
