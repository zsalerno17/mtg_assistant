# MTG Assistant — Deck Metadata & Iteration Tracking Schema Design

> **Phase 23 Design Document**  
> Data model for tracking deck changes, improvements, and feedback loops over time

---

## 1. Problem Statement

### Current State

The `analyses` table stores deck analysis results as JSON blobs:

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  deck_id TEXT NOT NULL,
  deck_name TEXT,
  deck_updated_at TIMESTAMPTZ,
  result_json JSONB NOT NULL,  -- Everything lives here
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Limitations:**
1. **No normalized tracking** — themes, weaknesses, improvements all buried in JSON blob
2. **No user action tracking** — did user accept an improvement? Implement it? Test it?
3. **No version diffing** — when user re-analyzes after Moxfield changes, can't see what changed
4. **No trend data** — can't query "show ramp count over last 5 iterations"
5. **No scenario persistence** — scenarios run → results shown → lost forever (not saved)
6. **No feedback loops** — suggested swap → user implements → re-analyze → no way to track "did this actually improve the deck?"

### Goals

Design a schema that supports:
- **Deck versioning** — track snapshots over time, diff between versions
- **User decisions** — mark improvements as accepted/rejected/implemented
- **Scenario testing** — save scenarios, link to actual changes, compare predicted vs actual impact
- **Trend analysis** — chart key metrics over time (ramp count, avg CMC, weakness resolution)
- **Feedback loops** — verify if improvements actually worked when user re-analyzes

---

## 2. Proposed Schema

### 2.1 — Core Tables

#### `deck_snapshots`

One row per deck version (each time `deck_updated_at` changes on Moxfield).

```sql
CREATE TABLE deck_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL,  -- Moxfield deck ID
  snapshot_at TIMESTAMPTZ NOT NULL,  -- Moxfield deck_updated_at
  
  -- Snapshot metadata
  deck_name TEXT NOT NULL,
  commander TEXT,
  partner TEXT,
  color_identity TEXT[],  -- ['W', 'U', 'B']
  format TEXT DEFAULT 'commander',
  
  -- Card list (full mainboard as JSON array for diffing)
  mainboard JSONB NOT NULL,  -- [{name, quantity, cmc, type_line, ...}, ...]
  
  -- Key stats (denormalized for fast querying)
  total_cards INT,
  land_count INT,
  ramp_count INT,
  draw_count INT,
  removal_count INT,
  board_wipe_count INT,
  average_cmc NUMERIC(4,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, deck_id, snapshot_at)
);

CREATE INDEX idx_snapshots_user_deck ON deck_snapshots(user_id, deck_id, snapshot_at DESC);
```

**Purpose**: Historical record of deck state over time. Enables:
- Version diffing ("You added 3 cards, removed 2 since last analysis")
- Trend charts ("Ramp count: 8 → 10 → 12 over 3 weeks")
- Rollback reference ("What did my deck look like before I broke it?")

---

#### `deck_analyses`

Replaces current `analyses` table. One row per AI/rule-based analysis run.

```sql
CREATE TABLE deck_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES deck_snapshots(id) ON DELETE CASCADE,
  
  -- Analysis metadata
  ai_enhanced BOOLEAN DEFAULT FALSE,
  verdict TEXT,
  
  -- Structured analysis results (no more giant JSON blob)
  themes TEXT[],  -- ['sacrifice', 'tokens', 'aristocrats']
  mana_curve JSONB,  -- {0: 5, 1: 12, 2: 18, ...}
  card_types JSONB,  -- {Creatures: 32, Instants: 8, ...}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(snapshot_id)  -- One analysis per snapshot
);

CREATE INDEX idx_analyses_user ON deck_analyses(user_id, created_at DESC);
CREATE INDEX idx_analyses_snapshot ON deck_analyses(snapshot_id);
```

**Why separate from snapshots?**
- Snapshots = immutable deck state (what was in the Moxfield list)
- Analyses = computed insights (can be re-run with different AI models, thresholds, etc.)

---

#### `deck_weaknesses`

Extracted from `result_json.weaknesses` for queryability.

```sql
CREATE TABLE deck_weaknesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES deck_analyses(id) ON DELETE CASCADE,
  
  label TEXT NOT NULL,  -- e.g., "Not enough card draw"
  severity TEXT CHECK(severity IN ('low', 'medium', 'high')),
  why TEXT,  -- Explanation
  look_for TEXT,  -- "Cards with 'draw' in oracle text"
  examples TEXT[],  -- ['Rhystic Study', 'Phyrexian Arena']
  
  -- User resolution tracking
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'addressed', 'wontfix')),
  resolved_at TIMESTAMPTZ,
  resolved_by_improvement_id UUID REFERENCES deck_improvements(id),  -- What fixed it?
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weaknesses_analysis ON deck_weaknesses(analysis_id);
CREATE INDEX idx_weaknesses_status ON deck_weaknesses(status) WHERE status = 'open';
```

**Purpose**: Track weakness lifecycle:
1. Weakness identified in analysis → `status = 'open'`
2. User accepts improvement that addresses it → `status = 'addressed'`, link to improvement
3. Next analysis shows weakness gone → auto-update `resolved_at`
4. Or: User marks as "won't fix" → `status = 'wontfix'`

---

#### `deck_improvements`

Extracted from `result_json.improvements.swaps` + `additions` for user action tracking.

```sql
CREATE TABLE deck_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES deck_analyses(id) ON DELETE CASCADE,
  
  suggestion_type TEXT NOT NULL CHECK(suggestion_type IN ('swap', 'add', 'urgent_fix')),
  category TEXT,  -- 'ramp', 'draw', 'removal', etc.
  
  -- The suggestion
  add_card TEXT NOT NULL,  -- Card to add
  cut_card TEXT,  -- Card to cut (NULL for pure additions)
  reason TEXT NOT NULL,
  score NUMERIC(3,2),  -- 0.0-1.0 quality score
  
  -- User action tracking
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'implemented', 'tested')),
  accepted_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,  -- When user actually made the change on Moxfield
  
  -- Verification via diff
  verified_in_snapshot_id UUID REFERENCES deck_snapshots(id),  -- Snapshot that shows this change was made
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_improvements_analysis ON deck_improvements(analysis_id);
CREATE INDEX idx_improvements_status ON deck_improvements(status);
```

**Workflow:**
1. AI suggests swap → `status = 'pending'`
2. User clicks "Accept" in UI → `status = 'accepted'`, `accepted_at` set
3. User implements on Moxfield → re-analyze triggers
4. New snapshot diffed against old → if `cut_card` removed AND `add_card` added → auto-update `status = 'implemented'`, link `verified_in_snapshot_id`
5. Optional: User marks as "tested" after playtesting → `status = 'tested'`

---

#### `deck_scenarios`

Persistent storage for scenario testing.

```sql
CREATE TABLE deck_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES deck_snapshots(id) ON DELETE CASCADE,
  
  name TEXT,  -- Optional user-provided name: "More ramp test"
  description TEXT,  -- Optional notes
  
  -- Scenario inputs
  cards_to_add TEXT[] NOT NULL,  -- ['Sol Ring', 'Arcane Signet']
  cards_to_remove TEXT[] NOT NULL,  -- ['Gilded Lotus', 'Worn Powerstone']
  
  -- Predicted impact (from AI or rule-based engine)
  predicted_impact JSONB,  -- {ramp_delta: +2, avg_cmc_delta: -0.5, verdict: "..."}
  ai_enhanced BOOLEAN DEFAULT FALSE,
  
  -- User action
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'implemented', 'discarded')),
  implemented_at TIMESTAMPTZ,
  implemented_via_improvement_ids UUID[],  -- Link to improvements that came from this scenario
  
  -- Actual impact (if implemented and re-analyzed)
  actual_impact JSONB,  -- {ramp_delta: +2, avg_cmc_delta: -0.4, verdict: "..."}
  verified_in_snapshot_id UUID REFERENCES deck_snapshots(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scenarios_user_snapshot ON deck_scenarios(user_id, snapshot_id);
CREATE INDEX idx_scenarios_status ON deck_scenarios(status);
```

**Workflow:**
1. User runs scenario → row created with `status = 'draft'`, `predicted_impact` saved
2. User likes it → clicks "Implement" → `status = 'implemented'`
3. New snapshot created → diff compared to `predicted_impact` → `actual_impact` calculated and stored
4. UI shows side-by-side: "Predicted +2 ramp, Actual +2 ramp ✓"

**Value**: Learn over time if AI predictions are accurate. "My scenarios predicted X but actual was Y" → adjust engine.

---

### 2.2 — Supporting Tables

#### `deck_changes`

Auto-generated diff between snapshots.

```sql
CREATE TABLE deck_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_snapshot_id UUID NOT NULL REFERENCES deck_snapshots(id) ON DELETE CASCADE,
  to_snapshot_id UUID NOT NULL REFERENCES deck_snapshots(id) ON DELETE CASCADE,
  
  cards_added JSONB,  -- [{name, quantity}, ...]
  cards_removed JSONB,  -- [{name, quantity}, ...]
  net_changes JSONB,  -- {ramp: +2, draw: 0, avg_cmc: -0.3}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(from_snapshot_id, to_snapshot_id)
);

CREATE INDEX idx_changes_to_snapshot ON deck_changes(to_snapshot_id);
```

**Computed on every new snapshot**: Compare `mainboard` arrays, emit added/removed cards.

**Use cases:**
- Dashboard changelog: "3 cards added, 2 removed since last analysis"
- Auto-verify improvements: check if `cut_card` is in `cards_removed` AND `add_card` is in `cards_added`
- Trend detection: "You've added 8 ramp sources over 4 iterations"

---

## 3. Migration Plan

### 3.1 — Backwards Compatibility

**Don't break existing data.** Approach:

1. **Create new tables** (all the above)
2. **Keep `analyses` table** for now (read-only)
3. **Backfill script**: Loop through `analyses` rows, create:
   - One `deck_snapshots` row per unique `(deck_id, deck_updated_at)`
   - One `deck_analyses` row per analysis
   - Extract weaknesses → `deck_weaknesses` rows
   - Extract improvements → `deck_improvements` rows (all `status = 'pending'` since we don't know user actions)
4. **Dual-write period**: New analyses write to both `analyses` (for safety) and new tables
5. **After 1 month**: Drop `analyses` table, remove dual-write code

### 3.2 — SQL Migration File

```sql
-- Create new schema (simplified example)
CREATE TABLE deck_snapshots (...);
CREATE TABLE deck_analyses (...);
CREATE TABLE deck_weaknesses (...);
CREATE TABLE deck_improvements (...);
CREATE TABLE deck_scenarios (...);
CREATE TABLE deck_changes (...);

-- Backfill from analyses (pseudo-code)
INSERT INTO deck_snapshots (...)
SELECT DISTINCT user_id, deck_id, deck_updated_at, ...
FROM analyses;

INSERT INTO deck_analyses (...)
SELECT id, user_id, (SELECT id FROM deck_snapshots WHERE ...), ...
FROM analyses;

-- etc.
```

**Don't run yet** — this is design only.

---

## 4. API Contract Changes

### 4.1 — New Endpoints

#### `GET /api/decks/:deckId/history`

Returns timeline of snapshots + analyses for a deck.

```json
{
  "snapshots": [
    {
      "id": "uuid",
      "snapshot_at": "2026-04-01T12:00:00Z",
      "total_cards": 100,
      "ramp_count": 10,
      "draw_count": 12,
      "analysis": {
        "verdict": "...",
        "ai_enhanced": true
      },
      "changes": {
        "added": ["Sol Ring"],
        "removed": ["Worn Powerstone"]
      }
    },
    // ... older snapshots
  ]
}
```

**Used by**: New "Deck Timeline" page (future feature).

---

#### `POST /api/improvements/:improvementId/accept`

Mark improvement as accepted.

```json
{
  "status": "accepted"
}
```

**Returns**: Updated improvement object.

---

#### `POST /api/scenarios`

Save a scenario for later reference.

```json
{
  "snapshot_id": "uuid",
  "name": "More ramp test",
  "cards_to_add": ["Sol Ring", "Arcane Signet"],
  "cards_to_remove": ["Gilded Lotus"],
  "predicted_impact": {...},
  "ai_enhanced": false
}
```

**Returns**: Created scenario object.

---

#### `GET /api/decks/:deckId/trends`

Returns time-series data for charting.

```json
{
  "metrics": [
    {
      "date": "2026-04-01",
      "ramp_count": 10,
      "draw_count": 12,
      "avg_cmc": 3.2,
      "land_count": 37
    },
    // ... older dates
  ]
}
```

**Used by**: New "Deck Insights" dashboard (future feature).

---

### 4.2 — Modified Endpoints

#### `POST /api/decks/analyze`

**Before**: Returns analysis JSON blob.

**After**: Also creates `deck_snapshots` row (if new `deck_updated_at`), `deck_analyses` row, and extracts to normalized tables.

**Response unchanged** (for backwards compat), but DB writes go to new tables.

---

## 5. UI Mockups

### 5.1 — Deck Timeline View

**New page**: `/deck/:deckId/timeline`

```
┌─────────────────────────────────────────┐
│ Deck Timeline — My Voltron Deck         │
├─────────────────────────────────────────┤
│                                         │
│  Apr 10, 2026 ─ Latest                 │
│  Ramp: 12 (+2) │ Draw: 10 │ CMC: 3.1  │
│  ✓ Added: Sol Ring, Arcane Signet      │
│  ⨯ Removed: Gilded Lotus                │
│  ── Analysis: 3 weaknesses fixed        │
│                                         │
│  ───────────────────────────────────────│
│                                         │
│  Apr 3, 2026                            │
│  Ramp: 10 │ Draw: 10 │ CMC: 3.4         │
│  ✓ Added: Rhystic Study                │
│  ── Analysis: 1 improvement accepted    │
│                                         │
│  ───────────────────────────────────────│
│                                         │
│  Mar 28, 2026                           │
│  Ramp: 10 │ Draw: 9 │ CMC: 3.5          │
│  ── Initial analysis                    │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Click any snapshot → navigate to that analysis
- Expand to see full card diff
- Chart view toggle: line chart of ramp/draw/CMC over time

---

### 5.2 — Improvements Tracker

**New tab on Deck page**: "Tracker" (between Improvements and Scenarios)

```
┌─────────────────────────────────────────┐
│ Improvement Tracker                     │
├─────────────────────────────────────────┤
│                                         │
│  [Implemented] ✓ Apr 10                │
│  + Sol Ring  for  − Gilded Lotus       │
│  Verified in latest snapshot           │
│                                         │
│  [Accepted] Apr 3                       │
│  + Rhystic Study                        │
│  [Implement on Moxfield →]             │
│                                         │
│  [Pending]                              │
│  + Swords to Plowshares  for  − Murder │
│  [Accept] [Reject]                      │
│                                         │
└─────────────────────────────────────────┘
```

**Workflow:**
1. Improvements tab shows suggestions → user clicks "Accept" → moves to Tracker
2. User implements on Moxfield
3. Re-analyze → if detected in diff → auto-mark "Implemented"

---

### 5.3 — Scenario Testing Workflow

**Enhanced Scenarios tab:**

```
┌─────────────────────────────────────────┐
│ Test Scenario                           │
├─────────────────────────────────────────┤
│                                         │
│  Add: [Sol Ring ⨯] [Arcane Signet ⨯]   │
│  Remove: [Gilded Lotus ⨯]               │
│                                         │
│  [Run Scenario]  [Save for Later]      │
│                                         │
│  ──── Predicted Impact ────             │
│  Ramp: 10 → 12 (+2)                     │
│  Avg CMC: 3.4 → 3.1 (−0.3)              │
│  Verdict: "Adding 2 low-CMC ramp..."    │
│                                         │
│  [Implement These Changes]              │
│                                         │
└─────────────────────────────────────────┘
```

**After implementing + re-analyzing:**

```
┌─────────────────────────────────────────┐
│ Scenario Results                        │
├─────────────────────────────────────────┤
│  Predicted vs Actual                    │
│  Ramp: 10 → 12  |  Actual: 10 → 12 ✓   │
│  CMC:  3.4 → 3.1 | Actual: 3.4 → 3.2 ≈  │
│                                         │
│  Prediction accuracy: 95%               │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Benefits

### For Users
- **Visible progress**: See deck improvements over time, not just one-off suggestions
- **Confidence**: Verify that changes actually worked ("Predicted +2 ramp, got +2 ramp")
- **Learning**: Understand what changes had biggest impact
- **Planning**: Save scenarios, revisit later

### For System
- **Queryable data**: No more digging through JSON blobs
- **Feedback loops**: Learn which suggestions users accept vs reject
- **Accuracy tracking**: Measure prediction vs reality → improve engine
- **Trend analysis**: Detect patterns ("Users who add >10 ramp see 15% better avg CMC")

---

## 7. Implementation Phases

**Phase 23a** (design — this doc) — ✓ Complete

**Phase 23b** (schema + migration) — Future work:
- [ ] Write full SQL migration (backfill + indexes + RLS policies)
- [ ] Test on staging DB
- [ ] Run in production

**Phase 23c** (backend API) — Future work:
- [ ] New endpoints: `/history`, `/trends`, `/improvements/:id/accept`, `/scenarios`
- [ ] Modify `/analyze` to write to new tables
- [ ] Diffing logic for `deck_changes`

**Phase 23d** (frontend UI) — Future work:
- [ ] Deck Timeline page
- [ ] Improvements Tracker tab
- [ ] Enhanced Scenarios tab (save/implement workflow)
- [ ] Trend charts (Recharts line graphs)

**Priority**: Low (Phase 17-22 are higher priority). This is **foundational design** for future iteration tracking features.

---

## 8. Open Questions

**Q**: Should weaknesses auto-resolve when not present in next analysis, or require manual user confirmation?  
**A**: Auto-resolve but keep history. Mark as `resolved_at` when missing from new analysis, but don't delete row (for trends).

**Q**: How to handle partial scenario implementation? (User adds 1 of 3 suggested cards)  
**A**: Track per-card verification. Link each `deck_improvements` row to the scenario, mark individually.

**Q**: Should we track user-initiated changes (not from suggestions)?  
**A**: Yes — when diff shows changes not linked to any improvement, create "user_change" rows for completeness.

**Q**: Performance impact of large `mainboard` JSONB columns?  
**A**: PostgreSQL handles this well. Add GIN index on `mainboard` if querying card presence. Typical deck = ~100 cards × 200 bytes = 20KB per snapshot. 1000 snapshots = 20MB (negligible).

**Q**: RLS policies?  
**A**: All new tables: `auth.uid() = user_id` (same as existing tables). User only sees own snapshots/analyses/improvements.

---

**Phase 23 complete.** Schema design documented, ready for future implementation when iteration tracking features are prioritized.
