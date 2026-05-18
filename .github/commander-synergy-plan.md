# Plan: Commander-Specific Synergy Detection

## TL;DR
The collection analyzer currently filters out high-synergy cards because it only checks for generic weaknesses (low ramp/draw/removal). We need to:
1. Add commander oracle text parsing to detect commander-specific synergies (e.g., "life-gain-matters" commanders prioritize cards that trigger on life gain)
2. Integrate EDHREC API to cross-reference community-recommended cards with user's collection
3. Keep weakness-based scoring as fallback for non-synergistic commanders

This fixes the core issue where owned EDHREC-recommended cards never appear in suggestions.

**Approach:** Hybrid model combining rule-based synergy detection (Phases 1-5) with community data (Phase 6).

**Implementation Order:**
- **Sprint 1 (MVP):** Phase 1 (foundation) + Phase 2 (combos) → fixes Willowdusk/Marauding Blight-Priest issue
- **Sprint 2:** Phase 3 (theme deepening) + Phase 4 (quality tiers) → improves suggestion quality
- **Sprint 3:** Phase 5 (AI enhancements) + Phase 6 (EDHREC) → completes hybrid approach

**Scoring Priority (after all phases complete):**
1. Commander combo pieces (0.95+) — highest impact
2. Multi-synergy cards (0.9-1.0) — matches 2+ commander synergies
3. EDHREC community picks (0.85) — top 100 for this commander
4. Single synergy cards (0.85) — triggers on commander ability
5. Theme deepening (0.8) — pushes theme toward critical mass
6. Weakness fills (0.7) — generic gaps (ramp/draw/removal)
7. Quality-tiered staples (0.5-0.9) — Sol Ring > Mind Stone

Cards evaluated once, highest score wins. Multiple sources can boost score (e.g., card is both EDHREC pick AND commander synergy → 0.95).

## Context
- **Root issue:** `findCollectionImprovements` uses weakness-driven scoring only
- **User impact:** Owns Marauding Blight-Priest (perfect for Willowdusk) but never sees it suggested
- **Example deck:** awkk3ttaKkWy7rXAszUTng (Witherbloom Pestilence precon - Willowdusk life-gain commander)

## Implementation Plan

### Phase 1: Commander Oracle Text Parser (Foundation)
**Goal:** Extract synergy keywords from commander abilities → cards that trigger on those abilities get prioritized

1. Add `extractCommanderSynergies(commander: Card): string[]` function
   - Parse oracle text for common patterns: "whenever you [X]", "[X] triggers", "when [X]"
   - Map to synergy categories: "life gain", "sacrifice", "cast spell", "landfall", "+1/+1 counters", "artifact", "enchantment"
   - Return list of detected synergies
   - *Depends on: nothing (new function)*

2. Add `SYNERGY_KEYWORDS` constant map (NOT regex — use `.includes()` for speed)
   - Define keyword arrays for each synergy type
   - Example: `"life gain": ["whenever you gain life", "gain life", "when a player gains life"]`
   - **CRITICAL PERF:** Use `.includes()` not regex — regex in hot loop would add 3-6 seconds
   - *Parallel with step 1*

3. Update `_evaluateCard` to accept `commanderSynergies: string[]` parameter
   - Check if card oracle text matches any commander synergy
   - **Multi-synergy bonus:** +0.1 for each additional synergy matched beyond the first
   - If match found, score 0.9+ with reason "Triggers on commander ability: [synergy]"
   - Example: Card triggers on sacrifice + creates tokens → matches 2 synergies → score 1.0
   - *Depends on steps 1-2*

4. Update `findCollectionImprovements` to call `extractCommanderSynergies`
   - Pass synergies to `_evaluateCard`
   - *Depends on step 3*

**Verification:**
- Test with Willowdusk deck + Marauding Blight-Priest in collection → should appear in top 3 suggestions
- Test with non-synergy card (e.g., Sol Ring for Willowdusk) → should still suggest if fills weakness
- Test with commander that has no parseable synergies → should fall back to weakness-only scoring

---

### Phase 2: Combo Detection (High-Impact Synergies)
**Goal:** Detect two-card combos with commander → score even higher than generic synergies

5. Expand `KNOWN_COMBOS` constant
   - Add commander-specific combos (e.g., Heliod + Walking Ballista)
   - Format: `{ "Card A": ["Card B", "Card C"], ... }`
   - *Parallel with Phase 1*

6. Add `detectCommanderCombo(card: Card, deck: Deck): boolean`
   - Check if card + commander form known combo
   - Check if card completes combo where commander is one piece
   - *Depends on step 5*

7. Update `_evaluateCard` to check for commander combos
   - If combo detected, score 0.95+ with reason "Combo piece — infinite with commander + [card]"
   - *Depends on step 6*

**Verification:**
- Test Heliod commander + Walking Ballista in collection → "Infinite damage combo" reason
- Test Food Chain + any commander → should not trigger (not a commander-specific combo)

---

### Phase 3: Synergy Density Tracking (Theme Deepening)
**Goal:** Detect partial commander themes and suggest completing them to critical mass

8. Add `calculateSynergyDensity(deck: Deck, synergy: string): number`
   - Count cards in deck that match synergy keyword
   - Return percentage of nonland cards
   - **CRITICAL PERF:** Call ONCE before collection loop, not per collection card (would add 600ms)
   - Store results in Map<string, number> and pass to _evaluateCard
   - *Parallel with Phase 1*

9. Define `SYNERGY_CRITICAL_MASS` thresholds
   - "life gain": 12 cards minimum
   - "sacrifice": 10 cards minimum
   - "landfall": 15 cards minimum
   - "+1/+1 counters": 12 cards minimum
   - *Parallel with step 8*

10. Update `_evaluateCard` to boost score for synergy deepening
    - If deck has 6 life-gain cards (below threshold of 12), prioritize owned life-gain cards
    - Reason: "Deepens life-gain synergy (6/12 → critical mass)"
    - *Depends on steps 8-9*

**Verification:**
- Test deck with 8 life-gain cards + owned life-gain card → score 0.85, "Deepens theme" reason
- Test deck with 15 life-gain cards + owned life-gain card → score 0.7, "Fits theme" reason (not urgent)

---

### Phase 4: Quality Tiering (Better Card Prioritization)
**Goal:** Within the same category, prioritize higher-quality cards (Sol Ring > Mind Stone)

11. Add `CARD_QUALITY_TIERS` constant map
    - Define tiers for common staples: `{ "Sol Ring": "S", "Arcane Signet": "A", "Mind Stone": "B" }`
    - Categories: ramp, draw, removal, tutors
    - *Parallel with other phases*

12. Add `getCardQualityBonus(card: Card, category: string): number`
    - Look up card in quality tiers
    - Return score modifier: S-tier +0.2, A-tier +0.1, B-tier +0.0
    - *Depends on step 11*

13. Update `_evaluateCard` to apply quality bonus
    - When suggesting ramp, Sol Ring gets 0.9 base + 0.2 bonus = 1.0 (max)
    - Mind Stone gets 0.7 base + 0.0 bonus = 0.7
    - *Depends on step 12*

**Verification:**
- Test collection with Sol Ring + Mind Stone → Sol Ring appears first
- Test collection with only Mind Stone → still suggests it (no penalty for lower tier)

---

### Phase 5: AI Mode Enhancement (Prompt Improvements)
**Goal:** Pass commander synergies to Gemini so AI suggestions also benefit from synergy awareness

14. Update `getImprovementSuggestions` in `gemini.ts`
    - Extract commander synergies using same parser
    - Add to prompt: "Commander synergies: life gain, +1/+1 counters. Prioritize cards that trigger on these."
    - *Depends on Phase 1 (parser function)*

15. Add commander combo context to prompt
    - "Commander combos: Heliod + Walking Ballista = infinite damage"
    - Gemini can reason about combo pieces more effectively
    - *Depends on Phase 2*

**Verification:**
- Test AI mode with life-gain commander → suggestions should include life-gain triggers
- Test AI mode with combo commander → suggestions should include combo pieces

---

### Phase 6: EDHREC API Integration (Hybrid Approach)
**Goal:** Combine community data with rule-based synergy detection for best-in-class suggestions

16. Add `fetchEDHRECRecommendations(commanderName: string): Promise<string[]>`
    - Call EDHREC API endpoint (research needed: `/commanders/[name]` or similar)
    - Parse response to get top 100 recommended cards for this commander
    - Cache results in Supabase `ai_cache` table (key: `edhrec:[commander_name]`, TTL: 7 days)
    - *Parallel with other phases (can be implemented independently)*

17. Add `crossReferenceWithCollection(edhrecCards: string[], collection: Card[]): Card[]`
    - Filter EDHREC recommendations to only cards user owns
    - Return Card objects from collection that match EDHREC list
    - *Depends on step 16*

18. Update `findCollectionImprovements` to merge EDHREC + synergy suggestions
    - Run synergy-based scoring (Phases 1-4)
    - Run EDHREC cross-reference (Phase 6)
    - Merge results with priority: synergy combos (0.95+) → EDHREC community picks (0.85) → weakness fills (0.7)
    - Deduplicate by card name
    - *Depends on steps 1-17*

19. Add "Source" field to suggestions
    - Tag each suggestion with source: "commander_synergy", "edhrec_community", "weakness", "combo"
    - Display in UI: "🔥 EDHREC top pick" vs. "⚡ Commander synergy" vs. "🛠️ Fills weakness"
    - *Depends on step 18*

**EDHREC API Research:**
- Official API: Check if EDHREC has public API or requires scraping
- Alternative: Use EDHREC JSON endpoints (check `/api/commanders/[name]` or similar)
- Rate limiting: Respect EDHREC's rate limits, cache aggressively (7 days)
- Fallback: If EDHREC unavailable, continue with rule-based only (graceful degradation)

**Verification:**
- Test with popular commander (Atraxa) → EDHREC should return ~100 cards
- Cross-reference with collection → owned EDHREC picks appear in suggestions
- Test with obscure commander → EDHREC may return 0 results, synergy detection still works
- Test with EDHREC API down → suggestions still work (rule-based only)

---

## Relevant Files

**Core Analysis Logic:**
- `supabase/functions/_shared/deck_analyzer.ts`
  - `findCollectionImprovements` (line 350-405) — entry point for collection suggestions
  - `_evaluateCard` (line 2769-2950) — scoring logic to modify
  - `identifyThemes` (line 1376-1424) — theme detection (reference for patterns)

**AI Integration:**
- `supabase/functions/_shared/gemini.ts`
  - `getImprovementSuggestions` (line 297-440) — AI mode entry point
  - `deckContext` (line 140-200) — prompt builder to enhance

**Constants:**
- `supabase/functions/_shared/deck_analyzer.ts` (top of file)
  - Add `COMMANDER_SYNERGY_PATTERNS`, `SYNERGY_CRITICAL_MASS`, `CARD_QUALITY_TIERS`

**Models:**
- `supabase/functions/_shared/models.ts`
  - Card interface already has `oracle_text` — no changes needed

**EDHREC Integration (Phase 6):**
- `supabase/functions/_shared/edhrec.ts` (NEW FILE)
  - `fetchEDHRECRecommendations()` — API client for EDHREC data
  - `crossReferenceWithCollection()` — filter EDHREC picks to owned cards
  - Add caching logic using existing `ai_cache` table

**Frontend (Phase 6):**
- `frontend/src/components/CardRecommendation.jsx`
  - Add source badges: "🔥 EDHREC top pick", "⚡ Commander synergy", "🛠️ Fills weakness"

---

## Verification

**Unit Tests (if time permits):**
1. `extractCommanderSynergies("Whenever you gain life, ...")` → `["life gain"]`
2. `_evaluateCard(Marauding Blight-Priest, weaknesses=[], commanderSynergies=["life gain"])` → score 0.9+
3. `findCollectionImprovements(Willowdusk deck, collection with Marauding Blight-Priest)` → appears in results

**Integration Tests:**
1. Load deck awkk3ttaKkWy7rXAszUTng from Moxfield
2. Upload collection containing EDHREC-recommended cards: Marauding Blight-Priest, Vito, Heliod
3. Fetch improvements → all three should appear in top 10 suggestions
4. Check reasons → should mention "triggers on commander ability" or "life-gain synergy"

**Manual Verification:**
1. Run analysis on Willowdusk deck in production
2. Check Collection tab → EDHREC cards should now appear
3. Check AI tab → AI suggestions should also mention life-gain synergies
4. Test with different commander archetypes (sacrifice, landfall, spellslinger)

---

## Decisions

**Architectural:**
- Parser will use regex patterns (fast, deterministic) rather than NLP (slow, requires model)
- Quality tiers will be manually curated constants (100-200 staples) rather than dynamic pricing
- Synergy detection happens at analysis time (not cached separately)

**Scope:**
- **Included:** Commander-specific synergies, two-card combos with commander, synergy density
- **Excluded:** Three-card combos (too complex), community data integration (requires API), win condition inference (separate feature)

**Trade-offs:**
- **Regex patterns** — Fast but brittle (may miss creative wording)
- **Manual quality tiers** — Accurate but requires maintenance as new cards release
- **Critical mass thresholds** — Simple but doesn't account for deck strategy (combo vs. value)

---

## Decisions (User Confirmed)

1. **EDHREC API Integration: Option C (Hybrid)**
   - Use EDHREC API to fetch top 100 cards for commander
   - Cross-reference with user's collection for "community-recommended" suggestions
   - Use rule-based synergy detection for commander-specific interactions
   - **Why hybrid:** Combines community wisdom (EDHREC) with personalized synergy detection (our engine)
   - **Implementation:** Add Phase 6 for EDHREC integration after core synergy detection is working

2. **Multiple Commander Synergies: Option A (Detect All)**
   - Example: Korvold (sacrifice + card draw + ramp)
   - Detect all synergies from commander oracle text
   - Prioritize cards that match multiple synergies (e.g., Goblin Bombardment = sacrifice + damage)
   - Score bonus: +0.1 for each additional synergy matched beyond the first
   - **Why:** Multi-synergy cards are the highest-value suggestions

3. **Weakness Detection: Option A (Keep Both)**
   - Keep both synergy-first and weakness-fallback scoring
   - Evaluation order: commander synergy → combo detection → theme deepening → weakness filling
   - **Why:** Weaknesses still valuable for generic/non-synergistic commanders (e.g., Golos, partner commanders with no obvious synergy)

---

## Next Steps After Implementation

- Monitor user feedback on suggestion quality
- Track which cards are accepted vs. ignored (signals quality)
- Expand `SYNERGY_KEYWORDS` based on missed detections
- Add more combos to `KNOWN_COMBOS` as users report them
- Consider machine learning for quality tiering (if manual curation becomes bottleneck)

---

## Performance Optimization (Critical)

**Performance Agent Analysis:** Without optimizations, this plan would increase analysis time from **400ms to 5-7 seconds** (12-15x slower). With optimizations below, target is **555ms** (acceptable 40% increase).

### Top 3 Performance Risks

**1. Regex in Hot Loop (CRITICAL — would add 3-6 seconds)**
- **Problem:** Using regex patterns to match 2000+ collection cards
- **Solution:** Use `.includes()` for keyword matching instead of regex
- **Impact:** Reduces overhead from 3-6s to 150ms

**2. Redundant Deck Scans (would add 600ms)**
- **Problem:** `calculateSynergyDensity` called inside collection loop (2000× deck scans)
- **Solution:** Pre-compute deck synergy densities ONCE before collection loop
- **Impact:** Reduces overhead from 600ms to 5ms

**3. EDHREC API Latency (acceptable with mitigation)**
- **Problem:** 1-2 second delay on cache miss
- **Solution:** Already mitigated with 7-day cache + parallel fetch
- **Impact:** Only affects first analysis per commander

### Required Optimizations

**Phase 1 Implementation:**
```typescript
// ✅ FAST: Use keyword arrays with .includes()
const SYNERGY_KEYWORDS = {
  "life gain": ["whenever you gain life", "gain life", "when a player gains life"],
  "sacrifice": ["sacrifice a creature", "sacrifice another", "when this creature dies"],
  "landfall": ["landfall", "whenever a land enters"],
};

function detectSynergies(oracle: string): Set<string> {
  const oracleLower = oracle.toLowerCase(); // Cache normalization
  const found = new Set<string>();
  for (const [synergy, keywords] of Object.entries(SYNERGY_KEYWORDS)) {
    if (keywords.some(kw => oracleLower.includes(kw))) {
      found.add(synergy);
    }
  }
  return found;
}

// ❌ SLOW: Don't use regex in hot loop (would add 3-6 seconds)
const SYNERGY_PATTERNS = {
  "life gain": /whenever you gain life|when.*gains.*life/i,
};
```

**Phase 3 Implementation:**
```typescript
// ✅ FAST: Pre-compute ONCE before collection loop
const deckSynergyDensity = new Map<string, number>();
for (const synergy of commanderSynergies) {
  deckSynergyDensity.set(synergy, calculateSynergyDensity(deck, synergy));
}

// Pass as parameter to _evaluateCard (lookup is O(1))
for (const colCard of collection.cards) {
  _evaluateCard(colCard, weaknesses, themes, deckSynergyDensity);
}

// ❌ SLOW: Don't call inside collection loop
for (const colCard of collection.cards) {
  const density = calculateSynergyDensity(deck, synergy); // 2000× deck scans!
}
```

### Performance Budget

| Operation | Current | With Optimizations | Without Optimizations |
|-----------|---------|-------------------|--------------------|
| Collection iteration | 50ms | 50ms | 50ms |
| Weakness evaluation | 200ms | 200ms | 200ms |
| **Commander synergy matching** | - | **150ms** ✅ | **3-6s** ❌ |
| **Synergy density calc** | - | **5ms** ✅ | **600ms** ❌ |
| Theme detection | 100ms | 100ms | 100ms |
| Sorting/dedup | 50ms | 50ms | 50ms |
| **TOTAL** | **400ms** | **555ms** ✅ | **5-7s** ❌ |

**Target:** <1 second total analysis time (including EDHREC on cache hit)

### Profiling Strategy

Add instrumentation to measure actual performance:
```typescript
function findCollectionImprovements(deck: Deck, collection: Collection) {
  const t0 = performance.now();
  
  const commanderSynergies = extractCommanderSynergies(deck.commander);
  console.log(`[PERF] Extract synergies: ${(performance.now() - t0).toFixed(1)}ms`);
  
  const deckSynergyDensity = /* pre-compute */;
  console.log(`[PERF] Deck density: ${(performance.now() - t0).toFixed(1)}ms`);
  
  // Collection loop...
  console.log(`[PERF] Collection eval: ${(performance.now() - t0).toFixed(1)}ms`);
  console.log(`[PERF] TOTAL: ${(performance.now() - t0).toFixed(1)}ms`);
}
```

**Metrics to track:**
- Collection size vs. analysis time (should scale linearly)
- Commander synergy count vs. overhead
- EDHREC cache hit rate (target >95% after warmup)
