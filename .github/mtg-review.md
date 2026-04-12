# MTG Commander Assistant — User Review & Expert Analysis

**Review Date:** April 12, 2026  
**Reviewer:** MTG Specialist Agent (Commander/EDH focus)  
**Review Mode:** Comprehensive user experience audit + Commander accuracy validation

---

## Executive Summary

The mtg-assistant app provides **solid foundational deck analysis** with a clean, polished UI. The core analysis engine is **accurate for typical casual-to-mid power Commander decks**, and the collection-based upgrade suggestions are a **genuinely useful differentiator** from tools like EDHREC. However, **several critical Commander-specific issues** limit the app's usefulness for experienced players and higher power level decks.

**Key strengths:**
- Collection integration is **excellent** — showing owned upgrades first is a killer feature EDHREC doesn't have
- UI is clean, professional, and fast — matches or exceeds Moxfield/Archidekt polish
- Weakness detection is **specific and educational** (expandable cards with examples)
- Gemini-powered AI advice is contextually aware and uses actual card names

**Critical issues to address:**
1. **Flat thresholds ignore deck strategy** — combo/cEDH decks flagged incorrectly
2. **Power level is missing from analysis context** — Gemini can't give accurate advice without it
3. **Removal bundling is too broad** — exile vs destroy vs bounce matters in Commander
4. **Theme detection has false positives** — loose pattern matching triggers incorrectly
5. **No interaction with existing tools** — duplicates EDHREC/Moxfield features already done well

---

## Detailed Findings

### 1. User Flow & Experience

**Onboarding & Import**
- ✅ **Excellent:** Import modal is clear, fast, and idempotent (re-importing updates, no duplicates)
- ✅ **Excellent:** Collection upload with rotating flavor text ("Consulting the Scryfall oracle...") keeps long waits entertaining
- ⚠️ **Missing:** No explanation of what "analyze" does vs "import to library" — first-time users may be confused
- ⚠️ **Missing:** No visual feedback on dashboard when a deck has never been analyzed (shows "—" for power level but no CTA)

**Dashboard & Navigation**
- ✅ **Excellent:** Commander artwork thumbnails with hover effects are polished and distinctive
- ✅ **Good:** Stat cards on dashboard show key metrics at a glance (total decks, avg power, favorite colors)
- ⚠️ **Inconsistent:** "Power Level" column shows "—" for unanalyzed decks, but there's no button to analyze from the table — user must click into deck page
- ⚠️ **Missing:** No bulk actions (analyze all decks, refresh all from Moxfield)

**Deck Analysis Page**
- ✅ **Excellent:** Tab-based navigation is intuitive (Overview, Collection Upgrades, Strategy, Improvements, Scenarios)
- ✅ **Excellent:** Weaknesses are expandable with **specific examples** and **tooltips on hover** — this is more educational than EDHREC
- ✅ **Good:** Mana curve visualization with average CMC reference line
- ✅ **Good:** Theme badges with hover tooltips explaining each archetype
- ⚠️ **Confusing:** "Collection Upgrades" tab loads both collection-owned cards AND AI improvements, but the tab name suggests only owned cards
- ⚠️ **Missing:** No export to Moxfield (add all suggestions as "Considering" board or similar)
- ⚠️ **Missing:** No price breakdown for suggested upgrades (TCGPlayer, Cardmarket)

---

### 2. Analysis Accuracy (Commander-Specific)

#### **Thresholds: Major Issues**

The app uses **flat hardcoded thresholds** that don't account for deck strategy or power level:

```python
RECOMMENDED_LANDS = (36, 38)
RECOMMENDED_RAMP = 10
RECOMMENDED_DRAW = 10
RECOMMENDED_REMOVAL = 8
RECOMMENDED_BOARD_WIPES = 2
HIGH_AVG_CMC_THRESHOLD = 3.5
```

**Why this is wrong:**

1. **Ramp count varies by strategy:**
   - **Creature-based decks** (e.g., Elfball, Goblins): 6–8 ramp is normal — they ramp via creatures
   - **Fast combo/cEDH**: 12–16 ramp pieces (average CMC ≤ 2) — speed is everything
   - **Midrange value**: 10–12 is correct
   - **Current logic:** Flags all creature-ramp decks as "low ramp" even when they have 15+ mana dorks

2. **Land count varies by average CMC and ramp:**
   - **Low-to-the-ground aggro** (avg CMC 2.5): 32–34 lands is fine with 10+ ramp
   - **High CMC value decks** (avg CMC 4.0+): 38–40 lands needed
   - **Landfall decks**: 40–45 lands is correct (but app flags 42+ as "too many")
   - **Current logic:** Flags Fast Food Chain Tazri (avg CMC 2.1, 30 lands) as "low land count" when it's correct for the strategy

3. **Removal needs vs power level:**
   - **Casual/precon** (power 4–5): 8 removal pieces is fine
   - **Mid-power** (power 6–7): 10–12 removal + 2–3 wipes
   - **High-power/cEDH** (power 8–10): 15+ interaction pieces (counterspells, fast removal, stax)
   - **Current logic:** Treats all removal as equal and doesn't account for instant-speed interaction

4. **Board wipes vary by strategy:**
   - **Aggro/tokens**: 0–1 wipes (you're the board you'd be wiping)
   - **Control/stax**: 3–5 wipes
   - **Midrange**: 2–3 wipes (correct)
   - **Current logic:** Flags all aggro decks as "low board wipes" when they shouldn't run many

**Recommendation:**
- Add **strategy classification** (aggro, midrange, control, combo, stax) to analysis
- Add **power level detection** (4–10 scale) based on fast mana, tutors, infinite combos, avg CMC
- Make thresholds **dynamic** based on (strategy, power level, avg CMC)
- Example: `recommended_ramp = calculate_ramp_recommendation(strategy, power_level, avg_cmc)`

#### **Removal Classification: Too Broad**

Current `count_removal()` lumps together:
- **Exile removal** (Swords to Plowshares) — best in format, handles indestructible
- **Destroy removal** (Go for the Throat) — good but doesn't hit indestructible
- **Tuck effects** (Chaos Warp) — bypasses indestructible but less permanent than exile
- **Damage-based removal** (Lightning Bolt) — creature-only, ineffective vs high toughness
- **Enchantment-based neutralization** (Darksteel Mutation) — hard to remove but doesn't delete

**Why this matters in Commander:**
- Indestructible creatures are common (Avacyn, Blightsteel Colossus, etc.)
- A deck with 8x destroy-based removal is **weaker** than a deck with 5x exile + 3x destroy
- High-power players want **instant-speed exile** specifically

**Recommendation:**
- Split into `exile_removal`, `destroy_removal`, `conditional_removal`
- Weight exile higher in "removal quality" score
- Weakness detection should say "Low exile-based removal" if deck has 8 destroy spells but 0 exile

#### **Theme Detection: False Positives**

Current logic uses **loose keyword matching**:

```python
if theme == "Tokens":
    return any(kw in oracle for kw in (
        "create", "token", "populate", "amass",
    ))
```

**Problem:** The keyword `"create"` appears in thousands of cards that aren't token-focused:
- "Create a Treasure token" (incidental ramp, not a theme)
- "Create a Food token" (incidental lifegain)
- "Create a 1/1 creature token" in a single card (not a theme unless deck has 8+ token creators)

**Example false positive:** A deck with Smothering Tithe + 3 other incidental treasure makers gets flagged as "Tokens (4)" theme when it's clearly a value/control deck.

**Recommendation:**
- Increase thresholds: `_THEME_THRESHOLDS["Tokens"] = 8` (currently 4)
- Exclude incidental token creation (Treasure, Food, Clue) from theme detection
- Add **density check**: theme only triggers if ≥12% of nonland cards match (prevents single-card false positives)

#### **Count Functions: Edge Cases**

**`count_ramp()` misses:**
- **Rituals** (Dark Ritual, Jeska's Will) — filtered out by CMC ≤ 3 check but these are fast mana
- **Cost reducers** (Urza's Incubator, Herald's Horn) — not counted as ramp but functionally identical
- **Mana doublers** (Mana Reflection, Crypt Ghast) — high-impact ramp missed entirely

**`count_draw()` misses:**
- **Impulse draw** (Light Up the Stage, Jeska's Will) — says "exile and cast" not "draw" but is card advantage
- **Loot effects** (Faithless Looting) — discards but is still card selection
- **Wheel effects** (Wheel of Fortune) — no "draw a card" in oracle text (uses "draw seven cards")

**`count_board_wipes()` misses:**
- **Sacrifice wipes** (All Is Dust, Toxic Deluge) — text says "sacrifice" not "destroy"
- **Damage-based wipes** (Blasphemous Act) — text says "deals 13 damage to each creature" not "destroy all creatures"

**Recommendation:**
- Add ritual detection: `"add {" in oracle and "until end of turn" in oracle`
- Add cost reducer detection: `"spells you cast" in oracle and "cost" in oracle`
- Add impulse draw: `"exile" in oracle and ("may cast" in oracle or "play" in oracle)`
- Add sacrifice wipes: `"each player sacrifices" in oracle`
- Add damage wipes: `"deals X damage to each creature" in oracle`

---

### 3. Gemini AI Prompts: Missing Power Level Context

**Current prompt structure** ([gemini_assistant.py](backend/src/gemini_assistant.py#L101-L120)):

```python
Commander: {commander_str}
Color Identity: {colors}
Format: {deck.format}
Themes: {themes}
Weaknesses: {weakness_labels}
Average CMC: {analysis.get("average_cmc", "?")}
Ramp: {ramp} (need 10+) | Draw: {draw} (need 10+) | Removal: {removal} (need 8+)
```

**What's missing: POWER LEVEL**

The same commander (e.g., Teysa Karlov) can be built at:
- **Power 4** (precon upgrades, budget, casual)
- **Power 7** (tuned, some fast mana, efficient wincons)
- **Power 9** (cEDH-adjacent, Ad Nauseam, fast combo)

**Without power level, Gemini can't give accurate advice:**
- Casual Teysa: "Add Ashnod's Altar for sac synergy"
- High-power Teysa: "Add Mana Crypt, Demonic Tutor, Razaketh combo"

**Current output:** Generic advice that doesn't match deck's competitive intent

**Recommendation:**
- Detect power level in `analyze_deck()` based on:
  - Fast mana count (Mana Crypt, Mox Diamond, Chrome Mox, etc.)
  - Tutor count (Demonic Tutor, Vampiric Tutor, etc.)
  - Infinite combo presence
  - Average CMC and ramp/interaction density
- Add `power_level: int` to analysis dict (4–10 scale)
- Include in Gemini prompt: `"Power Level: {power_level}/10 (where 4 = precon, 7 = tuned casual, 10 = cEDH)"`
- Add power-level-specific advice: "At power level 7, you should run X fast mana pieces and Y tutors"

---

### 4. Collection Upgrades: Excellent Concept, Execution Issues

**What works:**
- ✅ Prioritizing owned cards is **brilliant** — this is the app's best differentiation from EDHREC
- ✅ Showing suggested cuts alongside adds is **better than EDHREC** (which only suggests adds)
- ✅ Deduplication prevents same card appearing twice

**What needs work:**

1. **"Collection Upgrades" tab is misleading:**
   - Tab name implies ONLY owned cards
   - Actually shows up to 12 suggestions: owned cards + AI improvements
   - **Fix:** Rename tab to "Upgrade Suggestions" or split into two tabs ("Owned Cards" + "Recommended Purchases")

2. **Cut suggestions are weak:**
   ```python
   def _find_cut(deck: Deck, col_card: Card) -> Tuple[Optional[Card], Optional[str]]:
   ```
   - Logic is **too conservative** — only suggests cutting strictly worse cards
   - Misses **opportunity cost cuts** (e.g., cut Kodama's Reach for Mana Crypt if you own it)
   - Never suggests cutting lands (even when deck has 42 lands and you're adding Arcane Signet)
   - **Fix:** Add "lowest-synergy card" detection for each category (ramp, draw, removal)

3. **No budget filtering:**
   - User might own expensive cards but be building a budget deck
   - No way to filter suggestions by price tier (budget/mid/premium)
   - **Fix:** Add toggle: "Only show budget upgrades (< $5)" or "Only show cards I own"

---

### 5. Improvements Tab: AI Quality Varies

**When Gemini is available:**
- ✅ Structured JSON output with categories (urgent_fixes, swaps, additions)
- ✅ Specific card names with reasoning
- ✅ Price tiers (budget/mid/premium) for gradual upgrades

**When Gemini is unavailable (fallback):**
- ⚠️ Generic staples with no deck-specific reasoning
- ⚠️ Doesn't respect deck's theme (suggests aggro cards to control decks)
- ⚠️ Hardcoded list feels like a precon upgrade guide, not tailored advice

**Recommendation:**
- Improve fallback by using **theme-aware staples** from analysis
- If deck has "Graveyard" theme → suggest Living Death, Phyrexian Reclamation, etc.
- If deck has "Voltron" theme → suggest Swiftfoot Boots, Whispersilk Cloak, etc.
- Store theme-specific staple lists in `deck_analyzer.py` (like `_COLOR_STAPLES` but for themes)

---

### 6. Scenarios Tab: Weak Impact Analysis

**Current implementation** ([deck_analyzer.py](backend/src/deck_analyzer.py#L144-L223)):
- Counts ramp/draw/removal before & after
- Shows simple delta ("+2 ramp, -1 draw")
- **Doesn't understand card quality** — treating Sol Ring and Rampant Growth as equal

**Example failure:**
- User adds: Sol Ring, Mana Crypt, Arcane Signet
- User removes: Rampant Growth, Cultivate, Kodama's Reach
- App says: "Ramp unchanged (3 in, 3 out)"
- **Reality:** This is a HUGE upgrade (0-mana rocks vs 3-CMC land tutors)

**Recommendation:**
- Weight ramp by CMC: `ramp_quality = sum(3 - card.cmc for each ramp piece)`
- Show quality delta: "Ramp average speed improved by 1.2 CMC"
- For Gemini path, ask for **strategic impact** not just counting

---

### 7. Duplication vs Existing Tools

**What MTG Assistant does that existing tools DON'T:**
1. ✅ **Collection-prioritized suggestions** (EDHREC doesn't know what you own)
2. ✅ **Paired cut suggestions** (EDHREC only suggests adds)
3. ✅ **Expandable weakness cards with examples** (more educational than EDHREC theme pages)
4. ✅ **Scenario analysis** (unique feature, though execution needs work)

**What MTG Assistant duplicates (and existing tools do better):**
1. ❌ **Card recommendations by commander** (EDHREC is the gold standard, 10+ years of data)
2. ❌ **Deck statistics & mana curve** (Moxfield, Archidekt, Deckstats all have this)
3. ❌ **Theme detection** (EDHREC's algorithm is more accurate, based on millions of decks)
4. ❌ **Strategy guides** (Command Zone podcast, EDHREC articles, YouTube creators)

**Recommendation:**
- **Double down on differentiators:** Collection integration, paired cuts, scenario analysis
- **Consider integration over duplication:** Link to EDHREC theme page instead of reimplementing theme detection
- **Add features existing tools lack:**
  - **Budget-aware suggestions** (filter by price tier)
  - **Playgroup meta tracking** (track what your friends play, suggest counters)
  - **Deck evolution tracking** (see how deck changed over time, power level progression)
  - **Multi-deck analysis** (compare your decks, identify cards you always cut → sell)

---

## Priority Fixes (Commander Accuracy)

### 🔴 Critical (Breaks Trust for Experienced Players)

1. **Dynamic thresholds based on strategy & power level**
   - File: [backend/src/deck_analyzer.py](backend/src/deck_analyzer.py#L11-L16)
   - Impact: Currently flags optimal decks as "weak" and vice versa
   - Fix: Add `classify_strategy()` and `detect_power_level()` functions

2. **Power level in Gemini context**
   - File: [backend/src/gemini_assistant.py](backend/src/gemini_assistant.py#L101-L120)
   - Impact: AI advice is generic and often wrong for high-power decks
   - Fix: Calculate power level in `analyze_deck()`, add to `_deck_context()`

3. **Remove bundling creates weak spots**
   - File: [backend/src/deck_analyzer.py](backend/src/deck_analyzer.py#L364-L391)
   - Impact: Deck with 8 destroy spells (no exile) rates same as deck with 8 exile spells
   - Fix: Split into `count_exile_removal()`, `count_destroy_removal()`, weight appropriately

### 🟡 High Priority (Quality of Life)

4. **Theme detection false positives**
   - File: [backend/src/deck_analyzer.py](backend/src/deck_analyzer.py#L489-L567)
   - Impact: Clutters UI with irrelevant themes, reduces signal-to-noise
   - Fix: Increase thresholds, exclude incidental tokens, add density check

5. **Ramp/draw counting misses common patterns**
   - File: [backend/src/deck_analyzer.py](backend/src/deck_analyzer.py#L317-L362)
   - Impact: Underestimates card advantage and ramp in optimized decks
   - Fix: Add ritual detection, impulse draw, cost reducers

6. **Collection Upgrades tab name is misleading**
   - File: [frontend/src/pages/DeckPage.jsx](frontend/src/pages/DeckPage.jsx#L46)
   - Impact: Users expect only owned cards, get confused by AI additions
   - Fix: Rename to "Upgrade Suggestions" or split into two tabs

### 🟢 Medium Priority (Polish & Differentiation)

7. **No price filtering for suggestions**
   - Impact: Users building budget decks get $50 card suggestions
   - Fix: Add toggle "Show only budget upgrades (< $5)"

8. **Scenario analysis ignores card quality**
   - File: [backend/src/deck_analyzer.py](backend/src/deck_analyzer.py#L144-L223)
   - Impact: Swapping 3-CMC ramp for 0-CMC rocks shows as "no change"
   - Fix: Weight by CMC/quality, show "ramp speed improved by X"

9. **No bulk actions on dashboard**
   - Impact: Users with 10+ decks must analyze individually
   - Fix: Add "Analyze All" and "Refresh All from Moxfield" buttons

---

## Overall Verdict

**For casual Commander players (power level 4–6):** ★★★★☆ (4/5)
- Excellent onboarding, clean UI, educational weakness explanations
- Collection integration is genuinely useful and unique
- Analysis is accurate enough for precon upgrades and budget builds

**For tuned/competitive players (power level 7–10):** ★★☆☆☆ (2/5)
- Flat thresholds produce wrong recommendations
- Doesn't understand cEDH strategies (fast combo, stax, turbo)
- Generic AI advice without power level context
- Missing critical distinctions (exile vs destroy, rituals vs rocks)

**Recommendation:**
1. **Short term:** Add power level detection + dynamic thresholds (2-week sprint)
2. **Medium term:** Improve removal/ramp classification, fix theme false positives (1-month sprint)
3. **Long term:** Add differentiating features (budget filtering, playgroup meta, deck evolution) instead of duplicating EDHREC

**The app has a STRONG foundation.** With Commander-specific fixes, it could legitimately compete with EDHREC for certain use cases (especially collection-driven upgrading). But it needs to **respect deck strategy and power level** to be useful beyond casual play.

---

**End of Review**  
*Next steps: Update [.github/copilot-plan.md](.github/copilot-plan.md) with findings and prioritization.*
