# Phase 35B — Quick Test Guide

## What's New (Ready to Test Now)

### 🎨 Dark/Light Mode Toggle
1. Open app at `localhost:5173`
2. Click your avatar in top-right → dropdown menu
3. Click "Light Mode" (with sun icon)
4. Watch entire app switch to light theme
5. Click "Dark Mode" (with moon icon) to switch back

**What works:**
- Theme persists across page refreshes (saved in localStorage)
- All token-based colors update instantly
- Charts re-render with new colors

**What doesn't work yet:**
- Some hardcoded hex colors won't update (these need manual migration)
- Not all components use tokens yet

### 🎬 Page Transitions  
1. Go to Dashboard
2. Click "View Deck" on any analyzed deck
3. Watch page fade out/in with slide animation (350ms)
4. Click back button
5. Watch transition again

**What works:**
- Dashboard ↔ DeckPage transitions smoothly
- Cinematic spring easing (slight bounce at end)

**What doesn't work yet:**
- Other pages (Collection, Leagues, Profile) don't have transitions yet
- Need to wrap them with PageTransition component

### ✨ Dashboard Deck Grid Animation
1. Refresh Dashboard page
2. Watch deck cards/table rows appear one at a time
3. 60ms stagger delay creates waterfall effect

**What works:**
- Mobile card grid: slides up with fade-in
- Desktop table: slides right with fade-in
- Smooth cinematic easing on all animations

### 📊 DeckPage Chart Redesign
1. Go to any analyzed deck
2. Scroll to "Mana Curve" section
3. Chart now uses gold/amber bars (matches theme)
4. Scroll to "Card Type Distribution"
5. See new donut PieChart with MTG color slices

**What works:**
- All chart colors use design tokens (update with theme)
- PieChart shows percentages and color-coded slices
- Tooltip backgrounds match current theme
- Hover interactions preserved

### 🖼️ Logo in TopNavbar
1. Look at top-left of navbar
2. MTG Assistant logo image displays
3. Text appears next to it (hidden on mobile < 640px)

**What works:**
- Logo loads from `/logo.svg`
- Cinzel font for brand text
- Responsive layout (logo always shows, text shows on sm+)

---

## How to Test

### Quick Visual Check (2 minutes)
```bash
# Make sure frontend is running
cd frontend && npm run dev
```

1. Open `localhost:5173`
2. Log in if not already
3. Dashboard should load with deck grid animating in
4. Click theme toggle in top-right dropdown
5. App switches to light theme
6. Click a deck → page transition + see new charts

### Full Walkthrough (10 minutes)

**Dashboard:**
- [ ] Deck grid animates in (stagger effect)
- [ ] Logo appears in top-left navbar
- [ ] Stats cards display correctly
- [ ] "Import Deck" button works

**Theme Toggle:**
- [ ] Open dropdown menu (click avatar)
- [ ] Theme toggle shows correct icon (sun in dark, moon in light)
- [ ] Clicking toggle switches theme instantly
- [ ] Refresh page → theme persists

**DeckPage:**
- [ ] Page transition animates when navigating from Dashboard
- [ ] Mana curve uses gold/amber bars
- [ ] Card type PieChart displays with colors
- [ ] Tooltips have correct background colors
- [ ] All tabs work (Overview, Upgrades, Strategy, Improvements, Scenarios)

**Navigation:**
- [ ] Dashboard → Deck → back transition works
- [ ] Navbar links work (Dashboard, Collection, Leagues)
- [ ] Mobile bottom nav shows (on small screens)

---

## Expected Behavior

### Dark Mode (Default)
- Background: Very dark blue `#070813`
- Text: Off-white `#ecf2fa`
- Primary color: Sky blue `#4ca8e0`
- Secondary color: Gold `#d8a848`
- Charts: Gold bars, colorful pie slices

### Light Mode
- Background: Light gray `#f9fafb`
- Text: Dark blue-black `#0a1828`
- Primary color: Darker blue `#2080b8`
- Secondary color: Darker gold `#b8842e`
- Charts: Same structure, different colors

### Animations
- Page transitions: 350ms fade + slide
- Deck grid stagger: 60ms delay per item
- Smooth cinematic easing (slight bounce)

---

## Known Limitations (Not Bugs)

These are expected and will be fixed in remaining work:

1. **Only Dashboard has PageTransition** — other pages need wrapping
2. **Only Dashboard deck grid has stagger** — Collection and League grids don't stagger yet
3. **Forms still use inline styling** — shadcn components not installed yet
4. **Some hardcoded colors remain** — gradual migration to tokens in progress
5. **Typography not fully updated** — some headings don't use Cinzel yet

---

## If You See Bugs

Check these first:

**Theme toggle doesn't work:**
- Check browser console for errors
- Verify `localStorage.getItem('mtg-assistant-theme')` is set
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

**Animations don't play:**
- Verify framer-motion is installed: `cd frontend && npm list framer-motion`
- Check if browser has "reduce motion" enabled (System Preferences → Accessibility)
- Open DevTools → Performance tab → check frame rate

**Charts don't show:**
- Check browser console for recharts errors
- Verify `recharts` is installed: `cd frontend && npm list recharts`
- Try a different deck

**Page is blank:**
- Check terminal for build errors
- Check browser console for JavaScript errors
- Verify dev server is running on port 5173

---

## Next Steps After Testing

If everything looks good:
1. Report back which features you like
2. Let me know if you want to continue with remaining work
3. Decide: shadcn/ui or pure CSS approach for forms?

If you find bugs:
1. Note which feature is broken
2. Check browser console for error messages
3. Let me know and I'll fix before continuing

If you want changes:
1. Describe what feels off (colors, animation speed, layout, etc.)
2. I can adjust tokens.css or animation timings
3. Quick iterations before finishing remaining pages
