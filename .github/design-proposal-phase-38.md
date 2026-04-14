# Phase 38 — Final-Spec Mockups Complete

> **Created:** April 13, 2026  
> **Status:** Phase 0c COMPLETE ✅ — Implementation-ready mockups delivered  
> **Mockups opened in browser:** final-spec-dashboard.html, final-spec-deckpage-desktop.html, final-spec-deckpage-mobile.html

---

## Status Update

**Phase 0a (Color Foundation):** ✅ Complete — 5-color palette approved and documented  
**Phase 0b (Layout Directions):** ✅ Complete — User selected Direction A for desktop, Direction B for mobile  
**Phase 0c (Final-Spec Mockups):** ✅ Complete — Implementation-ready specs created with detailed annotations

**Next Decision Point:**
- **Option 1:** Proceed directly to Phase A-G implementation (Foundation → DeckPage → Dashboard → Polish)
- **Option 2:** Create Phase 0d League page mockups first (LeaguesPage + LeaguePage), then implement all pages together
- **Option 3:** Implement core pages (Dashboard + DeckPage) now, defer League redesign to separate phase

---

## What Was Delivered

### 1. Dashboard (All Screen Sizes)
**File:** `final-spec-dashboard.html`  
**Layout:** Direction A (Data Dashboard)  
**Max-width:** 900px centered  
**Key Features:**
- Glass morphism import card with blue border (32px padding, 60px bottom spacing)
- Responsive deck grid: 3 columns (desktop) → 2 columns (tablet) → 1 column (mobile)
- Compact commander thumbnails: 60px × 84px
- Cinzel deck names (20px), Inter body copy
- Hover states: Card lift (-3px translateY), border highlight (blue), shadow elevation

**Spacing tokens documented:**
- Container: 40px (desktop), 24px (mobile)
- Card padding: 24px (deck cards), 32px (import card)
- Section spacing: 60px (40px mobile)
- Grid gap: 20px (16px mobile)

**Responsive breakpoints:**
- Desktop ≥1024px: 3 columns
- Tablet 768-1023px: 2 columns  
- Mobile <768px: 1 column, stacked import form

---

### 2. DeckPage Desktop (≥768px)
**File:** `final-spec-deckpage-desktop.html`  
**Layout:** Direction A (Data Dashboard)  
**Max-width:** 1400px centered  
**Key Features:**
- **Commander hero:** Compact horizontal layout (120×168px art + info + actions in flexbox row, 24px gap)
- **Stats grid:** BIG dashboard numbers (48px font-size, 800 weight), color-coded good/warning/bad, auto-fit minmax(140px, 1fr)
- **Weaknesses section:** Full-width dedicated area, red tinted background, 3-column grid (responsive to 2→1), 4px left border
- **Charts:** Two-column layout (1fr 1fr), stacks to single column below 1200px
- **Tabs:** Blue underline on active, 150ms transition, Inter font

**Spacing tokens documented:**
- Container: 40px padding
- Commander hero: 24px padding, 24px gap, 32px bottom margin
- Stats grid: 16px gap, 20px card padding
- Weaknesses: 32px padding, 20px grid gap
- Charts: 24px gap, 24px padding

**Hierarchy priorities:**
1. Commander hero (horizontal, gradient background, blue border)
2. Stats grid (big numbers immediately scannable)
3. Weaknesses (full-width section, red emphasis)
4. Charts (supporting analysis)

---

### 3. DeckPage Mobile (<768px)
**File:** `final-spec-deckpage-mobile.html`  
**Layout:** Direction B (Hero Editorial)  
**Max-width:** 1000px (full-width with 16px padding on mobile)  
**Key Features:**
- **Commander hero:** MASSIVE vertical centered layout (280×392px art, full-width gradient section, 48px vertical padding)
- **Weaknesses:** Second major section after hero (prominent red callout, single-column grid on small mobile, 2-column on ≥600px)
- **Stats:** Horizontal scroll row (40px values, 140px min-width cards)
- **Charts:** Single-column vertical flow (200px height, 240px on ≥400px)
- **Buttons:** Full-width on mobile (48px primary, 44px secondary), side-by-side on ≥600px

**Spacing tokens documented:**
- Hero padding: 48px vertical, 16px horizontal
- Section spacing: 64px between major sections
- Card padding: 24px (20px on weakness items)
- Container: 16px horizontal (mobile safe area)

**Hierarchy priorities:**
1. Commander hero (dominates viewport, emotional engagement)
2. Weaknesses (second section, not buried)
3. Stats (horizontal scroll, accessible)
4. Charts (vertical flow, natural for mobile)

**Why Direction B for mobile:**
- Vertical flow natural for limited horizontal space
- Massive commander art creates emotional hook
- Single-column prevents cramping
- Generous spacing prevents overwhelming density
- Weaknesses elevated (not lost in scroll)

---

## Implementation Details Across All Specs

### Typography System (LOCKED)
- **Cinzel (--font-display):** Logo text, page H1 titles, commander names, deck names ONLY
- **Inter (--font-body):** Everything else (nav links, tabs, labels, body copy, buttons, stats)
- **Font sizes:**
  - Commander name: 32px (desktop hero), 40-48px (mobile hero)
  - Page H1: 40px (desktop), 32px (mobile)
  - Section headers: 24-28px
  - Body text: 14-15px
  - Stat labels: 11px uppercase
  - Stat values: 48px (desktop), 40px (mobile)

### Color Palette (Phase 38 Approved)
All specs use CSS custom properties:
```css
--bg: #23292E (charcoal)
--surface: #2d3439
--border: #3a4248
--text: #E2E6E9 (off-white)
--text-muted: #9ba1a6
--accent-primary: #2D82B7 (blue)
--accent-secondary: #DBAC84 (tan)
--accent-danger: #79161D (red)
```

**Color usage patterns:**
- Primary actions: --accent-primary background, --bg text
- Secondary actions: Transparent background, --accent-secondary border
- Weaknesses: Red tinted backgrounds (rgba(121, 22, 29, 0.05-0.15))
- Good stats: #10b981 (green)
- Warning stats: #f59e0b (amber)  
- Bad stats: --accent-danger (red)

### Hover State Patterns
- **Cards (deck cards, stat cards):** translateY(-2px to -3px), border-color: --accent-primary, box-shadow elevation
- **Primary buttons:** brightness(1.1), translateY(-1px)
- **Secondary buttons:** background: rgba(219, 172, 132, 0.1)
- **Nav links/tabs:** background: rgba(45, 130, 183, 0.1-0.2)
- **All transitions:** 150-200ms ease

### Responsive Strategy
- **Desktop ≥1024px:** Full multi-column layouts, generous spacing
- **Tablet 768-1023px:** Reduce columns (3→2), maintain spacing
- **Mobile <768px:** Single-column flow, reduced padding, horizontal scrolls where needed, stacked forms
- **Small mobile <400px:** Further reduce font sizes, tighter padding

### Accessibility Standards
- **Semantic HTML:** `<nav>`, `<main>`, `<button>`, proper heading hierarchy
- **Focus rings:** Visible on all interactive elements
- **Touch targets:** Minimum 44×44px on mobile (buttons 48px height)
- **Color contrast:** WCAG AA compliant (4.5:1 text, 3:1 UI elements)
- **Screen reader support:** ARIA labels on icon-only buttons, proper landmark roles

---

## Engineering Handoff Notes

### File Structure
All specs are standalone HTML files with embedded CSS for clarity. In implementation:
- Extract CSS into existing design system files (tokens.css, components.css)
- Convert to React components (JSX)
- Use existing Phase 36 chart components for placeholders

### Component Mapping
- **Navbar:** `frontend/src/components/TopNavbar.jsx` (update styles, verify Inter on nav links)
- **Dashboard:** `frontend/src/pages/DashboardPage.jsx` (restructure card grid, update import form)
- **DeckPage:** `frontend/src/pages/DeckPage.jsx` (major restructure: commander hero, stats grid, weaknesses section)
- **Tabs:** Already exists in DeckPage, update styles for active state
- **Charts:** Phase 36 chart components, no changes to data logic

### Phase A-G Sequence (from phase-38-design-overhaul.md)
1. **Phase A — Foundation:** Update index.css (remove body gradients), tokens.css (add --font-display), components.css (button consolidation)
2. **Phase B — Shell:** TopNavbar typography (Inter nav links, keep Cinzel logo)
3. **Phase C — DeckPage:** Commander hero restructure, stats grid with big numbers, weaknesses section, two-column charts (desktop)
4. **Phase D — Dashboard:** Import card, deck grid, commander thumbnails
5. **Phase E — Mobile Responsive:** DeckPage switches to Direction B below 768px
6. **Phase F — League Pages:** OPTIONAL — can be deferred
7. **Phase G — Polish:** Audit all hover states, verify all Cinzel usage removed except earned cases

### Testing Checklist
- [ ] Navbar sticky position works correctly
- [ ] Commander hero responsive breakpoint (horizontal →vertical at <768px)
- [ ] Stats grid color-coded values display correctly
- [ ] Weaknesses section red tinting visible but not overwhelming
- [ ] Charts two-column → single-column at <1200px
- [ ] Mobile horizontal scroll works on stats row
- [ ] Touch targets minimum 44px height on mobile
- [ ] Focus rings visible on keyboard navigation
- [ ] Cinzel ONLY on logo, H1, commander names (verify Inter everywhere else)
- [ ] Hover states functional (card lift, button brightness, etc.)

---

## Next Steps

**Recommended:** Proceed to Phase A (Foundation) implementation now. League page mockups can be created later in a follow-up phase if needed, or skipped if existing league pages are acceptable.

**Alternative:** Create Phase 0e League page mockups before implementation if unified visual language across all pages is critical.

**User Decision Required:**
1. Approve these final-spec mockups as engineering contract? (Yes/No/Revisions needed)
2. Proceed to implementation (Phase A-G)? (Yes/Defer)
3. Create League page mockups before implementation? (Yes/No/Defer)

---

## Problem Statement

After locking the color palette (Phase 0a), need to establish the information architecture and visual hierarchy approach for:
- Shell / TopNavbar (navbar already fairly simple — likely consistent across all directions)
- DashboardPage (deck list + import flow)
- DeckPage Overview (commander hero, stats, weaknesses, charts)

The current design fails the 5-second test on DeckPage: commander identity is buried below stat badges, weaknesses (our killer differentiator) are at the bottom of a long scroll. User's eye has nowhere to land — everything has equal visual weight.

**Core requirement:** Genuinely different LAYOUT approaches — not just the same structure with different spacing/blur amounts. Different information architecture philosophies, different hierarchy strategies.

---

## Three Layout Directions Created

### Direction A: Data Dashboard
**Philosophy:** Information-dense, scannability-first, everything critical above fold  
**Reference aesthetic:** Linear, Notion, Airtable — data-rich SaaS tools  
**Best for:** Power users who want to scan all metrics quickly, multiple decks open in tabs

**Key Characteristics:**
- **Commander hero:** Compact horizontal layout (120px × 168px art + info + actions side-by-side)
- **Stats:** Big dashboard-style numbers (48px font-size), color-coded good/warning/bad, 6-card grid auto-fit
- **Weaknesses:** Full-width dedicated section immediately after stats, 3-column grid, red-tinted backgrounds
- **Charts:** Two-column layout (mana curve + role composition side-by-side)
- **Max-width:** 1400px on DeckPage to maximize horizontal space, 900px on Dashboard
- **Viewport strategy:** Everything important visible with minimal scrolling

**Dashboard page:**
- Compact import card (24px padding)
- Deck list: 64px commander thumbs, horizontal layout in cards

**Strengths:**
- Maximum information density — ideal for comparing metrics across sections quickly
- Stats are the immediate hero (big numbers grab attention)
- Weaknesses still prominent (dedicated section) but don't dominate emotional space
- Two-column chart layout reduces scroll depth significantly
- Horizontal commander hero saves vertical space while staying visually distinct

**Weaknesses:**
- Commander art is smaller (120px vs. alternatives) — reduced emotional impact
- Feels more "tool" than "experience" — less personality
- Dense layouts can feel overwhelming to casual users
- Horizontal commander layout less standard for card display (users expect vertical card aspect)

**Ideal user:** Competitive players, deck brewers, users who analyze 5+ decks regularly, people coming from Moxfield/Archidekt who want faster workflows

---

### Direction B: Hero Editorial
**Philosophy:** Commander-first storytelling, generous whitespace, emotional engagement  
**Reference aesthetic:** Stripe, Apple, Arc Browser — premium editorial layouts  
**Best for:** Users who brew one deck at a time, want to fall in love with their commander, appreciate breathing room

**Key Characteristics:**
- **Commander hero:** MASSIVE centered vertical art (280px × 392px), full-width gradient section, 80px padding top/bottom
- **Stats:** Horizontal row with hover lift effects, 56px stat values, cards lift on hover
- **Weaknesses:** Second major section after stats (not buried), prominent red gradient callout box, 36px danger-colored heading with warning icon
- **Charts:** Single-column vertical flow
- **Max-width:** 1000px on DeckPage (tighter for reading experience), 900px on Dashboard
- **Viewport strategy:** Vertical story, sections spaced 80px apart, confident typography (56px hero h1, 36px section h2)

**Dashboard page:**
- Hero text section (56px Cinzel h1 centered)
- Large import card with gradient background + blue border (48px padding)
- Spacious deck cards (32px padding, 80px commander thumbs, 24px Cinzel deck names)

**Strengths:**
- Commander identity dominates — solves the "buried below stats" hierarchy failure completely
- Weaknesses elevated to second section (right after commander) — killer differentiator gets prominence it deserves
- Generous whitespace feels premium, not crowded — matches modern design trends
- Emotional engagement: big art makes you care about the deck before diving into numbers
- Clear vertical reading flow — users know what comes next

**Weaknesses:**
- More scrolling required to see all content (charts below fold)
- Single-column layout doesn't leverage wide desktop screens
- Massive commander hero may feel excessive for users who just want stats fast
- Less information density — not ideal for power users who open 10 decks in tabs

**Ideal user:** Casual Commander players, deck showcase creators, users who care about aesthetics and vibe, mobile-first users (vertical flow works great on small screens)

---

### Direction C: Sidebar Split
**Philosophy:** Persistent context, Figma/VS Code workflow pattern  
**Reference aesthetic:** Figma, VS Code, Notion sidebar layouts, Framer  
**Best for:** Users switching between Overview/Upgrades/Strategy tabs frequently, need commander context visible at all times

**Key Characteristics:**
- **Commander hero:** Left sidebar (180px × 252px art, centered), always visible (sticky sidebar)
- **Quick stats:** Compact rows in sidebar below commander (label + value, color-coded), always accessible
- **Sidebar actions:** Primary CTA buttons stacked vertically (Analyze Deck, View Strategy, Find Upgrades)
- **Main content:** Right side with full-width tabs, weaknesses shown FIRST in content area
- **Max-width:** No constraint — layout uses viewport width intelligently (340px sidebar + fluid main)
- **Viewport strategy:** Commander + stats persist while content scrolls — context never lost

**Dashboard page:**
- Standard centered layout (no sidebar — sidebar only for deck detail pages)
- Similar card approach to other directions

**Strengths:**
- Solves "losing context when switching tabs" problem — commander always visible
- Efficient use of horizontal space on wide screens (sidebar doesn't steal from content)
- Stats always accessible without scrolling — ideal for users who reference them constantly
- Main content area gets full width for charts/tables
- Sidebar actions (Analyze, Strategy, Upgrades) are one-click from any scroll position
- Responsive fallback: sidebar stacks on top for mobile (still shows full commander before content)

**Weaknesses:**
- Sidebar at 340px is significant real estate commitment — less space for main content on laptops
- Commander art smaller than Direction B (180px vs 280px) — less emotional hero moment
- Sidebar pattern less common in web apps (though increasingly trendy) — learning curve
- Compact stat rows in sidebar may feel cramped compared to Direction A's big dashboard numbers
- Dashboard page doesn't benefit from sidebar pattern — only DeckPage does

**Ideal user:** Power users switching between tabs frequently, users on wide screens (1440px+), people comfortable with IDE/design tool patterns, users who want "workspace" feel rather than "page" feel

---

## My Recommendation

**For DashboardPage:** Any direction works — differences are minimal (import card + deck list). Slight preference for **Direction A or C** to ensure consistency with DeckPage choice.

**For DeckPage Overview:** Depends on user priorities:

- **Recommend Direction B (Hero Editorial)** IF:
  - Emotional engagement and premium feel are top priorities
  - Addressing hierarchy failure (commander buried, weaknesses not prominent) is critical
  - Target audience includes casual players and deck showcase users
  - Mobile experience is equally important as desktop
  - Okay with more scrolling in exchange for clearer story flow

- **Recommend Direction C (Sidebar Split)** IF:
  - Users switch between Overview/Upgrades/Strategy tabs frequently (persistent context wins)
  - Power users on wide screens are primary audience
  - Want to differentiate from typical card game web apps (sidebar pattern is trendy but less common)
  - Stats need to be accessible at all scroll positions
  - Willing to accept smaller commander art in exchange for persistent visibility

- **Recommend Direction A (Data Dashboard)** IF:
  - Information density and scannability are top priorities
  - Users compare metrics across many decks regularly (brewers, competitive players)
  - Minimizing scroll depth is critical
  - "Tool" feel preferred over "experience" feel
  - Desktop-first audience (dense layouts work better on large screens)

**My overall pick:** **Direction B (Hero Editorial)** for DeckPage Overview, **Direction A or C** for DashboardPage.

**Reasoning:** The design diagnosis identified hierarchy failure as the #1 UX problem. Direction B solves this most dramatically — commander dominates viewport, weaknesses are elevated to second section. The app's differentiators (weakness explanations, strategy advice) finally get prominence. Hero editorial matches modern premium design trends (Stripe, Linear, Arc). Generous whitespace and confident typography feel sophisticated, not robotic.

Direction C is a close second if users report "I lose context when switching tabs" or "I reference stats constantly while reading strategy." Sidebar pattern would be excellent for power users.

Direction A is solid if the user base is primarily competitive brewers who value speed and density over aesthetics — but it doesn't solve the hierarchy problem as strongly (commander is compact, weaknesses are visible but not hero-prominent).

---

## Next Steps

1. **User reviews all three mockups in browser** (already opened)
2. **User selects preferred direction** — can mix and match (e.g., Direction B for DeckPage, Direction A for Dashboard)
3. **Phase 0c:** Create final-spec mockups incorporating user's choice + any feedback
   - Add responsive breakpoints
   - Specify hover states
   - Include interaction details (tab switching, card expand, etc.)
   - Add spacing/sizing annotations for engineering handoff
4. **Phase 0d:** Repeat for League pages (LeaguesPage, LeaguePage) after core pages approved
5. **Phase A-G:** Implementation begins (only after Phase 0 fully approved)

---

## Visual Verification

**To review mockups:**
1. All three files already opened in browser
2. Compare side-by-side:
   - Scroll to DeckPage section in each mockup
   - Compare commander hero prominence (Direction B has 280px art, A has 120px, C has 180px sidebar)
   - Compare weaknesses placement (B second section, A full-width dedicated, C first in content area)
   - Compare stats presentation (A big dashboard numbers, B horizontal row with lift, C compact sidebar rows)
   - Resize browser to ~1200px to test responsive behavior
3. Focus on: Where does your eye land first? Can you identify the commander in 5 seconds? Are weaknesses prominent enough?

**Files:**
- `frontend/mockups/redesign-38/direction-a-data-dashboard.html`
- `frontend/mockups/redesign-38/direction-b-hero-editorial.html`
- `frontend/mockups/redesign-38/direction-c-sidebar-split.html`
