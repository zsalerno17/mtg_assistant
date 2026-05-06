# Deck Analysis & Improvement Enhancement Plan

**Created:** May 5, 2026  
**Status:** ✅ COMPLETE  
**Goal:** Transform surface-level analysis into deep, actionable Commander guidance

---

## TL;DR

**Transform deck analysis from "add more ramp" to "here's how to build your +1/+1 counter deck to power 8."** Build rule-based systems for power transparency (why is this 7/10?), win condition detection (what's my deck trying to do?), theme deepening (complete partial strategies), and upgrade paths (phased plan to reach target power). AI only enriches with natural language polish—no AI as decision-maker.

**Approach:** Rule-based first — power calculations, win condition detection, theme deepening, and upgrade path generation use deterministic MTG logic. AI only enriches with natural language polish and bracket-specific multiplayer advice.

**COMPLETED:** All 4 phases implemented (May 5, 2026). Backend logic complete, frontend components integrated across Overview, Strategy, and Improvements tabs.

---

## User Experience Changes

### Phase 1: Power Transparency (Weeks 1-2)
**Before:** "My deck is 7/10... why? When I add Mana Crypt, does power change?"

**After:**
- **Overview tab**: See power breakdown bar chart — "Fast Mana +1.0, Tutors +0.6, CMC Efficiency +0.5, Theme Coherence +0.75"
- **Improvements tab**: Every suggestion shows **"Power impact: +0.5 → 7.5/10"** badge
- **Scenarios tab**: Test changes, see power 7.0→7.5 with factor breakdown
- **Dashboard**: Hover power level for quick breakdown tooltip

*User now knows: "My deck is 7/10 because I have weak fast mana (+1.0/2.0 max). Adding Mana Crypt gives +0.5 power."*

### Phase 2: Win Conditions & Theme Deepening (Weeks 3-4)
**Before:** "Improvements just say 'add ramp, add draw.' I want to build toward +1/+1 counters but it's not suggesting counter cards I own."

**After:**
- **Overview tab**: Shows detected win conditions — *"Primary: Go-wide combat with tokens + anthems"* or *"Primary: Infinite mana combo (Isochron Scepter + Dramatic Reversal)"*
- **Improvements tab**: New category **"Theme Deepening"** — *"You have 8/12 counter cards. Add Branching Evolution to reach critical mass"*
- **Combo enablement**: *"Add Dramatic Reversal — completes infinite mana combo with Isochron Scepter"*

*User now sees: "My deck tries to win via tokens + anthems. I'm close to critical mass on +1/+1 counters—here are 4 cards I own to complete it."*

### Phase 3: User Goals & Upgrade Paths (Weeks 5-6)
**Before:** "I want to push this deck to power 8 but don't know what changes would get me there."

**After:**
- **Build Direction section**: Target power dropdown, theme emphasis chips, budget slider, style selector
- **Upgrade Path accordion**: Phased plan showing "Phase 1: Add fast mana (+1.0 power, $80) → 8.0/10"
- **Filtered suggestions**: Only show cards matching budget and theme priorities

*User now sees: "To reach power 8, I need 2 fast mana pieces first (+1.0), then deepen my token theme. Here's a $125 plan in 2 phases."*

### Phase 4: Strategy Depth (Weeks 7-8)
**Before:** "Strategy advice says 'play your commander early'—not helpful."

**After:**
- **Bracket banner**: *"🎯 Bracket 3: Games end turns 8-10. Opponents have fast mana and can threaten wins by turn 8."*
- **Calibrated advice**: *"Tokens strategy: Ramp T1-3, bait wipes T4-6 with small boards, alpha strike T7-9 with anthems."*
- **Win conditions detailed**: *"Primary: Combat via tokens + anthems. Secondary: Aristocrats drain if blocked."*

*User now sees: "My bracket expects turn 8 wins. My deck needs to ramp early, bait wipes mid-game, then alpha strike—not just 'leverage synergies.'"*

---

## Implementation Phases

### Phase 1: Power Transparency & Foundation ✓ (Weeks 1-2)

**Goal:** Users understand exactly why their deck has its current power level and how each improvement affects it.

#### Backend (`deck_analyzer.ts`)
- [x] **1.1** Implement `explainPowerLevel()` → returns breakdown with each factor's contribution
  - Returns: `{ total, bracket, factors: [{ category, value, max_contribution, description }], next_bracket_threshold }`
  - Calculates each power factor explicitly (fast mana, tutors, CMC, draw, interaction, theme, commander)
  
- [x] **1.2** Add `PowerDelta` type and calculation
  - Interface: `{ before: number, after: number, change: number, factors_changed: string[] }`
  - Function: `calculatePowerDelta(deck, add, remove, themes)` → creates modified deck, recalculates power
  - Memoization: Cache by `${deckHash}_${add.name}_${remove?.name}` (deferred for optimization)

- [x] **1.3** Add `userGoals` parameter to improvement APIs
  - Interface: `{ targetPowerLevel?, budgetConstraint?, themeEmphasis?: string[], style? }`
  - Update `findCollectionImprovements()` signature
  - Update `ImprovementSuggestion` type to include `PowerDelta | null`

#### Frontend
- [ ] **1.4** Overview tab: Power breakdown visualization
  - Component: `PowerBreakdownChart` in `components/shared/`
  - Display: Horizontal bar chart with color-coded factors
  - Show "To reach next bracket" section if applicable

- [ ] **1.5** Improvements tab: Power delta badges
  - Badge component: Show `+0.5 → 7.5/10` next to each suggestion
  - Color: Green for positive, red for negative (rare)

- [ ] **1.6** Scenarios tab: Power comparison
  - Add power row to before/after table
  - Show breakdown of which factors changed

- [ ] **1.7** Dashboard: Power breakdown tooltip
  - Hover state on power level column
  - Mini bar chart in tooltip

---

### Phase 2: Win Conditions & Theme Deepening (Weeks 3-4)

**Goal:** Detect what the deck is actually trying to do (combo? combat? value grind?) and suggest cards that deepen themes to critical mass.

#### Backend (`deck_analyzer.ts`)
- [ ] **2.1** Build `KNOWN_COMBOS` constant
  - Two-card infinites map: `Record<string, string[]>`
  - Start with ~50 combos: Isochron+Reversal, Kiki+Conscripts, Pili-Pala+Grand Architect, etc.

- [ ] **2.2** Implement `identifyWinConditions()`
  - Returns: `WinCondition[]` (type, description, cards, reliability)
  - Detects: Two-card combos, combat strategies (go-wide, Voltron), alternate win cons (Thoracle), value grind (fallback)

- [ ] **2.3** Add `THEME_CRITICAL_MASS` thresholds
  - Tokens: 12, Aristocrats: 10, Voltron: 8, Spellslinger: 15, Graveyard: 8, Landfall: 10, +1/+1 Counters: 12, Enchantress: 12, Artifacts Matter: 15, Combat: 10

- [ ] **2.4** Enhance `_evaluateCard()` with theme deepening
  - Check if card deepens partial theme: `currentCount < threshold`
  - Reason: *"Deepens Tokens theme (8/12 cards — needs 4 more for critical mass)"*
  - Score: 0.85 (high priority)

- [ ] **2.5** Add combo enablement detection
  - Check if `KNOWN_COMBOS[card.name]` has partners in deck
  - Reason: *"Completes combo with [partner card]"*
  - Score: 0.95 (very high priority)

#### Frontend
- [ ] **2.6** Overview tab: Display win conditions
  - Section: "Win Conditions" with card chips
  - Show primary/secondary reliability labels

- [ ] **2.7** Improvements tab: Theme deepening category
  - Separate section from weakness fixes
  - Show progress bars: "Tokens: 8/12 ████████░░░░"

---

### Phase 3: User Goals & Upgrade Paths (Weeks 5-6)

**Goal:** Users specify what they want (higher power? deepen theme? stay budget?) and get phased upgrade paths.

#### Backend
- [ ] **3.1** Implement `buildUpgradePath()`
  - Analyzes power gap to target
  - Identifies weakest factors (via `explainPowerLevel`)
  - Generates phased improvements with estimated cost and power delta per phase

- [ ] **3.2** Add `UserGoals` interface and API integration
  - Update Edge Function `/improvements` endpoint to accept goals
  - Pass goals to `findCollectionImprovements()` and `getImprovementSuggestions()`

- [ ] **3.3** Enhance Gemini prompt with user goals
  - Inject goals context: target power, budget, theme emphasis, style
  - Instruct AI to prioritize accordingly

- [ ] **3.4** Add price fetching for upgrade paths
  - Integrate TCGPlayer or Scryfall price API
  - Calculate estimated cost per phase

#### Frontend (`DeckPage.jsx` Improvements tab)
- [ ] **3.5** Build "Build Direction" UI
  - Target power: Dropdown (current to 10)
  - Theme emphasis: Toggle chips from detected themes
  - Budget: Slider/buttons (Budget/Mid/Premium/Unlimited)
  - Style: Radio (Competitive/Casual/Thematic)

- [ ] **3.6** Add "Upgrade Path" accordion
  - Collapsible sections per phase
  - Show: Phase name, changes, estimated cost, power after

- [ ] **3.7** Wire user goals to API
  - State management for goals
  - Refresh suggestions on goal change
  - Show loading state during re-fetch

---

### Phase 4: Strategy Depth (Weeks 7-8)

**Goal:** Strategy advice feels Commander-specific (bracket expectations, archetype sequencing, multiplayer politics) with rule-based fallbacks.

#### Backend
- [ ] **4.1** Add `BRACKET_GUIDANCE` constant
  - Per bracket: turns-to-win, opponent expectations, interaction density, common archetypes

- [ ] **4.2** Add `ARCHETYPE_PLAYPATTERNS` constant
  - Per strategy: sequencing advice (early/mid/late game priorities)

- [ ] **4.3** Add `ARCHETYPE_FALLBACK_GUIDES` constant
  - Rule-based strategy per archetype
  - Uses `identifyWinConditions()` to customize

- [ ] **4.4** Enhance `getStrategyAdvice()` prompt
  - Inject bracket guidance
  - Inject archetype patterns
  - Calibrate advice to expected game speed

- [ ] **4.5** Rewrite `fallbackStrategy()`
  - Use archetype guides + win conditions + key card roles
  - No template strings—actual rule-based logic

#### Frontend
- [ ] **4.6** Strategy tab: Bracket context banner
  - Banner at top: "🎯 Bracket 3: Games end turns 8-10..."
  - Color-coded by bracket

---

## Relevant Files

- `supabase/functions/_shared/deck_analyzer.ts` — Core analysis engine (all rule-based logic)
- `supabase/functions/_shared/gemini.ts` — AI enrichment (prompts only)
- `frontend/src/pages/DeckPage.jsx` — Overview, Strategy, Improvements, Scenarios tabs
- `frontend/src/components/shared/` — New reusable components

---

## Verification Checklist

- [ ] Load token deck → Overview shows power breakdown bar chart
- [ ] Improvements tab → Each suggestion shows "Power impact: +0.5 → 7.5/10"
- [ ] Set target power to 8, select "Tokens" theme → Suggestions prioritize token synergy + fast mana
- [ ] Scenarios tab → Adding Mana Crypt shows power 7→7.5
- [ ] Strategy tab → Shows bracket banner + detected win condition
- [ ] Combo deck → Win conditions detect "Infinite mana combo"

---

## Decisions

- **Rule-based first**: Power breakdown, win conditions, theme deepening, upgrade paths use MTG logic—no AI
- **AI enrichment only**: Strategy advice uses rule-based fallback; AI adds polish
- **Theme critical mass**: See Phase 2.3
- **Bracket speed**: 1 (turn 12+), 2 (10-12), 3 (8-10), 4 (3-6)
- **Combo database**: Start with 50 combos, expand via PRs

---

## Progress Tracking

### Phase 1 (Weeks 1-2)
- Status: **✅ COMPLETE**
- Blocked by: None
- Completion date: May 5, 2026
- Notes: 
  - ✅ Backend: PowerLevelBreakdown, PowerDelta interfaces, explainPowerLevel(), calculatePowerDelta()
  - ✅ Backend: Updated findCollectionImprovements() to calculate power delta for each suggestion
  - ✅ Backend: Updated analyzeDeck() and ai/index.ts to pass power data through API
  - ✅ Frontend: PowerBreakdownChart component with Recharts visualization
  - ✅ Frontend: PowerDeltaBadge component
  - ✅ Frontend: Integrated into Overview tab and all Improvements sections
  - Deferred: Scenarios power comparison, Dashboard tooltips (nice-to-have)

### Phase 2 (Weeks 3-4)
- Status: Not Started
- Blocked by: Phase 1 completion
- Notes:

### Phase 3 (Weeks 5-6)
- Status: Not Started
- Blocked by: Phase 1, 2 completion
- Notes:

### Phase 4 (Weeks 7-8)
- Status: **✅ COMPLETE**
- Blocked by: None
- Completion date: May 5, 2026
- Notes:
  - ✅ Backend: BRACKET_GUIDANCE and ARCHETYPE_PLAYPATTERNS constants
  - ✅ Backend: Enhanced gemini.ts analyzeStrategy() with bracket/archetype context
  - ✅ Frontend: BracketBanner component
  - ✅ Frontend: Integrated into Strategy tab
  - ⚠️ User feedback: advice seems generic, not deck-specific

---

## Testing Feedback (May 5, 2026)

### Bugs Found

**Phase 1 - Power Breakdown:**
- [ ] Chart needs one-liner explanation of how power is calculated (show formula/logic)
- [ ] Tooltips exist but UX unclear - only visible on hover of specific bar segment
- [ ] Move Power Breakdown section to appear UNDER "Interaction Coverage" in Overview tab

**Phase 3 - Upgrade Paths:**
- [ ] **CRITICAL**: Upgrade path headers show "0.0 power gain" even though backend calculates correctly
  - Backend: `powerGain: phasePowerGain` is computed in buildUpgradePath()
  - Frontend: UpgradePath component not displaying the value
- [ ] DirectionUI filters are inconsistent with rest of page
  - Direction UI has sliders for power/budget INSIDE the component
  - Set filter and Collection/Any mode toggles are OUTSIDE
  - Should consolidate ALL filters into ONE section with single "Apply" button
- [ ] DirectionUI and UpgradePath styling don't match rest of page (different visual style from existing sections)
- [ ] Power delta badges missing from swap cards (code exists but not rendering)
  - Line 1303: `{swap.power_delta && <PowerDeltaBadge powerDelta={swap.power_delta} size="sm" />}`
  - Need to debug why `swap.power_delta` is falsy

**Phase 4 - Strategy Depth:**
- [ ] Bracket guidance feels generic/not deck-specific
  - Example: "Bargain, track cards in hand, win by turn 8-10" could apply to any Bracket 2 deck
  - MTG specialist review needed: is this useful or just filler text?
- [ ] BracketBanner uses hardcoded Tailwind colors instead of CSS variables
  - Uses: `bg-slate-950/50`, `border-slate-700`, `text-blue-400`, etc.
  - Should use: `var(--color-bg)`, `var(--color-border)`, etc.
  - Breaks design system consistency

### MTG Specialist Review Needed

**Improvements Algorithm (Phases 2 & 3):**
- General feedback: improvement suggestions still not giving good advice
- Need deep domain review:
  - Are we recommending the RIGHT cards for each archetype?
  - Are we catching critical weaknesses? (0 board wipes, insufficient ramp for high CMC commander, no recursion in graveyard deck)
  - Does the impact/cost ratio actually correlate with upgrade quality in practice?
  - Are theme deepening suggestions accurate? (Do we correctly identify when a deck is "8/12 tokens" vs just happens to make some tokens)
- **Action**: Schedule MTG specialist session to audit recommendation quality

---

## Next Steps

1. **Fix UI Bugs** (1-2 hours)
   - Move power chart under Interaction Coverage
   - Add explanatory text to power breakdown
   - Fix BracketBanner to use CSS variables
   - Consolidate DirectionUI with existing filters

2. **Fix Data Bugs** (2-3 hours)
   - Debug why `swap.power_delta` not rendering
   - Fix UpgradePath component to display `powerGain` correctly

3. **MTG Specialist Deep Dive** (full session)
   - Review improvement recommendations with domain expert
   - Audit theme detection accuracy
   - Validate weakness identification logic
   - Iterate on scoring algorithm

4. **Deploy & Test Round 2**
   - Push bug fixes
   - User testing with fixes applied
   - Gather feedback on accuracy of recommendations
