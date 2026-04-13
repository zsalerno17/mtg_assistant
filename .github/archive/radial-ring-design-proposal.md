# Radial Progress Rings — Design Proposal

**Problem:** Current target notation ("/ 8", "≤ 3.0") below the stat label feels awkward and scannability suffers. The target info is separated from the number itself, forcing users to scan vertically across three text layers (value → label → target).

**User feedback:** "Having the /number at the bottom is weird"

---

## Diagnosis: What's wrong with the current design?

1. **Vertical text scan is inefficient.** User's eye path: center ring (7) → label below (Removal) → target notation below that (/ 8). That's three separate focal points for one piece of information.

2. **Target notation competes with the label.** The label should be the identifier ("what is this stat?"), but the target notation draws equal visual weight, creating ambiguity about what the secondary text means.

3. **Inconsistent information density.** "Cards" has no target. "Avg CMC" shows "≤ 3.0" (cryptic math notation). Others show "/ 8" (fraction notation). This inconsistency makes the UI feel unfinished.

4. **The ring itself is underutilized.** The circular progress already communicates "you're 7/8 of the way there" visually — but then we still spell it out textually below. That's redundant.

5. **Mobile concern.** On smaller screens, three lines of text per badge (value + label + target) makes the grid cramped. Eight stats × three text layers = a lot of vertical scanning.

---

## Recommended Direction: **Integrated fraction in center**

**What changes:**
- Move target into center of ring, displayed as "7/8" (for normal stats) or "2.8/3.0" (for Avg CMC)
- Label remains below ring (no change)
- Remove the separate target notation line entirely

**Visual hierarchy:**
```
┌─────────────┐
│  ○ ○ ○ ○ ○  │  ← Ring color shows health (green/amber/rose)
│ ○         ○ │
│○    7/8    ○│ ← Center: current/target (larger font, mono)
│ ○         ○ │
│  ○ ○ ○ ○ ○  │
│             │
│   Removal   │  ← Label below (unchanged)
└─────────────┘
```

**Typography specifics:**
- Numerator (current value): `font-bold`, slightly larger
- "/" divider: `font-normal`, muted color
- Denominator (target): `font-normal`, slightly smaller or muted

Example CSS (Tailwind):
```jsx
<div className="text-center font-[var(--font-mono)]">
  <span className="text-lg font-bold text-[var(--color-text)]">7</span>
  <span className="text-sm text-[var(--color-muted)]">/</span>
  <span className="text-sm text-[var(--color-muted)]">8</span>
</div>
```

**Why this works:**

1. **Single focal point.** User reads one piece of information: "7 out of 8." The ring visually reinforces this (87.5% filled).

2. **Standard pattern.** Fraction notation is instantly recognizable. No cryptic symbols ("≤") or isolated denominators ("/ 8" floating alone).

3. **Better use of space.** Removes third text layer. Badge becomes two-layer: center fraction + label. Cleaner, more compact, especially on mobile.

4. **The ring IS the affordance.** Users understand circular progress intuitively. The fraction confirms what the visual already communicated. No need to restate the target separately.

5. **Handles edge cases gracefully:**
   - **"Cards" (no target):** Show just "99" in center (no fraction). Ring stays neutral gray.
   - **"Avg CMC" (inverted):** Show "2.8/3.0" — fraction still makes sense because the ring communicates "lower is better" through color (green at low values).

---

## Alternative Considered: Target in ring arc (rejected)

**Concept:** Display target as small text positioned along the inner edge of the ring circle.

**Why rejected:**

- **Readability on small screens.** Text curved along a 64px diameter circle would be tiny and hard to read on mobile.
- **Complexity vs. benefit.** Requires SVG text-on-path or absolute positioning hacks. Not worth the implementation cost for marginal aesthetic gain.
- **Fights with the stroke.** The ring stroke is the primary visual — overlaying text on it creates visual competition.

**When this pattern works:** Large radial charts (200px+ diameter) where there's room for legible curved text. Not appropriate for compact stat badges.

---

## Alternative Considered: Hover-only target (rejected)

**Concept:** Show only current value in center. Reveal target on hover (tooltip or expanded state).

**Why rejected:**

- **Breaks mobile.** No hover state on touch devices. Target would be invisible unless we add a tap-to-reveal pattern (adds interaction cost).
- **Hides critical context.** "Is 7 Removal good?" — user can't answer without knowing the target. The target isn't decoration; it's essential for interpreting the stat.
- **Color alone isn't enough.** Ring color (green/amber/rose) signals health, but users still need the target number to understand the scale. "7 green removal" — compared to what? 8? 20? The number matters.

**When this pattern works:** Secondary metadata that's nice-to-know but not essential for the primary reading (e.g., "Last updated 3 days ago"). Targets aren't secondary here — they define what the stat means.

---

## Which stats should show targets?

**Recommendation: Show targets for all stats that have them. Hide for stats without targets.**

**Rationale:**

- **Cards:** No target. Display as "99" (no fraction). Ring stays neutral.
- **Avg CMC, Lands, Ramp, Draw, Removal, Wipes:** All have targets. Display as fractions.

**Why not hide targets selectively?**

- Creates inconsistency: "Why do some stats show fractions and others don't?" Users will wonder if they're missing information.
- The presence/absence of a target is meaningful: "Cards" is descriptive (deck size), others are prescriptive (target thresholds). Showing targets only where they exist makes that distinction clear.

**Edge case — Avg CMC display:**

- Show as "2.8/3.0" (fraction notation), NOT "2.8 ≤ 3.0" (inequality)
- Fraction is more scannable and consistent with other stats
- The ring color already communicates direction (green = good/low, rose = bad/high)

---

## Additional scannability improvements (independent of target notation)

These can be implemented separately or alongside the fraction change:

### 1. **Bolder value typography**
- Increase center value font size: `text-lg` → `text-xl` or `text-2xl`
- More weight: `font-bold` → `font-extrabold`
- **Why:** Makes the number the hero. Users should read the stat value first, label second.

### 2. **Reduce label font size**
- Current: `text-xs`
- Proposed: `text-[10px]` or `text-[11px]`
- **Why:** Label is wayfinding (tells user what the number represents), not primary content. Reducing size creates better hierarchy and frees up vertical space.

### 3. **Grid layout optimization (mobile)**
- Current: Likely 4 columns or auto-fit grid
- Proposed: `grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8`
- **Why:** On small mobile (320-375px width), 4 columns makes each badge tiny. 2 columns gives each stat more breathing room.

### 4. **Ring size responsive scaling**
- Current: Fixed 64×64px
- Proposed: `w-16 h-16 sm:w-20 sm:h-20` (64px → 80px on larger screens)
- **Why:** Larger rings on desktop improve readability and feel less cramped. Smaller screens stay at 64px for grid density.

### 5. **Subtle hover state (desktop only)**
- `hover:scale-105 transition-transform cursor-default`
- **Why:** Adds life to the interface. Cards can slightly lift on hover to signal interactivity, even if there's no click action. Feels more polished.

---

## MTG Aesthetic Consistency

The current design already nails the MTG aesthetic:

- **Color coding:** Green (healthy), amber (warning), rose (danger) mirrors MTG's Green = good, Red = bad color philosophy.
- **Circular motifs:** Radial rings echo mana symbols (circular iconography is MTG's visual language).
- **Monospaced numerics:** Using `font-mono` for stats gives a "game stats screen" feel (life totals, P/T, etc.).

**To amplify MTG aesthetic in the fraction notation:**

- Keep mono font: "7/8" in monospace reads like creature P/T ("7/8 creature").
- Consider mana pip-inspired colors: The ring colors already do this. Could add subtle glow (`drop-shadow`) on green/amber/rose rings to evoke foil card sheen.

---

## Implementation Checklist

**Phase 1: Core fraction notation**
- [ ] Update `StatBadge` center display to show "7/8" instead of "7"
- [ ] Remove target notation line below label
- [ ] Handle "Cards" edge case (no fraction, just number)
- [ ] Handle "Avg CMC" display (2.8/3.0 format)

**Phase 2: Typography refinement**
- [ ] Increase center value font size (`text-xl` or `text-2xl`)
- [ ] Style fraction: bold numerator, muted denominator
- [ ] Reduce label font size (`text-[11px]`)

**Phase 3: Responsive polish**
- [ ] Add 2-column mobile grid layout
- [ ] Scale ring size on larger screens (optional)
- [ ] Add hover state (optional)

**Phase 4: Visual testing**
- [ ] Test on mobile (375px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1440px+ width)
- [ ] Verify all stats (Cards, Avg CMC, Lands, Ramp, Draw, Removal, Wipes)
- [ ] Check color contrast (green/amber/rose against dark/light backgrounds)

---

## Final Recommendation

**Implement Direction: Integrated fraction in center.**

This is the highest-impact, lowest-risk change. It solves the core problem (awkward separated target notation), improves scannability (single focal point), and feels like a natural evolution of the existing design rather than a complete rework.

The optional improvements (bolder type, responsive scaling, hover states) can be added incrementally if needed, but the fraction notation alone is a significant UX win.

**Expected user reaction:** "Oh, that's way cleaner." The fraction notation is so standard that users won't even consciously notice the change — they'll just find the stats easier to read. That's the mark of good design.
