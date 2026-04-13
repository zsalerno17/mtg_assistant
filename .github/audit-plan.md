# MTG Assistant — Codebase Audit & Improvement Plan

**Date:** April 2026  
**Scope:** Performance, Reliability, Security, Design, Scalability  
**Stack:** React 19 + Vite (Vercel), Supabase Edge Functions/Deno (primary backend), FastAPI/Render (deprecated), PostgreSQL + RLS  
**Scale target:** Small group (<50 users)

---

## Context & Decisions

- **FastAPI is being deprecated** — fixes target Edge Functions first; FastAPI bugs are low priority
- **Scale is small** — skip Redis, CDN, sharding; PostgreSQL + Supabase is sufficient
- **Scope is audit + fixes only** — no new features, no full redesign
- **Priority order:** Reliability → Security → Performance → Migration → Design

---

## Phase 1 — Reliability & Error Handling ✅ In Progress

### 1a. Edge Function error handling
**Files:** `supabase/functions/ai/index.ts`, `decks/index.ts`, `leagues/index.ts`  
**Issues:**
- `loadDeck()` fallback chain in `ai/index.ts` — DB call inside `catch` block is unguarded; if DB is also down, it throws and loses the original Moxfield error context
- Unguarded `.from().select().eq()` calls can crash on DB errors in edge functions

**Fix:** Wrap Supabase DB fallback calls in nested try-catch, surface errors with meaningful HTTP codes. Top-level `serve()` handler already catches unhandled errors → 500.

### 1b. DB-backed rate limiting (critical) ✅ Done
**File:** `supabase/functions/leagues/index.ts` lines 9-28  
**Issue:** `const gameLogTimestamps: Record<string, number[]> = {}` is module-level state that **resets on every Edge Function cold start**. Rate limit of 10 games/hour becomes meaningless.  
**Fix:** Replace in-memory check with a DB query counting `league_games` records in the last hour for the given league.

### 1c. Blocking Scryfall enrichment
**File:** `backend/routers/collection.py` lines 41-43  
**Issue:** `time.sleep(0.11)` per card × ~800 cards = ~88s blocking. FastAPI is synchronous here.  
**Note:** FastAPI is deprecated. Fix belongs in the Edge Functions `collection` endpoint using `Promise.all()` with concurrency limiting. Flag for collection edge function migration.

### 1d. Silent Scryfall failures
**File:** `backend/routers/collection.py` ~L37  
**Issue:** If Scryfall is down, stub cards with no CMC/type_line are saved silently.  
**Fix:** Track failure count; surface warning if >20% of cards couldn't be enriched.

### 1e. Async mismatch in leagues router
**File:** `backend/routers/leagues.py` line 80  
**Status:** `async def verify_league_membership` is awaited correctly by all callers (lines 359, 477, 535, 684, 805, 842, 868, 921). No action needed.

---

## Phase 2 — Security

### 2a. Service role client misuse
**Files:** `backend/auth.py` L70, `backend/routers/ai.py` L18, `backend/routers/decks.py` L45  
**Issue:** `_supabase()` returns service-role client that bypasses RLS, used for user-scoped queries.  
**Fix:** FastAPI deprecation resolves this — Edge Functions use user JWT directly. For any FastAPI endpoints still active, audit and switch to `get_user_supabase_client()`. Do not add new FastAPI routes using the service client.

### 2b. Error message leakage ✅ Done
**File:** `frontend/src/lib/api.js` line ~58  
**Issue:** Raw backend `err.detail` is thrown and shown directly in the UI. Gemini errors, stack traces, and internal details can leak.  
**Fix:** Already addressed — `err.detail` passes through from edge functions which return sanitized messages. Top-level edge function handlers catch all errors and return `"Internal server error"`.

### 2c. Unused legacy dependency ✅ Done
**File:** `backend/requirements.txt`  
**Issue:** `openai>=1.14.0` is flagged as legacy and only imported inside a file that immediately raises `ImportError` (`backend/src/assistant.py`).  
**Fix:** Remove from requirements.

### 2d. Unpinned dependency versions
**File:** `backend/requirements.txt`  
**Issue:** All packages use `>=` which allows unexpected major version upgrades.  
**Recommendation:** Pin to `==` or `~=` for a production deployment snapshot. Do this when next updating deps intentionally.

---

## Phase 3 — Performance

### 3a. N+1 query in library fetch
**File:** `supabase/functions/decks/index.ts` — `handleGetLibrary()`  
**Status:** Already resolved. The function uses `Promise.all([sb.from("user_decks")..., sb.from("analyses")...])` to batch both queries, then joins them in memory. ✅

### 3b. Missing scenario analysis caching ✅ Done
**File:** `supabase/functions/ai/index.ts` — `handleScenarios()`  
**Issue:** Every "what if I swap X for Y" call hits Gemini fresh. Even repeated identical scenarios re-run the expensive AI call.  
**Fix:** Cache keyed on `moxfield_id:sha256(sorted_adds|sorted_removes)`, stored in `ai_cache` with type `"scenarios_v1"`. Only cache when `ai_enhanced = true`.

### 3c. Scryfall enrichment in collection Edge Function
**File:** `supabase/functions/collection/index.ts` (if/when collection enrichment is moved there)  
**Fix:** Use `Promise.all()` with concurrency limiter (5 concurrent requests) for Scryfall lookups instead of sequential calls.

---

## Phase 4 — Edge Function Migration Completeness

### 4a. Feature parity audit
| FastAPI Route | Edge Function | Status |
|---|---|---|
| `POST /api/decks/fetch` | `decks/fetch` | ✅ |
| `POST /api/decks/analyze` | `decks/analyze` | ✅ |
| `POST /api/decks/library` | `decks/library` | ✅ |
| `GET /api/decks/library` | `decks/library` | ✅ |
| `POST /api/ai/strategy` | `ai/strategy` | ✅ |
| `POST /api/ai/improvements` | `ai/improvements` | ✅ |
| `POST /api/ai/scenarios` | `ai/scenarios` | ✅ |
| `POST /api/ai/collection-upgrades` | `ai/collection-upgrades` | ✅ |
| `POST /api/collection/upload` | `collection/upload` | Needs verification |
| `GET /api/collection/` | `collection/` | Needs verification |
| `GET /api/collection/summary` | `collection/summary` | Needs verification |
| `GET /api/analyses/history` | `analyses/history` | Needs verification |
| `GET /api/users/profile` | `users/profile` | ✅ |
| `PUT /api/users/profile` | `users/profile` | ✅ |
| `*/leagues/*` | `leagues/*` | ✅ Full implementation |

### 4b. Frontend API switching
**File:** `frontend/src/lib/api.js`  
**Issue:** Dual-mode `USE_EDGE` flag with silent fallback to `LEGACY_BASE`.  
**Fix:** Once FastAPI is confirmed deprecated and collection/analyses edge functions verified, remove `LEGACY_BASE`, `USE_EDGE`, and `apiFetch`. Keep `edgeFetch` only.

### 4c. Request tracing (observability)
**Issue:** No correlation ID across frontend → Edge Function → DB calls.  
**Fix:** Add `X-Request-ID: <uuid>` header in `api.js` and log it in each Edge Function's request handler. Low effort, high debugging value.

---

## Phase 5 — Design & UX Polish

### 5a. Missing 404 page ✅ Done
**File:** `frontend/src/App.jsx`  
**Fix:** Add `NotFoundPage` component and `<Route path="*">` catch-all inside `AnimatedRoutes`.

### 5b. No fetch timeout ✅ Done
**File:** `frontend/src/lib/api.js`  
**Fix:** Wrap `fetch()` with `AbortController` and 30-second timeout. Throws a user-friendly "Request timed out" error.

### 5c. Collection upload no progress indicator
**File:** `frontend/src/lib/api.js` lines 145-157, `CollectionPage.jsx`  
**Issue:** Large CSV uploads silently freeze the UI with no progress feedback.  
**Fix:** Add upload loading state with estimated time message. Use `XMLHttpRequest` with `upload.onprogress` if byte-level progress is needed.

### 5d. Duplicate request prevention
**File:** `frontend/src/pages/DeckPage.jsx`  
**Issue:** Strategy and AI improvement fetch buttons can be clicked multiple times while the first request is in flight.  
**Status:** Review `DeckPage.jsx` loading state guards; ensure buttons are disabled while `loading === true`.

---

## Verification Checklist

After implementing changes, verify:

- [ ] `supabase functions serve` — test each route locally
- [ ] League game logging rate limit persists across function restarts (DB-backed)
- [ ] Collection upload with 100+ card file completes successfully
- [ ] Scenario analysis serves from cache on second identical request
- [ ] 404 page renders for unknown routes
- [ ] Fetch timeout fires after 30s on a slow/hung request (test with `supabase functions serve` + network throttling)
- [ ] Backend tests pass: `cd backend && pytest tests/`
- [ ] No regression on deck analysis, AI strategy, improvements flows

---

## Out of Scope

- Redis, CDN, database sharding (overkill for <50 users)
- Full E2E test suite (targeted fixes only)
- UI redesign or new features
- Kubernetes/containerization
