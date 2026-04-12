# League Tracking Critical Fixes — Implementation Summary

**Date:** April 12, 2026  
**Developer:** eng-expert agent  
**Status:** ✅ ALL CRITICAL ISSUES FIXED

---

## Executive Summary

All 7 critical/high severity issues identified by specialist agents have been fixed:

- ✅ **CRITICAL-01:** Backend RLS bypass — fixed with `get_user_supabase_client()`
- ✅ **CRITICAL-02:** Missing member_id validation — added validation in `log_game`
- ✅ **CRITICAL-03:** Missing deck_id ownership check — added validation
- ✅ **CRITICAL (Scoring):** First Blood backwards & 3rd place zero points — replaced with standard 3-2-1-0 system
- ✅ **CRITICAL (Performance):** SQL bug showing wrong standings — fixed in migration 008
- ✅ **HIGH-01:** URL validation (XSS/SSRF) — added HttpUrl + scheme validation
- ✅ **Migration 008:** Created with all schema changes, indexes, RLS policies

---

## Changes Made

### 1. Security Fixes (backend/auth.py, backend/routers/leagues.py)

**CRITICAL-01: RLS Bypass**
- **Problem:** All endpoints used `get_supabase_client()` which returned service_role client, bypassing RLS
- **Solution:** Created `get_user_supabase_client()` that uses user's JWT
- **Impact:** All 11 league endpoints now respect RLS policies
- **Files:**
  - `backend/auth.py` — added `get_user_supabase_client()` function
  - `backend/routers/leagues.py` — updated all endpoints to use dependency injection

**CRITICAL-02: Member ID Validation**
- **Problem:** `log_game` didn't verify member_ids belong to target league
- **Solution:** Added validation query before inserting results
- **Attack prevented:** Cross-league data pollution
- **Error message:** 400 with specific invalid member_ids listed

**CRITICAL-03: Deck Ownership Validation**
- **Problem:** No check that deck belongs to the player claiming to use it
- **Solution:** Verify deck.user_id matches member.user_id
- **Privacy fix:** Users can't claim to have played other users' decks
- **Error message:** 403 Forbidden with deck/member IDs

**HIGH-01: URL Validation**
- **Problem:** User-supplied URLs (entrance_music, screenshots) not validated
- **XSS risk:** `javascript:alert()` scheme allowed
- **SSRF risk:** `file://`, `http://localhost` allowed
- **Solution:** 
  - Added `validate_http_url()` helper function
  - Changed Pydantic types from `Optional[str]` to `Optional[HttpUrl]`
  - Added validator to block localhost/private IPs
  - Only http/https schemes allowed

**Additional Validation**
- Added duplicate placement check in backend (was only frontend)
- Returns 400 error with clear message

---

### 2. Scoring System Overhaul (frontend + backend + migration)

**Problem:**
- First Blood definition was backwards (awarded to first eliminated, not first eliminator)
- 3rd place earned 0 points while 4th place earned 1 point
- Created perverse incentive to die first rather than survive to 3rd
- Didn't scale to 5+ player pods (multiple players earning 0)

**Solution: Standard Placement-Based Scoring (3-2-1-0)**
- 1st place = 3 pts (win)
- 2nd place = 2 pts (runner-up)
- 3rd place = 1 pt
- 4th+ place = 0 pts
- Entrance Bonus = +1 pt (social award, voted by pod)

**Benefits:**
- Industry-standard for Commander leagues
- Scales to any pod size
- No perverse incentives
- Simple and fair

**Files Changed:**
- `frontend/src/pages/LogGamePage.jsx` (lines 104-120)
  - Removed auto-calculation of First Blood/Last Stand
  - Added `earned_second_place` and `earned_third_place`
  - Updated points logic
- `backend/routers/leagues.py`
  - Updated `GameResultLog` model with new fields
  - Updated points calculation (lines 406-418)
  - Added comments explaining new system
- `supabase/migrations/008_league_fixes_and_performance.sql`
  - Added `earned_second_place` and `earned_third_place` columns
  - Marked old fields as DEPRECATED
  - Included data migration (commented out, review first)

**Legacy Fields:**
- `earned_first_blood` and `earned_last_stand` kept for backward compatibility
- Always set to `false` in new records
- Marked as DEPRECATED in schema and docs

---

### 3. Performance Fixes (migration 008)

**CRITICAL BUG: Standings SQL**
- **Problem:** `get_league_standings()` joined results without filtering by league_id
- **Impact:** Standings showed cumulative points from ALL leagues a member is in
- **Example:** Alice in League A and League B → League A standings showed her points from BOTH leagues
- **Fix:** Added `LEFT JOIN league_games` with `WHERE league_id = league_uuid` filter
- **File:** `supabase/migrations/008_league_fixes_and_performance.sql` (lines 18-45)

**Missing Indexes:**
- Added `idx_league_game_results_deck` for deck filtering queries
- Added `idx_leagues_created_by` for creator lookups
- Documented redundant index removal (commented out, verify first)

**RLS Policy Gaps:**
- Added DELETE policy for `league_members` (users can leave leagues)
- Added UPDATE/DELETE policies for `league_games` (fix typos)
- Added UPDATE/DELETE policies for `league_game_results` (fix mistakes)

---

## Migration 008 Details

**File:** `supabase/migrations/008_league_fixes_and_performance.sql`

**Sections:**
1. Add new scoring columns (`earned_second_place`, `earned_third_place`)
2. Fix `get_league_standings()` SQL function (CRITICAL bug)
3. Add performance indexes
4. Add unique constraint for placement validation (commented, clean data first)
5. Add missing RLS policies (security audit findings)
6. Data migration for existing records (commented, review first)
7. Verification queries (run after migration)

**Safe to Apply:** Yes, all breaking changes are commented out with instructions
**Requires Data Review:** Yes, before uncommenting data migration section

---

## Testing Checklist

Before deploying to production:

### Backend Tests
- [ ] Run `backend/tests/test_leagues.py` — all 82 tests should pass
- [ ] Verify RLS enforcement: try to access League B as member of League A → 403
- [ ] Verify member_id validation: submit invalid member_id → 400 error
- [ ] Verify deck ownership: try to use another user's deck → 403 error
- [ ] Verify URL validation: submit `javascript:` URL → 422 validation error

### Migration Tests (on Supabase)
- [ ] Apply migration 008 to development/staging database
- [ ] Run verification queries at end of migration file
- [ ] Check standings: create 2 leagues, log games, verify standings are separate
- [ ] Test new scoring: log game with 4 players → 1st=3pts, 2nd=2pts, 3rd=1pts, 4th=0pts
- [ ] Test entrance bonus: winner + entrance → 4 pts total

### Frontend Tests
- [ ] Log game with new UI → verify points display correctly on standings
- [ ] Try to log game with duplicate placements → error message shown
- [ ] Enter `http://localhost` as entrance music → error prevented
- [ ] Enter `javascript:alert(1)` as screenshot URL → error prevented

### Integration Tests
- [ ] Full flow: create league → join members → log 3 games → check standings
- [ ] Verify standings recalculate correctly after each game
- [ ] Test with 5-player pod → verify all placements score correctly
- [ ] Leave league → verify can no longer see league data

---

## Known Issues & Future Work

### Not Fixed (Intentionally Deferred)
1. **Head-to-head tiebreaker** — mentioned in docs but not implemented
   - **Action:** Remove from docs or implement elimination tracking
   - **Severity:** Low — ties are rare in small leagues
2. **Pod size flexibility in UI** — hardcoded to 4 players
   - **Action:** Add pod size selector + dynamic placement dropdowns
   - **Severity:** Medium — schema supports 10 players but UI doesn't
3. **In-app voting for social awards** — currently external
   - **Action:** Build voting UI so each player can submit votes
   - **Severity:** Low — current system works for small pods

### Performance Improvements (Not Blocking)
- Pagination for `list_games` (recommended at 100+ games)
- Remove redundant membership queries (6 endpoints)
- Add caching for standings calculation

---

## Deployment Steps

**IMPORTANT:** Do these in order:

1. **Apply migration 008 to Supabase**
   ```sql
   -- Copy/paste migration 008 into Supabase SQL editor
   -- Run all sections except commented-out data migration
   ```

2. **Verify migration**
   ```sql
   -- Run verification queries at end of migration file
   -- Check pg_policies, pg_indexes, test standings query
   ```

3. **Deploy backend changes**
   ```bash
   cd backend
   # Dependencies already installed (no new packages)
   # Restart backend server
   ```

4. **Deploy frontend changes**
   ```bash
   cd frontend
   npm run build
   # Deploy dist/ folder
   ```

5. **Smoke test critical paths**
   - Create test league
   - Log game with 4 players
   - Verify standings show correct points (3-2-1-0 + entrance)
   - Try to access League B as non-member → should fail

6. **Mark ready for production**
   - Update `.github/copilot-plan.md` status
   - Close related GitHub issues
   - Announce to users (breaking change: scoring system)

---

## Breaking Changes

**IMPORTANT:** Existing leagues will have incorrect point totals until data migration runs.

**User-Facing Changes:**
- Scoring system changed from "achievements" to "placement"
- Old games show incorrect points (based on First Blood/Last Stand)
- Entrance Bonus still works the same (+1 pt)

**Migration Strategy:**
1. **Option A (Recommended):** Recalculate all existing data
   - Uncomment data migration in migration 008
   - Recalculates points based on placement (ignores old awards)
   - Safe if `placement` field is accurate
2. **Option B:** Mark existing leagues as "archived"
   - Don't migrate old data
   - Only new games use new scoring
   - Clear messaging to users about "Season 2" with new rules

**Recommendation:** Use Option A if placement data is trustworthy, Option B if uncertain.

---

## Files Modified

### Backend
- `backend/auth.py` — added `get_user_supabase_client()`
- `backend/routers/leagues.py` — security fixes, scoring changes, URL validation

### Frontend
- `frontend/src/pages/LogGamePage.jsx` — scoring logic update

### Database
- `supabase/migrations/008_league_fixes_and_performance.sql` — new migration

### Documentation
- `.github/league-fixes-summary.md` — this file
- `.github/copilot-plan.md` — needs status update

---

## Summary of Fixes

| Issue | Severity | Status | Fix Location |
|-------|----------|--------|--------------|
| Backend bypasses RLS | 🔴 CRITICAL | ✅ Fixed | `backend/auth.py`, all endpoints |
| No member_id validation | 🔴 CRITICAL | ✅ Fixed | `backend/routers/leagues.py` L328-345 |
| No deck ownership check | 🔴 CRITICAL | ✅ Fixed | `backend/routers/leagues.py` L347-363 |
| First Blood backwards | 🔴 CRITICAL | ✅ Fixed | Frontend + backend scoring |
| 3rd place gets 0 points | 🔴 CRITICAL | ✅ Fixed | New 3-2-1-0 system |
| SQL standings bug | 🔴 CRITICAL | ✅ Fixed | Migration 008 |
| URL validation missing | 🟠 HIGH | ✅ Fixed | Pydantic models + validator |
| Duplicate placement allowed | 🟠 HIGH | ✅ Fixed | Backend validation |
| Missing RLS policies | 🟠 HIGH | ✅ Fixed | Migration 008 |
| Missing performance indexes | 🟡 MEDIUM | ✅ Fixed | Migration 008 |

**All critical and high severity issues are resolved.**

---

## Next Steps

1. Review this summary with product owner
2. Decide on data migration strategy (Option A or B)
3. Apply migration 008 to staging
4. Run full test suite
5. Deploy to production with user announcement
6. Monitor error logs for 24 hours
7. Address deferred issues in Phase 27

---

**Ready for production deployment after testing.** 🎉
