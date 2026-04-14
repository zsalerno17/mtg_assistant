# CSS Variable Migration Plan
**Goal:** Convert all hardcoded CSS values to design system variables from `tokens.css`

---

## 📊 Current State Audit

### Design System Location
- **File:** `/frontend/src/styles/tokens.css`
- **Status:** Comprehensive design system defined with CSS custom properties
- **Coverage:** Colors, typography, spacing, borders, shadows, animations
- **Philosophy:** "Single source of truth — no hardcoded values elsewhere"

### Problems Identified

#### 1. **Typography - Hardcoded Font Sizes**
- **100+ instances** of `text-[10px]`, `text-[9px]`, `text-[11px]` across JSX files
- Design system defines `--text-xs: 11px` as smallest size, but app uses 10px and 9px
- **Gap:** No `--text-2xs` (10px) or `--text-3xs` (9px) variables exist
- **Impact:** Visual inconsistency, maintenance difficulty

**Files Affected:**
- `DeckPage.jsx` - ~50+ instances
- `IconShowcasePage.jsx` - ~15+ instances  
- `ProfilePage.jsx` - ~10+ instances
- `CollectionPage.jsx`, `ImportDeckPage.jsx`, `LeaguePage.jsx`, `EditGamePage.jsx`, `HelpPage.jsx`

#### 2. **Spacing - Hardcoded Gaps/Padding/Margins**
- **50+ instances** of arbitrary spacing like `gap-[5px]`, `max-w-[260px]`, `max-w-[1400px]`, `w-[280px]`
- Design system defines spacing scale from `--space-1` (4px) to `--space-24` (96px)
- **Issue:** Custom spacing values bypass the system

**Files Affected:**
- `DeckPage.jsx` - `gap-[5px]`, container sizing
- `LeaguePage.jsx` - `max-w-[1400px]`, `w-[500px]`
- `ImportDeckPage.jsx` - `max-w-[260px]`

#### 3. **Border Radii - Hardcoded Rounded Values**
- Multiple instances of `rounded-[7px]` (for card images)
- Design system defines `--radius-sm: 6px`, `--radius-md: 8px`
- **Issue:** 7px is custom value not in system

#### 4. **Colors - Mostly Correct ✅**
- **Good news:** Colors are already using `var(--color-*)` syntax
- **Issue:** Some opacity variations like `/80`, `/30`, `/50` applied via Tailwind
- **Consideration:** Should these be standardized in tokens.css?

#### 5. **Recharts - Inline Style Props**
- Chart components use `fontSize: 11`, `fontSize: 12`, `fontSize: 10`
- Not leveraging design system variables

---

## 🎯 Design System Gaps to Fill

### Typography Additions Needed

```css
/* Add to tokens.css */
--text-3xs: 0.5625rem;    /* 9px — ultra-small labels, badges */
--text-2xs: 0.625rem;     /* 10px — small labels, chart text */
```

### Spacing Additions Needed (if any)

Currently spacing scale covers 0-96px. Audit shows:
- `5px` used once → can map to `--space-1.5: 0.3125rem` or round to `--space-2` (8px)
- `260px`, `280px`, `500px`, `1400px` → layout/container widths, keep as component-specific

**Decision:** Don't add every arbitrary width. Container widths can remain component-specific. Focus on **repeated spacing values**.

### Border Radius Additions

```css
/* Add to tokens.css if 7px is universal for card images */
--radius-card: 0.4375rem;  /* 7px — MTG card image corners */
```

Or map existing card images to closest standard (`--radius-sm: 6px` or `--radius-md: 8px`).

---

## 📋 Migration Strategy

### Phase 1: Extend Design System (tokens.css)
**Duration:** 30 minutes  
**Owner:** Review with user first

1. Add missing typography variables:
   - `--text-3xs: 0.5625rem;  /* 9px */`
   - `--text-2xs: 0.625rem;   /* 10px */`

2. Decide on border radius for cards:
   - Option A: Add `--radius-card: 7px`
   - Option B: Standardize to `--radius-sm: 6px`

3. Document opacity standards:
   - Should `/80`, `/30`, `/50` become explicit variables?
   - Or continue using Tailwind opacity modifiers?

**Output:** Updated `tokens.css` with all necessary variables

---

### Phase 2: Update Tailwind Config
**Duration:** 15 minutes

Extend `tailwind.config.js` to recognize new design system classes:

```javascript
theme: {
  extend: {
    fontSize: {
      '3xs': 'var(--text-3xs)',
      '2xs': 'var(--text-2xs)',
      'xs': 'var(--text-xs)',
      'sm': 'var(--text-sm)',
      // ... rest of scale
    },
    borderRadius: {
      'card': 'var(--radius-card)',  // if adding
    }
  }
}
```

**Output:** Tailwind classes like `text-2xs`, `text-3xs` available

---

### Phase 3: Component Migration (By File)
**Duration:** 3-4 hours  
**Method:** Bulk find-and-replace per file

#### File-by-File Checklist

**Priority 1: High-Traffic Pages**
- [ ] `DeckPage.jsx` (~120 instances)
  - Replace `text-[10px]` → `text-2xs`
  - Replace `text-[9px]` → `text-3xs`
  - Replace `text-[11px]` → `text-xs`
  - Replace `gap-[5px]` → `gap-1.5` or `gap-2`
  - Replace `rounded-[7px]` → `rounded-card` or `rounded-sm`
  - Update Recharts fontSize props to use CSS variables

- [ ] `LeaguePage.jsx` (~80 instances)
  - Typography fixes
  - Container width decisions (keep `max-w-[1400px]` or create utility class)

- [ ] `ProfilePage.jsx` (~20 instances)
- [ ] `CollectionPage.jsx` (~15 instances)
- [ ] `ImportDeckPage.jsx` (~10 instances)

**Priority 2: Feature Pages**
- [ ] `EditGamePage.jsx`
- [ ] `LogGamePage.jsx`
- [ ] `JoinLeaguePage.jsx`
- [ ] `DashboardPage.jsx`

**Priority 3: Utility Pages**
- [ ] `IconShowcasePage.jsx`
- [ ] `HelpPage.jsx`
- [ ] `NotFoundPage.jsx`
- [ ] `LoginPage.jsx`
- [ ] `AuthCallbackPage.jsx`

**Priority 4: Components**
- [ ] `TopNavbar.jsx`
- [ ] `CardTooltip.jsx`
- [ ] `AvatarDisplay.jsx`
- [ ] `Skeletons.jsx`
- [ ] `Layout.jsx`
- [ ] `LeagueIcons.jsx`
- [ ] `PageTransition.jsx`
- [ ] `ProtectedRoute.jsx`

---

### Phase 4: Chart Component Refactoring
**Duration:** 1 hour

Recharts components currently use inline style props:
```jsx
// Before
<XAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />

// After
<XAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }} />
```

**Issue:** Recharts may not accept CSS variable strings for fontSize. Test first.

**Fallback:** If variables don't work, calculate px value from CSS:
```javascript
const chartFontSizes = {
  xs: 11,
  sm: 13,
  base: 15
};
```

---

## 🧪 Testing Strategy

### Visual Regression Testing
After each phase, verify:

1. **Page-by-Page Review**
   - Open each updated page in browser
   - Check all font sizes render correctly
   - Verify spacing looks identical pre/post migration

2. **Responsive Testing**
   - Test mobile breakpoints (component alignment)
   - Ensure no layout shifts

3. **Chart Rendering**
   - Verify Recharts components render properly
   - Check axis labels, tooltips, legends have correct sizing

4. **Theme Switching**
   - If light mode exists, verify variables work in both themes

### Automated Checks
```bash
# After migration, search for stragglers
grep -r "text-\[" frontend/src/pages/
grep -r "text-\[" frontend/src/components/
grep -r "fontSize:\s*\d" frontend/src/pages/
```

---

## 🚀 Phased Execution Plan

### **SESSION 1: Foundation Setup** (~30 min)
**Goal:** Extend design system and Tailwind config

**Tasks:**
1. Update `frontend/src/styles/tokens.css`:
   ```css
   /* Add after --text-xs */
   --text-3xs: 0.5625rem;    /* 9px — ultra-small labels, badges */
   --text-2xs: 0.625rem;     /* 10px — small labels, chart text */
   ```

2. Find and update `frontend/tailwind.config.js`:
   - Add `'3xs': 'var(--text-3xs)'` to fontSize theme
   - Add `'2xs': 'var(--text-2xs)'` to fontSize theme
   - Verify `'xs'`, `'sm'`, etc. are mapped to CSS variables

3. **Test:** Run dev server, verify Tailwind compiles without errors

**Output:**
- ✅ Design system has full typography scale
- ✅ Tailwind classes `text-3xs`, `text-2xs` available
- ✅ No build errors

**Verification:**
```bash
# Test in browser console:
getComputedStyle(document.documentElement).getPropertyValue('--text-2xs')
# Should return: 0.625rem
```

---

### **SESSION 2: DeckPage.jsx** (~1-1.5 hours)
**Goal:** Migrate the largest, most complex page

**Tasks:**
1. **Typography replacements** (~50-60 instances):
   - `text-[10px]` → `text-2xs`
   - `text-[9px]` → `text-3xs`
   - `text-[11px]` → `text-xs`

2. **Border radius standardization**:
   - `rounded-[7px]` → `rounded-sm` (for card images)

3. **Spacing adjustments**:
   - `gap-[5px]` → `gap-1` (4px) or `gap-1.5` (6px) - choose visually

4. **Recharts font sizes**:
   - Chart tick labels: Keep as `fontSize: 11` for now (Session 5)
   - Document which charts need variable support

**Test Checklist:**
- [ ] All three charts render correctly
- [ ] Card images have proper rounded corners (6px)
- [ ] Text hierarchy looks identical to before
- [ ] No visual regressions in spacing
- [ ] Tooltips display properly

**Verification:**
```bash
# Should return 0 matches:
grep -n "text-\[" frontend/src/pages/DeckPage.jsx
grep -n "rounded-\[7px\]" frontend/src/pages/DeckPage.jsx
```

---

### **SESSION 3: High-Traffic Pages** (~1-1.5 hours)
**Goal:** Migrate user-facing pages

**Updated:** 2026-04-14  
**Status:** ✅ Approved - Ready for Phased Execution  
**Next Step:** Begin Session 1 (Foundation Setup) when ready
   - Typography fixes
   - Note: Keep `max-w-[1400px]` as-is (decision #3)
   
2. `ProfilePage.jsx` (~20 instances)
3. `CollectionPage.jsx` (~15 instances)
4. `ImportDeckPage.jsx` (~10 instances)

**Per-File Process:**
1. Search for `text-[` patterns
2. Replace with appropriate variable class
3. Test page in browser
4. Verify no visual changes

**Test Checklist:**
- [ ] League page: tables, standings, game history render correctly
- [ ] Profile page: avatar selection, form inputs look good
- [ ] Collection page: upload area, card list display properly
- [ ] Import page: input fields, error states work

---

### **SESSION 4: Feature & Utility Pages** (~45 min)
**Goal:** Complete remaining pages

**Files:**
1. `EditGamePage.jsx`
2. `LogGamePage.jsx`
3. `JoinLeaguePage.jsx`
4. `DashboardPage.jsx`
5. `IconShowcasePage.jsx`
6. `HelpPage.jsx`
7. `NotFoundPage.jsx`
8. `LoginPage.jsx`
9. `AuthCallbackPage.jsx`

**Strategy:**
- Batch similar pages together
- Many have fewer than 10 instances each
- Use multi-file find/replace where patterns consistent

**Test Checklist:**
- [ ] Forms submit correctly
- [ ] Loading states display properly
- [ ] Error messages visible
- [ ] Navigation flows work

---

### **SESSION 5: Components & Charts** (~45 min)
**Goal:** Migrate reusable components and handle Recharts

**Components:**
1. `TopNavbar.jsx`
2. `CardTooltip.jsx`
3. `AvatarDisplay.jsx`
4. `Skeletons.jsx`
5. `Layout.jsx`
6. `LeagueIcons.jsx`
7. `PageTransition.jsx`

**Recharts Strategy:**
Test if Recharts accepts CSS variables:
```jsx
// Test this approach:
<XAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }} />
```

**If variables don't work** (likely), create utility:
```javascript
// frontend/src/lib/chartConstants.js
export const CHART_FONT_SIZES = {
  xs: 11,
  sm: 13,
  base: 15
};

// Usage:
<XAxis tick={{ fontSize: CHART_FONT_SIZES.xs }} />
```

**Test Checklist:**
- [ ] Navbar displays correctly on all pages
- [ ] Card tooltips appear on hover
- [ ] Avatar fallbacks work
- [ ] Skeleton loaders match content size
- [ ] Charts render with correct font sizes

---

### **SESSION 6: Cleanup & Verification** (~30 min)
**Goal:** Ensure 100% migration, document results

**Tasks:**
1. **Search for stragglers:**
   ```bash
   grep -r "text-\[" frontend/src/pages/ --include="*.jsx"
   grep -r "text-\[" frontend/src/components/ --include="*.jsx"
   grep -r "rounded-\[7px\]" frontend/src/ --include="*.jsx"
   ```

2. **Fix any remaining hardcoded values**

3. **Visual regression test:**
   - Open every page in browser
   - Check mobile responsive behavior
   - Test theme switching (if applicable)

4. **Documentation:**
   - Update any developer docs about design system usage
   - Add comment to tokens.css about new variables
   - Consider ESLint rule to prevent future hardcoding

5. **Create follow-up issues** (optional):
   - Container width standardization (if needed later)
   - Opacity variable system (if Tailwind `/80` becomes limiting)

**Success Criteria:**
- ✅ Zero `text-[` matches in pages/components
- ✅ All border radii use design system
- ✅ Visual appearance identical to pre-migration
- ✅ Build runs without errors
- ✅ Design system documented

---

## 📊 Session Summary

| Session | Duration | Files Changed | Complexity | Dependencies |
|---------|----------|---------------|------------|--------------|
| 1. Foundation | 30 min | 2 files | Low | None |
| 2. DeckPage | 90 min | 1 file | High | Session 1 |
| 3. High-Traffic | 90 min | 4 files | Medium | Session 1 |
| 4. Feature Pages | 45 min | 9 files | Low | Session 1 |
| 5. Components | 45 min | 8 files | Medium | Session 1 |
| 6. Cleanup | 30 min | Various | Low | Sessions 2-5 |
| **TOTAL** | **~5.5 hours** | **~24 files** | — | — |

**Recommended Schedule:**
- **Week 1:** Sessions 1-2 (get foundation + biggest page done)
- **Week 2:** Sessions 3-4 (knock out remaining pages)
- **Week 3:** Sessions 5-6 (polish components, verify completion)

---

## 📊 Estimated Impact

### Before
- **100+ hardcoded font sizes** scattered across 15+ files
- **50+ hardcoded spacing values**
- **Inconsistent border radii** (6px, 7px, 8px mixing)
- **Maintenance:** Change font scale = edit 100+ files

### After
- **All sizing via design system variables**
- **Single source of truth:** `tokens.css`
- **Maintenance:** Change font scale = edit 1 file
- **Consistency:** Automatic adherence to design system

---

## ✅ Decisions Made

1. **Typography:** ✅ Add `--text-3xs: 9px` and `--text-2xs: 10px` to tokens.css
2. **Card Border Radius:** ✅ Standardize to 6px (use existing `--radius-sm`)
3. **Container Widths:** ✅ Keep as component-specific (no new variables needed)
4. **Opacity Modifiers:** ✅ Keep Tailwind `/80`, `/30` syntax (flexible)
5. **Execution:** ✅ Phase over multiple sessions

---

## 📝 Success Criteria

Migration is complete when:

- ✅ Zero `grep` matches for `text-\[` in pages/components (excluding test files)
- ✅ Zero `fontSize: \d` in Recharts components (or documented as necessary)
- ✅ All border-radius values use design system variables
- ✅ Visual appearance identical to pre-migration state
- ✅ Design system documentation reflects new variables added
- ✅ Team understands how to use variables going forward

---

## 🔗 Related Files

- **Design System:** `frontend/src/styles/tokens.css`
- **Tailwind Config:** `frontend/tailwind.config.js` (if exists)
- **Component Styles:** `frontend/src/styles/components.css`
- **Priority Files:** See Phase 3 checklist above

---

**Created:** 2026-04-14  
**Status:** 📋 Planning - Awaiting User Approval  
**Next Step:** Review with user, get decisions on open questions
