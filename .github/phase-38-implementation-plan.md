# Phase 38 Implementation Plan — Evidence-Based Execution

> **Created:** April 13, 2026  
> **Status:** 🚧 IN PROGRESS  
> **Design Approved:** ✅ Phase 0 mockups complete  
> **Implementation:** Phase A in progress

---

## Critical Process Safeguards

### Why This Plan Exists

Previous attempt marked "Phase A-G COMPLETE ✅" when only ~40% done. Root cause: No verification, comments added without implementation, status updated without evidence.

### Non-Negotiable Rules

1. **Evidence Required for Completion**
   - Screenshot showing before/after
   - List of files actually modified
   - Verification checklist passed
   - Side-by-side mockup comparison

2. **Update Implementation Log, Not This Document**
   - Track progress in `/memories/session/implementation-log.md`
   - Only mark this document complete after FINAL verification
   - Each phase must be verified before next phase starts

3. **Incremental Verification Gates**
   - Run phase-specific verification after each phase
   - Compare to mockup visually
   - STOP if discrepancies found

4. **Atomic Commits with Evidence**
   - Every phase change = separate commit
   - Commit message includes what changed + verification note
   - Creates audit trail of actual work

---

## Implementation Phases

### Phase A — Color Palette Foundation ⬜

**Goal:** Replace Arcane Spectrum with Phase 38 refined neutral palette

**Files to Modify:**
- `frontend/src/styles/tokens.css` (lines 23-80)

**Specific Changes:**

```css
/* BEFORE (Arcane Spectrum) */
--color-bg: #070813;
--color-surface: #0d1020;
--color-surface-2: #14182d;
--color-border: #1e2540;
--color-border-light: #2a3458;
--color-primary: #4ca8e0;
--color-secondary: #d8a848;

/* AFTER (Phase 38 Refined) */
--color-bg: #1a1f24;
--color-surface: #23292E;
--color-surface-2: #2d3439;
--color-border: #2d3439;
--color-border-light: #3a4248;
--color-primary: #2D82B7;
--color-secondary: #DBAC84;
```

**Light Mode Updates:**
- Update corresponding light mode tokens to match mockup specs
- Verify contrast ratios remain accessible

**Verification Checklist:**
```bash
# 1. Inspect in DevTools
# Open app → Inspect → Computed → Verify CSS variables
✓ --color-bg shows #1a1f24 (not #070813)
✓ --color-primary shows #2D82B7 (not #4ca8e0)
✓ --color-secondary shows #DBAC84 (not #d8a848)

# 2. Visual check
✓ Background is lighter neutral gray (not pure black)
✓ Blue accent is muted/professional (not bright sky blue)
✓ Warmth comes from tan (not gold)

# 3. Automated
npm run build  # Must pass clean
```

**Evidence Required:**
- Screenshot: DevTools showing new CSS variable values
- Screenshot: App background comparison (before/after)
- Commit: "Phase A: Replace Arcane Spectrum with Phase 38 refined palette"

**Done When:** All verification checks pass + logged in implementation log

---

### Phase B — DeckPage Desktop Layout ⬜

**Depends on:** Phase A verified ✅

**Goal:** Restructure DeckPage to match final-spec-deckpage-desktop.html

**Files to Modify:**
- `frontend/src/pages/DeckPage.jsx` (OverviewTab component, lines 240-500)

**Specific Changes:**

**B1 — Commander Hero Restructure:**
```jsx
// Current: Vertical flex with small 72×100px art
// New: Horizontal flexbox with gradient background

<div className="bg-[var(--color-surface)]/80 backdrop-blur-sm 
     border border-[var(--color-primary)]/20 rounded-xl px-6 py-5">
  {/* Change to: */}
  <div className="relative rounded-2xl px-6 py-6 border border-[var(--color-primary)]"
       style={{ background: 'linear-gradient(135deg, rgba(45, 130, 183, 0.15) 0%, rgba(35, 41, 46, 0.8) 100%)' }}>
    <div className="flex items-center gap-6">
      {/* Art: 120×168px instead of 72×100px */}
      <CommanderImage name={...} size="large" />
      
      {/* Text info: flex-1 */}
      <div className="flex-1">
        <h2 className="font-display text-[--text-hero] text-[var(--color-primary)]">
          {commander name}
        </h2>
        {/* Color pips, strategy, power level */}
      </div>
      
      {/* Actions: column stack on right */}
      <div className="flex flex-col gap-3">
        {/* Action buttons */}
      </div>
    </div>
  </div>
```

**B2 — Promote Weaknesses to 2nd Section:**
- Move weaknesses section from bottom (after Role Composition, Resource Health)
- To: immediately after stats grid
- Update section ordering in JSX

**B3 — Two-Column Charts Layout:**
```jsx
// Mana Curve + Role Composition: side-by-side on ≥1024px
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div>{/* Mana Curve */}</div>
  <div>{/* Role Composition */}</div>
</div>
```

**Verification Checklist:**
```bash
# Visual comparison at 1024px+
✓ Open final-spec-deckpage-desktop.html
✓ Open running app DeckPage side-by-side
✓ Commander hero is horizontal layout with gradient bg
✓ Hero uses 120×168px art (larger, more prominent)
✓ Weaknesses is 2nd major section (after stats, before charts)
✓ Charts are two-column on desktop

# Responsive check
✓ At 1024px: Charts side-by-side
✓ At 768px: Charts stack to single column
```

**Evidence Required:**
- Screenshot: Before/after comparison (desktop at 1024px)
- Screenshot: Side-by-side with mockup showing match
- Video: Resize window showing responsive behavior

**Done When:** Layout matches mockup at all desktop breakpoints

---

### Phase C — DeckPage Mobile (Direction B) ⬜

**Depends on:** Phase B verified ✅

**Goal:** Implement massive hero editorial layout for <768px

**Files to Modify:**
- `frontend/src/pages/DeckPage.jsx` (add responsive breakpoint logic)

**Specific Changes:**

**C1 — Massive Commander Art Hero:**
```jsx
// Add responsive wrapper
<div className="lg:hidden">
  {/* Mobile: Direction B (Hero Editorial) */}
  <div className="relative -mx-4 mb-16" 
       style={{ 
         background: 'linear-gradient(180deg, rgba(45, 130, 183, 0.1) 0%, transparent 100%)',
         padding: '48px 16px'
       }}>
    {/* Centered vertical layout */}
    <div className="flex flex-col items-center gap-6 max-w-[600px] mx-auto">
      {/* Art: 280×392px (5:7 aspect) */}
      <CommanderImage name={...} size="hero" width={280} height={392} />
      
      {/* Name + info below art */}
      <div className="text-center">
        <h1 className="font-display text-4xl">{commander name}</h1>
        {/* Color pips, badges centered */}
      </div>
      
      {/* Full-width touch buttons */}
      <div className="w-full flex flex-col gap-3">
        <button className="btn btn-primary w-full">...</button>
      </div>
    </div>
  </div>
</div>

<div className="hidden lg:block">
  {/* Desktop: Direction A (from Phase B) */}
</div>
```

**C2 — Mobile Stats Horizontal Scroll:**
```jsx
<div className="lg:hidden overflow-x-auto -mx-4 px-4">
  <div className="flex gap-3 pb-2">
    {stats.map(stat => (
      <div className="min-w-[140px] shrink-0">
        <StatBadge {...stat} />
      </div>
    ))}
  </div>
</div>
```

**Verification Checklist:**
```bash
# Visual comparison at 375px
✓ Open final-spec-deckpage-mobile.html
✓ Open running app DeckPage on mobile simulator
✓ Commander art is MASSIVE (280×392px), centered
✓ Hero section has gradient fade overlay
✓ Weaknesses is 2nd section (prominent)
✓ Stats scroll horizontally with touch momentum
✓ All sections single-column vertical flow
✓ Buttons are full-width with 48px+ touch targets

# Test devices
✓ iPhone SE (375px)
✓ iPhone 14 Pro (390px)
✓ Pixel 7 (412px)
```

**Evidence Required:**
- Screenshot: Mobile view at 375px, 390px, 768px
- Video: Finger scrolling through page showing hero → stats → weaknesses flow

**Done When:** Mobile layout matches mockup exactly

---

### Phase D — Dashboard Polish ⬜

**Depends on:** Phase A verified ✅

**Goal:** Update commander art sizing + verify layout

**Files to Modify:**
- `frontend/src/pages/DashboardPage.jsx` (deck card components)

**Specific Changes:**

**D1 — Commander Art Sizing:**
```jsx
// Current: 46×64px
<CommanderImage width={46} height={64} />

// New: 60×84px (matches mockup spec)
<CommanderImage width={60} height={84} />

// May need to adjust card layout padding to accommodate
```

**D2 — Verify Max-Width:**
```jsx
// Ensure container max-width is appropriate
<div className="max-w-[900px] mx-auto px-6">
  {/* Dashboard content */}
</div>
```

**Verification Checklist:**
```bash
# Visual comparison
✓ Open final-spec-dashboard.html
✓ Commander thumbnails are 60×84px (measure in DevTools)
✓ Cards don't feel cramped with larger art
✓ Three-column grid at ≥1024px

# Responsive check
✓ 1024px+: 3 columns
✓ 768-1023px: 2 columns
✓ <768px: 1 column
```

**Evidence Required:**
- Screenshot: Before/after commander art sizing
- Screenshot: Side-by-side with mockup showing match

**Done When:** Art size matches mockup, responsive grid works

---

### Phase E — Collection Stats Header ⬜

**Depends on:** Phase A verified ✅

**Goal:** Add stats widget above upload section

**Files to Modify:**
- `frontend/src/pages/CollectionPage.jsx` (add stats component)

**Specific Changes:**

**E1 — Stats Header Component:**
```jsx
function CollectionStats({ collection }) {
  const totalCards = collection.length
  const lastUpdated = /* calculate from collection data */
  const avgValue = /* calculate if data available */
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] 
                      rounded-xl p-4">
        <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider mb-1">
          Total Cards
        </p>
        <p className="text-[var(--color-text)] text-2xl font-bold">
          {totalCards}
        </p>
      </div>
      
      <div className="...">
        <p>Last Updated</p>
        <p>{lastUpdated}</p>
      </div>
      
      {/* Avg Value, Total Value if available */}
    </div>
  )
}

// In CollectionPage render:
<h1>Collection</h1>
<CollectionStats collection={collection} />
{/* Upload section below */}
```

**Verification Checklist:**
```bash
# Visual comparison
✓ Open final-spec-collection.html
✓ Stats header appears above upload section
✓ Shows: Total Cards, Last Updated (minimum)
✓ Responsive: 2 cols mobile, 4 cols desktop

# Data check
✓ Total cards count is accurate
✓ Last updated shows reasonable value
```

**Evidence Required:**
- Screenshot: Collection page with stats header
- Screenshot: Side-by-side with mockup

**Done When:** Stats header matches mockup spec

---

### Phase F — Minor Polish ⬜

**Depends on:** All previous phases verified ✅

**Goal:** 3rd place badge color + final cleanup

**Files to Modify:**
- `frontend/src/pages/LeagueDetailPage.jsx` (rank badge logic)

**Specific Changes:**

**F1 — Distinct 3rd Place Color:**
```jsx
// Current: 1st and 3rd both use --color-secondary
// New: 3rd uses bronze/tan distinct color

const getRankColor = (rank) => {
  if (rank === 1) return 'bg-[#fbbf24]/15 text-[#fbbf24]'  // Gold
  if (rank === 2) return 'bg-[#94a3b8]/15 text-[#94a3b8]'  // Silver
  if (rank === 3) return 'bg-[#cd7f32]/15 text-[#cd7f32]'  // Bronze
  return 'text-[var(--color-text-muted)]'
}
```

**Verification Checklist:**
```bash
# Visual check
✓ League detail page standings table
✓ 1st place: Gold background
✓ 2nd place: Silver background
✓ 3rd place: Bronze background (distinct from 1st)
```

**Evidence Required:**
- Screenshot: Standings table showing all three colors distinct

**Done When:** 3rd place visually distinct from 1st place

---

## Final Verification (All Phases Complete)

**Before marking this document "COMPLETE":**

### Automated Checks
```bash
# 1. Build passes clean
npm run build

# 2. No gradient classes in JSX
grep -rn "bg-gradient-to-" frontend/src --include="*.jsx"
# Expected: Empty result OR only avatar presets (acceptable)

# 3. No old color values in CSS
grep -rn "#070813" frontend/src/styles
# Expected: Empty result

# 4. No hardcoded old primary blue
grep -rn "#4ca8e0" frontend/src/styles
# Expected: Empty result
```

### Visual Verification
```bash
# 1. Side-by-side comparison ALL mockups
✓ final-spec-dashboard.html vs. running Dashboard
✓ final-spec-deckpage-desktop.html vs. DeckPage (1024px+)
✓ final-spec-deckpage-mobile.html vs. DeckPage (<768px)
✓ final-spec-collection.html vs. Collection
✓ final-spec-league-detail.html vs. LeagueDetail
✓ final-spec-leagues-list.html vs. LeaguesList

# 2. Responsive breakpoint testing
✓ 375px (iPhone SE)
✓ 390px (iPhone 14 Pro)
✓ 768px (iPad portrait)
✓ 1024px (desktop)
✓ 1440px (wide desktop)

# 3. Color palette verification
✓ Inspect element → CSS vars show Phase 38 values
✓ Background feels neutral gray (not pure black)
✓ Primary blue is muted (#2D82B7)
✓ Secondary is tan warmth (#DBAC84)
```

### Documentation
```bash
# 1. Implementation log complete
✓ Every phase has timestamp + evidence
✓ Screenshots captured for all changes
✓ Commit history shows atomic changes

# 2. Video walkthrough
✓ Record screencast showing all pages match mockups
✓ Show responsive behavior at all breakpoints
```

### User Acceptance
```bash
✓ User confirms visual match to mockups
✓ No critical discrepancies
✓ Ready for production
```

**ONLY AFTER ALL ABOVE:** Update status at top of this document to "✅ COMPLETE"

---

## Implementation Log Reference

Track actual work in: `/memories/session/implementation-log.md`

Format:
```markdown
## Phase A — Color Palette
**Started:** [timestamp]
**Files Modified:** tokens.css (lines 23-80)
**Changes:** Replaced Arcane Spectrum with Phase 38 refined palette
**Screenshot:** [link or description]
**Verification:** DevTools inspection confirms new values
**Completed:** [timestamp] ✅

## Phase B — DeckPage Desktop
**Started:** [timestamp]
...
```

---

## Reference Files

- **Design Spec:** `.github/phase-38-design-overhaul.md`
- **Mockups:** `frontend/mockups/redesign-38/final-spec-*.html`
- **Color Palette:** `.github/design-system-colors.md`
- **Implementation Log:** `/memories/session/implementation-log.md` (to be created)
- **Original Diagnosis:** `/memories/session/plan.md`

---

## Emergency Rollback

If any phase causes breaking issues:

```bash
# Find the phase commit
git log --oneline --grep="Phase [A-F]"

# Rollback to before that phase
git revert <commit-hash>

# Or reset to specific phase
git reset --hard <commit-before-phase>
```

Each phase = atomic commit = easy rollback.

---

**Next Action:** Create implementation log, then begin Phase A (color palette).
