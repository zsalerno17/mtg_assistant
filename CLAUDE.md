# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Style

### Planning
- Small tasks (1-2 files, clear scope) → implement directly, no plan needed
- Larger tasks (3+ files, or anything that feels like a feature/refactor) → propose a plan first, get approval before writing code
- Write plans to `.github/<feature-name>.md`
- Plan format:
  - Break into phases; each phase has a **Goal** (what the user can see/use when it's done) and a checklist of `- [ ]` todos
  - Cross off todos (`- [x]`) as work is completed

### Plan summaries
- Mix technical work with user-facing outcome — what does the user actually get from this phase?
- Format each phase goal as: **[what it does technically]** → **[what the user experiences]**
- Example: "Wire up `league_game_votes` RLS policies and vote submission endpoint → Users can approve or dispute game results without needing an admin to intervene"
- Avoid pure-technical phase goals like "Add RLS policies and API endpoint" with no user outcome

### Responses
- Use short bulleted lists grouped by topic — no prose paragraphs
- **Root cause:** one line max
- **Fix:** one line max, file path included
- **Why it worked / what changed:** 1-2 bullets

- Never end a response with commands for the user to run — either run them yourself or give numbered step-by-step instructions if they require user action (e.g. browser steps)
- Don't list file changes as the primary structure; lead with what broke and why, then what changed

**Example of what NOT to do:**
> "Deployed. The games function was missing verify_jwt = false in config.toml, so Supabase's gateway was rejecting requests at the platform level before the function code ever ran — returning a 401 with no detail field, hence 'API error 401' on the frontend. The fix adds [functions.games] / verify_jwt = false to match all other functions, and redeploys. The function itself already handles auth via requireAllowedUser, so no code changes were needed."

**Example of what TO do:**
- **Root cause:** `verify_jwt = false` missing from `[functions.games]` in `config.toml` — Supabase gateway rejected requests before the function ran
- **Fix:** Added `[functions.games] / verify_jwt = false` to match all other functions, redeployed
- Auth logic unchanged — `requireAllowedUser` already handles it inside the function

## Commands

### Frontend (run from `frontend/`)
```bash
npm run dev       # Dev server on port 5173 (proxies /api → localhost:8000)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run test      # Run Vitest unit tests
npm run test:watch
npm run lint      # ESLint (no autofix)
```

### Supabase / Backend
```bash
supabase start                          # Start local Supabase (DB :54322, API :54321)
supabase functions serve                # Serve Edge Functions locally
supabase functions deploy [name]        # Deploy a single function
supabase db push                        # Apply pending migrations
```

## Architecture

This is a full-stack web app for Magic: The Gathering Commander deck analysis and league management.

**Stack:**
- **Frontend:** React 19 + Vite, Tailwind CSS, Recharts, React Router — deployed to Vercel
- **Backend:** Supabase Edge Functions (Deno/TypeScript) — each function in `supabase/functions/<name>/index.ts`
- **Database:** PostgreSQL via Supabase with Row-Level Security; schema managed via `supabase/migrations/`
- **External APIs:** Moxfield (deck/collection import), Scryfall (card images/prices), Google Gemini (AI suggestions)

**The `src/` directory contains legacy Python code** (dataclasses + analyzers). The active backend logic lives in `supabase/functions/_shared/` — `deck_analyzer.ts` and `collection_analyzer.ts` are the TypeScript re-implementations used in production.

### Request Flow

1. Frontend calls `src/lib/api.js` which attaches the Supabase JWT and routes to Edge Functions at `/api/*`
2. Edge Functions validate auth via `_shared/auth.ts` (JWT check + `allowed_users` email allowlist)
3. Functions use `_shared/` utilities for Moxfield/Scryfall fetching, deck analysis, and DB access
4. Results are cached in Supabase tables (`decks`, `analyses`, `ai_cache`) to avoid redundant API calls

### Key Shared Utilities (`supabase/functions/_shared/`)

| File | Purpose |
|------|---------|
| `deck_analyzer.ts` | Core deck analysis engine (mana curve, ramp/draw/removal counts, archetype detection) |
| `collection_analyzer.ts` | Matches user collection against deck needs; scores upgrade suggestions |
| `moxfield.ts` | Moxfield API client for importing decks and collections |
| `scryfall.ts` | Scryfall API client for card metadata and images |
| `gemini.ts` | Google Gemini AI integration for improvement suggestions |
| `auth.ts` | JWT verification + allowed_users allowlist check |
| `models.ts` | Shared TypeScript interfaces (Card, Deck, League, etc.) |

### Frontend Structure

- `src/pages/` — Route-level page components. `DeckPage.jsx` (~93KB) is the most complex, with tabs for Overview, Collection, Strategy, Improvements, and Changes.
- `src/components/` — Reusable UI components including data visualizations (mana curve, color identity matrix, archetype readiness)
- `src/context/AuthContext.jsx` — Google OAuth via Supabase; wraps the app and provides user/session state
- `src/lib/api.js` — HTTP abstraction over Edge Functions; handles auth token injection and 401 retry logic

### Shared UI Primitives (`src/components/shared/`)

**Before implementing any of the following patterns, import from `src/components/shared/` instead of writing your own.**

| Component | Use for |
|-----------|---------|
| `ColorPips` | Mana color identity symbols (W/U/B/R/G/C) |
| `TooltipWrapper` | Hover tooltips with edge-detection positioning |
| `ProgressBar` | Any value/max progress bar |
| `SelectField` | **All dropdowns** — fully custom styled listbox, never use a raw `<select>`. API matches native: `value`, `onChange(e)` (receives `{ target: { value } }`), `disabled`, `id`, `className` (on wrapper), `children` as `<option>` elements. |

### Database Schema

Core tables: `allowed_users` (access control), `decks` (Moxfield deck cache), `collections`, `analyses`, `ai_cache`, `user_profiles`, `user_decks`

League tables: `leagues`, `league_members`, `league_games`, `league_game_results`, `league_game_votes`, `league_invites`

Personal games: `personal_games`

Card data is stored as JSONB. RLS policies enforce that users can only access their own data; service role is used for shared deck caching.

### Auth / Access Control

- Login is Google OAuth only (via Supabase Auth)
- After login, `auth.ts` checks `allowed_users` table for the user's email — the app is invite-only
- `ProtectedRoute.jsx` guards all authenticated pages client-side
- Admin page (`/admin`) manages the allowlist
