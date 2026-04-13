# Phase 38 Design Mockups

**Status:** Phase 0c COMPLETE ✅ (April 13, 2026)  
**Ready for:** Engineering implementation (Phase A-G)

---

## Final-Spec Mockups (Implementation Contract)

These are the approved, implementation-ready specifications:

### 1. **final-spec-dashboard.html**
- **Layout:** Direction A (Data Dashboard)
- **Screen sizes:** All (responsive)
- **Key features:** Glass import card, 3→2→1 column responsive grid, 60px commander thumbnails
- **Use for:** DashboardPage implementation across all screen sizes

### 2. **final-spec-deckpage-desktop.html**
- **Layout:** Direction A (Data Dashboard)
- **Screen sizes:** ≥768px (desktop and tablet)
- **Key features:** Compact horizontal commander hero (120px art), big dashboard stats (48px), two-column charts, full-width weaknesses
- **Use for:** DeckPage implementation on desktop/tablet

### 3. **final-spec-deckpage-mobile.html**  
- **Layout:** Direction B (Hero Editorial)
- **Screen sizes:** <768px (mobile)
- **Key features:** Massive centered commander art (280px), vertical story flow, weaknesses second section, horizontal scroll stats
- **Use for:** DeckPage implementation on mobile (responsive switch at 768px breakpoint)

**All specs include:** Exact spacing tokens, hover state specifications, responsive breakpoints, color palette tokens, typography rules, accessibility notes, implementation checklists

---

## User's Direction Selection

- **DashboardPage:** Direction A (all screen sizes)
- **DeckPage Desktop (≥768px):** Direction A (information density)
- **DeckPage Mobile (<768px):** Direction B (vertical storytelling)

**Rationale:** Information density and scannability for desktop power users, emotional engagement and natural vertical flow for mobile where horizontal space is limited.

---

## Layout Direction Explorations (Reference Only)

These were the initial explorations shown to user for direction selection:

### Direction A: Data Dashboard (`direction-a-data-dashboard.html`)
- **Philosophy:** Information-dense, grid-based, Linear/Notion style
- **Best for:** Power users, desktop workflows, scanning metrics quickly
- **Selected for:** Dashboard (all sizes) + DeckPage desktop

### Direction B: Hero Editorial (`direction-b-hero-editorial.html`)  
- **Philosophy:** Commander-first storytelling, generous whitespace, Stripe/Apple style
- **Best for:** Emotional engagement, mobile vertical flow, casual users
- **Selected for:** DeckPage mobile

### Direction C: Sidebar Split (`direction-c-sidebar-split.html`)
- **Philosophy:** Persistent context sidebar, Figma/VS Code workflow pattern
- **Best for:** Users switching tabs frequently, wide screens, power users
- **Not selected** (but kept for reference)

---

## Color Exploration (Phase 0a — Complete)

### Approved Palette
**File:** `custom-palette-options.html` (interactive live editor with final palette loaded)

**Foundation colors:**
- `#23292E` Dark Charcoal (dark mode bg, light mode text)
- `#2D82B7` Blue (primary accent — buttons, brand, headers)
- `#79161D` Red (secondary accent — light mode emphasis, alerts)
- `#DBAC84` Tan (tertiary accent — dark mode warmth, secondary actions)
- `#E2E6E9` Off White (light mode bg, dark mode text)

**Documented in:** `.github/design-system-colors.md`

### Exploration Mockups (Reference Only)
- `mtg-color-palettes.html` — 6 MTG color palette options (Esper, Golgari, etc.)
- `neutral-accent-options.html` — 5 neutral + accent combinations
- `direction-1-precision.html`, `direction-2-layered.html`, `direction-3-hybrid-premium.html` — Initial attempts (rejected due to identical color palette)

---

## Typography System (LOCKED)

**Cinzel (Display font):** Logo text, page H1 titles, commander names, deck names ONLY  
**Inter (Body font):** Everything else — nav links, tabs, labels, body copy, buttons, stat numbers

**This is a critical design decision.** Cinzel is "earned" for elements that represent MTG identity (commanders, decks). Using it everywhere makes everything scream and nothing stand out.

---

## Design Philosophy

**Previous approach:** Make the UI chrome look like Magic — Cinzel everywhere, arcane gradients on body background, amber glows on every heading.

**New approach (Phase 38):** Modern premium dark SaaS UI where MTG flavor comes from **content** (commander card art, mana pips, card images), not **chrome**. The UI wrapper is neutral and clean (Vercel/Linear energy), letting the Magic cards breathe.

**Visual system:** Hybrid glass/crisp
- Glass morphism: Navbar, hero sections, modals (backdrop-blur, elevated)
- Crisp flat: Data tables, stats, utility UI (solid surfaces, 1px borders)

---

## Implementation Notes

### Responsive Strategy
- Desktop ≥1024px: Full multi-column, generous spacing
- Tablet 768-1023px: Reduce columns, maintain spacing  
- Mobile <768px: Single-column, reduced padding, **switch DeckPage to Direction B**
- Small mobile <400px: Further font size reductions

### Phase Sequence (from .github/phase-38-design-overhaul.md)
- **Phase A:** Foundation (tokens.css, index.css, components.css)
- **Phase B:** Shell (TopNavbar)
- **Phase C:** DeckPage (commander hero, stats grid, weaknesses, charts)
- **Phase D:** Dashboard (import card, deck grid)
- **Phase E:** Mobile responsive (DeckPage Direction B below 768px)
- **Phase F:** League pages (OPTIONAL, can defer)
- **Phase G:** Polish (hover states, audit Cinzel usage)

### File References
- **Planning:** `.github/phase-38-design-overhaul.md`, `.github/copilot-plan.md`
- **Design system:** `.github/design-system-colors.md`
- **Proposal:** `.github/design-proposal-phase-38.md`

---

## For Engineering Team

**Start here:**
1. Review final-spec mockups in browser (open all three HTML files)
2. Read implementation checklists at bottom of each spec
3. Begin Phase A (Foundation) — update tokens.css, index.css, components.css
4. Proceed through phases B-G sequentially

**Key verification points:**
- Navbar sticky position works
- Commander hero responsive switch (horizontal → vertical at <768px)
- Stats color-coded correctly (green/amber/red)
- Weaknesses section red tinting subtle but visible
- Charts two-column → single-column at <1200px
- Cinzel ONLY on logo, H1, commander names (verify Inter everywhere else)
- All hover states functional

**Questions?** See `.github/phase-38-design-overhaul.md` full specification.

---

## Direction 1: Precision

**File:** `direction-1-precision.html`

**Philosophy:** Clean minimal with strong typography hierarchy. Crisp flat surfaces dominate.

**Visual characteristics:**
- Glass only on navbar (minimal blur)
- All content surfaces are crisp flat with 1px borders
- Stats grid: flat cells with 1px dividers
- Deck list: flat rows with hover state
- Bold numbers (32-36px, weight 800) as visual anchors
- Tight information density — efficient scannable layouts
- Color: green/orange semantic only on stat values

**Typography:**
- Inter everywhere except Cinzel on logo + page H1 + commander names
- Commander name: 36px Cinzel
- Stats: 32px tabular nums, bold

**Spacing:**
- Tighter gaps (16-20px between sections)
- Cards: 32px padding
- Stats: 20px padding per cell

**Best for:** Users who want maximum information density, minimal chrome, no-nonsense data UI. Think Linear/Stripe energy.

---

## Direction 2: Layered

**File:** `direction-2-layered.html`

**Philosophy:** Maximum depth with glass morphism. Translucent overlays create layered visual hierarchy.

**Visual characteristics:**
- Glass everywhere: navbar, import card, deck cards, hero section, stats, weaknesses
- Heavy backdrop-blur (16-24px) on all elevated surfaces
- Translucent backgrounds (rgba 0.5-0.7 alpha)
- Generous hover effects (translateY, shadow boost, border glow)
- Commander hero: glass card with deep shadow
- Stats grid: individual glass cards with gaps (not 1px grid)
- Gradient button (linear-gradient primary)

**Typography:**
- Same Cinzel/Inter split as Direction 1
- Commander name: 42px Cinzel with text-shadow glow
- Stats: 36px tabular nums with color glow on good/warning

**Spacing:**
- More generous (24-40px between sections)
- Cards: 36-40px padding
- Stats: 24px padding per card

**Best for:** Users who want premium SaaS feel, atmospheric depth, modern layered aesthetic. Think Vercel/Arc browser energy.

---

## Direction 3: Hybrid Premium

**File:** `direction-3-hybrid-premium.html`

**Philosophy:** Strategic mix. Glass for elevated hero content, crisp flat for scannable data.

**Visual characteristics:**
- **Glass surfaces:** navbar, import card (call-to-action), commander hero section, tabs
- **Crisp flat surfaces:** deck list rows (data grid), stats grid (1px dividers), weaknesses section
- Best-of-both: atmospheric where it matters, scannable where data lives
- Commander hero gets full glass treatment with blur + shadow
- Stats use flat grid for quick comparison
- Deck list: flat rows for scannability (not floating cards)

**Typography:**
- Same Cinzel/Inter split
- Commander name: 39px Cinzel
- Stats: 34px tabular nums

**Spacing:**
- Balanced (18-36px between sections)
- Glass cards: 36px padding
- Flat grids: 18-22px padding

**Best for:** Balance between premium feel and information density. The "recommended" direction that applies glass strategically rather than everywhere.

---

## Key Differences at a Glance

| Aspect | Direction 1: Precision | Direction 2: Layered | Direction 3: Hybrid |
|--------|----------------------|---------------------|-------------------|
| **Glass usage** | Navbar only | Everywhere | Strategic (hero/modals) |
| **Stats layout** | 1px grid, flat cells | Individual glass cards | 1px grid, flat cells |
| **Deck list** | Flat rows, 1px dividers | Glass cards with gaps | Flat rows, 1px dividers |
| **Spacing density** | Tight (efficient) | Generous (breathing) | Balanced |
| **Button style** | Flat gradient | Gradient with glow | Gradient with glow |
| **Visual personality** | Minimal, data-first | Atmospheric, premium | Premium + practical |
| **Hover effects** | Subtle (bg shift) | Dramatic (transform + glow) | Moderate (transform) |
| **Commander hero** | Flat card | Glass card, deep shadow | Glass card, medium shadow |

---

## Shared Across All Directions

**What's consistent in every mockup:**

- **Typography split:** Cinzel for logo/H1/commander names ONLY. Inter everywhere else.
- **MTG flavor:** Mana color pips (W/U/B/R/G icons) + commander card art. No arcane gradients on body background.
- **Color palette:** Same Arcane Spectrum tokens (deep navy bg, amber primary, green=good, orange=warning).
- **Navbar:** Glass with backdrop-blur in all three (implementation difference is blur amount + shadow depth).
- **Commander as hero:** All three show commander art + name + pips as dominant element above the fold.
- **Weaknesses prominence:** Second section after stats, not buried at bottom.
- **Real content:** No lorem ipsum — Atraxa/Gishath/Meren, actual stat targets.

---

## How to Review

1. Open each HTML file in a browser (Chrome/Arc recommended for backdrop-filter support)
2. Scroll through all three sections (navbar → dashboard → deck page)
3. Compare at desktop width (≥1280px)
4. Note which direction feels:
   - Most premium
   - Most scannable for data
   - Most aligned with "modern SaaS" (Vercel/Linear reference)
   - Best balance for MTG deck analysis use case

---

## Next Steps (Per Phase 38 Plan)

**After direction selection:**
- User approves one direction for each surface (can mix — e.g., Direction 3 navbar + Direction 1 stats)
- Designer creates final-spec mockups incorporating feedback
- Those final mockups become the implementation contract for engineering phases A-G
