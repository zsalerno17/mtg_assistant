# Fix: Key Cards Validation in Strategy Section

**Status:** Planned  
**Priority:** High (User-Facing Bug)  
**Created:** 2026-04-12

## Problem Statement

The strategy section of deck analysis displays "key cards" that are not actually present in the analyzed deck. The AI (Gemini) generates card suggestions that get displayed without validation against the actual deck list.

### User Impact
- Users see recommendations for cards they don't own or aren't playing
- Undermines trust in the analysis feature
- Confusing user experience when key cards don't match their deck

## Root Cause Analysis

The bug exists in both Python and TypeScript implementations:

1. **AI Generation**: Gemini receives the full deck list in the prompt but sometimes:
   - Hallucinates cards that would fit the strategy but aren't in the deck
   - Suggests staple cards it thinks should be included
   - Makes name matching errors

2. **No Validation Layer**: After parsing the AI's JSON response, the code returns `key_cards` directly without checking if each card name exists in `deck.mainboard`

3. **Cached Results**: Invalid suggestions get cached in `strategy_v2` cache, persisting the bug across requests

### Affected Code Paths

**Python Backend:**
- File: `backend/src/gemini_assistant.py`
- Function: `get_strategy_advice()` (lines 147-177)
- Issue: Parses AI JSON at line 167, returns without validation

**TypeScript Edge Functions:**
- File: `supabase/functions/_shared/gemini.ts`
- Function: `getStrategyAdvice()` (lines 213-255)
- Issue: Identical validation gap as Python version

**API Endpoint:**
- File: `backend/routers/ai.py`
- Function: `strategy()` (lines 103-123)
- Note: Returns AI response as-is, no filtering layer

**Frontend Display:**
- File: `frontend/src/pages/DeckPage.jsx`
- Component: `StrategyTab` (lines 648-651)
- Note: Displays key_cards without client-side validation (trusts backend)

## Solution Design

### Approach: Post-Generation Filtering

Filter AI-generated key cards immediately after JSON parsing, before returning or caching the result.

**Advantages:**
- Centralizes validation at data entry point
- Prevents invalid data from entering cache
- No frontend changes needed
- Handles both implementations consistently

**Validation Logic:**
```python
# Build set of actual card names in deck
deck_card_names = {c.name for c in deck.mainboard}

# Filter key_cards to only include cards actually in the deck
if "key_cards" in parsed:
    valid_key_cards = [
        kc for kc in parsed.get("key_cards", [])
        if kc.get("name") in deck_card_names
    ]
    parsed["key_cards"] = valid_key_cards
```

### Implementation Steps

#### 1. Fix Python Implementation

**File:** `backend/src/gemini_assistant.py`  
**Function:** `get_strategy_advice()`  
**Location:** After line 167 (after `parsed = _try_parse_json(raw)`)

```python
def get_strategy_advice(deck, analysis: dict) -> dict:
    """Returns {content: dict, ai_enhanced: bool}. Content is a structured JSON object."""
    context = _deck_context(deck, analysis)
    prompt = f"""[...existing prompt...]"""
    
    raw = _ask(prompt)
    if raw:
        parsed = _try_parse_json(raw)
        if parsed and "game_plan" in parsed:
            # ✅ NEW: Validate key_cards against actual deck
            deck_card_names = {c.name for c in deck.mainboard}
            if "key_cards" in parsed:
                valid_key_cards = [
                    kc for kc in parsed.get("key_cards", [])
                    if kc.get("name") in deck_card_names
                ]
                parsed["key_cards"] = valid_key_cards
            
            return {"content": parsed, "ai_enhanced": True}
    
    return {"content": _fallback_strategy(deck, analysis), "ai_enhanced": False}
```

#### 2. Fix TypeScript Implementation

**File:** `supabase/functions/_shared/gemini.ts`  
**Function:** `getStrategyAdvice()`  
**Location:** After parsing JSON response

```typescript
export async function getStrategyAdvice(
  deck: Deck,
  analysis: AnalysisDict,
): Promise<{ content: Record<string, unknown>; ai_enhanced: boolean }> {
  const context = deckContext(deck, analysis);
  const prompt = `[...existing prompt...]`;
  
  const raw = await ask(prompt);
  if (raw) {
    const parsed = tryParseJson(raw);
    if (parsed && "game_plan" in parsed) {
      // ✅ NEW: Validate key_cards against actual deck
      const deckCardNames = new Set(deck.mainboard.map(c => c.name));
      if (parsed.key_cards && Array.isArray(parsed.key_cards)) {
        parsed.key_cards = parsed.key_cards.filter(
          (kc: any) => kc.name && deckCardNames.has(kc.name)
        );
      }
      
      return { content: parsed, ai_enhanced: true };
    }
  }
  
  return { content: fallbackStrategy(deck, analysis), ai_enhanced: false };
}
```

#### 3. Add Test Coverage

**File:** `backend/tests/test_gemini_assistant.py` (create if needed)

```python
def test_key_cards_validation_filters_invalid_cards():
    """Ensure key_cards are validated against actual deck list"""
    from backend.src.gemini_assistant import get_strategy_advice
    from backend.src.models import Deck, Card
    
    # Create mock deck with known cards
    deck = Deck(
        name="Test Deck",
        commander="Atraxa, Praetors' Voice",
        mainboard=[
            Card(name="Sol Ring", type_line="Artifact", cmc=1),
            Card(name="Cyclonic Rift", type_line="Instant", cmc=2),
            Card(name="Rhystic Study", type_line="Enchantment", cmc=3),
        ]
    )
    
    # Mock AI response with valid and invalid cards
    with patch('backend.src.gemini_assistant._ask') as mock_ask:
        mock_ask.return_value = json.dumps({
            "game_plan": "Control the board",
            "key_cards": [
                {"name": "Sol Ring", "role": "Mana acceleration"},
                {"name": "Mana Crypt", "role": "Fast mana"},  # NOT IN DECK
                {"name": "Rhystic Study", "role": "Card draw"},
            ]
        })
        
        result = get_strategy_advice(deck, {})
        
        # Should filter out Mana Crypt
        assert result["ai_enhanced"] == True
        assert len(result["content"]["key_cards"]) == 2
        card_names = [kc["name"] for kc in result["content"]["key_cards"]]
        assert "Sol Ring" in card_names
        assert "Rhystic Study" in card_names
        assert "Mana Crypt" not in card_names
```

#### 4. Cache Invalidation

**Option A: Manual SQL (Immediate)**
```sql
-- Clear all strategy_v2 cache entries
DELETE FROM ai_cache WHERE cache_type = 'strategy_v2';
```

**Option B: Migration (Systematic)**
```sql
-- Create migration: 011_invalidate_strategy_cache.sql
-- Clear strategy cache affected by key_cards bug
DELETE FROM ai_cache 
WHERE cache_type = 'strategy_v2' 
AND created_at < '2026-04-12';  -- Before fix deployment
```

**Option C: Version Bump (Future-Proof)**
- Change cache key from `strategy_v2` to `strategy_v3` in both implementations
- Old cache entries naturally expire
- Prevents immediate cache stampede

## Verification Plan

### Pre-Deployment Testing

1. **Unit Tests**
   ```bash
   cd backend
   pytest tests/test_gemini_assistant.py::test_key_cards_validation -v
   ```

2. **Integration Test with Real Deck**
   - Use known Moxfield deck ID that previously showed invalid cards
   - Clear cache for that deck
   - Trigger new analysis via API
   - Verify `key_cards` array only contains mainboard cards

3. **Edge Cases**
   - Deck with no AI-suggested key cards (should return empty array)
   - Card name with special characters or apostrophes
   - Card name case sensitivity (should match exactly)
   - Fallback strategy path still works

### Post-Deployment Monitoring

1. **Metric:** % of strategy requests returning 0 key_cards
   - Baseline before fix
   - Monitor for unexpected spike (indicates over-filtering)

2. **Spot Check:** Random sample of 10 deck analyses
   - Manually verify each key_card appears in deck's mainboard
   - Check for false negatives (valid cards incorrectly filtered)

3. **User Feedback:** Monitor support channels for reports of:
   - ✅ "Key cards now match my deck" (success)
   - ❌ "Key cards section is empty" (investigate)

## Rollout Strategy

### Phase 1: Backend Deployment
1. Deploy Python backend changes to production
2. Clear `strategy_v2` cache entries
3. Monitor error rates and response times
4. Test with subset of users

### Phase 2: Edge Functions Deployment
1. Deploy TypeScript changes to Supabase edge functions
2. Run smoke tests on key endpoints
3. Full production rollout

### Rollback Plan
- Git revert commits
- Restore previous service deployment
- Cache will naturally repopulate with old behavior

## Future Improvements

### Short-Term (Post-Fix)
- **Logging**: Add structured log when cards are filtered out
  - Track which cards AI suggests but aren't in deck
  - May reveal systematic hallucination patterns
  
- **Metrics**: Instrument filter hit rate
  ```python
  total_suggested = len(parsed.get("key_cards", []))
  total_valid = len(valid_key_cards)
  if total_suggested > total_valid:
      logger.info(f"Filtered {total_suggested - total_valid} invalid key cards")
  ```

### Medium-Term
- **Prompt Engineering**: Strengthen AI constraints
  ```
  CRITICAL: Only suggest cards from the provided decklist.
  Do not recommend cards that are not currently in the deck.
  ```

- **Fuzzy Matching**: Handle near-matches due to special characters
  - "Urza's Saga" vs "Urza's Saga" (different apostrophes)
  - Use Scryfall API name normalization

### Long-Term
- **AI Fine-Tuning**: Train model on validated MTG deck analysis examples
- **Structured Output**: Use Gemini's structured output mode (when available) to enforce schema compliance
- **Fallback to Deterministic Key Cards**: If AI filtering removes >50% of suggestions, use heuristic-based key card selection instead

## Related Issues

- Potentially affects other AI-generated content (sideboard suggestions, upgrade recommendations)
- Consider applying similar validation to:
  - `get_synergies()` — may suggest cards not in deck
  - `get_upgrade_suggestions()` — intentionally suggests cards NOT in deck (different use case)

## References

- **Exploration Report:** Session memory `/memories/session/plan.md`
- **Backend AI Module:** `backend/src/gemini_assistant.py`
- **Edge Function AI Module:** `supabase/functions/_shared/gemini.ts`
- **API Endpoint:** `backend/routers/ai.py`
- **Frontend Display:** `frontend/src/pages/DeckPage.jsx`

---

**Implementation Checklist:**
- [ ] Update Python `get_strategy_advice()` with validation
- [ ] Update TypeScript `getStrategyAdvice()` with validation  
- [ ] Add unit test for key_cards filtering
- [ ] Test with real deck data
- [ ] Clear strategy_v2 cache
- [ ] Deploy backend changes
- [ ] Deploy edge function changes
- [ ] Verify in production with sample decks
- [ ] Monitor metrics for anomalies
- [ ] Document in release notes
