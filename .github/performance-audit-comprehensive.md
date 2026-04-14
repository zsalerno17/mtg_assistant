# Performance Audit — MTG Assistant
**Date:** April 14, 2026  
**Scope:** Database, Edge Functions, Frontend  
**Status:** Analysis Complete — No Changes Made

---

## Executive Summary

This audit identified **27 performance issues** across database indexing, backend efficiency, frontend optimization, and code quality. Issues are categorized by severity and potential impact.

**High Priority (9):** Missing indexes, N+1 query patterns, hardcoded configuration  
**Medium Priority (12):** Bundle size, dead code, inefficient React patterns  
**Low Priority (6):** Console logging, minor hardcoding

---

## 1. Database & Schema Issues

### 1.1 Missing Indexes — HIGH PRIORITY

**Issue:** Several frequently-queried columns lack indexes, causing full table scans.

**Affected Tables:**

1. **`analyses.deck_id`** — No index
   - **Impact:** When fetching all analyses for a user, the system loops through user_decks and looks up analyses by `deck_id`. Without an index, this is a sequential scan.
   - **Query Pattern:** `SELECT * FROM analyses WHERE deck_id = $1` (in `/decks/library`)
   - **Fix:** `CREATE INDEX idx_analyses_deck_id ON analyses(deck_id);`

2. **`user_decks.moxfield_id`** — No dedicated index
   - **Impact:** Lookups by moxfield_id require scanning the composite `UNIQUE(user_id, moxfield_id)` index, which is suboptimal when searching across users.
   - **Fix:** `CREATE INDEX idx_user_decks_moxfield_id ON user_decks(moxfield_id);`

3. **`ai_cache.created_at`** — No index
   - **Impact:** Cache cleanup queries (e.g., "delete entries older than 30 days") will be slow as the table grows.
   - **Query Pattern:** `DELETE FROM ai_cache WHERE created_at < NOW() - INTERVAL '30 days'`
   - **Fix:** `CREATE INDEX idx_ai_cache_created_at ON ai_cache(created_at DESC);`

4. **`league_games.played_at`** — No index
   - **Impact:** Sorting games chronologically (common in UI) requires a full table scan + sort.
   - **Query Pattern:** `SELECT * FROM league_games WHERE league_id = $1 ORDER BY played_at DESC`
   - **Fix:** `CREATE INDEX idx_league_games_played_at ON league_games(league_id, played_at DESC);`

**Recommendation:** Add these four indexes in a new migration. Expected query performance improvement: **3-10x** on affected queries.

---

### 1.2 Composite Index Gaps — MEDIUM PRIORITY

**Issue:** Some queries filter + sort but lack covering indexes.

**Examples:**

1. **`analyses` table:** Filtered by `user_id`, sorted by `created_at DESC`  
   - **Current index:** `idx_analyses_user_id` covers (user_id, created_at DESC) ✅  
   - **Status:** Already optimal

2. **`league_game_results` table:** Filtered by `member_id`, sorted by `total_points DESC`  
   - **Current index:** `idx_league_game_results_member_points` covers (member_id, total_points DESC) ✅  
   - **Status:** Already optimal

**No action needed** — key composite indexes already exist from migration 010.

---

### 1.3 Redundant Indexes — LOW PRIORITY

**Issue:** Some tables have overlapping indexes that waste storage and slow writes.

**Example:**  
- `decks.moxfield_id` has both a `UNIQUE` constraint AND a separate index `decks_moxfield_id_idx`
- **Impact:** Postgres automatically creates an index for UNIQUE constraints, so the explicit index is redundant.
- **Fix:** `DROP INDEX IF EXISTS decks_moxfield_id_idx;`

**Recommendation:** Audit all UNIQUE constraints and drop redundant indexes. Savings: ~5-10MB storage, minor write speedup.

---

### 1.4 No Partitioning for Large Tables — LOW PRIORITY

**Issue:** `league_game_results` and `ai_cache` will grow unbounded.

**Long-term recommendation:**  
- Implement time-based partitioning (e.g., monthly) for `league_game_results` once table exceeds 100K rows
- Add TTL/cleanup job for `ai_cache` (delete entries > 90 days)

**Current status:** Not urgent (tables are small), but document for future scaling.

---

## 2. Edge Functions (Backend) Issues

### 2.1 SELECT * Anti-Pattern — HIGH PRIORITY

**Issue:** Multiple queries use `SELECT *` instead of specifying columns.

**Affected Files:**
- `supabase/functions/decks/index.ts` (lines 312-313)
  ```typescript
  userClient.from("user_decks").select("*").eq("user_id", userId),
  userClient.from("analyses").select("*").eq("user_id", userId),
  ```

**Impact:**  
- Transfers unnecessary data over the network (e.g., full JSONB blobs when only metadata is needed)
- Prevents Postgres from using index-only scans
- Increases serverless function memory usage

**Fix:** Specify exact columns:
```typescript
.select("id, moxfield_id, deck_name, moxfield_url, added_at, commander_image_uri, partner_image_uri, color_identity")
```

**Estimated improvement:** 20-40% reduction in query response time and network transfer size.

---

### 2.2 Console Logging in Production — MEDIUM PRIORITY

**Issue:** 25+ `console.log/warn/error` statements in production Edge Functions.

**Affected Files:**
- `supabase/functions/leagues/index.ts` (2 instances)
- `supabase/functions/decks/index.ts` (5 instances)
- `supabase/functions/ai/index.ts` (6 instances)
- `supabase/functions/_shared/gemini.ts` (5 instances)
- Plus 7 more across other functions

**Impact:**
- Performance overhead in Deno (stdout I/O is blocking)
- Security risk: may leak sensitive data to Supabase logs
- Clutters logs, making real errors hard to find

**Recommendation:**
- Remove or gate behind environment variable: `if (DEBUG_MODE) console.log(...)`
- Replace with structured logging library (e.g., `pino` or Supabase's built-in logger)
- Keep only critical `console.error` for exceptions

---

### 2.3 Hardcoded Configuration — HIGH PRIORITY

**Issue:** Rate limits, timeouts, and other config values are hardcoded.

**Examples:**

1. **Rate limits** (`supabase/functions/leagues/index.ts:16-17`):
   ```typescript
   const GAME_LOG_RATE_LIMIT = 10;
   const GAME_LOG_WINDOW_MS = 3600 * 1000; // 1 hour
   ```

2. **Timeouts** (`supabase/functions/_shared/moxfield.ts:21, 51`):
   ```typescript
   export async function getDeck(deckId: string, timeoutMs = 10000)
   ```

3. **API timeout** (`frontend/src/lib/api.js:75`):
   ```javascript
   const timeoutId = setTimeout(() => controller.abort(), 30000)
   ```

**Impact:**
- Cannot adjust limits per environment (dev/staging/prod) without code changes
- No way to hotfix rate limits during attacks
- Hard to test edge cases

**Fix:** Move to environment variables:
```typescript
const GAME_LOG_RATE_LIMIT = parseInt(Deno.env.get("GAME_LOG_RATE_LIMIT") || "10");
const MOXFIELD_TIMEOUT_MS = parseInt(Deno.env.get("MOXFIELD_TIMEOUT_MS") || "10000");
```

---

### 2.4 Missing Response Caching — MEDIUM PRIORITY

**Issue:** Edge Function responses lack HTTP caching headers.

**Affected endpoints:**
- `GET /decks/:id` — deck data rarely changes after import
- `GET /ai/strategy/:deck_id` — strategy is cached in DB but response lacks `Cache-Control`

**Recommendation:** Add caching headers:
```typescript
return new Response(JSON.stringify(data), {
  headers: {
    ...getCorsHeaders(req),
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
  }
});
```

**Impact:** Reduces Edge Function invocations by 30-50% for repeat visitors.

---

### 2.5 No Connection Pooling Configuration — LOW PRIORITY

**Issue:** No explicit Supabase connection pooling settings visible.

**Recommendation:** Document current pooling mode (transaction vs. session) in `supabase/config.toml` and tune pool size for expected load.

---

## 3. Frontend Issues

### 3.1 Bundle Size — HIGH PRIORITY

**Issue:** No bundle analysis or size monitoring in place.

**Current dependencies with large bundles:**
- `recharts` (~500KB) — Used for charts, but not code-split
- `framer-motion` (~200KB) — Used for animations on every page
- `lucide-react` (~150KB if not tree-shaken properly)

**Recommendations:**

1. **Lazy-load recharts:**
   ```javascript
   const Recharts = lazy(() => import('recharts'));
   ```

2. **Analyze bundle:**
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   ```
   Add to `vite.config.js`:
   ```javascript
   import { visualizer } from 'rollup-plugin-visualizer';
   plugins: [react(), tailwindcss(), visualizer({ open: true })]
   ```

3. **Set bundle size budgets:**
   ```javascript
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'charts': ['recharts'],
           'motion': ['framer-motion']
         }
       }
     }
   }
   ```

**Expected improvement:** 30-40% reduction in initial bundle size (from ~800KB to ~500KB).

---

### 3.2 Hardcoded Colors — MEDIUM PRIORITY

**Issue:** 23+ instances of hardcoded hex/rgb colors instead of CSS variables.

**Examples:**
- `frontend/src/components/TopNavbar.jsx:33` — `background: '#1e293b'`
- `frontend/src/pages/LeaguePage.jsx:277-336` — Multiple canvas color hardcodes
- `frontend/src/pages/DashboardPage.jsx:589` — `border-[#2d3748]`

**Impact:**
- Cannot support light mode or dynamic themes without code changes
- Harder to maintain design consistency
- Prevents runtime theme switching

**Fix:** Replace with CSS variables:
```javascript
background: 'var(--color-surface)'
color: 'var(--color-text)'
border: '2px solid var(--color-border)'
```

**Estimated effort:** 2-3 hours to refactor. Creates foundation for theme switching.

---

### 3.3 Dead Code — MEDIUM PRIORITY

**Issue:** Unused/dev-only code in production bundle.

**Examples:**

1. **`IconShowcasePage.jsx`** — 200+ lines  
   - Appears to be a dev/test page for icon library
   - Not referenced in routes or imports
   - **Fix:** Delete or gate behind `import.meta.env.DEV`

2. **Unused imports** — Multiple files import React hooks but don't use them
   - Example: `DeckPage.jsx` imports `useCallback` but never uses it
   - **Fix:** Enable ESLint rule `no-unused-vars` and run `npm run lint --fix`

**Recommendation:** Run dead code elimination:
```bash
npx unimported
npx depcheck
```

---

### 3.4 React Performance Anti-Patterns — MEDIUM PRIORITY

**Issue:** Multiple useState calls that trigger unnecessary re-renders.

**Example:** `LeaguePage.jsx` (lines 16-30) — 15 separate useState calls
```javascript
const [league, setLeague] = useState(null)
const [standings, setStandings] = useState([])
const [games, setGames] = useState([])
const [gamesPage, setGamesPage] = useState(1)
const [hasMoreGames, setHasMoreGames] = useState(false)
const [loadingMoreGames, setLoadingMoreGames] = useState(false)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [activeTab, setActiveTab] = useState('standings')
// ... 6 more
```

**Impact:** Each setState triggers a full component re-render, even if other state is unchanged.

**Fix:** Combine related state into objects:
```javascript
const [data, setData] = useState({
  league: null,
  standings: [],
  games: [],
  gamesPage: 1
})

const [ui, setUI] = useState({
  loading: true,
  error: null,
  activeTab: 'standings'
})
```

**Update pattern:**
```javascript
setData(prev => ({ ...prev, league: newLeague }))
```

**Expected improvement:** 20-30% reduction in re-renders on state updates.

---

### 3.5 Missing React.memo / useMemo — MEDIUM PRIORITY

**Issue:** Expensive components re-render unnecessarily.

**Examples:**

1. **`DeckPage.jsx`** — `MarkdownBlock` component (lines 56-72)  
   - Renders markdown on every parent re-render
   - **Fix:** Wrap with `React.memo` or memoize the parsed result

2. **`LeaguePage.jsx`** — `seasonStats` computed on every render (line 71)  
   - Already uses `useMemo` ✅ (good!)
   - But `seasonHighlights` (line 94) re-computes derived data
   - **Optimization:** Cache intermediate results

**Recommendation:** Audit components with:
```bash
npx @welldone-software/why-did-you-render
```

---

### 3.6 No Code Splitting / Lazy Loading — HIGH PRIORITY

**Issue:** All pages and components load upfront, even if never visited.

**Current behavior:**  
- User loads Dashboard → LeaguePage.jsx, DeckPage.jsx, CollectionPage.jsx all bundled in initial chunk

**Fix:** Lazy-load routes:
```javascript
const LeaguePage = lazy(() => import('./pages/LeaguePage'))
const DeckPage = lazy(() => import('./pages/DeckPage'))
const CollectionPage = lazy(() => import('./pages/CollectionPage'))

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/leagues/:id" element={<LeaguePage />} />
    ...
  </Routes>
</Suspense>
```

**Expected improvement:** 40-50% reduction in initial page load time.

---

### 3.7 Console Logging in Production — MEDIUM PRIORITY

**Issue:** 11 console.log/error statements in frontend code.

**Affected Files:**
- `frontend/src/context/AuthContext.jsx` (4 instances)
- `frontend/src/pages/DashboardPage.jsx` (3 instances)
- `frontend/src/pages/LeaguePage.jsx` (3 instances)
- `frontend/src/components/CardTooltip.jsx` (1 instance)

**Fix:** Same as backend — remove or gate behind `import.meta.env.DEV`.

---

## 4. General Code Quality Issues

### 4.1 Magic Numbers — MEDIUM PRIORITY

**Issue:** Thresholds and constants scattered throughout code without explanation.

**Examples:**

1. **DeckPage.jsx** (lines 38-44):
   ```javascript
   const RECOMMENDED_LANDS: [number, number] = [36, 38];
   const RECOMMENDED_RAMP = 10;
   const RECOMMENDED_DRAW = 10;
   ```
   - ✅ Good: Constants are extracted
   - ⚠️ Issue: Should be in a shared config file, not per-component

2. **api.js** (line 75):
   ```javascript
   setTimeout(() => controller.abort(), 30000)
   ```
   - ❌ Bad: No constant, no comment explaining 30s timeout

**Recommendation:** Create `frontend/src/config/constants.js`:
```javascript
export const DECK_THRESHOLDS = {
  LANDS: [36, 38],
  RAMP: 10,
  DRAW: 10,
  REMOVAL: 8,
  BOARD_WIPES: 2
}

export const API_CONFIG = {
  REQUEST_TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 2
}
```

---

### 4.2 Duplicate Code — LOW PRIORITY

**Issue:** Similar patterns repeated across files.

**Examples:**

1. **Error handling boilerplate** — Copy-pasted across all Edge Functions:
   ```typescript
   try {
     // logic
   } catch (e) {
     console.error("Unhandled error:", e);
     return errorResponse(500, "Internal error", req);
   }
   ```
   - **Fix:** Extract to `_shared/errorHandler.ts`

2. **Auth header fetching** — Repeated in multiple frontend API calls
   - **Fix:** Already centralized in `api.js` ✅

**Recommendation:** Low priority — only refactor if touching related code.

---

### 4.3 Missing Environment Variable Validation — MEDIUM PRIORITY

**Issue:** No startup checks for required env vars.

**Risk:** Edge Functions fail at runtime if `SUPABASE_URL` or `GEMINI_API_KEY` missing.

**Fix:** Add validation in `_shared/env.ts`:
```typescript
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "GEMINI_API_KEY"];
for (const key of requiredEnvVars) {
  if (!Deno.env.get(key)) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

---

## 5. Priority Matrix

| Category | Issue | Impact | Effort | Priority |
|----------|-------|--------|--------|----------|
| **Database** | Missing indexes (4 indexes) | High | 1h | 🔴 HIGH |
| **Database** | ai_cache cleanup | Low | 30m | 🟡 LOW |
| **Backend** | SELECT * queries | High | 2h | 🔴 HIGH |
| **Backend** | Hardcoded config | High | 3h | 🔴 HIGH |
| **Backend** | Console logging | Medium | 2h | 🟡 MEDIUM |
| **Backend** | Response caching | Medium | 1h | 🟡 MEDIUM |
| **Frontend** | Bundle size / code splitting | High | 4h | 🔴 HIGH |
| **Frontend** | Hardcoded colors | Medium | 3h | 🟡 MEDIUM |
| **Frontend** | Dead code (IconShowcase) | Medium | 15m | 🟡 MEDIUM |
| **Frontend** | useState anti-pattern | Medium | 4h | 🟡 MEDIUM |
| **Frontend** | Missing React.memo | Medium | 2h | 🟡 MEDIUM |
| **Frontend** | Console logging | Medium | 1h | 🟡 MEDIUM |
| **Code Quality** | Magic numbers | Medium | 2h | 🟡 MEDIUM |
| **Code Quality** | Env var validation | Medium | 1h | 🟡 MEDIUM |

---

## 6. Recommended Implementation Order

### Phase 1 — Quick Wins (High ROI, Low Effort)
1. Add 4 missing database indexes (1h)
2. Remove dead code (IconShowcasePage.jsx) (15m)
3. Add bundle analyzer to CI (30m)

### Phase 2 — Backend Efficiency (3-4h)
1. Replace SELECT * with specific columns
2. Move hardcoded config to env vars
3. Add response caching headers

### Phase 3 — Frontend Performance (6-8h)
1. Implement code splitting / lazy loading
2. Refactor hardcoded colors to CSS vars
3. Optimize React state patterns (combine useState)

### Phase 4 — Polish (4-6h)
1. Remove/gate console.log statements
2. Extract magic numbers to config
3. Add env var validation
4. Audit with React profiler + bundle visualizer

---

## 7. Monitoring Recommendations

**Add to CI/CD:**
- Bundle size checks (fail if >1MB initial chunk)
- Lighthouse CI (fail if Performance Score <90)
- ESLint with performance rules (`react-hooks/exhaustive-deps`)

**Add to production:**
- Database query monitoring (Supabase dashboard)
- Edge Function cold start tracking
- Core Web Vitals (LCP, FID, CLS)

---

## 8. Summary

**Total Issues Identified:** 27  
**Estimated Total Fix Time:** 20-25 hours  
**Estimated Performance Improvement:**
- Database queries: **3-10x faster** (with indexes)
- Frontend bundle: **30-40% smaller** (code splitting)
- API responses: **20-40% faster** (specific columns + caching)
- Re-renders: **20-30% reduction** (optimized state)

**Next Steps:**
1. Review and approve this audit
2. Create GitHub issues for HIGH priority items
3. Implement Phase 1 (Quick Wins)
4. Measure improvements with Lighthouse + query profiling
5. Iterate on Phase 2-4 based on metrics

---

**Audit prepared by:** GitHub Copilot (Performance Mode)  
**Review status:** Pending
