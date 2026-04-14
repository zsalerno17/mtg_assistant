# Deck Builder Implementation Plan

**Feature**: Generate full 100-card Commander decks from user's collection  
**Date**: April 14, 2026  
**Research**: mtg-specialist domain analysis complete

---

## Executive Summary

Build a deck recommendation system that generates playable Commander decks from a user's actual collection, ranking commanders by fit and respecting card usage across multiple decks. This fills a major gap vs. EDHREC/Moxfield/Archidekt, which show "ideal" lists but don't optimize for owned cards.

**Key Differentiators:**
- **Collection-first**: Build from what you own, not what's popular
- **Archetype validation**: Enforce minimum thresholds (e.g., Control needs 8+ counterspells)
- **Usage awareness**: Track cards already in decks, suggest unused alternatives
- **Commander ranking**: Score legendary creatures by collection fit, not popularity
- **Full 100-card builds**: Complete playable decks, not partial suggestions

---

## User Requirements

### Core Features
1. **Commander Ranking**: Show 3 legendary creatures from user's collection ranked by archetype fit
2. **Full Deck Generation**: Build complete 100-card Commander deck from collection
3. **Card Source Toggle**: 
   - **OFF**: Only use unused cards from collection
   - **ON**: Use any card (collection or existing decks), but commanders stay locked
4. **Draft Deck Storage**: Save in database + offer Moxfield export
5. **Deck Dashboard Integration**: Show draft decks alongside imported Moxfield decks

### User Clarifications
- **Commander scope**: Only suggest commanders user already owns (no purchase recommendations yet)
- **Commanders are locked**: Each commander can only be in ONE deck at a time
- **Toggle behavior**: Simple binary — ON = all cards available, OFF = unused only (no priority system)
- **Cannibalization**: Users can pull cards from existing decks, but not commanders
- **Draft deck status**: Clearly labeled as "Draft" on dashboard, separate from imported decks

---

## Technical Architecture

### Database Schema

#### New Table: `draft_decks`

```sql
CREATE TABLE draft_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Deck identity
  deck_name TEXT NOT NULL,
  commander_name TEXT NOT NULL,
  partner_name TEXT,  -- Optional partner commander
  color_identity TEXT[] NOT NULL,  -- ['W', 'U', 'B', 'R', 'G']
  archetype TEXT NOT NULL,  -- 'Control', 'Combo', etc.
  
  -- Deck data
  deck_data JSONB NOT NULL,  -- Full deck list: {mainboard: Card[], lands: Card[]}
  
  -- Generation metadata
  allow_used_cards BOOLEAN NOT NULL DEFAULT false,  -- Toggle state when generated
  source_tracking JSONB,  -- Which cards came from which existing decks
  
  -- Quality metrics
  estimated_power_level NUMERIC(3,1),  -- 1.0-10.0
  synergy_score NUMERIC(3,2),  -- 0.00-1.00
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, deck_name)
);

-- RLS policies
ALTER TABLE draft_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own draft decks"
  ON draft_decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own draft decks"
  ON draft_decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft decks"
  ON draft_decks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own draft decks"
  ON draft_decks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_draft_decks_user_id ON draft_decks(user_id);
CREATE INDEX idx_draft_decks_archetype ON draft_decks(archetype);
```

### Backend API Structure

#### New Edge Function: `supabase/functions/deck-builder/`

```
supabase/functions/deck-builder/
├── index.ts                     # Route handler
└── _shared/
    ├── commander_ranker.ts      # Commander ranking algorithm
    ├── deck_builder.ts          # Deck construction algorithm
    └── moxfield_exporter.ts     # Export format
```

#### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/deck-builder/rank-commanders` | Rank user's legendary creatures for archetype |
| `POST` | `/deck-builder/build` | Generate full 100-card deck |
| `GET` | `/deck-builder/drafts` | Get user's draft decks |
| `PUT` | `/deck-builder/drafts/:id` | Update draft deck |
| `DELETE` | `/deck-builder/drafts/:id` | Delete draft deck |
| `GET` | `/deck-builder/export/:id` | Export draft as Moxfield format |

---

## Implementation Phases

### Phase 1: Commander Ranking (MVP)

**Goal**: Prove the concept with one archetype (Control)

**Deliverables:**
- [ ] Backend: `commander_ranker.ts` with scoring algorithm
- [ ] API endpoint: `POST /deck-builder/rank-commanders`
- [ ] Frontend: `ArchetypeReadiness.jsx` shows top 3 commanders per archetype
- [ ] UI: Click "Build Deck" button on commander card

**Algorithm** (from mtg-specialist research):

```typescript
interface CommanderScore {
  commander: CollectionCard;
  score: number;  // 0-1.0
  breakdown: {
    colorMatch: number;      // 30% weight
    synergy: number;         // 40% weight
    archetypePieces: number; // 20% weight
    unusedCards: number;     // 10% weight
  };
  reasons: string[];
}

function rankCommanders(
  legendaries: CollectionCard[],
  archetype: string,
  collection: CollectionAnalysis,
  deckUsage: Map<string, number>
): CommanderScore[] {
  // 1. Filter to unused commanders only (can't be in another deck)
  const availableCommanders = legendaries.filter(cmd => 
    deckUsage.get(cmd.name) === 0
  );
  
  // 2. Score each commander
  const scores = availableCommanders.map(cmd => ({
    commander: cmd,
    score: calculateScore(cmd, archetype, collection, deckUsage),
    breakdown: getScoreBreakdown(cmd, archetype, collection, deckUsage),
    reasons: getReasons(cmd, archetype, collection),
  }));
  
  // 3. Sort by score, return top 3
  return scores.sort((a, b) => b.score - a.score).slice(0, 3);
}
```

**Success Criteria:**
- Control archetype shows 3 commanders with scores > 0.5
- UI displays commander cards with score breakdown
- "No suitable commanders" message if score < 0.3

---

### Phase 2: Deck Generation (Core Feature)

**Goal**: Build full 100-card decks with proper ratios

**Deliverables:**
- [ ] Backend: `deck_builder.ts` with construction algorithm
- [ ] API endpoint: `POST /deck-builder/build`
- [ ] Database migration: Create `draft_decks` table
- [ ] Frontend: Deck builder modal with toggle and preview
- [ ] UX: Card source indicators (which deck each card comes from)

**Algorithm** (from mtg-specialist research):

```typescript
interface DeckBuildRequest {
  commander: string;  // Card name
  archetype: string;
  allowUsedCards: boolean;  // Toggle state
}

interface DeckBuildResult {
  deck: {
    commander: Card;
    partner?: Card;
    mainboard: Card[];  // 99 cards
  };
  stats: {
    lands: number;
    ramp: number;
    draw: number;
    removal: number;
    averageCMC: number;
    manaCurve: Record<number, number>;
  };
  quality: {
    estimatedPowerLevel: number;  // 1-10
    synergyScore: number;         // 0-1
    speedRating: number;          // 1-10
    resilienceRating: number;     // 1-10
    interactionRating: number;    // 1-10
  };
  sourceTracking: Record<string, string>;  // card_name → "Deck A" or "Collection"
}
```

**Deck Construction Steps:**

1. **Filter legal cards**
   - Must match commander's color identity
   - If toggle OFF: skip cards with `in_use > 0`
   - Always skip commanders (even if toggle ON)

2. **Build mana base** (36-37 lands)
   - Calculate basic land distribution by color
   - Add dual lands from collection (sort by quality: untapped > tapped)
   - Include utility lands

3. **Add ramp** (10-15 cards based on archetype)
   - Prefer CMC ≤3
   - Rocks > dorks for resilience
   - Lands > artifacts in Control/Midrange

4. **Add card draw** (10-14 cards)
   - Prefer engines over one-shots
   - Balance instant vs. sorcery speed

5. **Add removal** (8-12 cards)
   - Targeted + board wipes
   - Instant speed preferred
   - Exile > destroy

6. **Add archetype-specific pieces**
   - Control: 8+ counterspells, 4+ wraths
   - Combo: 6+ tutors, 5+ protection
   - Tokens: 10+ generators, 5+ anthems
   - Reanimator: 8+ reanimation, 10+ discard outlets
   - Voltron: 8+ equipment, 6+ auras, 8+ protection
   - Aristocrats: 6+ sac outlets, 8+ death triggers

7. **Fill with threats/value** (remaining slots)
   - Creatures, planeswalkers, win conditions
   - Balance CMC curve (avoid too many at one CMC)

**Archetype Ratios** (lands/ramp/draw/removal/specific/threats):

| Archetype | Lands | Ramp | Draw | Removal | Specific | Threats |
|-----------|-------|------|------|---------|----------|---------|
| Control | 37 | 10 | 14 | 12 | 15 | 12 |
| Combo | 34 | 15 | 12 | 6 | 20 | 13 |
| Tokens | 36 | 12 | 12 | 8 | 18 | 14 |
| Reanimator | 36 | 11 | 10 | 8 | 20 | 15 |
| Voltron | 35 | 12 | 10 | 6 | 22 | 15 |
| Aristocrats | 36 | 11 | 12 | 7 | 20 | 14 |

**Success Criteria:**
- Generates exactly 100 cards (commander + 99)
- Singleton constraint enforced (except basic lands)
- Meets archetype minimum thresholds
- All cards legal for commander's color identity
- CMC curve reasonable (average 2.5-3.5)

---

### Phase 3: Draft Deck Management

**Goal**: Store, edit, and export draft decks

**Deliverables:**
- [ ] API endpoints: GET/PUT/DELETE for draft decks
- [ ] Database: RLS policies on `draft_decks`
- [ ] Frontend: Draft deck list on dashboard
- [ ] UI: Edit modal to swap cards
- [ ] Export: Moxfield plain text format

**Draft Deck Dashboard:**

```
┌─────────────────────────────────────────────────┐
│ My Decks                         [+ Import Deck]│
├─────────────────────────────────────────────────┤
│ Tabs: [All] [Imported] [Drafts]                │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📝 DRAFT: Meren Reanimator (Power Level: 6.2) │
│    Archetype: Reanimator • Golgari • 100 cards│
│    [Analyze] [Edit] [Export to Moxfield] [⋮]  │
│                                                 │
│ 📝 DRAFT: Tatyova Control (Power Level: 5.8)  │
│    Archetype: Control • Simic • 100 cards     │
│    [Analyze] [Edit] [Export to Moxfield] [⋮]  │
│                                                 │
│ ── Imported Decks ──────────────────────────── │
│                                                 │
│ Caesar Tokens                     [Analyzed]   │
│    Archetype: Tokens • Bant • 100 cards       │
│    [View Analysis] [⋮]                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Moxfield Export Format:**

```
// Commander
1 Meren of Clan Nel Toth

// Lands
8 Forest
7 Swamp
1 Command Tower
1 Overgrown Tomb
...

// Ramp
1 Sol Ring
1 Arcane Signet
1 Cultivate
...

// Card Draw
1 Phyrexian Arena
1 Skullclamp
...

// Removal
1 Beast Within
1 Putrefy
...

// Reanimation
1 Animate Dead
1 Reanimate
1 Victimize
...

// Creatures
1 Sakura-Tribe Elder
1 Eternal Witness
...
```

**Success Criteria:**
- Draft decks appear on dashboard with clear "DRAFT" label
- Export downloads `.txt` file that imports into Moxfield
- Edit modal allows swapping cards (validates constraints)
- Delete removes from database

---

### Phase 4: UI/UX Polish

**Goal**: Make deck building intuitive and informative

**Deliverables:**
- [ ] Archetype Readiness: Show commander rankings inline
- [ ] Deck Builder Modal: Step-by-step wizard
- [ ] Card Source Indicators: Highlight cards from existing decks
- [ ] Quality Metrics: Show power level, synergy, and archetype fit
- [ ] Tooltips: Explain rankings and scores

**Deck Builder Modal Flow:**

```
┌─────────────────────────────────────────────────┐
│ Build Deck for Control Archetype         [✕]  │
├─────────────────────────────────────────────────┤
│ Step 1: Choose Commander                       │
│                                                 │
│ ┌─────────────────┐  ┌─────────────────┐      │
│ │ [Image]         │  │ [Image]         │      │
│ │ Nekusar         │  │ Narset          │      │
│ │ ★★★★★ 0.87      │  │ ★★★★☆ 0.76      │      │
│ │ • Strong UBR    │  │ • Strong UWR    │      │
│ │   card pool     │  │   card pool     │      │
│ │ • Wheel synergy │  │ • Spell slinger │      │
│ └─────────────────┘  └─────────────────┘      │
│                                                 │
│ ⚙️ Card Source                                 │
│   ○ Unused cards only                         │
│   ● All cards (including from existing decks) │
│                                                 │
│                     [Next: Generate Deck →]   │
└─────────────────────────────────────────────────┘

(After generation)

┌─────────────────────────────────────────────────┐
│ Nekusar Control Deck                      [✕]  │
├─────────────────────────────────────────────────┤
│ Deck Quality                                   │
│ Power Level: ██████░░░░ 6.2/10                │
│ Synergy: ████████░░ 0.78                      │
│ Speed: ██████░░░░ 6/10                        │
│                                                 │
│ Deck Composition (100 cards)                   │
│ • 37 Lands • 10 Ramp • 14 Draw                │
│ • 8 Counterspells • 4 Wraths • 27 Other       │
│                                                 │
│ Card List                                      │
│ ┌─────────────────────────────────────────┐   │
│ │ Ramp (10)                          [▼] │   │
│ │ ─────────────────────────────────────  │   │
│ │ Sol Ring                          [⚠️]  │ ← from Caesar deck
│ │ Arcane Signet                           │   │
│ │ Fellwar Stone                           │   │
│ ╰─────────────────────────────────────────╯   │
│                                                 │
│ [Save as Draft] [Export to Moxfield]          │
└─────────────────────────────────────────────────┘
```

**Card Source Indicators:**
- ✅ **Green checkmark**: Card unused in collection
- ⚠️ **Yellow warning**: Card from existing deck (show deck name on hover)
- 🔒 **Locked**: Commander (can't be used)

**Success Criteria:**
- Users understand commander rankings without reading docs
- Card sources are visually clear
- Quality metrics help users gauge deck strength
- Export is one-click

---

## Domain Knowledge Reference

### Archetype-Specific Requirements

#### Control (Reactive, Card Advantage, Win Late)
**Minimum thresholds:**
- 8+ counterspells (Swan Song, Counterspell, Negate, etc.)
- 4+ board wipes (Wrath of God, Damnation, Cyclonic Rift)
- 12+ card draw (Rhystic Study, Mystic Remora, instant-speed draw)
- 6+ targeted removal (exile preferred)

**Commander synergy keywords:**
- "counter target spell"
- "draw a card"
- "return to hand"
- "flash"

**Common mistakes:**
- Not enough counterspells (6 ≠ Control, that's just "has interaction")
- Running out of gas (need repeatable draw engines)
- Win cons too slow (have a plan to close)

---

#### Combo (Fast, Focused, Win with Combos)
**Minimum thresholds:**
- 6+ tutors (Demonic, Vampiric, Mystical, Worldly)
- 14+ ramp (Sol Ring, Arcane Signet, fast mana rocks)
- 5+ protection (Swan Song, Pact of Negation, Lightning Greaves)
- 15+ combo pieces (overlapping win conditions)

**Commander synergy keywords:**
- "when ~ enters the battlefield"
- "sacrifice"
- "untap"
- "search your library"

**Common mistakes:**
- Not enough tutors (can't find combo = can't win)
- Fragile combos (one counterspell and you're done)
- No plan B (if combo fails, deck folds)

---

#### Tokens (Go Wide, Anthems, Overrun)
**Minimum thresholds:**
- 12+ token generators (Secure the Wastes, Bitterblossom, etc.)
- 5+ anthems (Glorious Anthem, Cathars' Crusade, Coat of Arms)
- 3+ sacrifice outlets (Ashnod's Altar, Viscera Seer)

**Commander synergy keywords:**
- "create.*token"
- "creatures you control get"
- "whenever a creature enters"

**Common mistakes:**
- Not enough anthems (1/1 tokens die to Pyroclasm)
- Vulnerability to wraths (run Heroic Intervention)
- No sac outlets (get value before opponents wipe)

---

#### Reanimator (Cheat Big Creatures from Graveyard)
**Minimum thresholds:**
- 8+ reanimation spells (Animate Dead, Reanimate, Victimize, Living Death)
- 10+ discard/mill outlets (Entomb, Buried Alive, Faithless Looting)
- 8+ reanimation targets (Eldrazi, Praetors, dragons with ETBs)
- 3+ graveyard protection (against Rest in Peace)

**Commander synergy keywords:**
- "return.*creature.*graveyard.*battlefield"
- "discard"
- "mill"
- "when ~ dies"

**Common mistakes:**
- Not enough ways to fill graveyard
- Not enough reanimation spells
- No graveyard protection (one RIP and deck doesn't work)

---

#### Voltron (Kill with Commander Damage)
**Minimum thresholds:**
- 8+ equipment (Lightning Greaves, Sword of X and Y, CMC ≤3 preferred)
- 6+ auras (risky but high payoff)
- 8+ protection (Heroic Intervention, counterspells, hexproof)
- Evasion built-in (flying, trample, unblockable)

**Commander synergy keywords:**
- "equipment"
- "aura"
- "double strike"
- "hexproof"
- "indestructible"

**Common mistakes:**
- Not enough protection (one Terminate and 10-mana commander is gone)
- Equipment too expensive (should have 2 equipped by turn 6)
- No backup plan (if commander hits 12+ mana, need other threats)

---

#### Aristocrats (Sacrifice for Value, Drain Opponents)
**Minimum thresholds:**
- 6+ sacrifice outlets (Viscera Seer, Ashnod's Altar, Phyrexian Altar)
- 10+ death trigger payoffs (Blood Artist, Zulaport Cutthroat, Grave Pact)
- 8+ token generators (fuel for sacrificing)
- 6+ recursion (Sun Titan, Karmic Guide, get creatures back)

**Commander synergy keywords:**
- "sacrifice"
- "when.*dies"
- "death trigger"
- "each opponent loses"

**Common mistakes:**
- Not enough sac outlets
- Only one payoff (gets removed, left with no value)
- No recursion (run out of creatures)

---

## Success Metrics

### MVP (Phase 1-2) Success Criteria
- [ ] 80%+ of users with legendaries in collection see at least 1 commander ranked > 0.5
- [ ] Generated decks meet archetype thresholds 100% of time
- [ ] Zero color identity violations
- [ ] All decks have exactly 100 cards
- [ ] Average CMC in reasonable range (2.5-3.5)

### User Experience Metrics
- [ ] Time to build deck: < 30 seconds (loading excluded)
- [ ] Moxfield export success rate: 100%
- [ ] Draft deck saves without errors: 100%
- [ ] Users understand commander rankings without confusion

### Long-term Goals
- [ ] Users prefer MTG Assistant deck builder over manually building from scratch
- [ ] Draft decks have similar win rates to imported Moxfield decks (same power level)
- [ ] Feature requests for upgrade paths (future enhancement)

---

## Open Questions

1. **Basic lands**: Should we assume unlimited basics (not from collection)? **Answer**: Yes — Commander format allows unlimited basics.

2. **Card quantity**: If user owns 2x Sol Ring, can both be suggested for different decks when toggle is ON? **Answer**: Yes, but track which deck uses which copy.

3. **Partner commanders**: Do we rank them separately or as pairs? **Answer**: Rank partners separately, score gets +15% bonus for flexibility.

4. **Power level estimation**: Use fast mana density + tutor count? **Answer**: Yes — formula from `deck_analyzer.ts` applies. Base 4.0, +0.5 per fast mana (max +2.0), +0.4 per tutor (max +2.0).

5. **Upgrade path**: Should we show "add these 5 cards to bump from 5 to 6"? **Answer**: Phase 4 enhancement, MVP focuses on "build with what you have."

6. **Commander popularity data**: Use EDHREC for secondary scoring? **Answer**: No — we're differentiated by collection-fit, not popularity.

---

## Technical Considerations

### Performance
- **Commander ranking**: O(n × m) where n = legendary creatures, m = collection size. Target: < 2 seconds for 20 commanders × 2000 cards.
- **Deck generation**: O(n log n) sorting for each category. Target: < 3 seconds for 2000-card collection.
- **Caching**: Cache collection analysis + archetype readiness for 5 minutes to reduce recomputation.

### Data Quality
- **Collection completeness**: Requires uploaded collection. Show error if missing.
- **Card categorization**: Reuse existing `collection_analyzer.ts` — already optimized and tested.
- **Edge cases**:
  - No legendary creatures owned → show "Please acquire commanders first"
  - Insufficient cards for archetype → show estimated power level with gaps
  - All cards in use (toggle OFF) → show "Enable 'Use existing deck cards' to build"

### Security
- **RLS**: All draft deck operations scoped to `auth.uid()`
- **Input validation**: Validate commander exists in collection, archetype is valid, toggle is boolean
- **Rate limiting**: Deck generation is compute-heavy — limit to 5 builds per minute per user

### Testing Strategy
- **Unit tests**: Commander ranking scores, deck construction logic, moxfield export format
- **Integration tests**: Full build flow (rank → build → save → export)
- **Manual tests**: Build deck for each archetype × 2 power levels = 12 test cases

---

## Future Enhancements (Post-MVP)

### Phase 5: Upgrade Path
- Show "what to add" to improve power level
- Suggest budget-friendly upgrades (<$ 5 each)
- Track when user implements suggestions

### Phase 6: Advanced Options
- Power level targets (build a 7, not a 10)
- Budget constraints ($50 max deck value)
- Avoid strategies (no infinite combos, no land destruction)

### Phase 7: Social Features
- Share draft decks with friends
- Community voting on deck quality
- Deck improvement suggestions from other users

### Phase 8: Purchase Integration
- Show TCGPlayer prices for missing cards
- One-click "complete this deck" cart
- Track collection value over time

---

## Conclusion

This deck builder fills a critical gap: **no tool optimizes 100-card Commander decks for your actual collection**. By combining:
- Collection-first philosophy
- Archetype threshold validation
- Commander fit ranking
- Usage tracking integration
- MTG domain expertise (archetype ratios, card selection heuristics)

...we create a feature that's genuinely useful for players with growing collections who don't want to buy singles.

**MVP timeline**: 2-3 weeks (Phase 1-2)  
**Full feature**: 4-6 weeks (Phase 1-4)  
**Research complete**: ✅ Ready to start implementation
