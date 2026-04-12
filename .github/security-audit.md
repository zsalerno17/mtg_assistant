# Security Audit — League Tracking Feature

**Date:** April 12, 2026  
**Auditor:** Security Mode Agent  
**Scope:** League tracking feature (leagues.py, 007_league_tracking.sql, LeaguePage.jsx, LeaguesPage.jsx, LogGamePage.jsx)

---

## Executive Summary

**Overall Risk Level: CRITICAL ⚠️**

The league tracking feature has **7 Critical/High severity findings** that require immediate remediation before production deployment. Most critical issues:

1. **Backend bypasses Row Level Security** — all operations use service_role key instead of user's JWT
2. **No member_id verification** in game logging — attacker can submit results for any league member
3. **No URL validation** — XSS/SSRF risk from user-supplied URLs
4. **Missing RLS policies** — incomplete database-level authorization

**Threat Model:** Multi-tenant web app with user-submitted content. Primary risks: privilege escalation, cross-tenant data access, XSS, database manipulation.

---

## CRITICAL Findings

### 🔴 CRITICAL-01: Backend Bypasses Row Level Security

**File:** [backend/auth.py](backend/auth.py#L67-L70), [backend/routers/leagues.py](backend/routers/leagues.py#L9)

**Issue:**  
All league endpoints use `get_supabase_client()`, which returns a service_role client that **completely bypasses RLS policies**. This defeats the entire purpose of having RLS policies in the migration.

**Attack Scenario:**
1. User A is member of League 1
2. User A calls `GET /api/leagues/{league_2_id}` where User A is NOT a member
3. Backend verifies membership with service_role client (passes RLS check)
4. But data query also uses service_role, so RLS is bypassed
5. User A sees League 2 data despite failing membership check

**Root Cause:**  
The `get_supabase_client()` function in auth.py uses `SUPABASE_SERVICE_ROLE_KEY` instead of the user's JWT token.

**Fix:**

```python
# backend/auth.py — ADD this new function
def get_user_supabase_client(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    """Get a Supabase client authenticated with the user's JWT (respects RLS)."""
    token = credentials.credentials
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_ANON_KEY"]
    client = create_client(url, key)
    # Set the user's JWT as the auth token
    client.postgrest.auth(token)
    return client
```

```python
# backend/routers/leagues.py — UPDATE all endpoints
from auth import require_user_id, get_user_supabase_client

@router.post("")
async def create_league(
    league: LeagueCreate,
    user_id: str = Depends(require_user_id),
    supabase = Depends(get_user_supabase_client)  # ← Changed
):
    # ... rest of endpoint
```

**Verification:**
1. Add a test user to League A
2. Try to access League B's data via API
3. Should receive 403 Forbidden (currently would succeed)
4. Check Supabase logs — queries should execute with user's JWT, not service_role

**Residual Risk:** Medium — RLS policies must be correctly written (see CRITICAL-02)

---

### 🔴 CRITICAL-02: member_id Not Verified in Game Logging

**File:** [backend/routers/leagues.py](backend/routers/leagues.py#L320-L380)

**Issue:**  
The `log_game` endpoint accepts `member_id` values in `game_data.results` but never verifies these members belong to the target league.

**Attack Scenario:**
1. User A creates malicious payload with `member_id` from League B
2. User A submits game to League A with League B's member_id in results
3. Database accepts insert because foreign key constraint is satisfied
4. League A's standings now include a player from League B

**Vulnerable Code:**
```python
# backend/routers/leagues.py L355-365
results_to_insert.append({
    "game_id": game_id,
    "member_id": str(result.member_id),  # ← Never validated!
    "deck_id": str(result.deck_id) if result.deck_id else None,
    # ...
})
```

**Fix:**

```python
# backend/routers/leagues.py — Add validation before creating results
# After line 337 (inside log_game endpoint)

# Validate all member_ids belong to this league
submitted_member_ids = {str(r.member_id) for r in game_data.results}
valid_members = supabase.table("league_members") \
    .select("id") \
    .eq("league_id", league_id) \
    .in_("id", list(submitted_member_ids)) \
    .execute()

valid_member_ids = {m["id"] for m in valid_members.data}
invalid_members = submitted_member_ids - valid_member_ids

if invalid_members:
    raise HTTPException(
        status_code=400,
        detail=f"Invalid member_ids: {invalid_members}. All players must be league members."
    )
```

**Verification:**
1. Create League A with Member 1
2. Create League B with Member 2
3. Try to log game in League A with Member 2's ID
4. Should return 400 Bad Request with helpful error message

**Residual Risk:** Low — foreign key constraints provide defense-in-depth

---

### 🔴 CRITICAL-03: deck_id Not Verified to Belong to User

**File:** [backend/routers/leagues.py](backend/routers/leagues.py#L320-L380)

**Issue:**  
The `log_game` endpoint accepts `deck_id` in results but doesn't verify the deck belongs to the user who owns that member profile. User A could log a game claiming to have played User B's deck.

**Attack Scenario:**
1. User A discovers User B's deck UUID (via API enumeration or leaked URL)
2. User A logs game with `deck_id` pointing to User B's deck
3. League shows User A played User B's deck (privacy violation + data integrity issue)

**Fix:**

```python
# backend/routers/leagues.py — Add deck ownership validation
# After member_id validation (in log_game endpoint)

# Validate deck ownership
deck_ids_to_check = {str(r.deck_id) for r in game_data.results if r.deck_id}
if deck_ids_to_check:
    for result in game_data.results:
        if not result.deck_id:
            continue
        
        # Get the member's user_id
        member = supabase.table("league_members") \
            .select("user_id") \
            .eq("id", str(result.member_id)) \
            .single() \
            .execute()
        
        # Verify deck belongs to that user
        deck = supabase.table("user_decks") \
            .select("user_id") \
            .eq("id", str(result.deck_id)) \
            .single() \
            .execute()
        
        if deck.data["user_id"] != member.data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail=f"Deck {result.deck_id} does not belong to member {result.member_id}"
            )
```

**Verification:**
1. User A creates Deck 1
2. User B tries to log game claiming they played Deck 1
3. Should return 403 Forbidden

**Residual Risk:** Low after fix

---

## HIGH Findings

### 🟠 HIGH-01: No URL Validation (XSS/SSRF Risk)

**Files:** 
- [backend/routers/leagues.py](backend/routers/leagues.py#L41-L44) (MemberJoin)
- [backend/routers/leagues.py](backend/routers/leagues.py#L48-L52) (MemberUpdate)
- [backend/routers/leagues.py](backend/routers/leagues.py#L58-L65) (GameLog)
- [frontend/src/pages/LogGamePage.jsx](frontend/src/pages/LogGamePage.jsx#L25)
- [frontend/src/pages/LeaguePage.jsx](frontend/src/pages/LeaguePage.jsx#L290)

**Issue:**  
User-supplied URLs (`entrance_music_url`, `screenshot_url`) are stored and rendered without validation. Could allow:
- **XSS:** `javascript:alert(document.cookie)` scheme
- **SSRF:** `file:///etc/passwd` or internal network URLs
- **Phishing:** Misleading external links

**Vulnerable Code:**
```python
# Pydantic accepts ANY string
entrance_music_url: Optional[str] = None  # ← No URL validation!
screenshot_url: Optional[str] = None      # ← No URL validation!
```

```jsx
// Frontend renders URLs without sanitization
<a href={member.entrance_music_url} target="_blank" rel="noopener noreferrer">
  🎵 Entrance Music
</a>
```

**Fix:**

```python
# backend/routers/leagues.py — Add URL validator
from pydantic import HttpUrl, validator
from urllib.parse import urlparse

class MemberJoin(BaseModel):
    superstar_name: str = Field(..., min_length=1, max_length=100)
    entrance_music_url: Optional[HttpUrl] = None  # ← Changed to HttpUrl
    catchphrase: Optional[str] = None
    
    @validator('entrance_music_url')
    def validate_url_scheme(cls, v):
        if v is None:
            return v
        parsed = urlparse(str(v))
        if parsed.scheme not in ['http', 'https']:
            raise ValueError('URL must use http or https scheme')
        # Optional: block internal IPs
        if parsed.hostname in ['localhost', '127.0.0.1', '0.0.0.0']:
            raise ValueError('URL cannot point to localhost')
        return v

# Apply same validator to MemberUpdate and GameLog
```

**Alternative:** Use a URL sanitization service or Content Security Policy headers.

**Verification:**
1. Try to submit `javascript:alert(1)` as entrance_music_url
2. Should return 422 Validation Error
3. Try `http://localhost/admin` — should be rejected
4. Valid HTTPS URLs should work normally

**Residual Risk:** Medium — relies on correct implementation of CSP headers in frontend

---

### 🟠 HIGH-02: RLS Policy Gaps

**File:** [supabase/migrations/007_league_tracking.sql](supabase/migrations/007_league_tracking.sql)

**Issue:**  
Incomplete RLS policies leave authorization gaps:

1. **league_members:** No DELETE policy (users can't leave leagues)
2. **league_games:** No UPDATE or DELETE policies (can't fix mistakes in game logs)
3. **league_game_results:** No UPDATE or DELETE policies
4. **leagues:** Missing policy to prevent creating leagues for other users

**Impact:**  
- Users stuck in leagues they joined by mistake
- Typos in game logs are permanent
- Potential for privilege escalation if policies are added later without careful review

**Fix:**

```sql
-- supabase/migrations/007_league_tracking.sql — ADD these policies

-- Allow users to leave leagues (delete their own membership)
CREATE POLICY "Users can leave leagues"
  ON league_members FOR DELETE
  USING (user_id = auth.uid());

-- League members can update/delete games (only in leagues they're in)
CREATE POLICY "League members can update games"
  ON league_games FOR UPDATE
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "League members can delete games"
  ON league_games FOR DELETE
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- League members can update/delete game results
CREATE POLICY "League members can update results"
  ON league_game_results FOR UPDATE
  USING (
    game_id IN (
      SELECT id FROM league_games WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "League members can delete results"
  ON league_game_results FOR DELETE
  USING (
    game_id IN (
      SELECT id FROM league_games WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

-- Strengthen league INSERT policy
DROP POLICY "Anyone can create leagues" ON leagues;
CREATE POLICY "Authenticated users can create leagues"
  ON leagues FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );
```

**Verification:**
1. Join a league, then call DELETE on your member record — should succeed
2. Log a game, then try to update it — should succeed
3. Try to update someone else's game — should fail
4. Test in Supabase SQL Editor with `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO '<user_id>';`

**Residual Risk:** Low after fix

---

### 🟠 HIGH-03: No Input Sanitization for Markdown/Text Fields

**Files:** 
- [backend/routers/leagues.py](backend/routers/leagues.py) (description, notes, catchphrase, spicy_play_description)
- [frontend/src/pages/LeaguesPage.jsx](frontend/src/pages/LeaguesPage.jsx#L107)
- [frontend/src/pages/LeaguePage.jsx](frontend/src/pages/LeaguePage.jsx#L251)

**Issue:**  
Text fields that accept markdown or freeform text are stored without sanitization. If rendered as HTML, could enable stored XSS.

**Current State:**
- Frontend renders text fields as plain text (safe for now)
- No markdown parsing currently implemented
- Risk increases if markdown rendering is added later

**Fix:**

```python
# backend/routers/leagues.py — Add length limits and sanitization
from html import escape

class LeagueCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=10000)  # ← Add limit
    season_start: date
    season_end: date
    status: str = Field(default="active", pattern="^(draft|active|completed)$")
    
    @validator('description', 'always')
    def sanitize_description(cls, v):
        if v is None:
            return v
        # Escape HTML entities
        return escape(v)

# Apply same pattern to notes, catchphrase, spicy_play_description
```

**Alternative:** Use DOMPurify on frontend if markdown rendering is needed.

**Verification:**
1. Submit description with `<script>alert('xss')</script>`
2. Check database — should see HTML-escaped version
3. Render on frontend — should display literal text, not execute script

**Residual Risk:** Low — plain text rendering provides defense-in-depth

---

## MEDIUM Findings

### 🟡 MEDIUM-01: Date Range Validation Missing

**File:** [backend/routers/leagues.py](backend/routers/leagues.py#L22-L25)

**Issue:**  
No validation that `season_end` is after `season_start`. Could lead to confusing UX or broken logic.

**Fix:**

```python
class LeagueCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    season_start: date
    season_end: date
    status: str = Field(default="active", pattern="^(draft|active|completed)$")
    
    @validator('season_end')
    def validate_date_range(cls, v, values):
        if 'season_start' in values and v <= values['season_start']:
            raise ValueError('season_end must be after season_start')
        return v
```

**Verification:**
1. Try to create league with end date before start date
2. Should return 422 Validation Error

**Residual Risk:** Low

---

### 🟡 MEDIUM-02: No Rate Limiting Awareness

**File:** [backend/routers/leagues.py](backend/routers/leagues.py#L320) (log_game endpoint)

**Issue:**  
Game logging endpoint has no rate limiting. Attacker could spam database with thousands of game records.

**Recommendation:**
- Implement rate limiting middleware (e.g., slowapi, fastapi-limiter)
- Limit to 10 games per league per hour
- Consider implementing soft delete instead of allowing unlimited game creation/deletion

**Example Fix:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/{league_id}/games")
@limiter.limit("10/hour")  # Max 10 games per hour per IP
async def log_game(...):
    # ...
```

**Residual Risk:** Medium until implemented

---

### 🟡 MEDIUM-03: Missing Database-Level Constraints

**File:** [supabase/migrations/007_league_tracking.sql](supabase/migrations/007_league_tracking.sql)

**Issue:**  
Some constraints are validated in Pydantic but not enforced at database level:
- `name` max length (200 chars) — no DB constraint
- `superstar_name` max length (100 chars) — no DB constraint
- `status` enum values — check constraint exists ✓

**Fix:**

```sql
-- Add column constraints
ALTER TABLE leagues 
  ADD CONSTRAINT leagues_name_length CHECK (char_length(name) <= 200);

ALTER TABLE league_members
  ADD CONSTRAINT league_members_superstar_name_length CHECK (char_length(superstar_name) <= 100);

-- Add NOT NULL where appropriate
ALTER TABLE league_members
  ALTER COLUMN superstar_name SET NOT NULL;
```

**Verification:**
1. Try to insert 201-character league name directly via SQL
2. Should be rejected by database constraint

**Residual Risk:** Low — Pydantic provides first line of defense

---

## LOW Findings

### 🟢 LOW-01: Frontend Exposes Deck Library to Other Users

**File:** [frontend/src/pages/LogGamePage.jsx](frontend/src/pages/LogGamePage.jsx#L46)

**Issue:**  
`loadData()` fetches `api.getDeckLibrary()` which returns the **current user's** decks. This is shown in a dropdown for all league members. UI suggests User A could select User B's decks, but backend would reject it (after CRITICAL-03 is fixed).

**Current State:** Confusing UX but not a security issue if backend validation is added.

**Fix:**
```jsx
// LogGamePage.jsx — Only show decks for current user's member profile
// Get current user's member_id first
const currentUserMember = members.find(m => m.user_id === currentUserId);

// Only show deck dropdown for current user's row
{member.id === currentUserMember?.id && (
  <select value={results[member.id]?.deck_id || ''} ...>
    {myDecks.map(deck => <option key={deck.id} value={deck.id}>{deck.deck_name}</option>)}
  </select>
)}
```

**Residual Risk:** Low — requires backend fix from CRITICAL-03

---

### 🟢 LOW-02: Timezone Ambiguity in played_at

**File:** [frontend/src/pages/LogGamePage.jsx](frontend/src/pages/LogGamePage.jsx#L23), [backend/routers/leagues.py](backend/routers/leagues.py#L342)

**Issue:**  
`played_at` is set from `<input type="datetime-local">` which has no timezone info. Backend converts to ISO string assuming local time, but database stores as UTC.

**Impact:** Game timestamps could be hours off for users in different timezones.

**Fix:**
```jsx
// LogGamePage.jsx — Store in UTC explicitly
const playedAtUTC = new Date(playedAt).toISOString();

// Or show timezone selector
```

**Residual Risk:** Low — functional issue, not security

---

## Positive Findings ✅

1. **JWT Authentication** — properly implemented with Supabase
2. **PKCE flow** — frontend uses secure auth flow
3. **Service role limited** — only used in backend (not exposed to frontend)
4. **Foreign key constraints** — database enforces relational integrity
5. **Parameterized queries** — Supabase client prevents SQL injection
6. **CORS awareness** — FastAPI backend isolated from frontend
7. **HTTPS URLs only** — frontend uses secure protocols (after URL validation fix)

---

## Remediation Priority

**Before Production:**
1. ✅ **CRITICAL-01:** Switch to user-scoped Supabase client
2. ✅ **CRITICAL-02:** Validate member_ids in game logging
3. ✅ **CRITICAL-03:** Validate deck ownership
4. ✅ **HIGH-01:** Add URL validation
5. ✅ **HIGH-02:** Complete RLS policies

**Next Sprint:**
6. ✅ **HIGH-03:** Sanitize text fields
7. ✅ **MEDIUM-01:** Date range validation
8. ✅ **MEDIUM-02:** Rate limiting

**Nice to Have:**
9. MEDIUM-03: Database constraints
10. LOW-01: Deck selection UX
11. LOW-02: Timezone handling

---

## Testing Recommendations

1. **Manual Penetration Testing:**
   - Try to access other users' leagues
   - Submit malformed member_ids/deck_ids
   - Test XSS payloads in all text fields
   - Enumerate league/member UUIDs

2. **Automated Security Scanning:**
   - Run OWASP ZAP against API endpoints
   - Use SQLMap to verify no SQL injection
   - Test with Burp Suite for parameter tampering

3. **RLS Policy Testing:**
   - Write test suite that uses `SET LOCAL ROLE authenticated`
   - Verify all SELECT/INSERT/UPDATE/DELETE operations respect RLS
   - Test cross-tenant access attempts

---

## Sign-off

**Audit Status:** ⚠️ **FAILED — Critical issues must be resolved**

**Re-audit Required:** After implementing CRITICAL and HIGH fixes  
**Estimated Remediation Time:** 4-6 hours  
**Risk of Not Fixing:** High — database could be compromised, user data leaked

**Next Steps:**
1. Implement fixes for CRITICAL-01 through CRITICAL-03
2. Run verification tests for each fix
3. Request re-audit before production deployment
4. Update `.github/copilot-plan.md` with security remediation status
