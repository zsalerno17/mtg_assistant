import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from auth import require_allowed_user
from src.moxfield import get_deck
from src.deck_analyzer import analyze_deck, find_collection_improvements, scenarios_fallback
from src.gemini_assistant import get_strategy_advice, get_improvement_suggestions, explain_scenarios
from src.models import Card, Collection, Deck

router = APIRouter()
logger = logging.getLogger(__name__)


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def _deck_from_cache(sb, moxfield_id: str):
    """Reconstruct a Deck object from the Supabase decks cache, or return None."""
    result = sb.table("decks").select("data_json").eq("moxfield_id", moxfield_id).execute()
    if not result.data:
        return None
    d = result.data[0]["data_json"]

    def _card(raw) -> Card:
        if raw is None:
            return None
        return Card(
            name=raw.get("name", ""),
            quantity=raw.get("quantity", 1),
            mana_cost=raw.get("mana_cost", ""),
            cmc=float(raw.get("cmc", 0)),
            type_line=raw.get("type_line", ""),
            oracle_text=raw.get("oracle_text", ""),
            colors=raw.get("colors", []),
            color_identity=raw.get("color_identity", []),
            keywords=raw.get("keywords", []),
            rarity=raw.get("rarity", ""),
            set_code=raw.get("set_code", ""),
            image_uri=raw.get("image_uri", ""),
            scryfall_id=raw.get("scryfall_id", ""),
        )

    return Deck(
        id=d.get("id", moxfield_id),
        name=d.get("name", ""),
        format=d.get("format", "commander"),
        commander=_card(d.get("commander")),
        partner=_card(d.get("partner")),
        mainboard=[_card(c) for c in d.get("mainboard", [])],
        sideboard=[_card(c) for c in d.get("sideboard", [])],
    )


def _load_deck(moxfield_id: str):
    sb = _supabase()
    try:
        return get_deck(moxfield_id)
    except Exception as e:
        # Moxfield unreachable (e.g. datacenter IP block in production) — fall back to Supabase cache
        deck = _deck_from_cache(sb, moxfield_id)
        if deck:
            logger.warning("Moxfield 403/error for %s, using Supabase deck cache: %s", moxfield_id, e)
            return deck
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
    cached = _get_cached(sb, cache_key, "improvements_v3")
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

    # --- Post-process: validate swaps, merge legacy cuts/additions, add truthful owned flags ---
    content = result["content"]
    mainboard_lower = {c.name.lower() for c in deck.mainboard}
    owned_lower = {c["name"].lower() for c in collection_cards} if collection_cards else set()

    # Remove urgent_fixes that are already in the deck
    if content.get("urgent_fixes"):
        content["urgent_fixes"] = [
            f for f in content["urgent_fixes"]
            if f.get("card", "").lower() not in mainboard_lower
        ][:5]

    # Process swaps: validate cut is in deck, add is not in deck, add owned flag
    raw_swaps = list(content.get("swaps") or [])

    # Backwards compat: merge old-format cuts + additions into swaps if Gemini returned old format
    old_cuts = list(content.get("cuts") or [])
    old_adds = list(content.get("additions") or [])
    if old_cuts and not raw_swaps:
        # Pair old cuts with old additions by index
        for i, cut in enumerate(old_cuts):
            if i < len(old_adds):
                raw_swaps.append({
                    "cut": cut.get("card", ""),
                    "add": old_adds[i].get("card", ""),
                    "reason": old_adds[i].get("reason", cut.get("reason", "")),
                    "category": cut.get("type", "upgrade"),
                    "price_tier": old_adds[i].get("price_tier", "mid"),
                })
        # Remaining additions that weren't paired become unpaired additions
        unpaired_adds = old_adds[len(old_cuts):]
    else:
        unpaired_adds = old_adds

    content.pop("cuts", None)

    # Validate swaps: cut must be in deck, add must not be in deck
    validated_swaps = []
    for swap in raw_swaps:
        cut_name = swap.get("cut", "").lower()
        add_name = swap.get("add", "").lower()
        if cut_name in mainboard_lower and add_name not in mainboard_lower:
            swap["owned"] = add_name in owned_lower
            validated_swaps.append(swap)
    content["swaps"] = validated_swaps[:8]

    # Merge any staples_to_buy into additions (backwards compat with old Gemini responses)
    merged_additions = list(content.get("additions") or []) + unpaired_adds
    for s in (content.get("staples_to_buy") or []):
        if not any(a.get("card", "").lower() == s.get("card", "").lower() for a in merged_additions):
            merged_additions.append(s)
    content.pop("staples_to_buy", None)

    # Filter out cards already in deck, add truthful owned flag
    content["additions"] = [
        {**a, "owned": a.get("card", "").lower() in owned_lower}
        for a in merged_additions
        if a.get("card", "").lower() not in mainboard_lower
    ][:10]

    # Only cache AI-generated responses
    if result["ai_enhanced"] and content:
        _set_cached(sb, cache_key, "improvements_v3", json.dumps(content))

    return {"improvements": result["content"], "ai_enhanced": result["ai_enhanced"], "cached": False}


@router.post("/scenarios")
def scenarios(body: ScenariosRequest, user: dict = Depends(require_allowed_user)):
    if not body.cards_to_add and not body.cards_to_remove:
        raise HTTPException(status_code=400, detail="Provide at least one card to add or remove.")

    deck = _load_deck(body.moxfield_id)
    analysis = analyze_deck(deck)

    try:
        result = explain_scenarios(deck, analysis, body.cards_to_add, body.cards_to_remove)
        # explain_scenarios returns a plain dict (before/after AI prose).
        # Check if it looks like a real AI result vs the generic fallback.
        # The gemini fallback returns a static game_plan string — we detect it by
        # checking whether the result came from Gemini or the static _fallback_scenarios.
        # Since explain_scenarios doesn't expose ai_enhanced, we wrap it here.
        ai_enhanced = bool(
            result.get("before", {}).get("game_plan") and
            result["before"]["game_plan"] != "Current deck strategy based on existing card composition."
        )
    except Exception as e:
        logger.warning("explain_scenarios failed: %s", e)
        ai_enhanced = False
        result = None

    if not ai_enhanced:
        fallback = scenarios_fallback(deck, body.cards_to_add, body.cards_to_remove)
        return {"scenarios": fallback, "ai_enhanced": False}

    return {"scenarios": result, "ai_enhanced": True}


class CollectionUpgradesRequest(BaseModel):
    moxfield_id: str


@router.post("/collection-upgrades")
def collection_upgrades(body: CollectionUpgradesRequest, user: dict = Depends(require_allowed_user)):
    """Rule-based collection-vs-deck comparison. Returns swap suggestions."""
    try:
        sb = _supabase()

        col_result = sb.table("collections").select("cards_json").eq("user_id", user["user_id"]).execute()
        if not col_result.data or not col_result.data[0]["cards_json"]:
            return {"upgrades": [], "has_collection": False}

        deck = _load_deck(body.moxfield_id)
        
        # Reconstruct Card objects with all enriched fields from DB
        collection = Collection(
            cards=[
                Card(
                    name=c["name"],
                    quantity=c.get("quantity", 1),
                    cmc=c.get("cmc", 0.0),
                    type_line=c.get("type_line", ""),
                    oracle_text=c.get("oracle_text", ""),
                    color_identity=c.get("color_identity", []),
                )
                for c in col_result.data[0]["cards_json"]
            ]
        )

        suggestions = find_collection_improvements(deck, collection)

        upgrades = []
        for col_card, cut_card, reason, score, never_cut_reason in suggestions:
            entry = {
                "add": col_card.name,
                "cut": cut_card.name if cut_card else None,
                "reason": reason,
                "score": score,
            }
            if never_cut_reason:
                entry["never_cut_reason"] = never_cut_reason
            upgrades.append(entry)

        return {"upgrades": upgrades, "has_collection": True}
    except Exception as e:
        logger.error(f"collection-upgrades error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error analyzing collection upgrades: {str(e)}")
