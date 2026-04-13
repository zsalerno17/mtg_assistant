# Phase 38 — Full App Design Overhaul

> **Created:** April 13, 2026  
> **Status:** Phase 0 (Mockups) — not yet started  
> **Owner:** Designer agent for Phase 0 + C + F. Engineering agent for A + B + D + E + G.

---

## Why This Exists — Root Cause Analysis

Six previous design phases (9, 15, 24, 33, 35A, 35B) each layered on top of previous work rather than replacing it. The result is a codebase with competing visual philosophies, a design system that exists but isn't used, and unresolved hierarchy problems that were diagnosed but never fixed.

**The 7 root causes:**

1. **Design philosophy conflict** — Phase 33 added "glass morphism everywhere." Phase 35A decided on "Crisp" (flat, no gradients). Both philosophies coexist in the codebase simultaneously, making the app feel incoherent.

2. **Design system exists but isn't used** — `components.css` has `.btn-primary`, `.btn-ghost`, `.btn-danger`, etc. but 25+ inline gradient buttons violate the Crisp principle across every page. Phase 37 (button consolidation) was planned but never implemented.

3. **Token drift** — `design-gap-analysis.md` found 19 gaps between the approved mockup and implementation, including Tier 1 critical issues (border color 40% too light, surface colors wrong). Each redesign introduced new drift.

4. **Layer-on-layer redesigns** — Never a clean slate. Legacy gradient buttons, old glass morphism, and new Crisp design system classes all coexist and fight each other.

5. **Hierarchy never fixed** — `design-analysis.md` diagnosed "flat and generic — the user's eye has nowhere to land." DeckPage fails the 5-second test: commander identity is BELOW stat badges, weaknesses (the app's killer differentiator) are buried at the bottom of a long scroll. This was identified but no implementation phase addressed it.

6. **League pages are a different product** — Built separately, never unified. Plain `bg-surface` cards with no depth, no hierarchy, no glass — while the main app uses Cinzel and hover effects.

7. **Designer agent not used holistically** — Each task was scoped to a single component/phase rather than a top-down whole-app redesign pass.

---

## The Core Reframing

**Previous approach:** Make the app look like Magic — Cinzel on every heading, arcane radial gradients on the body background, amber glows everywhere.

**Why it failed:** When the UI chrome itself tries to be the MTG aesthetic, it overwhelms everything. Modern premium apps have neutral, clean chrome where the *content* provides the character.

**New approach:** Modern premium dark SaaS UI — Vercel/Linear energy. The MTG flavor comes entirely from:
- Commander card art (large, prominent)
- Mana color identity pips
- Card images in tooltips
- Scryfall art in analysis

The UI wrapper steps back and lets the content breathe.

---

## Locked Decisions

| Decision | Choice |
|---|---|
| Visual system | **Hybrid** — Glass for hero/elevated (navbar, commander hero, modals). Crisp flat for data tables, list rows, utility UI. |
| Typography | **Inter everywhere** EXCEPT: logo text, page H1 titles, commander names — those earn Cinzel. |
| MTG flavor | Card art + mana pips ONLY. Remove arcane gradients from body background. |
| Scope | Full app — every page |
| DeckPage hero | Commander art + name + color pips = dominant element above the fold |
| Phase 37 buttons | Bundled into this phase, not separate |
| League pages | Fully redesign to match. PRESERVE standings table data and metrics. |
| Reference aesthetic | fireart.studio/blog/designing-modern-ui-ux — modern layered dark UI patterns |

---

## What to Preserve (Do Not Change)

- Arcane Spectrum color palette tokens — colors are fine as accents, usage pattern changes
- League standings table data structure and metrics
- Commander art + mana pip components — keep and enhance
- Card tooltip (CardTooltip.jsx) — no changes needed
- Resource Health charts (Phase 36 work)
- All authentication flows

---

## What Must Change Systematically

1. **`index.css`** — Remove body radial-gradient + SVG noise texture. Remove global `h1-h6 { font-family: Cinzel }` rule. This single change immediately modernizes every page.
2. **`tokens.css`** — Rename/add `--font-display: Cinzel` (logo/hero only). `--font-heading` becomes Inter. Add `--text-hero` (~36-40px) for commander name.
3. **All 25+ gradient buttons** — Replace with `.btn-primary`, `.btn-ghost`, `.btn-secondary` design system classes.
4. **Glass vs. Crisp split** — Resolve by applying hybrid rule consistently: glass for elevated hero surfaces, crisp for data.

---

## Implementation Plan

### ⛔ Phase 0 — Visual Target / Mockups (HARD GATE)
> **No implementation code begins until Phase 0 is complete and approved.**

**Owner:** Designer agent (`.github/agents/designer.agent.md`)

**Inputs the designer agent must read first:**
- `.github/archive/design-analysis.md` — full diagnosis of current problems
- `.github/agents/references/design-knowledge.md` — design principles + modern style guide

**Status Update — April 13, 2026:**

**✅ 0a — Color Palette Foundation (COMPLETE)**
- User provided 5-color foundation palette rooted in strategic neutral + accent approach
- Foundation colors documented in `.github/design-system-colors.md`:
  - `#23292E` (Dark Charcoal) — dark mode bg, light mode text
  - `#2D82B7` (Blue) — primary accent (buttons, brand, headers)
  - `#79161D` (Red) — secondary accent (light mode emphasis)
  - `#DBAC84` (Tan) — tertiary accent (dark mode warmth)
  - `#E2E6E9` (Off White) — light mode bg, dark mode text
- Derived surface/border tokens defined for both modes
- Interactive live editor created: `frontend/mockups/redesign-38/custom-palette-options.html`
- Strategy: Neutral gray foundation with Blue dominating, Red for light mode emphasis, Tan for dark mode warmth
- This palette is now LOCKED for all Phase 0 layout mockups

**✅ 0b — Layout Direction Mockups (COMPLETE, AWAITING USER REVIEW)**
- Created 3 genuinely different layout approaches using approved color palette:
  - **Direction A: Data Dashboard** (`direction-a-data-dashboard.html`) — Information-dense, grid-based, Linear/Notion style. Compact horizontal commander hero (120px art), big dashboard stat numbers (48px), two-column charts, full-width weaknesses section.
  - **Direction B: Hero Editorial** (`direction-b-hero-editorial.html`) — Commander-focused storytelling, Stripe/Apple style. Massive centered commander art (280px), generous whitespace (80px sections), vertical story flow, weaknesses as prominent second section.
  - **Direction C: Sidebar Split** (`direction-c-sidebar-split.html`) — Persistent context sidebar, Figma/VS Code style. Commander + quick stats in left sidebar (180px art, sticky), main content on right with tabs, weaknesses first in content area.
- All three mockups show: Navbar, DashboardPage, DeckPage Overview
- Used real content (Atraxa, Gishath, actual stat numbers)
- Mockups opened in browser for user review

**✅ 0d — Final-Spec Mockups for Core Pages (COMPLETE):**
- Created implementation-ready mockups with detailed annotations:
  - **Dashboard** (`final-spec-dashboard.html`) — Direction A, all screen sizes, 900px max-width, responsive grid, glass import card, 60px commander thumbnails, detailed hover states
  - **DeckPage Desktop** (`final-spec-deckpage-desktop.html`) — Direction A for ≥768px, 1400px max-width, horizontal commander hero (120×168px art), 48px stat values, two-column charts, full-width weaknesses section
  - **DeckPage Mobile** (`final-spec-deckpage-mobile.html`) — Direction B for <768px, 1000px max-width, massive centered commander art (280×392px), vertical flow, weaknesses second section, horizontal scroll stats
- **USER FEEDBACK REFINEMENTS APPLIED (April 13, 2026):**
  - Darkened backgrounds: `--bg: #1a1f24` (was #23292E), `--surface: #23292E` (was #2d3439), `--border: #2d3439` (was #3a4248)
  - Removed button glow effects: Hover now only uses `brightness(1.1) + translateY(-1px)` — no box-shadow
  - Verified scalability: All specs use CSS custom properties for colors, typography, buttons (future light/dark mode switching, multiple color schemes)
- All specs include: Spacing tokens (40px/24px/16px/12px), hover states, responsive breakpoints, color-coded stats, implementation checklists, accessibility notes
- Typography specifications: Cinzel ONLY for logo/H1/commander names, Inter everywhere else
- Color palette: All specs use refined Phase 38 tokens with darker backgrounds
- These mockups are the engineering contract for Phase A-G implementation

**✅ 0e — Final-Spec Mockups for Secondary Pages (COMPLETE — April 13, 2026):**
- Created remaining page mockups using Direction A (information-dense) approach:
  - **Collection** (`final-spec-collection.html`) — Stats header (total cards, avg value, collection value, last updated), glass upload section (drag-and-drop CSV), crisp flat card grid (220px columns, 4-5 per row), search filter, empty state
  - **Leagues List** (`final-spec-leagues-list.html`) — Grid of league cards (3→2→1 columns responsive), each showing status badge (Active/Draft/Completed), member count, games played, current leader with points, toolbar with archive/refresh actions
  - **League Detail** (`final-spec-league-detail.html`) — Breadcrumb navigation, glass leader callout (current #1 with pts/wins/games), tabs (Members | Standings | Games), **prominent standings table** with rank badges (gold/silver/bronze), player names, points, wins, 2nd/3rd place, avg placement, unique commanders, games played — responsive (hides columns <1024px, minimal on mobile)
- **DATA STRUCTURE PRESERVED:** All existing league metrics maintained (superstar names, placement tracking, points calculation, game history with placements/decks/awards)
- All mockups follow refined color palette (#1a1f24 bg, #23292E surface, #2d3439 border), CSS custom properties, no button glows
- Hybrid glass/crisp system: Glass for elevated surfaces (upload section, leader callout), flat crisp for data display (collections grid, standings table, league cards)

**🎯 Phase 0 Status: COMPLETE ✅ — APPROVED FOR IMPLEMENTATION (April 13, 2026)**

All page mockups created (Dashboard, DeckPage Desktop/Mobile, Collection, Leagues List/Detail). User feedback refinements applied (darker backgrounds, no button glows, CSS variables for scalability). **Emojis in mockups are visual placeholders only — will be replaced with lucide-react SVG icons during implementation.** User has approved complete mockup suite. Ready to proceed to Phase A (Foundation) implementation.

**Deliverables:**
- 6 final-spec HTML mockups with detailed implementation annotations
- Color system documented with refined darker backgrounds (#1a1f24 base)
- Typography specifications locked (Cinzel ONLY for logo/H1/commander names)
- Spacing tokens defined (40px/24px/16px/12px)
- Button patterns standardized (no glows)
- Responsive breakpoints specified (≥1024px, 768-1023px, <768px)
- All mockups use CSS custom properties for future theme switching

**User quote:** "we'll move on to phase A once we have everything honed in" ✅

---

## Implementation Phases (A-G)

### Phase A — Foundation
> **Depends on:** Phase 0 approval  
> **Owner:** Engineering agent  
> **Files:** `frontend/src/index.css`, `frontend/src/styles/tokens.css`, `frontend/src/styles/components.css`

**Tasks:**

**A1 — `index.css`:**
- Remove the `body` radial-gradient + SVG noise texture (currently creates arcane background effect)
- Remove the global `h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading) }` rule
- Body background becomes clean `background: var(--color-bg)` (already the deep `#070813` dark — atmospheric enough without gradients)

**A2 — `tokens.css`:**
- Add `--font-display` token (Cinzel) — used only for logo, H1 page titles, commander names
- Change `--font-heading` to point to Inter (not Cinzel)
- Add `--text-hero: 36px` (or 40px) for commander name sizing
- Review shadow tokens — remove/reduce ambient glow shadows that aren't on primary CTAs

**A3 — `components.css` (Phase 37 bundle):**
- Audit all button patterns — enforce `.btn-primary` as flat blue with subtle glow shadow only
- Remove any gradient patterns in component classes
- Unify `.card` surface classes to use `--color-surface` + `--color-border` consistently
- Verify `stat-card-*` classes don't use gradients

**Verify:** `npm run build` clean before proceeding to any page work.

---

### Phase B — Shell
> **Depends on:** Phase A  
> **Owner:** Engineering agent  
> **Files:** `frontend/src/components/TopNavbar.jsx`

**Tasks:**

**B1 — Typography:**
- Keep `backdrop-blur-md` on navbar (this is correct glass usage)
- Logo text: keep `--font-display` (Cinzel) — this is one of the earned uses
- Nav links (`Dashboard`, `Collection`, `Leagues`): must use Inter body font — audit and fix any `font-[var(--font-heading)]` usage on nav links

**B2 — Active link styling:**
- Active link: white text + amber-tinted background + subtle amber border
- Not: amber text on gray background (current)

**B3 — Critical bug fix:**
- Mobile bottom nav "Profile" tab currently calls `signOut()` directly
- Fix: navigate to ProfilePage (or open a dropdown with profile + sign out options)
- This is a trust-destroying interaction — user taps their avatar expecting account, gets signed out

---

### Phase C — DeckPage
> **Depends on:** Phase A + approved DeckPage mockup  
> **Owner:** Engineering agent (or designer agent if mockup requires significant layout judgment)  
> **Files:** `frontend/src/pages/DeckPage.jsx`

**Tasks:**

**C1 — Overview tab hero restructure:**
- Commander art (current size or larger) + commander name (Cinzel, `--text-hero`) + color identity pips = hero zone at TOP
- This hero zone should visually dominate above the fold
- Stat badges row: BELOW the hero, not above
- Weaknesses section: PROMOTED — second section after stats, not bottom of page scroll
- Mana curve + Role Composition: third section
- Resource Health: fourth section

**C2 — Tab consolidation:**
- "Collection Upgrades" and "Improvements" both call `api.getImprovements()` — this is a bug AND a UX problem
- Either merge into one tab or differentiate them with distinct API calls
- Simplify tab labels — "Collection Upgrades" is a long label on mobile

**C3 — Button consolidation:**
- Replace all gradient buttons on DeckPage with `.btn-primary`, `.btn-ghost`, `.btn-secondary`
- No `bg-gradient-to-*` classes in DeckPage JSX after this phase

---

### Phase D — DashboardPage
> **Depends on:** Phase A + approved DashboardPage mockup  
> **Owner:** Engineering agent  
> **Files:** `frontend/src/pages/DashboardPage.jsx`

**Tasks:**

**D1 — Deck list items:**
- Add commander name to each deck list item (currently missing — this is the single most important card in a Commander deck)
- Verify commander art is displaying in deck rows/cards

**D2 — Container:**
- Verify `max-w` is generous enough (design-gap-analysis found max-w-6xl = 1152px, mockup was 1600px)

**D3 — Button consolidation:**
- Replace gradient buttons with design system classes

**D4 — Stat cards:**
- Audit `stat-card-*` CSS classes for any gradient usage — update to flat/crisp

---

### Phase E — CollectionPage
> **Depends on:** Phase A + approved mockup  
> **Owner:** Engineering agent  
> **Files:** `frontend/src/pages/CollectionPage.jsx`

**Tasks:**

**E1 — Layout structure:**
- Add `max-w-*` container — currently stretches full width on 1400px+ screens, upload zone feels lost
- Recommended: `max-w-5xl mx-auto`

**E2 — Card grid:**
- Replace `max-h-[480px] overflow-y-auto` fixed-height scroll box with proper full-page layout
- A box-within-a-page scroll context is a developer shortcut, not a design decision

**E3 — Search input:**
- Fix search input alignment on tablet widths (currently breaks at md breakpoint)

---

### Phase F — League Pages
> **Depends on:** Phase A + Phase 0 league mockups  
> **Owner:** Engineering agent  
> **Files:** `frontend/src/pages/LeaguesPage.jsx`, `frontend/src/pages/LeaguePage.jsx`, `frontend/src/pages/LogGamePage.jsx`

**Context:** League pages were built as a feature sprint and never visually integrated with the main app. They use plain `bg-surface` cards, generic fonts, no depth — while the main app has glass cards, Cinzel headings, and hover effects. They read like a different product.

**Tasks:**

**F1 — LeaguesPage:**
- Replace plain `bg-surface border border-accent/30` cards with glass cards matching main app
- Fix create form: replace inline expansion (shifts page content down) with proper modal overlay
- Add success feedback after creating a league
- League cards: consider adding current standings leader or member count preview

**F2 — LeaguePage:**
- Add a hero section at top: league name (Cinzel), season dates, active leader callout
- Standings table: **PRESERVE data structure** — improve visual execution only (header styling, row hover states, rank badge styling)
- Games history: enhance narrative presentation of game cards
- Members section: glass cards consistent with main app

**F3 — LogGamePage:**
- Visual upgrade consistent with app style
- Replace any gradient buttons with design system classes

---

### Phase G — Remaining Pages
> **Depends on:** Phase A  
> **Owner:** Engineering agent  
> **Files:** `LoginPage.jsx`, `ProfilePage.jsx`, `ImportDeckPage.jsx`, `HelpPage.jsx`, `JoinLeaguePage.jsx`

**Tasks:**

**G1 — LoginPage:**
- Currently generic: title + tagline + Google button on empty dark background
- Add commander art reference or color pip visual interest
- Better tagline (promise, not feature list)
- Improve visual hierarchy so button has clear weight

**G2 — ProfilePage, ImportDeckPage, HelpPage, JoinLeaguePage:**
- Typography audit: remove Cinzel from headings that shouldn't have it (section headers, form labels)
- Button consolidation: replace gradient buttons with design system classes
- These are quick passes, not full redesigns

**G3 — Skeletons.jsx:**
- Review skeleton colors against final token values

---

## Verification Checklist

After all phases are complete:

- [ ] `npm run build` passes clean (no errors)
- [ ] `grep -rn "bg-gradient-to-" frontend/src --include="*.jsx"` returns nothing
- [ ] `grep -rn "font-\[var(--font-heading)\]" frontend/src --include="*.jsx"` returns nothing on nav links / buttons / section labels
- [ ] DeckPage: commander art + name is the first visual element above the fold (above stat badges)
- [ ] Mobile: tapping Profile in bottom nav navigates to ProfilePage (not signs out)
- [ ] League standings tables: all columns and data preserved
- [ ] Light mode toggle (`data-theme="light"`) works across all pages
- [ ] Phase 0 mockups at `frontend/mockups/redesign-38/` exist as the visual reference

---

## File Index

| File | Phase | Role |
|---|---|---|
| `frontend/src/index.css` | A | Remove body gradients + global Cinzel rule |
| `frontend/src/styles/tokens.css` | A | Add `--font-display`, fix `--font-heading`, add `--text-hero` |
| `frontend/src/styles/components.css` | A | Button audit, card surface unification |
| `frontend/src/components/TopNavbar.jsx` | B | Font fix, active link style, mobile Profile bug |
| `frontend/src/pages/DeckPage.jsx` | C | Hero restructure, tab consolidation, buttons |
| `frontend/src/pages/DashboardPage.jsx` | D | Commander name in list, max-w, buttons |
| `frontend/src/pages/CollectionPage.jsx` | E | max-w container, scroll layout fix |
| `frontend/src/pages/LeaguesPage.jsx` | F | Glass cards, modal create form |
| `frontend/src/pages/LeaguePage.jsx` | F | Hero section, table improvements |
| `frontend/src/pages/LogGamePage.jsx` | F | Visual consistency, buttons |
| `frontend/src/pages/LoginPage.jsx` | G | Personality, hierarchy |
| `frontend/src/pages/ProfilePage.jsx` | G | Typography + button audit |
| `frontend/src/pages/ImportDeckPage.jsx` | G | Typography + button audit |
| `frontend/src/pages/HelpPage.jsx` | G | Typography + button audit |
| `frontend/src/pages/JoinLeaguePage.jsx` | G | Typography + button audit |
| `frontend/src/components/Skeletons.jsx` | G | Token color review |
| `frontend/mockups/redesign-38/` | 0 | Phase 0 mockup outputs (designer agent) |

---

## Related Files

- `.github/archive/design-analysis.md` — Full UX diagnosis (read before any design work)
- `.github/archive/design-gap-analysis.md` — 19 gaps between mockup and implementation
- `.github/league-design-audit.md` — League-specific visual audit
- `.github/agents/designer.agent.md` — Designer agent definition
- `.github/agents/references/design-knowledge.md` — Design principles + modern style guide
- `.github/button-design-system-plan.md` — Original Phase 37 plan (now bundled into Phase A)
- `frontend/src/styles/tokens.css` — Design token source of truth
- `frontend/src/styles/components.css` — Component classes
