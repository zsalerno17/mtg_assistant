# Mockup vs Implementation — Full Gap Analysis

**Reference:** `frontend/mockups/variant-3-refined.html`  
**Current:** `frontend/src/pages/DashboardPage.jsx`, `frontend/src/index.css`, `frontend/src/components/TopNavbar.jsx`  
**Date:** April 12, 2026

---

## Executive Summary

There are **19 gaps** between the mockup and current implementation, grouped into three tiers. The root cause of many visible issues is that **3 CSS variables in `@theme` don't match the mockup values** — specifically the border color, text color, and surface-elevated color. Fixing those 3 variables propagates improvements across every component automatically.

---

## TIER 1 — Critical (highly visible, breaks the design feel)

### GAP 1: `--color-border` is wrong
| | Mockup | App |
|---|---|---|
| Value | `#1e293b` | `#374151` |

`#374151` is **significantly lighter** — makes every border in the entire app too prominent. This single variable affects the table container, stat cards, navbar, mobile cards, collection widget, and every other bordered element. **This is the single biggest visual discrepancy.**

**Fix:** Change `--color-border` from `#374151` to `#1e293b` in `@theme`.

---

### GAP 2: `--color-text` is wrong
| | Mockup | App |
|---|---|---|
| Value | `#f1f5f9` | `#e2e8f0` |

Headings, titles, deck names — everything using `--color-text` appears slightly dimmer/grayer than the mockup.

**Fix:** Change `--color-text` from `#e2e8f0` to `#f1f5f9` in `@theme`.

---

### GAP 3: `--color-surface-2` is wrong (used as elevated surface)
| | Mockup | App |
|---|---|---|
| Value | `#1a202e` (--surface-elevated) | `#1f2937` (--color-surface-2) |

The table header and stat card gradient endpoint use `#1a202e`. The existing `--color-surface-2` is `#1f2937`, which is too light. Note: the DashboardPage currently hardcodes `#1a202e` in some places, but other pages may reference `--color-surface-2`.

**Fix:** Change `--color-surface-2` from `#1f2937` to `#1a202e` in `@theme`. Also add a `--color-border-light: #2d3748` variable for the mockup's secondary border color.

---

### GAP 4: Table body background
| | Mockup | App |
|---|---|---|
| Background | Inherits from `.deck-table` → `var(--surface)` = `#111827` | `bg-[var(--color-bg)]` = `#0a0f1a` |

The `<tbody>` in the app is explicitly set to `bg-[var(--color-bg)]` (the page background), making table rows appear **too dark**. The mockup has rows sitting on the surface color (`#111827`), which is the table container's background.

**Fix:** Remove `bg-[var(--color-bg)]` from `<tbody>`. The rows should inherit the table container's surface background.

---

### GAP 5: Container max-width too narrow
| | Mockup | App |
|---|---|---|
| max-width | `1600px` | `max-w-6xl` = `1152px` |

The app is nearly **450px narrower** than the mockup. On wide monitors the table looks cramped.

**Fix:** Change `max-w-6xl` to `max-w-[1600px]`.

---

### GAP 6: Container padding wrong
| | Mockup | App |
|---|---|---|
| Padding | `40px 32px` | `p-6` = `24px` all sides |

Not enough vertical breathing room above the title, and sides are slightly tighter.

**Fix:** Change `p-6` to `px-8 pt-10 pb-6`.

---

### GAP 7: StatusBadge component is completely wrong
| Property | Mockup | App |
|---|---|---|
| Font size | `11px` | `10px` |
| Padding | `6px 12px` | `px-2 py-0.5` (8px/2px) |
| Border radius | `7px` | `rounded-full` (999px) |
| Shape | Rounded rectangle | Pill |
| Status dot | 5px circle with currentColor | Missing |
| "Not analyzed" text | "Pending" | "Not analyzed" |
| Analyzed bg | `rgba(16, 185, 129, 0.12)` | `bg-emerald-500/20` (higher opacity) |
| Analyzed border | `rgba(16, 185, 129, 0.25)` | `border-emerald-500/30` |
| Pending bg | `rgba(100, 116, 139, 0.12)` | `bg-[var(--color-bg)]` |

This component needs a full rewrite to match.

**Fix:** Rewrite `StatusBadge` with correct sizing, rounded-[7px], status dot, "Pending" text, and correct colors.

---

## TIER 2 — Navbar (separate component, many differences)

### GAP 8: Navbar brand font size + effects
| | Mockup | App |
|---|---|---|
| Font size | `18px` | `text-xl md:text-2xl` (20px/24px) |
| Effects | None | `drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]` |

The brand text is too large and has a glow effect the mockup doesn't have.

**Fix:** Change to `text-[18px]`, remove drop-shadow.

---

### GAP 9: Nav link font family
| | Mockup | App |
|---|---|---|
| Font | `'Inter', sans-serif` | `font-[var(--font-heading)]` = Space Grotesk |

Nav links should use Inter, not Space Grotesk.

**Fix:** Change `font-[var(--font-heading)]` to `font-[var(--font-body)]` on nav links.

---

### GAP 10: Nav active link styling
| | Mockup | App |
|---|---|---|
| Color | `var(--text)` (white) | `text-[var(--color-primary)]` (amber) |
| Background | `rgba(251, 191, 36, 0.12)` | `bg-amber-500/10` (close) |
| Border | `1px solid rgba(251, 191, 36, 0.2)` | None |

Active nav links should be WHITE text with an amber bg + border, not amber text.

**Fix:** Update active link class: white text, add border.

---

### GAP 11: Nav link hover
| | Mockup | App |
|---|---|---|
| Hover bg | `rgba(251, 191, 36, 0.08)` | `bg-[var(--color-surface-2)]` (solid gray) |

Hover should have a subtle amber tint, not a gray surface.

**Fix:** Change hover bg to `hover:bg-amber-500/[0.08]`.

---

### GAP 12: Nav link border-radius
| | Mockup | App |
|---|---|---|
| Radius | `7px` | `rounded-lg` = `8px` |

Minor difference. Could update to `rounded-[7px]` for precision.

---

### GAP 13: Avatar shape
| | Mockup | App |
|---|---|---|
| Shape | `border-radius: 7px` (rounded square) | `rounded-full` (circle) |
| Background | `linear-gradient(135deg, var(--primary), var(--accent))` | Varies per avatar type |
| Shadow | `0 2px 8px rgba(251, 191, 36, 0.25)` | None |

The mockup avatar is a **rounded square** with gradient background and shadow. The app uses circles.

**Fix:** This affects `UserAvatar` in TopNavbar.jsx. Change to rounded-[7px] for the initials variant.

---

## TIER 3 — Medium/Minor Gaps

### GAP 14: Missing page count
The mockup shows `<span class="page-count">12 decks</span>` inline with the title. The app has no deck count.

**Fix:** Add deck count next to title: `<span className="text-sm text-[var(--color-muted)]">{decks.length} decks</span>`

---

### GAP 15: Mana pip gap
| | Mockup | App |
|---|---|---|
| Gap | `5px` | `gap-0.5` = `2px` |

Mana symbols are too tightly packed.

**Fix:** Change `gap-0.5` to `gap-[5px]` in `ColorPips`.

---

### GAP 16: Commander art border width
| | Mockup | App |
|---|---|---|
| Border | `1.5px solid` | `border` = `1px solid` |

Subtle but the mockup uses 1.5px borders on commander art.

**Fix:** Change `border` to `border-[1.5px]` on commander art images.

---

### GAP 17: Skeleton row padding mismatch
Skeleton rows use `py-3 px-4` but real rows use `py-[18px] px-6`. The skeletons look cramped compared to real data.

**Fix:** Update `DeckRowSkeleton` td classes to use `py-[18px] px-6`.

---

### GAP 18: Navbar opacity
| | Mockup | App |
|---|---|---|
| Opacity | `0.85` | `0.9` (via `/90`) |

Very minor. Change to `/85` if we're being exact.

---

### GAP 19: Power level dash styling for unanalyzed decks
Mockup uses `color: var(--text-muted); font-weight: 500;` for the dash.

App uses `text-[var(--color-muted)] font-medium text-sm` — `font-medium` = 500 ✅. This is actually correct.

---

## Implementation Plan

### Phase A: CSS Variable Fixes (fixes 60%+ of visual issues)
**File:** `frontend/src/index.css`

1. Change `--color-border` from `#374151` to `#1e293b`
2. Change `--color-text` from `#e2e8f0` to `#f1f5f9`
3. Change `--color-surface-2` from `#1f2937` to `#1a202e`
4. Add `--color-border-light: #2d3748`
5. Add `--color-accent: #f59e0b`

This single change propagates to EVERY component using these variables — navbar, table, stat cards, modals, etc.

### Phase B: DashboardPage Layout Fixes
**File:** `frontend/src/pages/DashboardPage.jsx`

1. Change container `max-w-6xl` → `max-w-[1600px]`
2. Change page padding `p-6` → `px-8 pt-10 pb-6`
3. Add page count next to title
4. Make title + count a flex row with `items-baseline gap-4`
5. Remove `bg-[var(--color-bg)]` from both `<tbody>` elements
6. Rewrite `StatusBadge` component fully (dot, 7px radius, 11px, proper padding/colors, "Pending" text)
7. Update `ColorPips` gap from `gap-0.5` to `gap-[5px]`
8. Update commander art border from `border` to `border-[1.5px]`
9. Update `DeckRowSkeleton` td padding to `py-[18px] px-6`

### Phase C: TopNavbar Fixes
**File:** `frontend/src/components/TopNavbar.jsx`

1. Brand: `text-xl md:text-2xl` → `text-[18px]`, remove `drop-shadow`
2. Nav links: `font-[var(--font-heading)]` → `font-[var(--font-body)]`
3. Active link: amber text → white text + `border border-[var(--color-primary)]/20`
4. Nav link hover: `hover:bg-[var(--color-surface-2)]` → `hover:bg-amber-500/[0.08]`
5. Nav link radius: `rounded-lg` → `rounded-[7px]`
6. Avatar initials variant: `rounded-full` → `rounded-[7px]`, add gradient bg and shadow
7. Navbar bg: `/90` → `/85` (optional)

### Order of Implementation
1. **Phase A first** — CSS variables. Instant improvement across every page.
2. **Phase B second** — Dashboard-specific layout and components.
3. **Phase C third** — Navbar.

This ensures maximum visual improvement with minimum changes first.
