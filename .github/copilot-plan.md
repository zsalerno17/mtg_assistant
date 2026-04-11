# Project Plan

## Current status
- Project: MTG Assistant
- State: Active development

## Active tasks
<!-- Agents: add tasks here as they come up -->

## Known issues
<!-- Agents: log bugs, tech debt, and risks here -->

## Recent changes
<!-- Agents: add a bullet after each task you complete. Newest first. -->
- **Creature avatar icon sizing fix**: Picker buttons icon `w-6 h-6` → `w-8 h-8`; large avatar display iconClass `w-12 h-12` → `w-14 h-14`. Matches mockup's ~77% icon-to-container fill ratio (40px icon in 52px circle).
- **Creature avatar system — 19 archetypes finalized**: Rewrote `creatureIcons.jsx` with `makeIcon()` factory + imports from `iconAlternatives.js`. Expanded `avatarPresets.js` to 19 entries (dragon, goblin, wizard, zombie, elf, vampire, vampire-bat, knight, knight-mounted, rogue, minotaur, orc, dwarf, ninja, samurai, griffin, wyvern, skeleton, pirate) — each with `bg` gradient + `iconColor` theme data + new `CREATURE_PRESET_MAP` export. Updated `ProfilePage.jsx` to use per-archetype themed circles (`renderCreatureAvatar` helper). Updated `IconMockupPage.jsx`: knight now shows 2 confirmed picks, 10 archetypes promoted from OTHER_ARCHETYPES into GROUPS with gold rings, OTHER_ARCHETYPES trimmed to 8 unconfirmed entries.
- **Pending cleanup**: remove `/mockup` route from `App.jsx`, delete `IconMockupPage.jsx`, delete orphaned old icon functions (DragonIcon–MerfolkIcon) from `creatureIcons.jsx`. Also: backend preset URL validation fix; mobile nav Profile button calls `signOut()` instead of navigating.
- **Profile page avatar presets**: Added 8 MTG mana pip–style SVG preset avatars (W/U/B/R/G/Colorless/Gold/Planeswalker) to ProfilePage. Users can pick a preset or upload their own image. Preset icons stored in `frontend/src/lib/avatarPresets.js`.
- **SVG data URI fix**: Replaced `btoa()` with `encodeURIComponent` + `data:image/svg+xml;charset=utf-8,` prefix to avoid `InvalidCharacterError` crash on non-Latin1 SVG strings.
- **Nested `<a>` fix in DashboardPage**: Replaced `<Link>` wrapper on history cards with `<div role="button">` + `useNavigate()` to fix invalid nested anchor HTML. Inner Moxfield `<a>` link preserved.
- **Sidebar profile area**: Desktop sidebar now shows username (if set) above email in muted text; full area has hover ring + `cursor-pointer` affordance linking to `/profile`.
- **Email removed from ProfilePage**: Email is no longer shown as editable text on the profile page (only used internally for avatar initials fallback).

## Decisions
<!-- Agents: record architectural or design decisions and the reasoning -->

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
