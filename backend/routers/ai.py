import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from auth import require_allowed_user
from src.moxfield import get_deck, parse_moxfield_deck
from src.deck_analyzer import analyze_deck
from src.gemini_assistant import get_strategy_advice, get_improvement_suggestions, explain_scenarios

router = APIRouter()


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


def _load_deck(moxfield_id: str):
    try:
        raw = get_deck(moxfield_id)
        return parse_moxfield_deck(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not load deck: {str(e)}")


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
    deck = _load_deck(body.moxfield_id)
    analysis = analyze_deck(deck)

    # Load user's collection for context
    sb = _supabase()
    col_result = sb.table("collections").select("cards_json").eq("user_id", user["user_id"]).execute()
    collection_cards = col_result.data[0]["cards_json"] if col_result.data else []

    advice = get_strategy_advice(deck, analysis)
    return {"strategy": advice}


@router.post("/improvements")
def improvements(body: ImprovementsRequest, user: dict = Depends(require_allowed_user)):
    deck = _load_deck(body.moxfield_id)
    analysis = analyze_deck(deck)

    sb = _supabase()
    col_result = sb.table("collections").select("cards_json").eq("user_id", user["user_id"]).execute()
    collection_cards = col_result.data[0]["cards_json"] if col_result.data else []

    suggestions = get_improvement_suggestions(deck, analysis, collection_cards)
    return {"improvements": suggestions}


@router.post("/scenarios")
def scenarios(body: ScenariosRequest, user: dict = Depends(require_allowed_user)):
    if not body.cards_to_add and not body.cards_to_remove:
        raise HTTPException(status_code=400, detail="Provide at least one card to add or remove.")

    deck = _load_deck(body.moxfield_id)
    analysis = analyze_deck(deck)

    result = explain_scenarios(deck, analysis, body.cards_to_add, body.cards_to_remove)
    return {"scenarios": result}
