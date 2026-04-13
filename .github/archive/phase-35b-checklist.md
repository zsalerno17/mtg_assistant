# Phase 35B — Implementation Checklist

## ✅ Completed (This Session — April 12, 2026)

- [x] Theme infrastructure (useTheme.js, ThemeProvider, localStorage persistence)
- [x] shadcn CSS variable mappings in tokens.css
- [x] TopNavbar logo integration  
- [x] TopNavbar theme toggle (dropdown menu item)
- [x] Page transition infrastructure (PageTransition.jsx, App.jsx AnimatePresence)
- [x] DeckPage chart redesign (PieChart + token-based colors)
- [x] DashboardPage stagger animations (deck grid)
- [x] DashboardPage PageTransition wrapper
- [x] Update planning doc with current status

## 🚧 In Progress / Remaining

### High Priority (Core Functionality)

- [ ] **Install shadcn/ui** (blocking other tasks)
  ```bash
  cd frontend
  npx shadcn@latest init
  npx shadcn@latest add button input select card badge dialog dropdown-menu table tabs avatar tooltip switch
  ```

- [ ] **Wrap pages with PageTransition** (~10 min)
  - [ ] DeckPage.jsx
  - [ ] CollectionPage.jsx
  - [ ] LeaguePage.jsx
  - [ ] ProfilePage.jsx
  - [ ] LoginPage.jsx
  - [ ] ImportDeckPage.jsx
  - [ ] LogGamePage.jsx
  - [ ] JoinLeaguePage.jsx

### Medium Priority (Polish & UX)

- [ ] **Migrate form components to shadcn** (~45-60 min)
  - [ ] ImportDeckPage (input + button)
  - [ ] LogGamePage (selects + checkboxes + button)
  - [ ] JoinLeaguePage (input + button)
  - [ ] ProfilePage (inputs + textarea + button)
  - [ ] DashboardPage ImportModal → Dialog component

- [ ] **Add stagger animations** (~20-30 min)
  - [ ] CollectionPage card grid
  - [ ] LeaguePage member cards
  - [ ] LeaguePage game cards

- [ ] **Update LoginPage** (~10 min)
  - [ ] Add logo to hero section
  - [ ] Apply Cinzel font to page title
  - [ ] Convert "Sign in with Google" to shadcn Button

### Low Priority (Nice-to-Have)

- [ ] **Typography audit** (~30 min)
  - [ ] Page titles → `font-heading text-3xl` (Cinzel, 32px)
  - [ ] Section headings → `font-heading text-2xl` (Cinzel, 24px)
  - [ ] Replace hardcoded font sizes with token classes

- [ ] **Component class migration** (~1-2 hours)
  - [ ] Replace inline button styles with `.btn-primary`, `.btn-secondary` from components.css
  - [ ] Replace inline badge styles with `.badge-mtg-w`, `.badge-mtg-u`, etc.
  - [ ] Replace inline card styles with `.card` from components.css

## 🧪 Testing Checklist

### Automated
- [ ] `cd frontend && npm run build` (no errors)
- [ ] `cd frontend && npm test` (all 14 tests pass)

### Manual (Dark Mode)
- [ ] Page transitions work on all routes
- [ ] Deck grid staggers in on Dashboard
- [ ] Mana curve shows gold bars (`var(--color-secondary)`)
- [ ] Card type PieChart displays with MTG colors
- [ ] Theme toggle switches to light mode

### Manual (Light Mode)
- [ ] Background is `#f9fafb` (light gray)
- [ ] Text is dark and readable (WCAG AA contrast)
- [ ] Charts re-render with light colors
- [ ] Primary button is darker blue (`#2080b8`)
- [ ] Theme toggle switches back to dark mode

### Forms (Critical)
- [ ] Import deck form submits and navigates
- [ ] Log game form saves and updates standings
- [ ] Join league form accepts code
- [ ] Profile update saves changes

## 📊 Progress

- **Phase 35A (Foundation):** ✅ 100% Complete
- **Phase 35B (Migration):** 🚧 ~30% Complete
  - Infrastructure: ✅ Complete
  - TopNavbar: ✅ Complete
  - DeckPage: ✅ Charts done, PageTransition needed
  - DashboardPage: ✅ Complete
  - Other pages: ⏳ Pending
  - Forms: ⏳ Pending
  - Testing: ⏳ Pending

## 🎯 Recommended Next Session Plan

1. **Install shadcn/ui** (5 min) — unblocks form migration
2. **Wrap all pages** (10 min) — quick visual win
3. **Test dark/light toggle** (5 min) — verify theme system works
4. **Migrate 1-2 forms** (30 min) — ImportDeckPage + LogGamePage
5. **Add CollectionPage stagger** (10 min) — another visual win
6. **Test and iterate** (20 min) — find and fix bugs

**Total session time:** ~1.5 hours to get to 70-80% complete

## 💡 Command Reference

```bash
# Start dev servers
cd frontend && npm run dev          # Frontend on :5173
cd backend && uvicorn main:app --reload --port 8000   # Backend on :8000

# Check running servers
lsof -ti:5173   # Frontend
lsof -ti:8000   # Backend

# Build and test
cd frontend
npm run build
npm test

# Add more shadcn components later
npx shadcn@latest add [component-name]
```

## 📝 Files to Review

- **Session summary:** `.github/phase-35b-session-summary.md` (detailed breakdown)
- **Planning doc:** `.github/copilot-plan.md` (updated CURRENT TASK section)
- **Design decisions:** `.github/design-proposal.md` (Arcane Spectrum reference)

## ❓ Decision Points for User

1. **shadcn/ui:** Continue with selective shadcn approach, or switch to pure CSS classes from `components.css`?
2. **Priority:** Forms first, animations first, or typography first?
3. **Testing:** Should I test current partial implementation before continuing?
