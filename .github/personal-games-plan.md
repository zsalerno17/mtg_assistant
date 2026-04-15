# Plan: The Battlefield — Campaigns & Skirmishes

## Context
The "Leagues" nav tab becomes "The Battlefield" — a unified hub for all in-game tracking. Within it, two sub-tabs:
- **Campaigns** — the current league system (renamed from "Leagues")
- **Skirmishes** — new standalone personal game log (no league required)

This keeps the nav clean (one tab, not two) while adding the new personal game tracking feature.

---

## Naming Reference

| Old name | New name |
|----------|----------|
| Leagues (nav tab) | The Battlefield |
| Leagues list | Campaigns |
| Create League | Create Campaign |
| Personal games | Skirmishes |
| Log personal game | Log Skirmish |

---

## Phase 1 — Database

**New migration:** `supabase/migrations/020_personal_games.sql`

Extends `league_games` rather than creating a new table. Standalone ("skirmish") rows have `league_id = NULL` and carry `placement` + `deck_id` directly on the row. League games are unaffected — all existing queries filter on `league_id = ?` so null-league rows never appear in league views.

```sql
-- Make league_id optional (skirmish games have no league)
ALTER TABLE league_games ALTER COLUMN league_id DROP NOT NULL;

-- Add owner for skirmish rows (RLS + filtering)
ALTER TABLE league_games
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make game_number optional (meaningless for skirmishes)
ALTER TABLE league_games ALTER COLUMN game_number DROP NOT NULL;

-- Store the user's result directly on the row (only used when league_id IS NULL)
ALTER TABLE league_games
  ADD COLUMN IF NOT EXISTS placement INT CHECK (placement >= 1),
  ADD COLUMN IF NOT EXISTS deck_id UUID REFERENCES user_decks(id) ON DELETE SET NULL;

-- Every row must belong to a league OR have an owner
ALTER TABLE league_games
  ADD CONSTRAINT check_game_context
  CHECK (league_id IS NOT NULL OR user_id IS NOT NULL);

-- Replace the old unique constraint with a partial index scoped to league games
ALTER TABLE league_games DROP CONSTRAINT IF EXISTS league_games_league_id_game_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_league_games_league_number
  ON league_games(league_id, game_number)
  WHERE league_id IS NOT NULL AND game_number IS NOT NULL;

-- RLS: users manage their own skirmish rows
CREATE POLICY "Users manage their own skirmishes"
  ON league_games FOR ALL
  USING  (league_id IS NULL AND user_id = auth.uid())
  WITH CHECK (league_id IS NULL AND user_id = auth.uid());

-- Index for personal game history queries
CREATE INDEX idx_league_games_user_skirmish
  ON league_games(user_id, played_at DESC)
  WHERE league_id IS NULL;
```

---

## Phase 2 — Edge Function

**New file:** `supabase/functions/games/index.ts`

Same boilerplate as `supabase/functions/leagues/index.ts`. All queries hit `league_games WHERE league_id IS NULL`.

**Routes:**

| Method | Path | Action |
|--------|------|--------|
| `GET` | `/games` | `listSkirmishes` — paginated, `played_at DESC`, joins `user_decks(deck_name, commander_image_uri)` |
| `POST` | `/games` | `logSkirmish` — validate pod_size (2–10), placement (1–pod_size), optional deck ownership check, insert with `league_id = NULL, user_id = userId` |
| `GET` | `/games/:id` | `getSkirmish` — single row + deck join |
| `DELETE` | `/games/:id` | `deleteSkirmish` |

Rate limit: 20 skirmish logs per hour per user, fail-open.

---

## Phase 3 — API Layer

**File:** `frontend/src/lib/api.js` — add at the bottom of the `api` object:

```javascript
// Skirmishes (standalone games, no league)
logSkirmish: (data) =>
  edgeFetch('games', '', { method: 'POST', body: JSON.stringify(data) }),
getSkirmishes: (page = 1) =>
  edgeFetch('games', `?page=${page}`, {}),
deleteSkirmish: (game_id) =>
  edgeFetch('games', `/${game_id}`, { method: 'DELETE' }),
```

---

## Phase 4 — Frontend: BattlefieldPage

### New file: `frontend/src/pages/BattlefieldPage.jsx`

Replaces `LeaguesPage.jsx` as the destination for the nav tab. Has two sub-tabs controlled by local state (`activeTab: 'campaigns' | 'skirmishes'`).

**Tab bar (inside the page header area):**
```jsx
<div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
  <button onClick={() => setActiveTab('campaigns')}
    className={activeTab === 'campaigns' ? '...active style...' : '...inactive style...'}>
    Campaigns
  </button>
  <button onClick={() => setActiveTab('skirmishes')}
    className={activeTab === 'skirmishes' ? '...active style...' : '...inactive style...'}>
    Skirmishes
  </button>
</div>
```

**Campaigns tab** — identical to the current `LeaguesPage.jsx` content:
- League list grid, league card links, loading/empty states
- `CreateLeagueModal` (keep as-is, just the label changes in the button: "Create Campaign")
- Bulk actions (Refresh Decks, Archive Completed, Show/Hide Completed)
- All API calls unchanged (`api.getLeagues()`, `api.createLeague()`, etc.)

**Skirmishes tab** — new content:

Stats tiles (grid-cols-2 md:grid-cols-4, computed from `skirmishes` array via `useMemo`):
- Total skirmishes
- Win rate (placement = 1)
- Avg placement (1 decimal)
- Top deck (most wins by deck_id)

Header: "Skirmishes" heading + "+ Log Skirmish" button (opens `LogSkirmishModal`)

Skirmish card (one per game, most recent first):
- Date + "N-player pod"
- Placement badge (gold for 1st, ordinal)
- Deck name + commander thumbnail (if deck selected)
- Notes excerpt (80 chars)
- Trash icon with inline confirm (no modal)

Loading: 3× `<GameCardSkeleton />` (already in `Skeletons.jsx`)

Empty: centered prompt + "Log your first skirmish" button

Pagination: "Load More" button, appends to `skirmishes` array.

**State management:**
- `activeTab` — which tab is shown
- `campaigns` + campaign loading/error state (loaded lazily when Campaigns tab is first visited)
- `skirmishes` + skirmish loading/error state (loaded lazily when Skirmishes tab is first visited)

Both datasets load lazily on first tab visit to avoid loading everything upfront.

### New file: `frontend/src/components/LogSkirmishModal.jsx`

Inline modal (same pattern as `CreateLeagueModal`). Triggered by "+ Log Skirmish" button.

**Fields:**
1. Date & Time — `datetime-local`, default: now
2. Pod Size — `select` 2–10, default: 4
3. Placement — `select` 1 → podSize, ordinal labels ("1st (Winner)", "2nd", …)
4. Deck Played — `select` from `myDecks` (optional)
5. Notes — `textarea` (optional)

**Submit:** `api.logSkirmish({ played_at, pod_size, placement, deck_id, notes })` → closes modal → prepends new game to `skirmishes` list → success toast.

**Deck data:** pass `myDecks` as a prop from `BattlefieldPage` (already fetched when needed).

---

## Phase 5 — Routing & Navigation

### `frontend/src/App.jsx`

Remove the `LeaguesPage` import and replace with `BattlefieldPage`. Keep all sub-routes (`/leagues/:id`, etc.) unchanged — those are deep links from inside the page.

```jsx
// Remove:
import LeaguesPage from './pages/LeaguesPage'

// Add:
import BattlefieldPage from './pages/BattlefieldPage'

// Change:
<Route path="/leagues" element={<LeaguesPage />} />
// To:
<Route path="/battlefield" element={<BattlefieldPage />} />
<Route path="/leagues" element={<Navigate to="/battlefield" replace />} />

// All other /leagues/* routes stay identical:
<Route path="/leagues/:leagueId" element={<LeaguePage />} />
<Route path="/leagues/:leagueId/log-game" element={<LogGamePage />} />
<Route path="/leagues/:leagueId/games/:gameId/edit" element={<EditGamePage />} />
<Route path="/leagues/join/:inviteToken" element={<JoinLeaguePage />} />
```

(Add `Navigate` to the react-router-dom import.)

### `frontend/src/components/TopNavbar.jsx`

**Desktop:** Change the "Leagues" `NavLink` to `/battlefield` with label "The Battlefield". Keep all existing styling classes.

**Mobile bottom bar:** Change the Leagues tab (`/leagues`, Trophy icon, label "Leagues") to `/battlefield`, same Trophy icon, label "Battle" (short enough for the tab bar).

Both `isActive` checks need to match on `/battlefield` AND `/leagues/*` so the tab stays highlighted when viewing a specific league page. Use a custom `isActive` check:

```jsx
// For the NavLink, use className as a function but override isActive manually:
const isBattlefieldActive = location.pathname.startsWith('/battlefield') || location.pathname.startsWith('/leagues')
```

This requires importing `useLocation` in `TopNavbar.jsx`.

---

## Critical Files

| File | Action |
|------|--------|
| `supabase/migrations/020_personal_games.sql` | Create new — alters `league_games` |
| `supabase/functions/games/index.ts` | Create new |
| `frontend/src/lib/api.js` | Add 3 methods |
| `frontend/src/pages/BattlefieldPage.jsx` | Create new (replaces LeaguesPage in nav) |
| `frontend/src/components/LogSkirmishModal.jsx` | Create new |
| `frontend/src/App.jsx` | Swap LeaguesPage → BattlefieldPage, add `/leagues` redirect |
| `frontend/src/components/TopNavbar.jsx` | Rename tab label + path, add location-aware active state |

**Unchanged:** `LeaguesPage.jsx` (can keep for now, just no longer in nav), `LeaguePage.jsx`, `LogGamePage.jsx`, `EditGamePage.jsx`, `JoinLeaguePage.jsx`, `league_game_results` table, `leagues` edge function.

---

## Implementation Order

1. Migration `020_personal_games.sql` — apply and verify
2. Edge function `supabase/functions/games/index.ts` — build and deploy
3. `api.js` — add 3 skirmish methods
4. `LogSkirmishModal.jsx` — modal component (simple, standalone)
5. `BattlefieldPage.jsx` — main page with both tabs; Campaigns tab reuses league list logic, Skirmishes tab uses new skirmish state + `LogSkirmishModal`
6. `App.jsx` — swap route, add redirect
7. `TopNavbar.jsx` — rename tab

---

## Verification

1. Migration applied → `league_id` nullable, new columns exist, existing league game rows unchanged
2. Deploy `games` function → endpoint returns `{ games: [] }`
3. Nav shows "The Battlefield" (desktop) / "Battle" (mobile), highlights for both `/battlefield` and `/leagues/:id`
4. Campaigns tab: looks and works exactly like the old Leagues page
5. Skirmishes tab: log a skirmish via modal → appears in list with correct stats
6. Delete a skirmish → disappears, stats update
7. All existing league deep links (`/leagues/:id`, log-game, edit-game, join) still work
