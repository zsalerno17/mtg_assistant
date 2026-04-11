import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from auth import require_allowed_user
from src.moxfield import get_deck
from src.deck_analyzer import analyze_deck, find_collection_improvements
from src.gemini_assistant import get_strategy_advice, get_improvement_suggestions, explain_scenarios
from src.models import Card, Collection

router = APIRouter()
logger = logging.getLogger(__name__)


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def _load_deck(moxfield_id: str):
    try:
        return get_deck(moxfield_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not load deck: {str(e)}")


def _get_cached(sb, deck_id: str, cache_type: str):
    """Return cached AI result string, or None if not cached."""
    result = sb.table("ai_cache").select("result").eq("deck_id", deck_id).eq("cache_type", cache_type).execute()
    return result.data[0]["result"] if result.data else None


def _set_cached(sb, deck_id: str, cache_type: str, result: str):
    """Upsert an AI result into the cache."""
    try:
        sb.table("ai_cache").upsert(
            {"deck_id": deck_id, "cache_type": cache_type, "result": result},
            on_conflict="deck_id,cache_type",
        ).execute()
    except Exception as e:
        logger.warning("Failed to write ai_cache: %s", e)


class StrategyRequest(BaseModel):
    moxfield_id: str


class ImprovementsRequest(BaseModel):
    moxfield_id: str


class ScenariosRequest(BaseModel):
    moxfield_id: str
    cards_to_add: list[str]
    cards_to_remove: list[str]


@router.post("/strategy")
def strategy(body: StrategyRequest, user: dict = Depends(require_allowed_user)):
    sb = _supabase()

    # Serve from cache if available
    cached = _get_cached(sb, body.moxfield_id, "strategy_v2")
    if cached:
        logger.info("ai_cache hit: strategy/%s", body.moxfield_id)
        try:
            return {"strategy": json.loads(cached), "ai_enhanced": True, "cached": True}
        except (json.JSONDecodeError, TypeError):
            pass

    deck = _load_deck(body.moxfield_id)
    analysis = analyze_deck(deck)
    result = get_strategy_advice(deck, analysis)

    # Only cache AI-generated responses
    if result["ai_enhanced"] and result["content"]:
        _set_cached(sb, body.moxfield_id, "strategy_v2", json.dumps(result["content"]))

    return {"strategy": result["content"], "ai_enhanced": result["ai_enhanced"], "cached": False}


@router.post("/improvements")
def improvements(body: ImprovementsRequest, user: dict = Depends(require_allowed_user)):
    sb = _supabase()

    # Improvements are user-collection-aware so cache key includes user_id
    cache_key = f"{body.moxfield_id}:{user['user_id']}"
    cached = _get_cached(sb, cache_key, "improvements_v2")
    if cached:
        logger.info("ai_cache hit: improvements/%s", body.moxfield_id)
        try:
            return {"improvements": json.loads(cached), "ai_enhanced": True, "cached": True}
        except (json.JSONDecodeError, TypeError):
            pass

    deck = _load_deck(body.moxfield_id)
    analysis = analyze_deck(deck)

    col_result = sb.table("collections").select("cards_json").eq("user_id", user["user_id"]).execute()
    collection_cards = col_result.data[0]["cards_json"] if col_result.data else []

    result = get_improvement_suggestions(deck, analysis, collection_cards)

    # --- Post-process: filter, cap, and add truthful owned flags ---
    content = result["content"]
    mainboard_lower = {c.name.lower() for c in deck.mainboard}
    owned_lower = {c["name"].lower() for c in collection_cards} if collection_cards else set()

    # Remove urgent_fixes / additions that are already in the deck
    if content.get("urgent_fixes"):
        content["urgent_fixes"] = [
            f for f in content["urgent_fixes"]
            if f.get("card", "").lower() not in mainboard_lower
        ][:5]
    if content.get("additions"):
        content["additions"] = [
            {**a, "owned": a.get("card", "").lower() in owned_lower}
            for a in content["additions"]
            if a.get("card", "").lower() not in mainboard_lower
        ][:5]
    if content.get("cuts"):
        content["cuts"] = content["cuts"][:5]
    if content.get("staples_to_buy"):
        content["staples_to_buy"] = content["staples_to_buy"][:5]

    # Only cache AI-generated responses
    if result["ai_enhanced"] and content:
        _set_cached(sb, cache_key, "improvements_v2", json.dumps(content))

    return {"improvements": result["content"], "ai_enhanced": result["ai_enhanced"], "cached": False}


@router.post("/scenarios")
def scenarios(body: ScenariosRequest, user: dict = Depends(require_allowed_user)):
    if not body.cards_to_add and not body.cards_to_remove:
        raise HTTPException(status_code=400, detail="Provide at least one card to add or remove.")

    deck = _load_deck(body.moxfield_id)
    analysis = analyze_deck(deck)

    result = explain_scenarios(deck, analysis, body.cards_to_add, body.cards_to_remove)
    return {"scenarios": result}


class CollectionUpgradesRequest(BaseModel):
    moxfield_id: str


@router.post("/collection-upgrades")
def collection_upgrades(body: CollectionUpgradesRequest, user: dict = Depends(require_allowed_user)):
    """Rule-based collection-vs-deck comparison. Returns swap suggestions."""
    sb = _supabase()

    col_result = sb.table("collections").select("cards_json").eq("user_id", user["user_id"]).execute()
    if not col_result.data or not col_result.data[0]["cards_json"]:
        return {"upgrades": [], "has_collection": False}

    deck = _load_deck(body.moxfield_id)
    collection = Collection(
        cards=[Card(name=c["name"], quantity=c.get("quantity", 1)) for c in col_result.data[0]["cards_json"]]
    )

    suggestions = find_collection_improvements(deck, collection)

    upgrades = []
    for col_card, cut_card, reason in suggestions:
        entry = {
            "add": col_card.name,
            "cut": cut_card.name if cut_card else None,
            "reason": reason,
        }
        upgrades.append(entry)

    return {"upgrades": upgrades, "has_collection": True}
