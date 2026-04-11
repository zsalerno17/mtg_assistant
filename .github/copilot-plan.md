# MTG Assistant — Project Plan

> **Single source of truth.** All agents read and update this file. PLAN.md is archived — do not use it.
> Last updated: April 11, 2026

---

## Current Status

**Phase 16 complete.** All original phases done. Working through gap phases (17–21) in order.

**Completed:**
1. [x] Quick win: `ColorPips` on Dashboard history items
2. [x] Quick win: Dashboard form ring `/8` → `/20`
3. [x] Quick win: Collection page `max-w-4xl` + remove `max-h-[480px]` scroll cap
4. [x] Quick win: Login page personality (MTG pips, better tagline)
5. [x] Quick win: Deck top bar commander name + color identity subtitle
6. [x] Phase 14A: Dashboard deck grid + collection summary widget
7. [x] Phase 14B: Onboarding panel (replaced by Phase 16)
8. [x] Phase 15: Design review (MTG aesthetic + desktop/mobile polish)
9. [x] Phase 16: Rearchitect user flow (complete)

**Next up (gap phases):**
- [ ] Phase 17: Cleanup + quick backend fixes (verdict in history, remove mockup page)
- [ ] Phase 18: Scenarios tab rule-based fallback (`scenarios_fallback()`)
- [ ] Phase 19: Collection improvements quality (`_evaluate_card()` + cut logic)
- [ ] Phase 20: Card tooltip (Scryfall image on hover)
- [ ] Phase 21: StatBadge visual upgrade (radial progress rings)
- [ ] Phase 22: Deployment (Render + Vercel)

---

## Phase 16 Spec — User Flow Rearchitect

### Goal
Correct the onboarding flow: load decks first, analyze later. New user flow:
`Login → Profile setup (if first time) → Import decks → Upload collection → Analyze`

### New user flow
1. **First login**: `AuthContext` detects `profile.username === null` → redirect to `/profile` with a "first time" banner
2. **Import decks**: Dashboard has NO URL form. "Import Deck" button → `/decks/import` page (just Moxfield URL paste + one-click import, no AI)
3. **Upload collection**: `/collection` page (unchanged)
4. **Analyze**: From dashboard, each deck card has an **Analyze** button (or **View Analysis** if already analyzed). Clicking Analyze runs Gemini and navigates to `/deck/{id}`.

### DB change
New `user_decks` table (migration `005_user_decks.sql`):
```sql
create table user_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  moxfield_id text not null,
  deck_name text,
  moxfield_url text,
  added_at timestamptz default now(),
  unique(user_id, moxfield_id)
);
alter table user_decks enable row level security;
create policy "Users see own decks" on user_decks for all using (auth.uid() = user_id);
```

### Backend changes
- `POST /api/decks/library` — adds a deck to user's library (calls existing `/fetch` internally, saves to `user_decks`). Returns deck row.
- `GET /api/decks/library` — returns user's `user_decks` rows joined with latest `analyses` row per deck (to know if analyzed + get analysis metadata).
- Existing `/fetch` and `/analyze` endpoints unchanged.

### Frontend changes
- `AuthContext`: after `refreshProfile`, if `profile.username === null` AND current path is not `/profile`, redirect to `/profile`. ProfilePage gets a `?firstTime=1` query param to show welcome banner.
- New `ImportDeckPage` (`/decks/import`): URL input + "Import Deck" button → calls `api.addToLibrary(url)` → success shows "Deck added! View in dashboard" link. No AI.
- `DashboardPage`: Remove URL form entirely. "Import Deck" button in section header → navigates to `/decks/import`. Dashboard reads from `api.getDeckLibrary()`. Responsive layout: **table on desktop** (deck name, commander, colors, date added, analyzed status, actions), **cards on mobile** (current grid). Each row/card has "Analyze" or "View Analysis" button.
- `api.js`: add `addToLibrary(url)`, `getDeckLibrary()`.
- `App.jsx`: add route `/decks/import`.
- Remove `OnboardingPanel` from dashboard (replaced by profile redirect + empty state in deck library).

### Backwards compatibility
Existing analyses in `analyses` table are NOT in `user_decks`. On `GET /api/decks/library`, also backfill: if analyses exist for this user that have no corresponding `user_decks` row, include them as synthetic library entries (or just migrate them on first load). Decision: **include analyses as fallback** in library response so existing users don't lose their decks.



**Do NOT touch:** `supabase/migrations/004_user_profiles.sql`, or the profile/auth flow — settled, no changes needed.

---

## Recent Changes (Phase 15 — April 2026)

- **Scryfall commander image**: `CommanderImage` component added to `DeckPage.jsx` — shows small card image in the commander hero block with gold gradient border. `onError` fallback to text-only. Supports partner commanders (two images side by side).
- **Background texture**: SVG `feTurbulence` noise layer (4% opacity) added to `body` background-image in `index.css` — eliminates flat paint wall feeling.
- **Amber button glow**: `hover:shadow-[0_0_16px_rgba(251,191,36,0.3)]` added to all primary filled amber buttons in DeckPage, DashboardPage, ProfilePage.
- **Deck name text glow**: `textShadow: '0 0 24px rgba(251,191,36,0.3)'` on the DeckPage top bar h1.
- **Desktop layout**: Dashboard `max-w-4xl`; sidebar labels/brand/profile text now show at `xl` (1280px) breakpoint instead of `lg` (1024px); Collection grid adds 5th column at `xl`.
- **Mobile polish**: "Collection Upgrades" tab abbreviated to "Upgrades" on screens < sm; page titles `text-2xl sm:text-3xl`; mobile nav active pill `bg-amber-500/10`; `active:scale-[0.97]` on mobile nav items and tab buttons.
- **Shimmer skeletons**: `DeckCardSkeleton` + `DeckRowSkeleton` components replace "Loading decks…" text on Dashboard. `.skeleton` CSS class + `shimmer` keyframe added to `index.css`.
- **Note**: DeckPage top bar "date" (spec item) skipped — no `analyzed_at` in the analysis response payload. To add it: expose `created_at` from `POST /api/decks/analyze` response and surface it on the top bar.

## Recent Changes (Phase 16 — April 2026)

- **DB**: Created `supabase/migrations/005_user_decks.sql` — `user_decks` table with RLS. **Must be run in Supabase SQL editor before new import features work.**
- **Backend** (`backend/routers/decks.py`): Added `POST /api/decks/library` (import deck, no AI) and `GET /api/decks/library` (user's deck library + analysis status, backwards-compat with old analyses).
- **Frontend** (`api.js`): Added `addToLibrary(url)` and `getDeckLibrary()`.
- **ProtectedRoute**: Added profile redirect — if `profile.username === null`, redirect to `/profile?firstTime=1`.
- **ProfilePage**: Added `?firstTime=1` welcome banner.
- **ImportDeckPage** (`/decks/import`): New page — URL form only, calls `addToLibrary`, no AI.
- **App.jsx**: Added `/decks/import` route.
- **DashboardPage**: Full rewrite — removed URL form + OnboardingPanel. Now reads from `getDeckLibrary()`. Responsive: card grid on mobile (< md), table on desktop (md+). Each deck has "Analyze" (not yet analyzed) or "View Analysis →" (already analyzed) action.

---

## Open Items & Known Gaps

> All gaps have been promoted to planned phases. See Phases 17–21 below.

- [x] **Deck top bar** — commander name + color pips subtitle added. Done as quick win (pre-Phase 15).
- [x] **Skeleton loaders** — Shimmer `DeckCardSkeleton` + `DeckRowSkeleton` on Dashboard. `.skeleton` CSS class added. Done in Phase 15.
- [ ] **`scenarios_fallback()`** → Phase 18
- [ ] **`CardTooltip` component** → Phase 20
- [ ] **StatBadge radial progress rings** → Phase 21
- [ ] **Cleanup + `verdict` in history** → Phase 17
- [ ] **`find_collection_improvements()` quality** → Phase 19
- [ ] **Deployment** → Phase 22

---

## Architecture

| Concern | Decision |
|---|---|
| Frontend | React 18 (JSX) + Vite + TailwindCSS |
| Backend | FastAPI (Python), `backend/` dir |
| DB + Auth | Supabase (PostgreSQL + Google OAuth + allow-list) |
| AI | Gemini 2.5 Flash (free tier, fallback chain to 2.0-flash → flash-lite) |
| Moxfield decks | Unofficial public API (`api2.moxfield.com/v2/decks/all/{id}`) — public decks only |
| Moxfield collection | CSV upload only (no OAuth) |
| Auth model | Google login + `allowed_users` email allow-list in Supabase |
| Deployment | Render (backend, free tier, sleeps after 15 min) + Vercel (frontend, free) |

### Design System — Option A (Dark Arcane)
- **Background:** `#0a0f1a` (Slate 950)
- **Surface:** `#0f172a` (Slate 900)
- **Primary accent:** `#fbbf24` (Amber 400)
- **Secondary:** `#38bdf8` (Sky 400)
- **Success:** `#34d399` (Emerald 400)
- **Danger:** `#fb7185` (Rose 400)
- **Text:** `#e2e8f0` | **Muted:** `#94a3b8`
- **Headings:** Cinzel | **Body:** Inter | **Mono:** JetBrains Mono
- Icons: inline SVG only — no Unicode emoji
- MTG color pips: W/U/B/R/G as semantic accents (not dominant)

---

## Recent Changes

- **Phase 14B complete** (April 2026): OnboardingPanel added to DashboardPage. Shown when `dedupedDecks.length === 0 && collectionSummary.count === 0 && !localStorage.mtg_onboarding_dismissed`. Two-step checklist (analyze deck, upload collection), amber accent, glass card style, dismissible via × (writes localStorage). No new API calls — reuses already-fetched state.
- **Phase 14A complete** (April 2026): Dashboard replaced flat history list with responsive `grid-cols-1/2/3` deck grid. History deduplicated by `deck_id` (most recent per deck). Each card shows: deck name (Cinzel), color pips, commander, up to 3 theme tags, last analyzed date, "View Analysis →" + Moxfield link. "Add New Deck" button focuses URL input. Collection summary widget below grid shows card count + last updated, or nudge to upload CSV. Backend: added `GET /api/collection/summary` endpoint (count + last_updated, no full card data). Frontend: `api.getCollectionSummary()` added.
- **Quick wins 4 & 5 completed** (April 2026): Login page now has mana pip row (W/U/B/R/G) + "Know your deck. Command your game." tagline. Deck top bar now shows commander name + color pips subtitle below deck name.
- **Quick wins completed** (April 2026): ColorPips on Dashboard history items; form ring opacity `/8`→`/20`; Collection page `max-w-4xl` wrapper + removed `max-h-[480px]` scroll cap.
- **Planning docs consolidated** (April 2026): PLAN.md archived; `.github/copilot-plan.md` is now single source of truth.
- **Phase 15 planned**: Design review — MTG aesthetic (Scryfall commander image, login personality, bg texture), modern polish (button hover glow, loading states, empty states), desktop vs mobile intentionality.
- **Phase 14 planned**: User onboarding (two-step panel for new users) + Dashboard deck grid (replaces flat list) + collection summary widget.
- **Phase 13 complete** — all 3 stages done: rule-based engine overhaul, structured JSON tabs (StrategyTab/ImprovementsTab/CollectionUpgradesTab), visual polish (commander hero, glass cards, Cinzel section headers, tab fade, StatBadge grid fix, weaknesses above fold).
- **User profiles added**: `user_profiles` table + avatar storage + `GET/PUT /api/users/profile`. ProfilePage with username + avatar picker (19 creature archetypes). AuthContext exposes `profile` + `refreshProfile`.
- **Improvements tab paired swaps**: Gemini returns `swaps: [{cut, add, reason, category}]`. UI shows each swap as a card: "− Cut → + Add" with reason.
- **AI consistency**: Gemini temp lowered to 0.3. Deck context includes card types + CMC + actual counts vs thresholds. Partners included.
- **Dual commander support**: Both commanders in color identity + context. Frontend shows both on Overview.
- **Cached results banner + Force Re-analyze**: Deduplication by `deck_updated_at` from Moxfield.
- **Collection Upgrades tab wired** to rule-based `find_collection_improvements()` — instant, no AI quota.
- **Analysis metadata migration** (`003_analyses_metadata.sql`): `deck_name`, `moxfield_url`, `deck_updated_at` stored + shown in history list.
- **Full UI/UX design analysis** in `.github/design-analysis.md` — covers all 4 pages + Layout. Key finding: flat hierarchy + buried differentiators.

---

## Quick Wins (do before Phase 14)

### 1. ColorPips on Dashboard history items
- File: `frontend/src/pages/DashboardPage.jsx`
- **Done** — `COLOR_PIP_STYLES` + `ColorPips` added inline; renders in each history card row
- Status: [x] complete

### 2. Dashboard form ring opacity
- File: `frontend/src/pages/DashboardPage.jsx`
- **Done** — changed `ring-[var(--color-primary)]/8` → `ring-[var(--color-primary)]/20`
- Status: [x] complete

### 3. Collection page layout
- File: `frontend/src/pages/CollectionPage.jsx`
- **Done** — added `max-w-4xl mx-auto` wrapper; removed `max-h-[480px] overflow-y-auto` from card grid
- Status: [x] complete

### 4. Login page personality
- File: `frontend/src/pages/LoginPage.jsx`
- Add MTG 5-color pip row (W/U/B/R/G) as decorative element below logo
- Replace tagline with something evocative (e.g. "Know your deck. Command your game.")
- Status: [ ] not started

### 5. Deck top bar commander subtitle
- File: `frontend/src/pages/DeckPage.jsx`
- In the top bar, add commander name (from `analysis.commanders`) + `ColorPips` below the deck name
- Status: [ ] not started

---

## Phase 14 — User Onboarding + Dashboard Data

> Start after quick wins are done.

### 14A — Dashboard Layout (deck grid + collection widget)
**Goal:** Replace flat history list with a richer deck grid. Add collection status summary.

**Deck grid:**
- Deduplicate history by `deck_id` (keep most recent per deck)
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` responsive grid
- Each card: `ColorPips`, deck name (Cinzel), commander name(s), up to 3 theme tags, last analyzed date, "View Analysis →" button
- "View Analysis →" navigates to `/deck/{deck_id}` — no re-analysis triggered
- "Add New Deck" button at top scrolls/focuses the URL input form
- Data: all from existing `GET /api/analyses/history` — no new endpoint needed

**Collection summary widget:**
- Below the deck grid
- If no collection: "No collection uploaded yet — Upload CSV →" (links to `/collection`)
- If collection exists: "N cards loaded · Last updated [date]" + green dot + "Manage →" link
- Consider `GET /api/collection/summary` endpoint (returns `{count, last_updated}`) to avoid fetching all cards just for count

**Backend:** Add `GET /api/collection/summary` → `{ count: int, last_updated: str | null }`

### 14B — Onboarding Panel
**Goal:** New users get guided through the two setup steps.

- Show panel when: `history.length === 0 AND collectionCount === 0 AND !localStorage.mtg_onboarding_dismissed`
- Show "upload collection" nudge when: `history.length > 0 AND collectionCount === 0`
- Two-step checklist: "Analyze your first deck" (auto-checks when deck exists) + "Upload your collection" (auto-checks when collection exists)
- Dismissible: `×` button sets `localStorage.mtg_onboarding_dismissed = true`
- Sits between the URL form and the deck grid
- Design: glass card, amber accent, no major new components

**Order:** Do 14A first, then 14B.

---

## Phase 15 — Design Review: MTG Aesthetic + Modern Polish

> Start after Phase 14 is complete.

### Pillar 1 — MTG Aesthetic
- **Login page**: Radial 5-color glow (CSS only, no copyrighted art), evocative tagline, decorative mana pip row below logo
- **Scryfall commander image**: In commander hero block on DeckPage Overview — small card image using `https://api.scryfall.com/cards/named?exact={name}&format=image`. Framed with MTG-card-border-style rounded rect + gold gradient border. Graceful fallback to current Cinzel name + pips if image fails.
- **Background texture**: 4-line CSS SVG noise overlay (`opacity-[0.03]`) on `bg` base layer in `index.css` — kills "flat paint wall" feeling
- **Surface card inner highlight**: `border-t border-white/5` on `color-surface` cards — "lifted panel" feel
- **Mana pips as atmosphere**: Use W/U/B/R/G pips more liberally as atmospheric decoration (section dividers, stat badges)

### Pillar 2 — Modern Polish
- **Amber button hover glow**: `box-shadow: 0 0 12px rgba(251,191,36,0.25)` on hover for primary button — subtle magical feel
- **Deck name text glow** on DeckPage top bar: `text-shadow: 0 0 24px rgba(251,191,36,0.3)` on Cinzel title at `text-2xl`
- **MTG-themed loading animation**: Amber glow ring or spinning pip — replaces text spinners
- **Skeleton screens**: Shimmer skeletons for deck grid (Dashboard) and analysis tab content (DeckPage)
- **Empty state polish**: Every empty state gets an icon, bold headline, single CTA button

### Pillar 3 — Desktop vs Mobile
- **Desktop**: Dashboard `max-w-4xl`, richer DeckPage top bar band (commander name + pips + date), sidebar labeled at ≥1280px (icon + text), Collection grid 4–5 columns
- **Mobile**: "Collection Upgrades" tab abbreviated to "Upgrades" on small screens, larger touch targets (min 44px), active nav background pill, responsive font sizes `text-2xl sm:text-3xl` on page titles, `active:scale-[0.97]` audit across all interactive elements

**Implementation order within Phase 15:**
1. Scryfall commander image (highest visual impact)
2. Login page personality
3. Background texture (4 lines CSS, zero risk)
4. Desktop layout expansions
5. Mobile polish
6. Loading skeletons (most effort, do last)

**Rules:** No Framer Motion. CSS transitions only. Do not change Option A palette. No feature additions.

---

## Phase 17 — Cleanup + Quick Backend Fixes

> Start after Phase 16. Small scope, no new API surface. Do first.

### Goal
Remove dead code and fix the one known data gap that affects existing UI.

### Tasks

**Frontend cleanup:**
- Remove `/mockup` route from `App.jsx`
- Delete `frontend/src/pages/IconMockupPage.jsx`
- Remove orphaned old icon functions from `frontend/src/lib/creatureIcons.jsx` (any functions no longer referenced after mockup page is removed)

**Backend fix — `verdict` in history:**
- `GET /api/analyses/history` currently does not include `verdict` in its response payload
- Add `verdict` to the history response so Dashboard deck cards can show a one-line preview sentence
- `verdict` already exists in `result_json` stored in the `analyses` table — just needs to be surfaced in the serialized response
- File: `backend/routers/analyses.py`

**Frontend update:**
- After backend fix, add a `verdict` line to each deck card on the Dashboard (truncated to 1–2 lines, muted text style)

### What NOT to change
- Do not alter the `analyses` table schema
- Do not change how analysis results are computed or stored

---

## Phase 18 — Scenarios Tab: Rule-Based Fallback

> Start after Phase 17.

### Goal
The Scenarios tab currently shows Gemini-only output with no quantitative before/after diff. When AI is rate-limited or unavailable, the tab shows an error or nothing useful. Add a `scenarios_fallback()` function that computes a stat diff table from the deck data alone.

### What to build

**Backend (`backend/src/deck_analyzer.py` or new `scenarios.py`):**

`scenarios_fallback(deck, adds: list[str], removes: list[str]) → dict`

Returns a structured before/after diff:
```python
{
  "before": { "land_count": int, "ramp_count": int, "draw_count": int, "avg_cmc": float },
  "after":  { "land_count": int, "ramp_count": int, "draw_count": int, "avg_cmc": float },
  "delta":  { "land_count": int, "ramp_count": int, "draw_count": int, "avg_cmc": float },
  "verdict": str  # e.g. "Adding 2 ramp pieces improves acceleration. Avg CMC drops 0.12."
}
```

Logic:
- **Ramp delta**: count adds/removes matching ramp detection patterns (CMC ≤ 3, `"add {"` / `"search your library"` + `"land"`)
- **Draw delta**: count adds/removes matching draw patterns (`"draw a card"` etc.)
- **Avg CMC delta**: recalculate after applying adds/removes to the card list
- **Land delta**: count land adds/removes
- **Verdict**: 1–2 sentence plain-English summary of the net effect (template-driven, not AI)

**Backend (`backend/routers/ai.py`):**
- `POST /api/ai/scenarios`: if Gemini call succeeds, return AI result as before
- If Gemini is rate-limited or fails, call `scenarios_fallback()` and return result with `"ai_enhanced": false`

**Frontend (`frontend/src/pages/DeckPage.jsx` — ScenariosTab):**
- If response has `ai_enhanced: false`, show the rule-based diff table instead of (or in addition to) prose
- Diff table: 4 rows (Lands, Ramp, Card Draw, Avg CMC), 3 columns (Before / After / Δ), amber highlight on changed rows
- Show `verdict` summary sentence above or below the table
- AI-enhanced indicator dot (already exists in codebase) — show gray/off when rule-based

### Files to touch
- `backend/src/deck_analyzer.py` (add `scenarios_fallback()`)
- `backend/routers/ai.py` (wire fallback)
- `frontend/src/pages/DeckPage.jsx` (ScenariosTab diff table)

---

## Phase 19 — Collection Improvements Quality

> Start after Phase 18.

### Goal
`find_collection_improvements()` currently uses basic scoring that over-recommends cards the user already owns on-theme, and its cut logic doesn't account for cards that should never be cut (commander staples, on-theme cards). Fix both.

### What to build

**`_evaluate_card()` quality scoring (`backend/src/collection.py`):**

Current behavior: all owned cards matching a category (ramp/draw/removal/wipe) get equal weight.

Improved scoring should rank suggestions by:
1. **CMC efficiency** — prefer lower CMC for ramp/draw (Sol Ring > Gilded Lotus for ramp)
2. **Unconditional vs. conditional** — "destroy target creature" > "destroy target nonblack creature"
3. **Repeatable vs. one-shot** — repeatable draw (Rhystic Study) > one-shot (Divination)
4. Score as a float 0.0–1.0; return top N by score per category

Implementation: add a `score: float` field to each suggestion. Simple heuristics only — no AI.

**`_find_cut()` never-cut logic (`backend/src/collection.py`):**

Current behavior: any card can be suggested as a cut.

Improved logic:
- Never suggest cutting a card that matches the deck's theme keywords (e.g. theme is "token generation" → don't cut "Anointed Procession")
- Never suggest cutting the commander(s)
- Prefer cutting cards with the highest CMC that don't match any deck category (dead weight)
- Add a `never_cut_reason: str | None` field to the cut suggestion for transparency

### Files to touch
- `backend/src/collection.py` (`_evaluate_card`, `_find_cut`)
- No frontend changes needed — the Collection Upgrades tab already renders suggestions correctly

---

## Phase 20 — Card Tooltip (Scryfall Image on Hover)

> Start after Phase 19. Highest user-facing polish of the remaining gap phases.

### Goal
Hovering any card name anywhere in the app shows a floating Scryfall card image popup. This is standard behavior on Moxfield, EDHREC, and Scryfall itself.

### What to build

**`CardTooltip` component (`frontend/src/components/CardTooltip.jsx`):**
- Wraps a card name string
- On hover: fetches `https://api.scryfall.com/cards/named?exact={name}&format=image` and shows image in a floating tooltip
- Tooltip positions above or below the hovered text depending on viewport position (flip if near bottom edge)
- Image: `width: 146px, height: 204px` (standard card thumbnail size), rounded-lg, drop-shadow
- Loading state: small shimmer placeholder 146×204
- Error/not-found state: show card name text only (no tooltip) — `onError` fallback
- Cache fetched image URLs in a module-level `Map` to avoid redundant Scryfall requests per session (simple in-memory cache, not localStorage)
- Delay tooltip appearance by ~300ms on hover to avoid flicker on accidental mouseovers

**Usage — apply to card names in:**
1. `DeckPage.jsx` — Improvements tab swap cards (cut/add names)
2. `DeckPage.jsx` — Collection Upgrades tab suggestion cards
3. `DeckPage.jsx` — Overview tab commander names (already has Scryfall image, but wrap the text too)

**Scryfall rate limiting:**
- Scryfall requests: max 10/sec per their guidelines. With 300ms hover delay this is naturally rate-limited.
- Do NOT pre-fetch all card images on page load. Only fetch on hover.

### Files to touch
- Create `frontend/src/components/CardTooltip.jsx`
- `frontend/src/pages/DeckPage.jsx` (wrap card name strings in relevant tabs)

---

## Phase 21 — StatBadge Visual Upgrade (Radial Progress Rings)

> Start after Phase 20. Pure visual polish, no logic changes.

### Goal
The StatBadge grid on DeckPage Overview currently shows plain count numbers. Upgrade to visual radial progress rings that show how close each stat is to the recommended threshold.

### What to build

**Updated `StatBadge` component (inline in `DeckPage.jsx` or extracted to `components/StatBadge.jsx`):**

Replace the plain number display with a small SVG radial ring:
- Ring fills proportionally based on `current / target` (cap at 100%)
- Colors: green (≥ target), amber (75–99% of target), rose (< 75% of target)
- Center text: current count (e.g. "12")
- Below ring: category label (e.g. "Ramp"), target label (e.g. "/ 10")
- Size: ~64×64px per badge (fits in current grid)
- CSS `stroke-dasharray` + `stroke-dashoffset` animation on mount (300ms ease-out)

**Thresholds to use (from Commander Expertise Reference in this doc):**
- Lands: target 37
- Ramp: target 10
- Card Draw: target 10
- Single Removal: target 8
- Board Wipes: target 2
- Avg CMC: inverted scale — target ≤ 3.0 (ring fills as CMC approaches 0; empty if ≥ 3.5)

### Files to touch
- `frontend/src/pages/DeckPage.jsx` (StatBadge section in Overview tab)
- Optionally extract to `frontend/src/components/StatBadge.jsx`

---

## Future Work — Commander Gauntlet League Tracker

> Do not start until Phases 17–21 are complete (or explicitly deprioritized). Low priority.

### Summary
Four friends play weekly Commander on SpellTable. Custom league with configurable scoring (Win=3pts, First elim=1pt, Last elim=1pt, voted Entrance=1pt), 6-week seasons, custom titles.

### Data model
```
seasons    → id, name, start_date, end_date, scoring_config JSONB, tiebreaker_config JSONB
sessions   → id, season_id, date, notes, screenshot_url
pod_results → id, session_id, player_id, placement (1-4), scoring_flags JSONB
awards     → id, session_id, player_id, title TEXT
players    → id, display_name, persona, email
```

`scoring_config` is JSONB — all point values live there, never hardcoded. Changing rules = new season row with different config.

### Build list (Phase 16 candidate)
- [ ] DB migration: seasons, sessions, pod_results, awards tables
- [ ] Season setup UI with configurable rule builder
- [ ] `POST /api/league/sessions` — log pod result
- [ ] `GET /api/league/standings/{season_id}` — dynamic scoring from config
- [ ] Session entry UI (4-player pod form, placement, scoring flags, voted categories)
- [ ] Standings page (columns from scoring_config labels)
- [ ] Discord webhook (post session summary to group Discord)

---

## Phase 22 — Deployment

> Do after Phase 21. Backend to Render, frontend to Vercel.

**Backend → Render:**
- [ ] Push repo to GitHub
- [ ] New Web Service on Render, point to `backend/`
- [ ] Build: `pip install -r requirements.txt` | Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`, `ENVIRONMENT=production`
- [ ] Update `main.py` CORS to include Vercel URL

**Frontend → Vercel:**
- [ ] Import repo, set root to `frontend/`
- [ ] Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
- [ ] Add Vercel URL to Supabase Auth redirect URLs

---

## Completed Phases (summary)

| Phase | What was done |
|---|---|
| 1 | Infrastructure: Supabase project, FastAPI scaffold, React + Vite scaffold, env config |
| 2 | Auth: Google OAuth, `allowed_users` allow-list, JWT middleware, `ProtectedRoute` |
| 3 | Backend API: fetch/analyze deck, upload/get collection, strategy/improvements/scenarios/history endpoints |
| 4 | Frontend pages: Login, Dashboard, Deck (5 tabs), Collection. Recharts mana curve + card types. Responsive layout. |
| 5 | Gemini 2.5 Flash: JSON prompts, 16k token budget, fallback chain, `explain_scenarios()` structured output |
| 6 | Supabase tables + RLS: `allowed_users`, `decks`, `analyses`, `collections`, `ai_cache`. Migrations 001-002. |
| 8 | Analysis dedup + metadata: `deck_name`, `moxfield_url`, `deck_updated_at` stored. Dashboard shows real names + Moxfield links. |
| 9 | Design refresh: Dark arcane palette, Cinzel, ambient gradients, sidebar, Gmail-style avatar, custom scrollbars, Sprint A-E all complete |
| 10 | Differentiators: Structured weakness cards (`why/look_for/examples`), theme tooltips with definitions, deck verdict, differentiator callout banners |
| 11 | Gemini rate limiting: Rule-based fallbacks for Strategy + Improvements. `ai_enhanced` indicator dots. 60s cooldown. Retry-with-backoff. |
| 13 | Rule-based engine overhaul (ramp/draw/removal/wipe detection), structured AI tabs (StrategyTab/ImprovementsTab/CollectionUpgradesTab), visual polish (commander hero, glass cards, Cinzel headers, tab fade, StatBadge grid fix) |
| User profiles | `user_profiles` table, avatar storage, 19 creature archetype presets, username in sidebar |

---

## MTG Commander Expertise Reference

> For backend rule-based engine development. Thresholds and detection patterns.

### Thresholds
| Category | Minimum | Good | Notes |
|---|---|---|---|
| Lands | 36 | 37–38 | Below 33 dangerous |
| Ramp (CMC ≤ 3) | 10 | 12–15 | Only acceleration, not 5+ CMC rocks |
| Card draw | 10 | 12–15 | Repeatable > one-shot |
| Single removal | 8 | 10–12 | Mix creature + noncreature |
| Board wipes | 2 | 3–4 | |
| Avg CMC (nonland) | — | ≤ 3.0 | Above 3.5 needs extra ramp |

### Key Detection Patterns
- **Ramp** (CMC ≤ 3): `"add {"`, `"add one mana"`, `"add mana"`, `"treasure token"`, `"search your library"` + `"land"` on instants/sorceries. Exclude CMC 4+.
- **Draw**: `"draw a card"`, `"draw cards"`, `"draw two/three"`, `"draw an additional card"`, `"draw that many"`, `"put that card into your hand"`
- **Removal**: `"destroy target"`, `"exile target"`, `"deals damage to any target"`, `"becomes a"` (enchantment neutralize), `"shuffle"` + `"into"` + `"library"`. **Do NOT count** `"return target"` (bounce).
- **Board wipes**: `"destroy all creatures"`, `"destroy all nonland"`, `"exile all"`, `"damage to each creature"`, `"-X/-X"` broad, `"return all"` + `"to their owners' hands"`

### Color-Aware Staple Examples (for weakness suggestions)
- **Ramp**: W→Smothering Tithe, U→artifacts only, B→Crypt Ghast, R→Dockside Extortionist, G→Cultivate/Llanowar Elves, ∅→Sol Ring/Arcane Signet
- **Draw**: W→Esper Sentinel/Mangara, U→Rhystic Study/Mystic Remora, B→Phyrexian Arena/Necropotence, R→Faithless Looting, G→Beast Whisperer/Sylvan Library
- **Removal**: W→Swords to Plowshares/Farewell, U→Reality Shift/Cyclonic Rift, B→Go for the Throat/Toxic Deluge, R→Chaos Warp/Blasphemous Act, G→Beast Within/Kenrith's Transformation

---

## Acceptance Criteria

Before considering any phase complete:
1. Auth — Google sign-in works; non-listed email rejected with message
2. Deck fetch — paste Moxfield URL → analysis renders
3. Collection — CSV upload → cards appear; Collection Upgrades shows owned-card suggestions
4. Strategy — Strategy tab returns useful content (rule-based or AI)
5. Scenarios — add/remove cards → before/after diff renders
6. History — two analyses → both appear; deck names shown; Moxfield links work
7. Mobile — no horizontal scroll, readable text, all buttons tappable
8. Multi-user — separate users see only their own collection + history

---

## Phase 14 — User Onboarding + User Data Dashboard

> Added April 2026. Prerequisite: backlog quick-wins above are done (or can proceed in parallel).

### Problem statement

New users land on the Dashboard with no context. There is a single URL input and an empty history list. They don't know:
- That they need to load a Moxfield deck before they can analyze
- That they can upload a CSV collection for collection-aware recommendations
- What their collection or previously-loaded decks looks like without going to separate pages

The Dashboard should become a *hub* — showing the user's loaded decks and collection snapshot so they can pick what to analyze without re-pasting URLs.

---

### Track A — User Onboarding Flow

**Goal:** First-time users are guided through the two setup steps (load a deck, upload collection) before they hit an empty state that makes no sense.

**Trigger condition:** Show onboarding when:
- User has 0 analyses in history AND 0 cards in their collection
- Once either step is completed, suppress the full onboarding panel (show a condensed "next step" nudge if only one step is done)

**Onboarding UI — two-step checklist panel:**

```
┌─────────────────────────────────────────────────────────┐
│  ✦ Welcome to MTG Assistant                              │
│  Two steps to get started:                              │
│                                                         │
│  [ ] Step 1: Analyze your first deck                    │
│      Paste a Moxfield deck URL above and hit Analyze.   │
│      Your deck will be saved here for future analysis.  │
│                                                         │
│  [ ] Step 2: Upload your card collection (optional)     │
│      Export your collection from Moxfield as CSV,       │
│      then upload it on the Collection page.             │
│      This unlocks collection-aware upgrade suggestions. │
│                                                         │
│  [Upload Collection →]   ← links to /collection        │
└─────────────────────────────────────────────────────────┘
```

- Onboarding panel sits between the "Analyze a Deck" form and the history list
- Step 1 checkbox auto-checks once `history.length > 0`
- Step 2 checkbox auto-checks once collection card count > 0 (check via `GET /api/collection/count` or reuse `GET /api/collection` response length)
- Panel is fully dismissible (an "×" or "Got it" button sets a `localStorage` flag `mtg_onboarding_dismissed = true`)
- Panel does NOT render after dismissal, even if both steps are incomplete
- Design: glass card treatment matching the rest of the app (`bg-surface/80 backdrop-blur-sm`), amber accent, two-column checklist rows with icon checkmarks

**Backend needs:**
- `GET /api/collection` already exists — check if response is empty to determine step 2 status
- No new endpoints needed for onboarding state — derive from existing data

---

### Track B — Loaded Decks + Collection Summary on Dashboard

**Goal:** Dashboard shows the user's saved decks and a collection summary so they can quickly pick a deck for analysis without re-pasting a URL.

#### B1 — Saved Decks Panel (replaces the flat history list)

Current history list shows: deck name, themes, date, Moxfield link. It works but offers no quick-launch path for re-analysis.

**Replace with a richer "My Decks" section:**

```
My Decks                               [+ Add New Deck]
─────────────────────────────────────────────────────────
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ [mana pips]  │  │ [mana pips]  │  │ [mana pips]  │
│ Deck Name    │  │ Deck Name    │  │              │
│ Commander    │  │ Commander    │  │              │
│ 3 themes     │  │ 2 themes     │  │              │
│ Analyzed Mar │  │ Analyzed Apr │  │              │
│ [Re-analyze] │  │ [Re-analyze] │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

- Layout: responsive card grid — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — instead of a flat vertical list
- Each card shows: mana color identity pips (reuse `ColorPips` component), deck name (Cinzel), commander name, theme tags (up to 3), last analyzed date, "Analyze →" button that navigates to the existing deck analysis (no recompute)
- "Analyze →" should navigate to `/deck/{deck_id}` if a cached result exists — it should NOT re-trigger the full fetch+analyze flow
- The URL input form stays at the top for adding new decks — "Add New Deck" button can scroll/focus to it
- Deduplication: only show 1 entry per unique `deck_id` (the most recent analysis), not duplicate rows for re-analyzed decks (backend already handles this with `lastUpdatedAtUtc` check)

**Data needed per card:**
- `deck_name` — already stored in `analyses` table
- `deck_id` — already stored
- `result_json.commanders` — already in analysis result
- `result_json.colors` or `result_json.color_identity` — already in analysis result
- `result_json.themes` — already in analysis result
- `created_at` — already stored

No new backend endpoints needed — `GET /api/analyses/history` already returns this data.

#### B2 — Collection Summary Widget

A small summary panel on the Dashboard showing the user's collection status so they know whether collection-aware analysis is available.

```
┌──────────────────────────────────────────────────────┐
│  Your Collection                    [Manage →]       │
│  ─────────────────────────────────────────────────── │
│  1,247 cards loaded · Last updated Apr 8             │
│  ● Collection upgrades are available for your decks  │
└──────────────────────────────────────────────────────┘
```

- Small card, placed below the "My Decks" grid
- Shows: total card count, last upload date
- If no collection: "No collection uploaded yet — [Upload CSV →]" linking to `/collection`
- If collection exists: "N cards loaded · Last updated [date]" + green indicator dot
- Clicking "Manage →" navigates to `/collection`

**Data needed:**
- Card count: derive from `GET /api/collection` response length, OR add `GET /api/collection/summary` endpoint that returns `{ count: int, last_updated: datetime }` (avoids loading all card data just to get a count)
- Recommend adding `GET /api/collection/summary` — lightweight, no card payload

---

### Implementation Plan

**Phase 14A — Dashboard layout refactor (deck grid + collection widget):**
1. Read `GET /api/analyses/history` and group by `deck_id` — keep only the most recent per deck
2. Render deck grid with `ColorPips`, commander name, themes (reuse existing components)
3. "Re-analyze" / "View Analysis" button navigates to `/deck/{deck_id}` — no API call
4. Add collection summary widget below the grid using `GET /api/collection` (or new summary endpoint)

**Phase 14B — Onboarding panel:**
1. Compute `hasDecks = history.length > 0` and `hasCollection = collectionCount > 0`
2. Show onboarding panel if `!hasDecks && !hasCollection && !localStorage.get('mtg_onboarding_dismissed')`
3. Show "upload collection" nudge if `hasDecks && !hasCollection` (partial completion state)
4. Dismiss button sets `localStorage` flag

**Phase 14C — Backend (if needed):**
- Add `GET /api/collection/summary` → `{ count: int, last_updated: str | null }`
- This is the only new endpoint required; everything else uses existing data

**Order:** Do 14A first (highest value, no user behavior change), then 14B (onboarding adds a new UI surface).

---

### What NOT to change
- The URL input form stays at the top — primary CTA for new decks
- Don't remove the existing analysis history data model — deck grid is a visual upgrade of the same data
- Don't auto-trigger re-analysis when user clicks a saved deck — navigate to cached result only
- Don't touch `CollectionPage.jsx` for this phase (beyond the collection widget link)

---

## Phase 15 — Design Review: MTG Aesthetic + Modern Polish

> Added April 2026. Start only after Phase 14 is complete.

### Goal

The app works well. This phase is about making it *feel* like a Magic: The Gathering product — not a generic dark-themed SaaS — and ensuring the desktop and mobile experiences are each intentionally designed for their context, not just "the same layout, scaled down."

### Three pillars

1. **MTG aesthetic** — The app should feel at home alongside Moxfield, EDHREC, and Scryfall. Users who play Magic should feel it immediately.
2. **Modern UI** — Clean, deliberate, no clutter. Elevate what we already have (good dark palette, Cinzel, MTG color pips) with texture, depth, and polish.
3. **Desktop vs. mobile intentionality** — Desktop and mobile are different contexts and should be designed accordingly, not identically.

---

### Pillar 1 — MTG Aesthetic

**What's currently missing:**
- The app has the right palette and fonts but it reads as "dark SaaS" rather than "Magic product." There are no MTG signatures beyond Cinzel. Nothing in the UI says "this is about cards."
- The Login page has zero personality — first impression is completely generic.
- MTG visual language (mana pips, card art framing, the iconic card border shape, activation costs, the 5-color wheel) is barely present except in the `ColorPips` component.

**Changes:**

**Login page — MTG personality:**
- Add a full-bleed background texture or subtle card art composite behind the login card. Options:
  - A radial glow using all 5 MTG colors (W/U/B/R/G gradients converging at center) — no copyrighted art needed
  - A CSS-only "card border" frame element as a decorative background shape
  - Fine grain/noise texture over the existing dark bg for depth
- Replace the tagline with something evocative: *"Know your deck. Command your game."* or *"The assistant that studies your deck so you don't have to."*
- Add the MTG 5 mana pips (W/U/B/R/G) as a decorative row below the logo — small, muted, atmospheric, not functional

**Card art framing on Deck page:**
- Commander hero block on the Overview tab should optionally show a Scryfall card image for the commander — small, framed with subtle MTG-card-border-style rounded rectangle + gold gradient border. Scryfall has a free image API (`https://api.scryfall.com/cards/named?exact={name}&format=image`). Make this opt-in: if image fails to load, fall back to the current Cinzel name + color pips treatment.
- This single change would be the biggest aesthetic upgrade in the app — a real commander card image as the focal point of the analysis page.

**Texture + depth:**
- Add a very subtle repeating SVG noise texture (`opacity-[0.03]`) over the `bg-[var(--color-bg)]` base layer in `index.css`. This eliminates the "flat paint wall" feeling. 4–8 lines of CSS, no dependencies.
- The `color-surface` cards (analysis cards, stat containers) should have a very faint inner border highlight on top edge (`border-t border-white/5`) — gives a "lifted panel" illusion without changing the color scheme.

**MTG iconography:**
- Use mana pip SVGs (W/U/B/R/G/C) more liberally beyond `ColorPips`. For example:
  - In the "Analyze a Deck" form placeholder/helper text: a small row of pips to reinforce the MTG context
  - In the stat badges that relate to colors
  - As section dividers (a horizontal rule with mana pips centered) on the Deck page

---

### Pillar 2 — Modern UI Polish

**Typography:**
- Cinzel is used correctly for headings. Ensure body text uses a high-quality system font stack with good reading rhythm — line-height 1.6–1.7 for paragraph text, 1.4 for labels.
- Section labels (`SectionLabel` component) use `tracking-widest` — good. But ensure consistent sizing: `text-xs` for secondary labels, `text-sm` for primary section headers.
- Deck name on the Deck page top bar: currently plain text. Upgrade to Cinzel at `text-2xl` with a subtle amber text-shadow glow (`text-shadow: 0 0 24px rgba(251,191,36,0.3)`).

**Spacing audit:**
- The app has good component-level spacing but inconsistent page-level breathing room. Every page should start with `pt-8 sm:pt-12` — currently some pages jump straight to content at the edge.
- Cards in grids need consistent gap: `gap-4` everywhere (some places use `gap-3`, some `space-y-3`).

**Interactive states:**
- Buttons: the primary amber button is good. Add a subtle `box-shadow: 0 0 12px rgba(251,191,36,0.25)` on hover — a very slight glow, not flashy. This reinforces the magical aesthetic without being garish.
- Card hover states: `hover:border-[var(--color-primary)]/60` is already set in some places. Audit all clickable cards to ensure consistent hover treatment.
- Tab bar active state: currently amber underline. Add a very subtle `background: linear-gradient(to bottom, amber/8%, transparent)` on the active tab panel — gives a "selected panel" feel.

**Loading states:**
- Replace any "Loading…" text spinners with a styled MTG-themed loading state — a simple CSS-animated amber glow ring, or a spinning mana pip. Small detail, big personality.
- Skeleton screens for the deck grid (Dashboard) and the analysis tabs (Deck page) instead of "Loading history…" text.

**Empty states:**
- Each empty state (no decks, no collection, no analyses) should have a personality — a muted MTG-themed icon (the existing sword icon is fine), a headline, a single CTA sentence, and a button. Currently some empty states are just text. Make them feel intentional.

---

### Pillar 3 — Desktop vs. Mobile Intentionality

**Current state:** The app is "responsive" — it scales down — but it's not *designed for mobile*. On desktop it's too narrow (max-w-2xl for Dashboard). On mobile, some elements are awkward.

**Desktop:**
- Dashboard: expand to `max-w-4xl` and use the horizontal space. The deck grid (from Phase 14) naturally fits wider. The "Analyze a Deck" form could be a two-column layout: URL input on left, recent activity summary on right.
- Deck page: the top bar (back link + deck name) feels thin on desktop. Consider a richer top bar with deck name (large Cinzel) + commander name + color pips + last analyzed date — all in one band. Like a card header.
- Collection page: already tagged for `max-w-4xl` fix in backlog. On desktop, the card grid should be 4–5 columns.
- Sidebar: already 64px wide with icon-only on mobile. On desktop (≥1280px), consider expanding to a 180px labeled sidebar — show icon + text label for each nav item. More breathing room, more product feel.

**Mobile:**
- Bottom nav: already implemented. Ensure active states are obvious at a glance (current: amber indicator dot — good, but also add a subtle background pill behind the active icon like iOS tab bars).
- Dashboard on mobile: single column is correct. But the form + deck grid should feel like a focused native-app experience — larger touch targets (min 44px tap areas on buttons), slightly larger input padding, deck cards that fill the full column width with no lateral padding waste.
- Deck page on mobile: the tab bar has 5 tabs. "Collection Upgrades" is too long for mobile — abbreviate to "My Cards" or "Upgrades" on small screens (use CSS truncation or responsive label).
- Typography scaling: `text-3xl` page titles are fine on desktop but `text-2xl` feels better on mobile — use responsive font sizes (`text-2xl sm:text-3xl`) across all page titles.
- Touch feedback: ensure all interactive elements have an `active:scale-[0.97]` micro-animation — tapping a button should feel responsive. Already on some elements, needs audit to confirm it's everywhere.

---

### Implementation Notes

**Ordering within Phase 15:**
1. **Scryfall commander image** — highest visual impact, single component change in `DeckPage.jsx`
2. **Login page personality** — first impression, CSS-only, low risk
3. **Background texture** — 4 lines of CSS, zero risk, immediate depth improvement
4. **Desktop layout expansions** (Dashboard max-w, Deck top bar, sidebar labels)
5. **Mobile polish** (tab label truncation, touch targets, active nav pill)
6. **Loading skeletons** — more effort, do last

**What NOT to do in Phase 15:**
- Do not change the Option A color palette — it's correct and implemented consistently
- Do not add Framer Motion or heavy animation libraries — CSS transitions only
- Do not redesign the information architecture — tabs, pages, and nav structure stay as-is
- Do not add features — this is purely visual/UX polish
- Do not use actual MTG card artwork (copyright) — Scryfall card images for commander lookup are fair use for a non-commercial tool; full art backgrounds are not
