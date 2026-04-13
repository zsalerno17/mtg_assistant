# Icon System Audit & Migration Plan

> **Status:** In Progress  
> **Date:** April 12, 2026  
> **Phase:** Phase 38 (follows Phase 37 Button Design System)

---

## Goal

Consolidate 40+ scattered inline SVG icons into a unified system using **[Lucide Icons](https://lucide.dev)** (`lucide-react`). Current icons are ad-hoc, duplicated across 6+ files, and inconsistent (strokeWidth varies 1.5–2.5px).

---

## Decision: Use Lucide Icons

**Why Lucide:**
- 1000+ icons including a dedicated **Gaming** category with fantasy/RPG icons
- Has exact matches for our key icons: `Swords`, `Crown`, `Flame`, `Sparkles`, `WandSparkles`, `Trophy`
- Consistent `viewBox="0 0 24 24"` matches our current icons — zero visual disruption
- Tree-shakeable React import: `import { Home, Trophy } from 'lucide-react'`
- ISC license (MIT-compatible), actively maintained
- `strokeWidth`, `size`, and `className` props built in

**Rejected alternatives:**
- Heroicons — only 316 icons, missing `Swords`, `Crown`, fewer fantasy options
- Feather Icons — 280 icons, not enough coverage
- Phosphor Icons — good but adds complexity with multiple weights

---

## Scope

### Included in migration
- All inline `viewBox="0 0 24 24"` SVGs across the app
- Icon components in `LeagueIcons.jsx` and `DeckPage.jsx`
- Navigation, utility, status, and empty state icons

### Excluded from migration
- `frontend/public/icons.svg` — social media SVG sprite, different use case
- `frontend/src/lib/creatureIcons.jsx` — already centralized, game-icons.net CC-BY-3.0 assets
- `frontend/src/pages/LoginPage.jsx` `GoogleIcon` — brand asset, must stay custom

---

## Current Icon Inventory

### LeagueIcons.jsx (4 icons)
| Component | Description | Lucide Replacement |
|---|---|---|
| `TrophyIcon` | Trophy cup | `Trophy` |
| `CrownIcon` | Filled crown | `Crown` |
| `SwordsIcon` | Crossed swords | `Swords` |
| `FlameIcon` | Filled flame | `Flame` |

### DeckPage.jsx (9 icons)
| Component | Description | Lucide Replacement |
|---|---|---|
| `OverviewIcon` | 2x2 grid of squares | `LayoutGrid` |
| `UpgradeIcon` | Arrow pointing up | `ArrowUp` |
| `StrategyIcon` | Play button in circle | `CirclePlay` |
| `ImprovementsIcon` | Trending up chart | `TrendingUp` |
| `ScenariosIcon` | Chat bubble | `MessageSquare` |
| `IconWarning` | Triangle warning | `AlertTriangle` |
| `IconCheck` | Checkbox with check | `ClipboardCheck` |
| `IconChevronDown` | Chevron down | `ChevronDown` |
| `IconChevronLeft` | Chevron left | `ChevronLeft` |

### TopNavbar.jsx (9 icons, all inline)
| Usage | Description | Lucide Replacement |
|---|---|---|
| Profile dropdown | User silhouette | `User` |
| Help link | Question mark circle | `CircleHelp` |
| Light mode toggle | Sun with rays | `Sun` |
| Dark mode toggle | Crescent moon | `Moon` |
| Sign out | Door with arrow | `LogOut` |
| Mobile: Home | House | `House` |
| Mobile: Leagues | Trophy/chalice | `Trophy` |
| Mobile: Collection | Box/chest | `Package` |
| Mobile: Profile | User silhouette | `User` |

### DashboardPage.jsx (4 icons, all inline)
| Usage | Description | Lucide Replacement |
|---|---|---|
| View button | Eye | `Eye` |
| Loading spinner | Spinning arc | `LoaderCircle` |
| Analyze success | Checkbox with check | `ClipboardCheck` |
| Empty state | Crossed swords | `Swords` |

### CollectionPage.jsx (1 icon, inline)
| Usage | Description | Lucide Replacement |
|---|---|---|
| Empty state upload | Cloud with arrow | `CloudUpload` |

### HelpPage.jsx (12 icons, all inline)
| Usage | Description | Lucide Replacement |
|---|---|---|
| Getting Started section | Question mark circle | `CircleHelp` |
| Collection section | Box/calendar | `Package` |
| Decks section | Document/file | `FileText` |
| AI Features section | Stack of layers | `Layers` |
| League Tracking section | Group of users | `Users` |
| Card Resources section | Magnifying glass | `Search` |
| External link × 3 | Arrow top-right | `ExternalLink` |
| Chevron right (links) | Right arrow | `ChevronRight` |

---

## Migration Steps

### Step 1 — Visual Audit (current)
- [x] Create `frontend/src/pages/IconShowcasePage.jsx` displaying all current icons
- [x] Add temporary `/icons-dev` route in `App.jsx`
- [ ] Review showcase page to spot visual inconsistencies

### Step 2 — Install Lucide
```bash
cd frontend && npm install lucide-react
```

### Step 3 — Map and verify replacements
For each icon in the inventory above, visit [lucide.dev/icons/{name}](https://lucide.dev/icons/) and confirm the visual match is acceptable. Note any icons that need custom alternatives.

**Potential gaps to verify:**
- `CrownIcon` — Lucide `Crown` is stroke-based; current custom icon is filled. May need `fill="currentColor"` override.
- `FlameIcon` — Similar issue. Lucide `Flame` is stroke-based.
- Check if `Swords` in Lucide matches the crossed-swords style we want.

### Step 4 — Refactor `LeagueIcons.jsx`
Replace custom SVG components with Lucide imports. Keep the same exported names so callers don't need to change:

```jsx
// Before
export function TrophyIcon({ className = 'w-10 h-10' }) { ... }

// After
import { Trophy } from 'lucide-react'
export function TrophyIcon({ className = 'w-10 h-10' }) {
  return <Trophy className={className} />
}
```

Or simplify callers directly if the usage is simple enough.

### Step 5 — Refactor `DeckPage.jsx`
Replace the 9 icon component definitions with Lucide imports at the top of the file.

### Step 6 — Refactor `TopNavbar.jsx`
Replace all 9 inline SVGs with named Lucide components. Import at top of file.

### Step 7 — Refactor remaining pages
Replace inline SVGs in `DashboardPage.jsx`, `CollectionPage.jsx`, `HelpPage.jsx`.

### Step 8 — Standardize props
All icons should use:
- `size={16|20|24}` (Lucide numeric prop) OR `className="w-N h-N"` (Tailwind)
- `strokeWidth={2}` (standardize to 2px everywhere)
- `aria-hidden="true"` on all decorative icons

### Step 9 — Cleanup
- Remove `/icons-dev` from production router (or gate behind `import.meta.env.DEV`)
- Search for `viewBox="0 0 24 24"` — should only find `creatureIcons.jsx` and `GoogleIcon`
- Verify bundle size didn't grow unexpectedly

---

## Verification Checklist

- [ ] `/icons-dev` shows all current icons in grid
- [ ] `lucide-react` installed
- [ ] All Lucide replacements visually validated on showcase page
- [ ] `LeagueIcons.jsx` migrated
- [ ] `DeckPage.jsx` migrated
- [ ] `TopNavbar.jsx` migrated
- [ ] `DashboardPage.jsx` migrated
- [ ] `CollectionPage.jsx` migrated
- [ ] `HelpPage.jsx` migrated
- [ ] All decorative icons have `aria-hidden="true"`
- [ ] strokeWidth standardized to `2` everywhere
- [ ] No regressions in visual appearance
- [ ] `/icons-dev` route removed or gated to dev-only

---

## Icon Showcase Page

**Route:** `/icons-dev` (dev-only, temporary)  
**File:** `frontend/src/pages/IconShowcasePage.jsx`  
**Purpose:** Visual grid of all current icons grouped by category and source file, with labels showing icon name, strokeWidth, and Lucide replacement target.
