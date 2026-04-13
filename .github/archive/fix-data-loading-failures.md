# Plan: Fix Intermittent Data Loading Failures

## Problem
Users experience intermittent failures where decks and profile data don't load on login/refresh despite data existing in the database. The system shows "No decks in your library yet" and profile information is missing.

**Root causes identified:**
1. **Frontend:** Silent error handling - API failures show as empty data with no error messages or logging
2. **Edge Functions:** Multiple issues causing intermittent failures (race conditions, missing error checks, no timeouts)

## Implementation Strategy

Fix both frontend error handling (so failures become visible) AND edge function bugs (to prevent failures). This two-pronged approach ensures immediate debugging visibility while preventing root causes.

---

## Steps

**Phase 1: Frontend Error Visibility (Priority 1 - Critical)**

1. **Add comprehensive error logging to DashboardPage** (*file: [frontend/src/pages/DashboardPage.jsx](frontend/src/pages/DashboardPage.jsx#L458-L472)*)
   - Replace silent `.catch(() => setDecks([]))` with proper error logging and state management
   - Add `decksError` state to track API failures
   - Log full error details to console for debugging
   - Display error banner to user when deck loading fails
   - Same for collection summary loading

2. **Add error state UI to DashboardPage** (*file: [frontend/src/pages/DashboardPage.jsx](frontend/src/pages/DashboardPage.jsx#L505)*)
   - Create error banner component showing "Failed to load decks" with retry button
   - Differentiate between loading, empty, and error states
   - Add retry mechanism that calls `loadDecks()` again

3. **Improve profile error handling in AuthContext** (*file: [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx#L11-L21)*)
   - Add `profileError` state alongside `profile` state
   - Expose error to consuming components via context
   - Log detailed error information to console
   - Don't silently set profile to null - preserve error details

**Phase 2: Edge Function Reliability (Priority 1 - Critical)**

4. **Fix race condition in decks/library endpoint** (*file: [supabase/functions/decks/index.ts](supabase/functions/decks/index.ts#L264-L272)*)
   - Add explicit error checking after `Promise.all` for both `decksRes` and `analysesRes`
   - Return 500 with error details if either query fails
   - Add console logging for database query failures

5. **Fix users/profile endpoint error handling** (*file: [supabase/functions/users/index.ts](supabase/functions/users/index.ts#L22-L31)*)
   - Change `.single()` to `.maybeSingle()` to handle missing user_profiles gracefully
   - Add explicit error checking - return 500 if query fails
   - Ensure missing profile returns default null values (not an error)

6. **Fix auth validation error handling** (*file: [supabase/functions/_shared/auth.ts](supabase/functions/_shared/auth.ts#L15-L40)*)
   - Change `allowed_users` lookup from `.single()` to `.maybeSingle()`
   - Add error checking on database query
   - Return proper 500 if database query fails (vs 403 if user not allowed)

**Phase 3: Performance & Resilience (Priority 2 - High)**

7. **Add timeout protection to Moxfield API calls** (*file: [supabase/functions/_shared/moxfield.ts](supabase/functions/_shared/moxfield.ts#L20-L26)*)
   - Implement AbortController with 10-second timeout
   - Properly clean up timeout on success/failure
   - Return clear timeout error message

8. **Replace silent error catches with logging** (*file: [supabase/functions/decks/index.ts](supabase/functions/decks/index.ts#L285-L294), [L352-L365](supabase/functions/decks/index.ts#L352-L365)*)
   - Add `console.warn()` in all "best-effort" catch blocks
   - Log what operation failed and why
   - Helps diagnose database connection issues

**Phase 4: Enhanced User Experience (Priority 3 - Nice to have)** 

9. **Add loading state differentiation**
   - Show spinner during loading
   - Show "Empty state" when user genuinely has no decks
   - Show error state with retry when API fails
   - Different visual treatment for each state

10. **Add retry mechanism with exponential backoff**
    - Auto-retry failed requests (1-2 retries)
    - Exponential backoff (1s, 3s delays)
    - Show "Retrying..." message to user

---

## Relevant Files

### Frontend
- [frontend/src/pages/DashboardPage.jsx](frontend/src/pages/DashboardPage.jsx) — Add error states, logging, and retry logic to `loadDecks()` and collection summary loading
- [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx) — Add error state to `refreshProfile()` and expose via context
- [frontend/src/lib/api.js](frontend/src/lib/api.js) — Review `edgeFetch()` error handling (currently working correctly)

### Edge Functions  
- [supabase/functions/decks/index.ts](supabase/functions/decks/index.ts) — Fix Promise.all error checking, add logging to silent catches
- [supabase/functions/users/index.ts](supabase/functions/users/index.ts) — Fix .single() error handling
- [supabase/functions/_shared/auth.ts](supabase/functions/_shared/auth.ts) — Fix allowed_users lookup error handling
- [supabase/functions/_shared/moxfield.ts](supabase/functions/_shared/moxfield.ts) — Add timeout to fetch calls

---

## Verification

1. **Test error logging**: Temporarily break the edge function (return 500) and verify:
   - Error appears in browser console with full details
   - Error banner shows in UI
   - Retry button works

2. **Test profile failure**: Remove user from `user_profiles` table temporarily:
   - Should return default null values (not crash)
   - Should log error to console

3. **Test database errors**: Temporarily make query fail:
   - Should return 500 with error message
   - Frontend should show error banner

4. **Test cold start performance**: Deploy edge functions and test first request:
   - Monitor response time 
   - Verify no timeout issues

5. **Test Moxfield timeout**: Mock slow Moxfield API response:
   - Should timeout after 10 seconds
   - Should return clear error message

---

## Decisions

- **Log errors both frontend and backend** - Frontend logs help debugging browser issues, backend logs help diagnose edge function issues
- **Show user-facing errors** - Silent failures are unacceptable; users need to know when something failed
- **Graceful degradation** - Best-effort features (like commander images from cache) should fail silently with logging, but critical features (deck library loading) should show errors
- **No breaking changes** - All fixes preserve existing API contracts and database schema

---

## Further Considerations

1. **Add request tracing IDs?** — For production debugging, consider adding unique request IDs that flow from frontend → edge function → database, making it easier to correlate logs
2. **Add Sentry or error tracking service?** — Automatically capture and aggregate errors in production for better visibility
3. **Add health check endpoint?** — Create `/health` endpoint that tests database connectivity, useful for monitoring
