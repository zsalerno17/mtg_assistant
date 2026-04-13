# Design System Implementation — MTG Assistant

**Decision Date:** April 12, 2026  
**Implementation Status:** Foundation Complete ✅

---

## 📋 Design Decisions (Locked)

### 1. Color Palette — Option C: **Arcane Spectrum**

**Chosen for:** MTG 5-color palette with high contrast, rich immersive feel

**Dark Mode Colors:**
```css
Background:     #070813
Surface:        #0d1020
Surface-2:      #14182d
Border:         #1e2540
Primary (Blue): #4ca8e0
Secondary (Gold): #d8a848
Success (Green): #5ec070
Danger (Red):   #e85868
Text:           #ecf2fa
Text Muted:     #92a8c8
Text Subtle:    #4a5a78
```

**MTG Color Identity:**
- White:  #f4f0e0
- Blue:   #4ca8e0
- Black:  #9875d8
- Red:    #e85868
- Green:  #5ec070

**Light Mode:** Full palette defined with WCAG AA contrast compliance (4.5:1 minimum for body text).

**Rationale:** 
- Embraces MTG's core 5-color identity system
- Higher contrast than other options (Deep Ocean felt too tech-forward, Forge was too warm)
- Balanced — neither cold nor warm dominant
- Versatile for data visualization (each color is semantically distinct)

---

### 2. Typography — Option D: **Cinzel + Inter**

**Font Hierarchy:**
- **Brand/Logo:** Cinzel (serif, 700 weight, wide letter-spacing)
- **Headings (H1-H3):** Cinzel (serif, 600-700 weight)
- **Body Text:** Inter (sans-serif, 400-600 weight)
- **UI Elements:** Inter (sans-serif, 500-600 weight)
- **Data/Tables:** Inter (sans-serif, 500 weight, tabular nums)
- **Code/IDs:** JetBrains Mono (monospace, 400-500 weight)

**Rationale:**
- **Cinzel:** Brings MTG gravitas and fantasy flavor to headings without sacrificing readability. Inspired by classical Roman inscriptions — evokes spellbooks and ancient tomes.
- **Inter:** Modern, crisp, highly legible for body text. Optimized for screens. Better scannability than serif body fonts (Alegreya felt too literary).
- **Hybrid approach** gives best of both worlds: personality + clarity.

**Font Scale:**
```
--text-xs:   11px  (helper text, timestamps, badges)
--text-sm:   13px  (muted body, table data)
--text-base: 15px  (body text)
--text-lg:   17px  (emphasized body)
--text-xl:   20px  (small headings)
--text-2xl:  24px  (section headings)
--text-3xl:  32px  (page titles)
```

---

### 3. Component Style — **Crisp**

**Visual Treatment:**
- **Flat surfaces** (no gradients, no inner shadows)
- **Borders carry structure** (1px solid borders define edges)
- **No ambient glow effects** (glow reserved for primary buttons only in dark mode)
- **Clean borders** with subtle color variations (--color-border vs --color-border-light)
- **Hover states:** Translate + subtle border color shift (not scale or heavy effects)

**Component Examples:**
- Cards: `background: surface`, `border: 1px solid border`, `border-radius: 10px`
- Buttons: Flat backgrounds, borders for ghost/secondary variants, glow only on primary
- Tables: Alternating row hover with `surface-hover`, no zebra striping
- Inputs: Flat with border, focus ring (3px subtle + 1px border-focus)

**Rationale:**
- Crisp style keeps UI scannable and uncluttered
- Borders provide clear visual hierarchy without visual noise
- Glowing style (Option B) felt too playful/game-like for a productivity tool
- Works seamlessly in both dark and light modes

---

### 4. Motion Profile — **Cinematic**

**Animation Timings:**
```
--duration-instant: 100ms  (micro-interactions, color changes)
--duration-fast:    200ms  (hovers, simple transitions)
--duration-base:    350ms  (standard entrance/exit, Cinematic baseline)
--duration-slow:    500ms  (complex animations, dramatic reveals)
--duration-slower:  700ms  (page transitions)
```

**Easing Curves:**
```
--easing-default: cubic-bezier(0.4, 0, 0.2, 1)       /* ease-in-out */
--easing-spring:  cubic-bezier(0.34, 1.56, 0.64, 1)  /* dramatic bounce */
--easing-entrance: cubic-bezier(0, 0, 0.2, 1)        /* ease-out */
--easing-exit:    cubic-bezier(0.4, 0, 1, 1)         /* ease-in */
```

**Stagger Entrances:**
- List items stagger by 60ms delay each
- Used for deck grids, league standings, card lists
- Creates sense of depth and dimension

**Special Effects:**
- Primary button glow in dark mode (0 0 16px primary-glow)
- Hover scale: 1.02 (slight lift on interactive cards)
- Active scale: 0.98 (tactile press feedback)

**Rationale:**
- 350ms baseline feels intentional without dragging (vs 150ms "Grounded" which felt too snappy)
- Spring easing adds playfulness on button interactions
- Stagger entrances create visual interest on page load
- Matches MTG's dramatic, theatrical identity

**Light Mode Adjustments:**
- Glow effects reduced to standard drop shadows (no luminous glow in light)
- Shadows use lower opacity (8% vs 18% in dark)
- Primary button shadow: `0 2px 8px primary-glow` (not halo)

---

## 🎨 Implementation Files

### Core Design Tokens
**File:** `frontend/src/styles/tokens.css`  
**Contents:**
- ✅ Color palette (dark + light mode via `[data-theme="light"]`)
- ✅ Typography scale (font families, sizes, weights, line heights, letter spacing)
- ✅ Spacing scale (0-24 in 4px increments)
- ✅ Border radii (sm/md/lg/xl/full)
- ✅ Shadows (crisp elevation + focus rings + button glow)
- ✅ Motion tokens (durations, easing curves, stagger delay)
- ✅ Z-index layers (dropdown/sticky/overlay/modal/popover/tooltip/toast)

### Component Classes
**File:** `frontend/src/styles/components.css`  
**Contents:**
- ✅ Buttons (primary/secondary/ghost/danger/text/icon, sm/lg sizes, loading state)
- ✅ Cards (base card, hover variant, elevated variant, stat-card components)
- ✅ Badges (primary/secondary/success/danger/warning + MTG 5-color identity)
- ✅ Forms & Inputs (input, label, helper/error text, focus states)
- ✅ Tables (wrapper, thead/tbody styles, row hover, highlight row, cell variants)
- ✅ Navigation (nav, nav-brand, nav-links, nav-link active state)
- ✅ Animations (fade-in, slide-up, stagger, skeleton pulse)
- ✅ Utilities (text/link helpers, divider, focus-visible)

### Main Entry Point
**File:** `frontend/src/index.css`  
**Changes:**
- ✅ Google Fonts import (Cinzel, Inter, JetBrains Mono)
- ✅ Import tokens.css and components.css
- ✅ Global base styles (body background texture + gradients)
- ✅ Typography defaults (h1-h6, p, code, pre)
- ✅ Custom scrollbar (uses --color-border-light on hover)
- ✅ Text selection (uses --color-primary-subtle)
- ✅ Tailwind theme mapping (for compatibility with existing utility classes)

---

## 📦 Dependencies Installed

```bash
npm install framer-motion
```

**Framer Motion** (for advanced Cinematic motion):
- Page transitions
- Orchestrated stagger animations
- Spring physics for interactive elements
- Scroll-triggered animations (future enhancement)

---

## 🚀 Next Steps

### Immediate (Required for rollout):
1. **Set up shadcn/ui** in CSS variables mode
   - Run: `npx shadcn@latest init` in `frontend/`
   - Install base components: Button, Card, Table, Badge, Dialog, Dropdown, Avatar, Input, Select, Tabs, Skeleton, Tooltip, NavigationMenu, Sheet
   - Override shadcn CSS vars in tokens.css to match design system

2. **Rebuild TopNavbar.jsx**
   - Replace hardcoded colors with token references
   - Use `.nav`, `.nav-brand`, `.nav-link` classes from components.css
   - Replace Tailwind `bg-amber-500` → `bg-primary` (or use component classes)
   - Apply Cinzel to brand, Inter to nav links

3. **Rebuild DeckPage.jsx**
   - Replace stat cards with `.stat-card` component classes
   - Re-theme Recharts charts to use Arcane Spectrum colors
   - Apply stagger entrance to tab content
   - Use `.badge-mtg-*` for color identity

4. **Rebuild LeaguePage.jsx**
   - Use `.table-wrapper` and `.table` classes
   - Apply `.table-cell-primary` to user's own row
   - Use `.badge` for player status indicators
   - Apply stagger entrance to standings list

5. **Implement dark/light mode toggle**
   - Add theme switcher to TopNavbar
   - Toggle `data-theme="light"` on `<html>` element
   - Store preference in localStorage

### Medium-term (Enhancements):
- Page transition animations with framer-motion
- Scroll-triggered fade-ins on long pages (Collection, Dashboard)
- Interactive deck card flips on hover (3D transform)
- Toast notification system (re-themed to Arcane Spectrum)

### Future (Nice-to-have):
- Custom recharts theme preset for consistency
- Animated stat counter (count-up on mount)
- Parallax hero section on login page
- Seasonal theme variants (keep Arcane Spectrum as base, add overlays)

---

## 🎯 Design Principles (Reference)

1. **MTG-First:** Embrace Magic's visual language (5-color system, fantasy gravitas, strategic depth)
2. **Clarity Over Flash:** Information hierarchy always wins. Animations enhance, never distract.
3. **Token-Driven:** No hardcoded values. Every color, size, duration references a token.
4. **Accessible:** WCAG AA minimum (already validated in mockups). Focus states visible. Semantic HTML.
5. **Scalable:** Component classes compose. New features inherit the system automatically.

---

## 📝 Mockup Archive

**Color Palette Mockup:** `frontend/mockups/design-system/01-color-palettes-v2.html`  
**Typography Mockup:** `frontend/mockups/design-system/02-typography.html`  
**Components Mockup:** `frontend/mockups/design-system/03-components.html`  
**Motion Mockup:** `frontend/mockups/design-system/04-motion.html`

---

**End of Design Proposal**  
*This document serves as the canonical reference for all design decisions. Any deviations from this spec require explicit approval and an updated proposal document.*
