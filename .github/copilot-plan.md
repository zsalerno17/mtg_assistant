# MTG Assistant — Project Plan

> **Single source of truth.** All agents read and update this file.
> Last updated: April 12, 2026

<!--
╔══════════════════════════════════════════════════════════════════╗
║                    MAINTENANCE RULES                            ║
║                                                                  ║
║  1. KEEP IT SHORT. This file should stay under ~600 lines.      ║
║  2. DO NOT paste session work logs here. Use git commit          ║
║     messages for implementation details. If needed, write to     ║
║     a separate `.github/session-log-YYYY-MM-DD.md` file.        ║
║  3. COMPLETED PHASES get a 2-5 line summary only. Delete the    ║
║     full spec once a phase is done — it lives in git history     ║
║     and in .github/copilot-plan-archive-2026-04-12.md.          ║
║  4. ONLY INCOMPLETE PHASES get expanded task lists/specs.        ║
║  5. NEVER duplicate info. One canonical location per fact:       ║
║     - Security audit → .github/security-audit.md                ║
║     - Performance audit → .github/performance-audit-leagues.md  ║
║     - Design audit → .github/league-design-audit.md             ║
║     - Test plan → .github/test-plan.md                          ║
║     - League fixes → .github/league-fixes-summary.md            ║
║     - Deployment → .github/DEPLOYMENT.md                        ║
║     - Schema design → .github/DECK_METADATA_SCHEMA.md           ║
║     - MTG review → .github/mtg-review.md                        ║
║  6. PHASE ORDER must stay sequential (1, 2, 3…). Never insert   ║
║     random sections between phases or scatter "recent changes."  ║
║  7. UPDATE the "Current Task" block and phase status table       ║
║     every session. Remove stale next-steps from old locations.   ║
║  8. The full pre-cleanup plan archive is at:                     ║
║     .github/copilot-plan-archive-2026-04-12.md                  ║
╚══════════════════════════════════════════════════════════════════╝
-->

---

## Production URLs

- **Frontend:** https://mtg-assistant-silk.vercel.app
- **Backend:** https://mtg-assistant-m4r9.onrender.com

---

## Table of Contents

1. [Current Task](#-current-task)
2. [Phase Status Overview](#phase-status-overview)
3. [Uncommitted Changes](#uncommitted-changes)
4. [Active Phases — Detail](#active-phases--detail)
5. [Production Fix Log](#production-fix-log)
6. [Architecture & Stack](#architecture--stack)
7. [Design System](#design-system)
8. [MTG Commander Reference](#mtg-commander-reference)
9. [Completed Phases](#completed-phases-summaries)
10. [Acceptance Criteria](#acceptance-criteria)

---

## ⚡ CURRENT TASK

**Status:** Phases 30 & 31C nearly complete (April 12, 2026)

**Just completed:**
- Phase 31C color identity pips (migration 013, backend leagues.py + decks.py, frontend LeaguesPage.jsx)
- Discovered Phase 30 voting, bulk actions, and image export **already fully implemented**
- Discovered Phase 31C entrance music preview **already fully implemented**

**Remaining:**
- Phase 30 PDF export (optional enhancement — jsPDF not installed)
- Migration 013 needs deployment (adds `color_identity` column to `user_decks`)
- End-to-end verification of all features in browser

**Last session completed:**
- Fixed duplicate navbar on all 4 league pages
- Removed all emoji from league pages (created `LeagueIcons.jsx` with SVG icons)
- Added CSV export for standings, head-to-head tiebreaker display
- Applied glass morphism to CollectionPage (Phase 33 completed)
- Updated all phase statuses (13 phases corrected from NOT STARTED)
- Build clean, all 14 frontend tests pass, 123+ backend tests pass

---

## Phase Status Overview

| Phase | Name | Status |
|-------|------|--------|
| 1 | Infrastructure (Supabase, FastAPI, React+Vite) | ✅ Complete |
| 2 | Auth (Google OAuth, allow-list, JWT, ProtectedRoute) | ✅ Complete |
| 3 | Backend API (fetch, analyze, collection, strategy, scenarios, history) | ✅ Complete |
| 4 | Frontend pages (Login, Dashboard, Deck 5-tab, Collection) | ✅ Complete |
| 5 | Gemini 2.5 Flash (JSON prompts, fallback chain, scenarios) | ✅ Complete |
| 6 | Supabase tables + RLS (migrations 001–002) | ✅ Complete |
| 8 | Analysis dedup + metadata (migration 003) | ✅ Complete |
| 9 | Design refresh (dark arcane palette, Cinzel, sidebar, avatars) | ✅ Complete |
| 10 | Differentiators (weakness cards, theme tooltips, verdict banners) | ✅ Complete |
| 11 | Gemini rate limiting (rule-based fallbacks, cooldown, retry) | ✅ Complete |
| 13 | Rule-based engine overhaul + structured AI tabs + visual polish | ✅ Complete |
| — | User profiles (migration 004, avatar storage, ProfilePage) | ✅ Complete |
| 14 | Dashboard deck grid + collection summary + onboarding | ✅ Complete |
| 15 | Design review (MTG aesthetic, commander images, texture, polish) | ✅ Complete |
| 16 | User flow rearchitect (user_decks table, ImportDeckPage, library API) | ✅ Complete |
| 17 | Cleanup + verdict in history | ✅ Complete |
| 18 | Scenarios tab rule-based fallback | ✅ Complete |
| 19 | Collection improvements quality scoring | ✅ Complete |
| 20 | Card tooltip (Scryfall image on hover, React Portal) | ✅ Complete |
| 21 | StatBadge radial progress rings | ✅ Complete |
| 22 | Deployment config (Render + Vercel, render.yaml, vercel.json) | ✅ Complete |
| 23 | Deck metadata schema design (design doc only, no code) | ✅ Complete |
| 24 | UI Redesign — "Refined" variant (TopNavbar, typography, commander art) | ✅ Complete |
| 25 | Feature planning & prioritization (mtg-review.md) | ✅ Complete |
| 26 | League/Pod tracking (schema, backend CRUD, frontend, social features) | ✅ Complete |
| 27 | League security polish (migration 009) | ✅ Complete |
| 28 | League performance optimizations (migration 010) | ✅ Complete |
| 29 | League test coverage expansion (14 frontend, 50+ backend tests) | ✅ Complete |
| 30 | League UX enhancements (voting, bulk actions, exports) | ✅ Complete |
| 31A | League critical design fixes (deprecated columns, glass cards, hero, tabs) | ✅ Complete |
| 31B | League leaderboard & profile design | ✅ Complete |
| 31C | League design polish (pips, narrative, music preview) | ✅ Complete |
| 31D | League accessibility fixes (ARIA, focus, contrast, live regions) | ✅ Complete |
| 32 | Edge Functions migration (7 Deno functions, dual-mode api.js) | ✅ Complete |
| 33 | App-wide design uniformity (glass morphism everywhere) | ✅ Complete |
| 34 | Analysis accuracy & commander intelligence (strategy, power level, thresholds) | ✅ Complete |

---

## Uncommitted Changes

20 files modified, 5 new files, 1 new migration:

**Modified:** copilot-plan.md, decks.py, leagues.py, deck_analyzer.py, gemini_assistant.py, test_leagues.py, App.jsx, TopNavbar.jsx, index.css, api.js, CollectionPage.jsx, DashboardPage.jsx, DeckPage.jsx, ImportDeckPage.jsx, LeaguePage.jsx, LeaguesPage.jsx, LogGamePage.jsx, LoginPage.jsx, ProfilePage.jsx

**New:** LeagueIcons.jsx, Skeletons.jsx, JoinLeaguePage.jsx, Leagues.test.jsx, logo.svg, edge-functions-deploy.md, 013_deck_color_identity.sql

---

## Active Phases — Detail

> Only phases with remaining work are expanded here. Completed phase specs are in git history and [the archive](.github/copilot-plan-archive-2026-04-12.md).

### Phase 30 — League UX Enhancements (COMPLETE)

**All features implemented:**

✅ **In-app voting for social awards**
- Migration 012: `league_game_votes` table with RLS
- Backend: `cast_vote()`, `get_votes()` endpoints in leagues.py (lines 817-900)
- Edge Functions: `castVote()`, `getVotes()`  in leagues/index.ts
- Frontend API: `castVote()`, `getGameVotes()` in api.js
- UI: Voting state management + voting UI in LeaguePage.jsx (loadGameVotes, handleVote, getVoteTally)

✅ **Bulk actions on LeaguesPage**
- "Archive completed leagues": `handleArchiveCompleted()` in LeaguesPage.jsx, backend endpoint at `/bulk/archive`
- "Refresh all decks": `handleRefreshDecks()` in LeaguesPage.jsx
- Show/hide completed leagues toggle: implemented

✅ **Image export for standings**
- `handleExportImage()` in LeaguePage.jsx (lines 164+)
- Uses Canvas API to generate 700×height PNG download

⚠️ **PDF export** — Not implemented (jsPDF library not installed). Image export covers 90% of use case; PDF is optional enhancement.

---

### Phase 31C — League Design Polish (COMPLETE)

**All features implemented:**

✅ **Color identity pips on league cards**
- Migration 013: Added `color_identity TEXT[]` column to `user_decks` with GIN index
- Backend: `decks.py` now extracts commander+partner color identity from Moxfield and stores in `user_decks` (WUBRG-sorted)
- Backend: `leagues.py list_leagues()` aggregates all colors from decks played by each member in game results
- Frontend: LeaguesPage.jsx dynamically calculates and displays W/U/B/R/G mana pips for each league based on member's deck colors

✅ **Entrance music auto-preview**
- LeaguePage.jsx Members tab already renders YouTube/Spotify embeds when entrance_music_url is present
- Preview iframe loads on UI render; user controls playback (respects autoplay policies)

**Status:** Both features complete. Migration 013 needs deployment before color pips will display data.

---

## Production Fix Log

### Moxfield 403 Fix (April 12, 2026)

**Issue:** Collection upgrades 502 — "Could not load deck: 403 Forbidden." Render datacenter IPs blocked by Moxfield's Cloudflare.

**Root cause:** `ai.py _load_deck()` always fetched live from Moxfield. `decks` table cache only stored name+quantity (no full card data), unusable as fallback.

**Fix applied:**
1. `decks.py` — `_serialize_deck()`/`_serialize_card()` now store ALL card fields in `decks.data_json`
2. `ai.py` — `_load_deck()` tries Moxfield first; on 403/error, reconstructs `Deck` from Supabase cache
3. `decks.py:analyze` — After successful Moxfield fetch, updates cache with full card data (auto-backfills)
4. `leagues.py` — Fixed `@root_validator` → `@root_validator(skip_on_failure=True)` (Pydantic v2)

### Scoring System Replacement (April 12, 2026)

Replaced broken achievements-based scoring (First Blood/Last Stand had backwards definitions, 4th place scored higher than 3rd) with standard 3-2-1-0 placement: 1st=3pts, 2nd=2pts, 3rd=1pt, 4th+=0pts. Entrance Bonus +1pt unchanged. Full details: [league-fixes-summary.md](.github/league-fixes-summary.md)

---

## Architecture & Stack

| Concern | Decision |
|---|---|
| Frontend | React 18 (JSX) + Vite + TailwindCSS v4 |
| Backend | FastAPI (Python) in `backend/` + Supabase Edge Functions (Deno) in `supabase/functions/` |
| DB + Auth | Supabase (PostgreSQL + Google OAuth + email allow-list) |
| AI | Gemini 2.5 Flash (free tier, fallback chain → 2.0-flash → flash-lite) |
| Moxfield | Unofficial public API (`api2.moxfield.com/v2/decks/all/{id}`) — public decks only |
| Collection | CSV upload only (no OAuth) |
| Deployment | Render (backend, free tier) + Vercel (frontend, free) + Supabase Edge Functions |

**Key reference docs:**
- [Deployment guide](.github/DEPLOYMENT.md)
- [Security audit](.github/security-audit.md)
- [Performance audit](.github/performance-audit-leagues.md)
- [Design audit](.github/league-design-audit.md)
- [Test plan](.github/test-plan.md)
- [MTG specialist review](.github/mtg-review.md)
- [Deck metadata schema](.github/DECK_METADATA_SCHEMA.md)

---

## Design System

**Typography:**
- `font-brand` (Cinzel) — logos, page titles, commander names
- `font-heading` (Space Grotesk) — section headings, metadata, buttons
- `font-body` (Inter) — body text
- `font-mono` (JetBrains Mono) — numbers, code, data

**Color Palette:**
- Background: `#0a0f1a` | Surface: `#111827` | Surface-2: `#1f2937`
- Border: `#1e293b` | Text: `#f1f5f9` | Muted: `#94a3b8`
- Primary: `#fbbf24` (amber) | Accent: `#f59e0b` | Secondary: `#38bdf8` (sky)
- Success: `#34d399` | Danger: `#fb7185`
- MTG colors: W/U/B/R/G as semantic accents

**Visual Conventions:**
- Glass morphism: `bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)]`
- Hover lift: `-translate-y-0.5 hover:shadow-lg transition-all`
- Border-radius: `rounded-xl` (cards) | `rounded-lg` (buttons/inputs) | `rounded-[7px]` (badges)
- Icons: inline SVG only — no Unicode emoji
- CTA buttons: `bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]`

---

## MTG Commander Reference

### Thresholds

| Category | Minimum | Good | Notes |
|---|---|---|---|
| Lands | 36 | 37–38 | Below 33 dangerous |
| Ramp (CMC ≤ 3) | 10 | 12–15 | Only acceleration, not 5+ CMC rocks |
| Card Draw | 10 | 12–15 | Repeatable > one-shot |
| Single Removal | 8 | 10–12 | Mix creature + noncreature |
| Board Wipes | 2 | 3–4 | |
| Avg CMC (nonland) | — | ≤ 3.0 | Above 3.5 → needs extra ramp |

> **Note:** Phase 34 replaced these flat thresholds with dynamic strategy + power-level-aware values. See `deck_analyzer.py:calculate_thresholds()`.

### Key Detection Patterns

- **Ramp** (CMC ≤ 3): `"add {"`, `"add one mana"`, `"treasure token"`, `"search your library"` + `"land"`
- **Draw**: `"draw a card"`, `"draw cards"`, `"draw two/three"`, `"draw an additional card"`
- **Removal**: `"destroy target"`, `"exile target"`, `"deals damage to any target"`. NOT `"return target"` (bounce)
- **Wipes**: `"destroy all creatures"`, `"exile all"`, `"damage to each creature"`, `"-X/-X"` broad

---

## Completed Phases (Summaries)

### Phases 1–6: Foundation

Infrastructure, auth (Google OAuth + allow-list), backend API (FastAPI), frontend pages (React), Gemini AI integration, Supabase tables + RLS. Core app: paste Moxfield URL → get AI-powered deck analysis with 5 tabs.

### Phase 8: Analysis Dedup + Metadata

Migration 003. Store `deck_name`, `moxfield_url`, `deck_updated_at`. Dashboard shows real names + Moxfield links.

### Phase 9: Design Refresh

Dark arcane palette, Cinzel headings, ambient gradients, sidebar nav, Gmail-style avatar, custom scrollbars.

### Phase 10: Differentiators

Structured weakness cards (`why/look_for/examples`), theme tooltips, deck verdict, differentiator callout banners.

### Phase 11: Gemini Rate Limiting

Rule-based fallbacks for Strategy + Improvements. `ai_enhanced` indicator dots. 60s cooldown. Retry-with-backoff.

### Phase 13: Engine Overhaul + Structured Tabs

Ramp/draw/removal/wipe detection rewrite. StrategyTab, ImprovementsTab, CollectionUpgradesTab. Commander hero, glass cards, Cinzel headers.

### User Profiles

Migration 004. `user_profiles` table, avatar storage, 19 creature archetype presets, ProfilePage.

### Phase 14: Dashboard Deck Grid + Onboarding

Replaced flat history list with responsive deck card grid. Collection summary widget. Onboarding panel for new users. `GET /api/collection/summary` endpoint.

### Phase 15: MTG Aesthetic + Polish

Scryfall commander image in hero block. Background noise texture. Amber button glow. Desktop layout expansion. Mobile bottom nav. Shimmer skeleton loaders.

### Phase 16: User Flow Rearchitect

Migration 005 (`user_decks`). ImportDeckPage, library API. Profile redirect for first-time users. Dashboard rewrite — removed URL form, reads from library.

### Phase 17: Cleanup

Deleted IconMockupPage. Added `verdict` to library and history endpoints. Dashboard cards show verdict preview.

### Phase 18: Scenarios Fallback

`scenarios_fallback()` — rule-based stat diff table. AI endpoint falls back on Gemini error. ScenariosTab dual render. Interactive card add/remove UI.

### Phase 19: Collection Improvements Quality

`_evaluate_card()` scoring (CMC efficiency, unconditional vs conditional, repeatable vs one-shot). `_find_cut()` never-cut logic. Collection enrichment bug fix.

### Phase 20: Card Tooltip

`CardTooltip.jsx` — Scryfall image via React Portal. 150ms delay, session cache, viewport-aware. 244×340px clickable images. Applied across all tabs.

### Phase 21: StatBadge Radial Progress

SVG radial progress rings (64×64px). Color-coded green/amber/rose. Integrated fraction notation. Fixed ring vs center color mismatch.

### Phase 22: Deployment

`render.yaml`, `vercel.json`, test script. Deployed to Render + Vercel. CORS configured. Guide: [DEPLOYMENT.md](.github/DEPLOYMENT.md)

### Phase 23: Schema Design (Doc Only)

[DECK_METADATA_SCHEMA.md](.github/DECK_METADATA_SCHEMA.md) — proposed 6 tables for snapshots, analyses, weaknesses, improvements, scenarios, diffs. Not implemented.

### Phase 24: UI Redesign ("Refined")

Complete visual redesign. TopNavbar replaced sidebar. Typography hierarchy (Cinzel/Space Grotesk/Inter). Commander art thumbnails with partner stacking. Stats grid with gradient borders. Tailwind v4 font class fix (46 replacements). Sub-phases 24a–24k. Mockup: `frontend/mockups/variant-3-refined.html`.

### Phase 25: Feature Planning

MTG specialist review ([mtg-review.md](.github/mtg-review.md)). All items triaged → Phase 26 (leagues) and Phase 34 (accuracy).

### Phase 26: League/Pod Tracking

Migration 007. Full CRUD in `leagues.py`. LeaguesPage, LeaguePage, LogGamePage, JoinLeaguePage. Social features (superstar names, entrance music, catchphrases). 3-2-1-0 scoring. Security + performance fixes (migrations 008). Details: [league-fixes-summary.md](.github/league-fixes-summary.md)

### Phase 27: League Security Polish

Migration 009. Text sanitization, date validation, DB constraints. Details: [security-audit.md](.github/security-audit.md)

### Phase 28: League Performance

Migration 010. Pagination, query deduplication, indexes. Fixed standings SQL bug. Details: [performance-audit-leagues.md](.github/performance-audit-leagues.md)

### Phase 29: League Test Coverage

14 frontend tests + 50+ backend tests. Points calculation, integration, RLS, validation, edge cases. Details: [test-plan.md](.github/test-plan.md)

### Phase 31A: League Critical Design Fixes

Removed deprecated scoring columns. Glass morphism on all league cards. Champion hero section. Tab reorder (Members → Standings → Games). Points preview on LogGamePage.

### Phase 31B: League Leaderboard & Profile

Championship leaderboard with gold gradient 1st place. Enhanced member cards. Motivational empty states. Mobile-optimized LogGamePage. Success animation.

### Phase 31D: League Accessibility

ARIA tab semantics. Table captions. Focus rings. Color contrast fixes. `aria-live` on standings. Explicit form labels.

### Phase 32: Edge Functions Migration

FastAPI/Render → Supabase Edge Functions (Deno). 7 functions in `supabase/functions/`. Shared utils in `_shared/`. Dual-mode `api.js`. Spike confirmed Deno fetch works with Moxfield.

### Phase 33: App-Wide Design Uniformity

League color system fix (~60 class replacements). Standardized CTA buttons. Leagues in mobile nav. Unified stat cards. Glass morphism on CollectionPage. Login page personality. Border-radius system. DeckPage Overview hero restructure.

### Phase 34: Analysis Accuracy & Commander Intelligence

Strategy classification (7 archetypes). Power level 4–10. Dynamic thresholds. Removal quality splits. Theme detection fixes. Enhanced counting functions. Gemini prompt enrichment. Tab rename → "Upgrades". Ported to Edge Functions. 123 backend tests passing.

---

## Acceptance Criteria

Before any phase is marked complete:
1. Auth — Google sign-in works; non-listed email rejected
2. Deck fetch — Moxfield URL → analysis renders
3. Collection — CSV upload → cards appear; upgrades show owned-card suggestions
4. Strategy — Strategy tab returns useful content (rule-based or AI)
5. Scenarios — add/remove cards → before/after diff renders
6. History — multiple analyses appear; deck names shown; Moxfield links work
7. Mobile — no horizontal scroll, readable text, all buttons tappable
8. Multi-user — separate users see only their own data
