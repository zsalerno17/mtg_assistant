# MTG Assistant — Project Plan

> Single source of truth. Update tasks in-place as work is completed. Do not create separate sprint or phase documents.

---

## Current Sprint

**Sprint 1 — Infrastructure & Auth scaffolding**

- [x] Restructure repo: `backend/` (FastAPI + existing `src/`) and `frontend/` (Vite + React)
- [x] Backend: `main.py`, routers (`decks`, `collection`, `ai`, `analyses`), `auth.py` middleware
- [x] Backend: `src/gemini_assistant.py` (Gemini 2.5 Flash, replaces OpenAI)
- [x] Backend: `.env`, `.env.example`, updated `requirements.txt`
- [x] Frontend: Vite + React + Tailwind, Option A design tokens, Google Fonts
- [x] Frontend: `AuthContext`, `ProtectedRoute`, page shells (`Login`, `Dashboard`, `Deck`, `Collection`)
- [ ] **Next:** Add Supabase anon key + JWT secret to `backend/.env` → create DB tables → test Google login end-to-end

---

## Goals

1. Users can get recommendations on how to alter their decks based on their card collection (data from Moxfield)
2. Users can get recommended play strategies for their current decks
3. Users are shown before/after scenarios of how their play strategy changes based on suggested deck changes
4. Multi-user support (~5 users), accessible on phone and desktop

---

## Architecture Decisions

| Concern | Decision | Notes |
|---|---|---|
| Frontend | React (Vite) + TailwindCSS | Deployed on Vercel (free) |
| Backend | FastAPI (Python) | Deployed on Render (free tier, sleeps after 15 min idle — acceptable for ~5 users) |
| Database + Auth | Supabase | PostgreSQL + Google OAuth + admin allow-list |
| AI | Gemini 2.5 Flash | Free tier, 1M token context window |
| Moxfield decks | Unofficial public API | `api2.moxfield.com/v2/decks/all/{id}` — public decks only, no auth needed |
| Moxfield collections | CSV upload only | No public OAuth exists for private collection data; Moxfield supports CSV export natively |
| Auth model | Google login + allow-list | Admin adds approved emails to `allowed_users` table in Supabase |

---

## Phase 1: Infrastructure Setup

- [x] Create Supabase project → enable Google OAuth provider → copy API URL + anon key
- [x] Scaffold FastAPI backend: `backend/` with `main.py`, routers, existing `src/` modules reused
- [x] Scaffold React frontend: `frontend/` with Vite + TailwindCSS + React Router
- [x] Update `backend/requirements.txt` — add `fastapi`, `uvicorn`, `supabase`, `google-generativeai`, `python-jose`
- [x] Configure `.env` files for both frontend and backend (Supabase URL/keys, Gemini API key)

---

## Phase 2: Auth + User System

- [ ] Supabase: create `allowed_users(email TEXT PRIMARY KEY)` table — admin-managed allow-list
- [x] FastAPI: JWT verification middleware using Supabase JWTs (`python-jose`)
- [x] FastAPI: `require_allowed_user` dependency — checks JWT + `allowed_users` table; rejects unlisted emails with 403
- [x] React: `AuthContext` — Supabase Google OAuth login/logout, session persistence across page loads
- [x] React: `ProtectedRoute` component — redirects unauthenticated or non-listed users to login page

---

## Phase 3: Backend API (FastAPI)

> Reuse existing `src/` modules (models, collection, deck_analyzer, moxfield, scryfall) unchanged.

- [ ] `POST /api/decks/fetch` — wraps `moxfield.get_deck()` + `parse_moxfield_deck()`; caches result in Supabase `decks` table
- [ ] `POST /api/decks/analyze` — runs `deck_analyzer.analyze_deck()` + saves result to `analyses` table
- [ ] `POST /api/collection/upload` — parses CSV via `parse_moxfield_csv()` + upserts to `collections` table per user
- [ ] `GET /api/collection` — returns the authenticated user's stored collection
- [ ] `POST /api/ai/strategy` — calls Gemini for strategy guide
- [ ] `POST /api/ai/improvements` — calls Gemini for improvement suggestions (cross-referenced against user's collection)
- [ ] `POST /api/ai/scenarios` — takes current deck + proposed adds/removes; returns structured before/after strategy diff
- [ ] `GET /api/analyses/history` — returns last 10 analyses for the authenticated user (paginated)

---

## Phase 4: Frontend (React)

> Build mockups of all 3 design options (A, B, C — see Design System below) before committing to full implementation. Confirm visual direction with mockups first.

- [ ] Pages: `LoginPage`, `DashboardPage`, `DeckPage`, `CollectionPage`
- [ ] `DeckPage` tabs: Overview | Collection Upgrades | Strategy | Improvements | Scenarios
- [ ] Scenarios tab: form to input cards to add/remove → side-by-side before/after display (strategy changes, win conditions gained/lost, new weaknesses introduced)
- [ ] `CollectionPage`: drag-and-drop CSV upload, card count display, search/filter
- [ ] Responsive layout: mobile-first TailwindCSS — bottom nav on mobile, left sidebar on desktop (see Responsive Layout in Design System)
- [ ] Charts: Recharts for mana curve + card type breakdowns (lighter than Plotly for React)

---

## Phase 5: AI — Gemini 2.5 Flash

- [ ] Create `backend/src/gemini_assistant.py` — replace OpenAI client with `google-generativeai` SDK
- [ ] Increase response token budget to 2000+ tokens (was 900 with gpt-4o-mini; free tier supports this)
- [ ] Include full decklist in prompt context (Gemini's 1M token window makes this viable; was omitted before)
- [ ] Implement `explain_scenarios()` — structured prompt returning JSON: `{ "before": { game_plan, win_conditions, weaknesses }, "after": { game_plan, win_conditions, weaknesses, changes_summary } }`
- [ ] Retire `src/assistant.py` once Gemini assistant is verified working

---

## Phase 6: Data Persistence (Supabase)

**Tables:**

| Table | Schema | Notes |
|---|---|---|
| `allowed_users` | `email TEXT PRIMARY KEY` | Admin-managed; controls who can log in |
| `decks` | `id, moxfield_id, data_json, fetched_at` | Shared cache across all users |
| `analyses` | `id, user_id, deck_id, result_json, created_at` | Per-user analysis history |
| `collections` | `user_id, cards_json, updated_at` | One row per user, updated on CSV upload |

- [ ] Create all four tables in Supabase
- [ ] Add Row Level Security (RLS) policies: users can read/write only their own `analyses` and `collections`; `decks` is shared-read for all authenticated users
- [ ] Wire `GET /api/analyses/history` to paginate the `analyses` table (10 per page)

---

## Acceptance Criteria

Before considering a phase complete, verify:

1. **Auth** — Sign in with Google → allow-listed email gets access; non-listed email is rejected with a clear message
2. **Deck fetch** — Paste a Moxfield URL → deck loads, analysis renders correctly
3. **Collection** — Upload Moxfield CSV → cards appear; Collection Upgrades tab shows only owned cards as suggestions
4. **Strategy** — Strategy tab returns substantive Gemini advice (not the rule-based fallback)
5. **Scenarios** — Add 2 cards + remove 2 cards → before/after diff renders correctly in both columns
6. **History** — Analyze two decks, reload the app → both appear in analysis history
7. **Mobile** — Open on phone → no horizontal scroll, readable text, all buttons are tappable
8. **Multi-user isolation** — Two accounts → each user sees only their own collection and history

---

## Out of Scope (v1)

- Moxfield OAuth / auto-fetching private collections
- Deck creation from scratch
- Real-time multiplayer or shared deck sessions
- Power level / cEDH tier comparison
- Card price / budget awareness
- Light mode

---

## Design System

### Mode
Dark mode only (v1). Light mode deferred.

### Visual Direction Options

> Build mockups of all 3 options early in Phase 4. Confirm final direction before full implementation. **Option A is the current working selection.**

---

#### ✅ Option A — Dark Arcane (Selected)

Dark, atmospheric, premium. Feels at home in the MTG universe. Good contrast on phone screens in low light (common while playing).

**Color Palette:**

| Role | Name | Hex |
|---|---|---|
| Background | Slate 950 | `#0a0f1a` |
| Surface (cards/panels) | Slate 900 | `#0f172a` |
| Border | Slate 700 | `#334155` |
| Primary accent | Amber 400 | `#fbbf24` |
| Secondary accent | Sky 400 | `#38bdf8` |
| Success / positive | Emerald 400 | `#34d399` |
| Danger / warning | Rose 400 | `#fb7185` |
| Body text | Slate 200 | `#e2e8f0` |
| Muted text | Slate 400 | `#94a3b8` |

**Typography:**
- Headings: **Cinzel** (Google Fonts — evokes MTG card title style, authoritative)
- Body + UI: **Inter** (clean, highly legible at all sizes)
- Data/numbers: **JetBrains Mono** (card counts, CMC values, stats)

**MTG color pips:** Use W/U/B/R/G as small semantic badge indicators on deck cards. Not dominant UI colors — accents only.

---

#### Option B — Clean Professional

Light mode SaaS aesthetic (Notion / Linear energy). Zinc 50 background, Zinc 900 text, Violet 600 primary accent. Neutral, fast-loading visually. Best for desktop + bright environments. Less MTG-native. Good fallback if Option A feels too heavy.

---

#### Option C — MTG Five Color System

Per-deck dynamic color theming based on the deck's color identity. Mono-green deck → green tints; Grixis deck → blue/black/red tones. High novelty, very MTG-native. Significantly more complex — every component needs a color theme prop. **Deferred to v2** as an enhancement on top of Option A.

---

### Responsive Layout

Follows Material Design's "swap, don't just scale" principle — nav components change, not just shrink.

| Breakpoint | Navigation | Layout | Tab Display |
|---|---|---|---|
| Mobile `< 768px` | Bottom nav bar (4 icons: Home, Decks, Collection, Profile) | Single column, full width | Horizontal scroll tabs |
| Tablet `768–1024px` | Top nav bar | Single column, `max-w-2xl` centered | Full tab row visible |
| Desktop `> 1024px` | Left sidebar (icons + labels, 240px wide, persistent) | Two-pane: sidebar + content area | Tab nav inside content pane |

**Key transition:** Bottom nav → left persistent sidebar. On desktop, the deck list and active analysis can display side-by-side simultaneously.

---

## Existing Files (reused in backend)

| File | Status | Notes |
|---|---|---|
| `src/models.py` | Keep as-is | Card, Deck, Collection dataclasses |
| `src/collection.py` | Keep as-is | CSV + text list parsing |
| `src/deck_analyzer.py` | Keep as-is | Core analysis engine |
| `src/moxfield.py` | Keep as-is | Moxfield deck fetching |
| `src/scryfall.py` | Keep as-is | Card lookup — finally wired up in Phase 3 |
| `src/assistant.py` | Replace | Replaced by `gemini_assistant.py` in Phase 5 |
| `app.py` | Retire | Replaced by React frontend |
