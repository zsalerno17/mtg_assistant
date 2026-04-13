# Design System — Color Palette

> **Status:** ✅ Approved — April 13, 2026 (REFINED with darker backgrounds)  
> **Phase:** Phase 38 Design Overhaul — Phase 0 (Color Foundation)  
> **Interactive Mockup:** `frontend/mockups/redesign-38/custom-palette-options.html`

---

## Foundation Colors

These 5 colors are the foundation of the entire design system. All other colors (surfaces, borders, etc.) are derived from these.

| Color | Hex | Usage |
|---|---|---|
| **Dark Charcoal** | `#1a1f24` | **REFINED** Dark mode background, Light mode text *(darkened from #23292E per user feedback)* |
| **Blue** | `#2D82B7` | Primary accent (buttons, links, brand, headers, graphs) |
| **Red** | `#79161D` | Secondary accent (emphasis, more prominent in light mode) |
| **Tan** | `#DBAC84` | Tertiary accent (warmth, more prominent in dark mode) |
| **Off White** | `#E2E6E9` | Light mode background, Dark mode text |

---

## Color Philosophy

**Neutral foundation + strategic MTG-inspired accents**

- Base UI is neutral gray scale (Dark Charcoal → Off White)
- Color is applied intentionally for:
  - **Blue:** Primary brand, interactive elements, data visualization
  - **Red:** Alerts, emphasis, light mode warmth
  - **Tan:** Dark mode warmth, secondary actions, subtle highlights
- MTG flavor comes from **card art + mana pips + Scryfall images**, not UI chrome colors
- Avoid overwhelming the user — let the content (commander cards, deck stats) provide personality

---

## Derived Tokens (REFINED DARK MODE)

### Dark Mode

| Token | Value | Derivation | Usage |
|---|---|---|---|
| `--bg-dark` | `#1a1f24` | Foundation (REFINED darker) | Page background |
| `--surface-dark` | `#23292E` | Previous bg-dark (shifted down) | Cards, elevated surfaces |
| `--border-dark` | `#2d3439` | Previous surface-dark (shifted down) | Card borders, dividers |
| `--text-dark` | `#E2E6E9` | Foundation (Off White) | Primary text |
| `--text-dark-secondary` | `#94a3b8` | Muted gray | Labels, secondary text |
| `--accent-primary` | `#2D82B7` | Foundation (Blue) | Primary buttons, links, brand |
| `--accent-secondary` | `#DBAC84` | Foundation (Tan) | Secondary buttons, highlights |
| `--accent-tertiary` | `#79161D` | Foundation (Red) | Alerts, danger actions |

**Refinement rationale:** User feedback requested "Make the background on dark mode darker - can be a dark grey. then we can make the foreground grey elements darker as well." The darker background (#1a1f24) provides better contrast for elevated surfaces (#23292E) and creates clearer visual hierarchy.

### Light Mode

| Token | Value | Derivation | Usage |
|---|---|---|---|
| `--bg-light` | `#E2E6E9` | Foundation | Page background |
| `--surface-light` | `#f5f7f8` | Off White + 5% lighter | Cards, elevated surfaces |
| `--border-light` | `#d2d6d9` | Off White + 10% darker | Card borders, dividers |
| `--text-light` | `#23292E` | Foundation (Charcoal) | Primary text |
| `--text-light-secondary` | `#5a6268` | Charcoal + 60% lighter | Labels, secondary text |
| `--accent-primary` | `#2D82B7` | Foundation (Blue) | Primary buttons, links, brand |
| `--accent-secondary` | `#79161D` | Foundation (Red) | Secondary buttons, emphasis |
| `--accent-tertiary` | `#DBAC84` | Foundation (Tan) | Subtle highlights |

---

## Usage Guidelines

### Blue (#2D82B7) — Primary Accent
**Use for:**
- Primary action buttons (`Analyze Deck`, `Save`, `Create League`)
- Brand elements (logo accent, navigation active state)
- Interactive links
- Data visualization (bar charts, stat highlights)
- Headers/section titles that need emphasis

**Don't use for:**
- Body text
- Large background areas
- Non-interactive decorative elements

### Red (#79161D) — Secondary Accent
**Use for:**
- Danger actions (`Delete`, `Remove`, `Cancel League`)
- Alert states (warnings, errors)
- Light mode: secondary buttons, stat emphasis
- Dark mode: sparingly — too dark to be prominent

**Don't use for:**
- Primary CTAs (use Blue)
- Success states (use Green from MTG mana colors if needed)

### Tan (#DBAC84) — Tertiary Accent
**Use for:**
- Dark mode: secondary buttons, warm highlights, stat badges
- Dark mode: "premium" moments (league standings, achievements)
- Light mode: sparingly — too light to be prominent

**Don't use for:**
- Primary CTAs
- Critical actions

---

## Shade Generation Rules

When you need lighter/darker variations:

**Lightening (for hover states, backgrounds):**
- Use `color-mix(in srgb, [base-color] [percentage], white)` in CSS
- Example: `color-mix(in srgb, #2D82B7 85%, white)` = lighter blue

**Darkening (for pressed states, borders):**
- Use `color-mix(in srgb, [base-color] [percentage], black)` in CSS
- Example: `color-mix(in srgb, #2D82B7 85%, black)` = darker blue

**Opacity for text/secondary elements:**
- Use `color-mix(in srgb, [base-color] [percentage], transparent)` in CSS
- Example: `color-mix(in srgb, #E2E6E9 60%, transparent)` = 60% opacity Off White

---

## Dark vs. Light Mode Strategy

### Dark Mode (Default)
- **Background:** `#23292E` (Dark Charcoal)
- **Text:** `#E2E6E9` (Off White)
- **Accent hierarchy:** Blue (primary) → Tan (secondary/warmth) → Red (alerts)
- **Why Tan?** Light color provides warmth and contrast against dark background

### Light Mode
- **Background:** `#E2E6E9` (Off White)
- **Text:** `#23292E` (Dark Charcoal)
- **Accent hierarchy:** Blue (primary) → Red (secondary/emphasis) → Tan (subtle)
- **Why Red?** Dark color provides contrast and emphasis against light background

---

## Implementation Notes

### CSS Custom Properties (tokens.css)

```css
:root {
  /* Foundation colors */
  --color-charcoal: #23292E;
  --color-blue: #2D82B7;
  --color-red: #79161D;
  --color-tan: #DBAC84;
  --color-off-white: #E2E6E9;
  
  /* Dark mode (default) */
  --color-bg: var(--color-charcoal);
  --color-surface: #2d3439;
  --color-border: #3a4248;
  --color-text: var(--color-off-white);
  --color-text-secondary: color-mix(in srgb, var(--color-off-white) 60%, transparent);
  --color-accent-primary: var(--color-blue);
  --color-accent-secondary: var(--color-tan);
  --color-accent-tertiary: var(--color-red);
}

[data-theme="light"] {
  --color-bg: var(--color-off-white);
  --color-surface: #f5f7f8;
  --color-border: #d2d6d9;
  --color-text: var(--color-charcoal);
  --color-text-secondary: color-mix(in srgb, var(--color-charcoal) 60%, transparent);
  --color-accent-primary: var(--color-blue);
  --color-accent-secondary: var(--color-red);
  --color-accent-tertiary: var(--color-tan);
}
```

### Component Usage

**Primary Button:**
```css
.btn-primary {
  background: var(--color-accent-primary);
  color: var(--color-bg);
  /* Blue button with background-appropriate text */
}
```

**Secondary Button:**
```css
.btn-secondary {
  background: transparent;
  border: 1px solid var(--color-accent-secondary);
  color: var(--color-accent-secondary);
  /* Tan in dark mode, Red in light mode */
}
```

**Stat Value (with accent):**
```css
.stat-value-accent {
  color: var(--color-accent-primary);
  /* Blue for important metrics */
}
```

---

## Testing Checklist

When implementing these colors:

- [ ] Verify contrast ratios (WCAG AA minimum):
  - Text on background: 4.5:1 minimum
  - Large text (18px+) on background: 3:1 minimum
  - UI controls: 3:1 minimum
- [ ] Test both dark and light modes
- [ ] Verify Blue is used for 90% of primary actions
- [ ] Verify Tan/Red swap prominence between dark/light modes
- [ ] Check that accent colors don't dominate — they should guide, not overwhelm
- [ ] Ensure MTG flavor comes from card art/mana pips, not UI chrome colors

---

## Reference

- **Interactive Mockup:** Open `frontend/mockups/redesign-38/custom-palette-options.html` in a browser to see the live palette editor with these defaults loaded. You can adjust colors and see real-time updates.
- **Design Brief:** `.github/phase-38-design-overhaul.md`
- **Design Analysis:** `.github/archive/design-analysis.md`
