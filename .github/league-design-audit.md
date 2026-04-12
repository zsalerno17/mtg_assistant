# League Tracking Feature — UI/UX Design Audit

> Conducted: April 12, 2026  
> Scope: LeaguesPage, LeaguePage, LogGamePage  
> Status: **Functionally complete, design quality unpolished**  

---

## Executive Summary

**The brutal truth:** The league tracking feature is functionally solid but **visually generic and structurally flat**. It reads like a first-pass MVP that never got a design review. While the main app (DeckPage) uses glass morphism cards with `backdrop-blur-sm`, Cinzel headings, and sophisticated hover states, the league pages look like a different product — plain `bg-surface` cards, Arial-esque text, and no depth layering.

### Critical Issues (Priority Order)

1. **LeaguePage fails the 5-second test** — Users land on a tabs interface with no hero. Standings table is first, but there's no visual hierarchy signaling "this is what matters." The social/competitive aspect (superstar names, rivalry dynamics) is completely buried.

2. **Zero visual consistency with main app** — Main app = glass cards + Cinzel + radial gradients + hover lifts. League pages = flat cards + generic fonts + no motion. These feel like they belong to different codebases.

3. **Information architecture is backwards** — The "Members" tab (profiles with superstar names, catchphrases, entrance music) is the MOST whimsical and social part of the feature, yet it's hidden at tab 3. Standings are important but lifeless. Games history is raw data with no narrative.

4. **Empty states are functional but soulless** — "No games logged yet" with a text link is the bare minimum. This is a social/competitive feature about bragging rights — the empty states should sell the vision.

5. **Mobile responsive but not mobile-optimized** — Tables work on small screens (horizontal scroll), but placement dropdowns and form fields are cramped. This feature is for game night — users will be on phones.

6. **No sense of occasion** — Logging a game should feel like recording a victory or memorializing a defeat. The LogGamePage is a form. Just a form. No ceremony, no celebration, no anticipation of what your rivals will see.

---

## Page-by-Page Diagnosis

---

### 1. LeaguesPage (League List + Create Modal)

**Current state:**  
- Header with emoji (🏆) + title + CTA button
- Grid layout (3 cols on desktop, responsive)  
- Each league = flat card with name, status badge, dates, member count
- Create form = expanded inline form (not modal, despite planning notes saying "modal")
- Empty state = centered emoji + text + CTA button

**What's wrong:**

#### Visual Flatness
- Cards use `bg-surface border border-accent/30` — no glass effect, no shadow, no depth
- Hover state only changes border color (`hover:border-accent`) — no lift, no shadow increase
- Compare to DeckPage cards: `bg-[var(--color-surface)]/80 backdrop-blur-sm border ... hover:-translate-y-0.5 hover:shadow-lg`
- These cards feel like generic DIVs, not crafted UI elements

#### Typography Issues
- Page title uses `font-brand` (Cinzel) — **this is correct**
- Subtitle uses `text-secondary text-sm` — correct weight
- BUT league names in cards use `font-brand` WITHOUT any visual hierarchy differentiation from the page title. Everything in Cinzel looks important, so nothing does.
- Status badges (`active`, `completed`) use generic text-xs with color-coded backgrounds — these should have more personality (icons, hover tooltips explaining what "active" means)

#### Create Form UX Problems
- The form expands inline when "Create League" is clicked — this pushes existing league cards down the page. On a page with 10+ leagues, clicking "Create" causes a jarring scroll jump.
- Form has `bg-surface border border-accent/30` — same visual weight as a league card. Users lose context that this is a temporary state.
- Form fields have `bg-black/40` — darker than the card background, creating a nested box-in-box feeling
- No visual confirmation after creating — form disappears, new league appears in grid, but there's no success toast/animation/celebration

#### Empty State
- The emoji (⚔️) + heading + description + button is functionally correct
- Missing: a **hook** that explains why this is exciting. "Create your first league to start tracking pod sessions" is informative but not motivating. Where's the promise of rivalries, bragging rights, legendary moments?

#### Information Missing
- No league creator name shown (who runs this league?)
- No indication of current standings leader (quick preview of who's winning)
- No visual distinction between leagues you created vs. leagues you joined
- Dates format as `MM/DD/YYYY` — for active leagues, showing "3 weeks left" or "Season ends in 5 days" would be more engaging

---

### 2. LeaguePage (Standings + Games + Members)

**Current state:**  
- Breadcrumb nav (Leagues / [league name])
- Header with league name (Cinzel), dates, status badge, "Log Game" CTA button  
- 3-tab interface: Standings | Games | Members
- Standings = HTML table with 8 columns (rank, name, total points, wins, first bloods, last stands, entrance bonuses, games)
- Games = card-based history list (game number, date, placement results, points, spicy play callout)
- Members = card grid (avatar, superstar name, title, catchphrase, entrance music link)

**Critical Problems:**

#### The 5-Second Test Failure
User lands on this page and sees:
1. Breadcrumb (navigational, not content)
2. League name + dates + status (metadata, not value)
3. Three equally-weighted tab labels
4. Standings table (if "standings" tab is default)

**There is no hero.** No dominant visual element that says "THIS is what you care about." The standings table has equal visual weight to the surrounding chrome. A user who just joined the league has no idea what makes this different from a Google Sheet.

#### Standings Table — Functional But Soulless
- It's an HTML `<table>` with `bg-surface border` wrapper and `border-b border-accent/30` row dividers
- Rank badges (1st/2nd/3rd) have color-coded backgrounds (yellow/silver/bronze) — **this is good**
- Total Points column uses `text-accent` at `text-lg font-bold` — **this is the right hierarchy decision**
- BUT: The table header is `bg-black/40` with `text-secondary` labels — it reads as pure data, not a leaderboard

**What's missing:**  
- No sense of competition. This should feel like a WWE championship belt scoreboard, not an Excel export.
- Superstar names are `font-medium text-primary` — they should be in Cinzel (these are personas, not data labels)
- First place should feel SPECIAL — maybe a gold glow, a trophy icon, a crown emoji, SOMETHING that signals "this person is the current champion"
- The "First Bloods" and "Last Stands" columns are now deprecated (per scoring system fix) — they show zeros for all new games. This is visual clutter. (Critical bug that snuck back in?)

**Wait — scoring system breaking change not reflected in UI:**  
The planning doc says the scoring system changed to **3-2-1-0 placement scoring** (1st = 3pts, 2nd = 2pts, 3rd = 1pt, 4th+ = 0pts). But the standings table STILL shows "First Bloods" and "Last Stands" columns, which were the old achievement system. This is confusing and wrong.

#### Games Tab — Good Structure, Weak Presentation
- Each game is a card with game number (Cinzel), date, placement list, earned badges (🏆 Win, 🩸 First Blood, ⚔️ Last Stand, 🎤 Entrance), spicy play callout
- Placement results show player name + deck name + earned badges + points

**What works:**  
- The card-based layout is the right pattern (vs. a table)
- Spicy play gets a special callout box with `bg-orange-500/10 border-orange-500/30` — nice differentiation
- Placement display with emoji badges is visually scannable

**What's wrong:**  
- Cards use `bg-surface border border-accent/30` — again, no glass effect, no depth
- Game number uses `font-brand` (correct) but at `text-lg` — this should be larger and more prominent (these are historical events, not list items)
- No visual hierarchy between games — every card looks identical. Recent games should be more prominent (larger, more color) than old games.
- Empty state ("No games logged yet.") is a single line of text with a link styled as `text-accent hover:underline` — this is the absolute minimum viable empty state

#### Members Tab — THE HIDDEN GEM
This tab contains the BEST part of the social feature design:  
- Superstar names (personas)
- Catchphrases (flavor)
- Entrance music links (whimsy)
- Current titles (status)

**Problem:** IT'S HIDDEN AT TAB 3.

Users who join a league land on Standings (data table), might click Games (history list), and may never discover Members. This is backwards. The member profiles are the personality of the feature — they should be VISIBLE on first load, not buried.

**Also wrong:**  
- Superstar names use `font-brand text-xl` (correct) BUT with no visual embellishment. These are wrestling personas — they deserve more flair.
- Catchphrases are `text-sm italic text-secondary` — this makes them feel like footnotes. In wrestling, the catchphrase IS the character.
- Entrance music links are `text-xs text-accent` with 🎵 emoji — functionally correct but visually timid. This should be a playable audio preview or at minimum a more prominent button.
- Current title shows as `px-3 py-1 bg-accent/20 text-accent` badge — this is fine, but titles should rotate/animate or have more visual weight (belt icon, special typography)

#### Tab Order Priority
Current: Standings → Games → Members  
**Should be:** Members → Standings → Games  

Rationale:  
- Members establishes the CHARACTERS (who you're competing against)
- Standings shows the SCORE (current competitive state)  
- Games is HISTORY (reference material)

This order tells a story. Current order is just database tables in ERD order.

#### Breadcrumb Nav
`Leagues / [league name]` is correct and functional. No changes needed.

#### Header CTA Button
"+ Log Game" button uses `btn-primary px-5 py-2.5 rounded-lg` — this is consistent with the app's button style. No issues here.

---

### 3. LogGamePage (Game Logging Form)

**Current state:**  
- Header (title + league name subtitle)
- Error message display (conditional)
- 3-section form: Game Details | Player Results | Special Awards
- Submit/Cancel buttons at bottom

**Critical Problems:**

#### Zero Sense of Ceremony
This form will be used IMMEDIATELY after a game ends — players are still at the table, emotions are high, someone just won, someone just got crushed. This is a social/emotional moment.

The UI treats it like "fill out this form."

**What's missing:**  
- No anticipation of the result (e.g., "Who claimed victory tonight?")
- No preview of what will happen (e.g., "This will update the standings and notify league members")
- No celebration on submit (users press "Log Game" and are redirected — no success animation, no "Game logged! [Player] takes the lead" confirmation)

#### Form Visual Design — Functional But Flat
- Sections use `bg-surface border border-accent/30` — same issue as other pages (no glass, no depth)
- Section headings use `font-brand text-lg` (correct) but there's no visual grouping hierarchy — all 3 sections look equally important
- Input fields use `bg-black/40 border border-accent/30` — this is consistent with the create league form but creates a nested-box-in-box feeling

#### Player Results Grid — Cramped on Mobile
- Each player row is `grid-cols-3` with name | placement dropdown | deck dropdown
- On small screens, dropdowns are narrow (especially deck names, which can be long like "Ur-Dragon Dragon Tribal Reanimator")
- Player name shows superstar name + @displayName — the @displayName is `text-xs text-secondary`, which is correct, but the visual hierarchy between superstar name and real name is weak

#### Points Preview — MISSING
The old version of the form (per comment in code) showed "Points awarded automatically: 1st = 3pts (Win), 2nd = 1pt (Last Stand), 4th = 1pt (First Blood)."

**This is outdated** (refers to old scoring system) but the CONCEPT is good — users should see a preview of points before submitting. Current form has NO points preview. Users select placements and have no idea how many points each player will earn.

**Should be:** As users select placements, show a live preview below each player row: "1st place = 3 pts | 2nd = 2 pts | 3rd = 1 pt | 4th = 0 pts | +1 entrance bonus if awarded = 4 pts total"

#### Special Awards Section
- "🎤 WWE Entrance of the Week" — naming is PERFECT (whimsical, on-brand)
- "🔥 Spicy Play of the Week" — also perfect
- But the section header ("Special Awards") is generic. Should be "Awards of the Week" or "Legendary Moments" or something with more flavor.

#### Dropdown UX — "No winner" Default
The entrance and spicy play dropdowns default to "— No winner —". This is safe (prevents accidental awards) but also creates friction. Most pods WILL award these every week. Consider:  
- "Who gets entrance bonus?" (required award)
- "Spicy play" (optional)

Or make entrance bonus a REQUIRED selection (someone always gets +1 pt for showing up with energy).

#### Deck Linking — Hidden Value
The form allows players to link their deck from their library. This is a GREAT feature (connects leagues to deck analysis), but it's visually buried in a dropdown labeled "Deck (optional)" with "—" as the default.

**Should show:**  
- If user has analyzed decks, show them as a visual card picker (thumbnails with commander art?) instead of a dropdown
- If user hasn't analyzed any decks, show a hint: "Link your deck to track performance over time"

---

## Visual Consistency Audit

Comparing league pages to main app (DeckPage):

| Element | DeckPage (Reference) | League Pages (Current) | Gap |
|---------|----------------------|------------------------|-----|
| **Cards** | `bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl` | `bg-surface border border-accent/30 rounded-xl` | No glass, no blur, no depth |
| **Typography (headings)** | Cinzel for page titles, section labels, important names | Cinzel for page titles only | Section labels are generic sans-serif |
| **Hover states** | `hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5 transition-all` | `hover:border-accent transition-colors` | No lift, no shadow, minimal motion |
| **Color usage** | Amber accents (`--color-primary`), sky blue secondary, semantic colors (danger/success) | Amber used sparingly, mostly neutral grays | Looks like a low-contrast wireframe |
| **Empty states** | Centered icon + heading + motivational copy + CTA button | Centered icon + informational copy + CTA button | No emotional hook |
| **Data visualization** | Radial progress rings, color-coded bars, visual stat badges | HTML tables, plain text, no visual encoding | Pure spreadsheet aesthetic |

**Conclusion:** League pages are 2 design phases behind the main app.

---

## Mobile Responsive Review

Tested at: 375px (iPhone SE), 390px (iPhone 13), 768px (iPad Mini), 1024px (iPad Pro)

### LeaguesPage
- ✅ Grid collapses to 1 column on mobile (correct)
- ✅ Create form stacks fields vertically (correct)
- ❌ Create form button remains full-width on mobile while cancel button is inline — inconsistent
- ✅ Empty state scales well

### LeaguePage
- ✅ Tabs scroll horizontally with `overflow-x-auto` (correct pattern)
- ❌ Standings table scrolls horizontally — functional but feels cramped. 8 columns is too many for phone screens.
- ❌ Table headers are small (`text-sm`) — on mobile they're unreadable at arm's length
- ✅ Games cards stack vertically (correct)
- ✅ Members grid collapses to 1 column (correct)
- ❌ Tab labels ("Standings", "Games", "Members") are equal width on mobile — wastes space

### LogGamePage
- ✅ Sections stack vertically (correct)
- ❌ Player results grid (`grid-cols-3`) remains 3 columns on mobile — dropdowns are too narrow
- ❌ Dropdown text truncates awkwardly (deck names cut off mid-word)
- ✅ Special Awards section stacks correctly
- ❌ Date/time picker on iOS overlays form (standard browser behavior, but could use better spacing/margins)

**Overall:** Feature is responsive but not *optimized* for mobile. Given that this feature will be used at game night (likely on phones), mobile should be the HERO experience, not an afterthought.

---

## Information Hierarchy Review

### LeaguesPage Hierarchy
1. Page title (🏆 My Leagues) — ✅ Correct
2. Create League button — ✅ Correct (primary CTA)
3. League grid — ✅ Correct
4. Individual league prominence — ❌ All cards equal weight (should highlight active leagues or ones you created)

### LeaguePage Hierarchy (Current)
1. League name + metadata — ❌ Too much metadata, too little context
2. Tabs — ❌ Equal weight, no guidance on what to view first
3. Tab content — ❌ No hero element within any tab

### LeaguePage Hierarchy (Should Be)
1. **Hero:** Current standings leader + their superstar name + points (visual trophy/belt)
2. Quick stats: Games played, active members, season end date
3. **Secondary:** Member profiles (visible above fold, not hidden in tab)
4. **Tertiary:** Full standings table (expandable/scrollable)
5. **Reference:** Games history (collapsed by default, expand to see)

### LogGamePage Hierarchy (Current)
1. Form sections (all equal weight)
2. Submit button

### LogGamePage Hierarchy (Should Be)
1. **Primary question:** "Who won?" (placement selection for 1st place, visually prominent)
2. **Secondary:** Other placements (2nd/3rd/4th)
3. **Optional:** Special awards, deck linking, notes
4. **Preview:** Points calculation (auto-updating as user selects placements)
5. **CTA:** Submit with confirmation preview ("This will update standings and notify members")

---

## Loading & Error States Review

### Loading States
- LeaguesPage: Shows "Loading leagues..." in centered text — ❌ No skeleton, no visual preview of what's loading
- LeaguePage: Shows "Loading league..." in centered text — ❌ Same issue
- LogGamePage: Not applicable (form is static, submission shows "Saving..." button state) — ✅ Correct

**Should use:** Skeleton cards matching the expected layout (`bg-surface animate-pulse` placeholders)

### Error States
- All pages show error at top in `bg-red-500/10 border border-red-500/30 text-red-400` box — ✅ Correct pattern
- Error messages are technical ("Failed to fetch", "Network error") — ❌ Should be user-friendly ("Couldn't load your leagues. Check your connection and try again.")

### Empty States
- LeaguesPage empty state: ⚔️ emoji + "No leagues yet" + description + CTA — ✅ Functional, ❌ No personality
- LeaguePage standings empty: "No games logged yet. Log your first session..." — ✅ Functional, ❌ No personality
- LeaguePage games empty: "No games logged yet. [link]" — ❌ Bare minimum
- LeaguePage members empty: Not shown (assumes league always has at least creator as member) — ❌ Edge case not handled

**Pattern needed:** Empty states should SELL the feature ("Your first game will kick off the rivalry. Log a session to start the season!") with an illustration or stronger visual hook.

---

## Social/Competitive Aspect Review

**The Core Promise:** This feature is about rivalries, bragging rights, legendary moments, WWE-style personas, and social dynamics at game night.

**Current Experience:**  
- Superstar names exist but are visually buried
- Catchphrases exist but feel like footnotes
- Entrance music links exist but no one will find them
- Spicy play of the week is well-implemented but small
- Standings feel like a spreadsheet, not a leaderboard

**What to amplify:**
1. **Member profiles should be the FIRST thing users see** — who you're playing against is the story
2. **First place should feel special** — trophy icon, glow effect, "Current Champion" label, something that says "this person is winning"
3. **Catchphrases should be prominent** — in wrestling, the catchphrase defines the character. Should be larger, maybe with animated text on hover.
4. **Entrance music should auto-preview** — when viewing a member, play a 5-second clip (optional, respectful of autoplay rules)
5. **Game history should tell stories** — "Game 7: [Player] emerged victorious after a legendary combo, claiming the top spot in standings" (not "Placement: 1, Points: 3")

---

## Accessibility Review

### Semantic HTML
- ✅ All forms use `<form>` with proper `onSubmit`
- ✅ Inputs have `<label>` (some implicit via placeholder, should be explicit)
- ✅ Buttons are `<button>` elements (not divs with onClick)
- ❌ Tables have no `<caption>` or `aria-label` (screen reader users don't know what table they're in)
- ❌ Tabs have no `role="tablist"` / `role="tab"` / `role="tabpanel"` ARIA (implemented as buttons with conditional rendering)

### Keyboard Navigation
- ✅ All interactive elements are focusable
- ❌ No visible focus rings on tab buttons (default outline suppressed by Tailwind reset, not replaced)
- ❌ Dropdowns on LogGamePage have no keyboard shortcuts (down arrow to open, enter to select)

### Color Contrast
- ✅ Most text meets WCAG AA (text-secondary on surface background is ~6:1)
- ❌ Status badges ("active", "completed") use low-contrast backgrounds (bg-green-500/20 text-green-400 is marginal)
- ❌ Tab border on active state (border-accent at 2px) is visible but below 3:1 for non-text UI elements

### Screen Reader Support
- ❌ No `aria-live` regions (when standings update after logging a game, screen reader doesn't announce change)
- ❌ No `aria-current="page"` on active tab
- ❌ Rank badges (1st/2nd/3rd with color only) have no text alternative (should be "1st place" not just "1")
- ✅ Links and buttons have descriptive text

---

## Priority Recommendations

### 🔴 Critical (Do First)

**1. Fix the scoring system UI bug**  
Standings table still shows "First Bloods" and "Last Stands" columns, which are deprecated. Remove these columns. Add "2nd Place" and "3rd Place" columns to match new 3-2-1-0 system.

**Effort:** 1 hour  
**Impact:** Prevents user confusion about how scoring works

---

**2. Apply glass morphism to all league cards**  
Replace `bg-surface` with `bg-[var(--color-surface)]/80 backdrop-blur-sm`, add `hover:-translate-y-0.5 hover:shadow-lg` transitions. This matches the main app's visual depth.

**Effort:** 2 hours (find/replace pattern across 3 pages)  
**Impact:** Instantly makes league pages feel like they belong to the same product

---

**3. Restructure LeaguePage hierarchy — add a hero section**  
Create a prominent "Current Champion" card above the tabs showing:
- 1st place superstar name (Cinzel, text-3xl)
- Their total points + trophy icon
- Games played
- "Challenge them" CTA button (links to Log Game page)

**Effort:** 3 hours  
**Impact:** Solves the 5-second test failure, creates a focal point, surfaces the competitive narrative

---

**4. Reorder tabs: Members → Standings → Games**  
Members tab shows the personas (most interesting social content first). Standings show current score. Games are historical reference.

**Effort:** 30 minutes  
**Impact:** Users discover the whimsical member profiles immediately instead of assuming this is a boring data tracker

---

**5. Add points preview to LogGamePage**  
Show live calculation as user selects placements:
- "1st place: 3 pts"
- "2nd place: 2 pts"
- "3rd place: 1 pt"
- "4th place: 0 pts"
- "+1 pt if entrance bonus awarded"

**Effort:** 2 hours  
**Impact:** Users understand the scoring system, reduces confusion, creates anticipation

---

### 🟡 High Priority (Do Second)

**6. Redesign standings table to feel like a leaderboard**  
- First place row gets gold gradient background
- Superstar names in Cinzel (these are personas, not data)
- Add trophy icon next to rank 1
- Larger font size for top 3 rows
- Remove deprecated columns (First Bloods, Last Stands)

**Effort:** 3 hours  
**Impact:** Standings stop feeling like a spreadsheet and start feeling like a championship scoreboard

---

**7. Enhance member profile cards**  
- Larger superstar names (text-2xl or text-3xl)
- Catchphrases in larger italic text (text-base, not text-sm)
- Entrance music as playable preview button (not just a link)
- Add hover animation (card tilts slightly, like a trading card reveal)

**Effort:** 3 hours  
**Impact:** Member profiles become the feature's personality anchor

---

**8. Improve empty states with illustrations + motivational copy**  
LeaguesPage empty: "Form your first pod. Build a rivalry. Claim the championship."  
LeaguePage standings empty: "The season awaits. Log your first game to stake your claim."  
Games empty: "No battles yet. Make history."

Add custom emojis or SVG illustrations (trophy, swords, dice).

**Effort:** 2 hours  
**Impact:** Empty states sell the vision instead of just describing absence of data

---

**9. Mobile-optimize LogGamePage player results**  
- Change grid from `grid-cols-3` to stacked layout on mobile (one row per player, full width for dropdowns)
- Add visual player cards instead of grid rows (avatar + name + dropdowns in a card)

**Effort:** 2 hours  
**Impact:** Form becomes usable on phones without zooming/scrolling horizontally

---

**10. Add success animation on game submit**  
When user clicks "Log Game", show:
- Success toast with confetti animation
- "Game logged! [Winning player] takes the lead" message
- Auto-redirect after 2 seconds (gives time to celebrate)

**Effort:** 2 hours  
**Impact:** Logging a game feels like an event, not a database insert

---

### 🟢 Nice to Have (Polish Round)

**11. Cinzel for section labels**  
Change all `text-xs uppercase tracking-wider` section headers to `font-[var(--font-heading)]` (Space Grotesk) or `font-brand` (Cinzel). Makes section labels feel crafted.

**Effort:** 1 hour  
**Impact:** Medium — adds visual consistency with main app

---

**12. Add color identity pips to league cards**  
Show MTG W/U/B/R/G pips for most common deck colors in each league (calculated from game results). Visual personality.

**Effort:** 3 hours  
**Impact:** Medium — adds MTG flavor to an otherwise generic league list

---

**13. Skeleton loading states**  
Replace "Loading..." text with skeleton cards that preview the layout (pulsing gray boxes in the shape of league cards, standings rows, etc.)

**Effort:** 2 hours  
**Impact:** Low — polish, not critical

---

**14. Game history narrative mode**  
Rewrite game history descriptions to tell stories:  
Current: "Game #7, Played at 2026-04-11 8:30 PM"  
Better: "Game 7: The Bloodbath — [Player1] claimed victory in a brutal 4-way clash"

Pull from spicy play descriptions or auto-generate from placements.

**Effort:** 4 hours (requires backend summary generation or frontend templating logic)  
**Impact:** Medium — adds personality to history, but not critical for MVP polish

---

**15. Entrance music auto-preview**  
If member has entrance music URL (YouTube/Spotify), embed a playable widget or show album art thumbnail. Clicking plays a 10-second preview.

**Effort:** 4 hours (requires media embed handling, respectful of autoplay policies)  
**Impact:** Low — whimsical but not essential

---

## Quick Wins vs. Design Investments

| Recommendation | Effort | Impact | Type |
|----------------|--------|--------|------|
| Remove deprecated scoring columns | 1h | Critical | Bug fix |
| Apply glass cards to all pages | 2h | High | Visual consistency |
| Add points preview to LogGamePage | 2h | High | UX clarity |
| Reorder tabs (Members first) | 30m | High | Information architecture |
| Hero section on LeaguePage | 3h | High | Hierarchy fix |
| Redesign standings as leaderboard | 3h | High | Social/competitive feel |
| Enhance member profile cards | 3h | Medium | Personality |
| Mobile-optimize LogGamePage | 2h | Medium | Mobile UX |
| Success animation on submit | 2h | Medium | Delight |
| Improve empty states | 2h | Medium | Onboarding |
| Cinzel for section labels | 1h | Medium | Visual polish |
| Color identity pips | 3h | Low | MTG flavor |
| Skeleton loaders | 2h | Low | Polish |
| Game history narrative mode | 4h | Low | Personality |
| Entrance music previews | 4h | Low | Whimsy |

**Total effort for Critical + High: ~20 hours**  
**Total effort for all recommendations: ~33 hours**

---

## What's Already Good (Don't Change)

✅ **Spicy play callout design** — The orange border + background for "Spicy Play of the Week" is visually distinct and fun. Keep it.  
✅ **Status badges** — Color-coded active/completed/upcoming badges work well. Maybe increase contrast but don't rethink the pattern.  
✅ **Breadcrumb nav** — Simple, functional, correct. No changes needed.  
✅ **Log Game button placement** — Top-right CTA on LeaguePage is the right call.  
✅ **Tab structure** — Using tabs for Standings/Games/Members is the correct organizational pattern (just reorder them).  
✅ **Member avatar fallback** — The ⚔️ emoji for users without avatars is on-brand and charming.  
✅ **Game number in Cinzel** — Using `font-brand` for game numbers is correct (these are historic events, should feel important).  
✅ **Form validation** — Placement uniqueness check is implemented correctly (prevents duplicate 1st place awards).

---

## Creative Directions (Pick One or Blend)

### Direction A: Championship Belt Style
Lean into the WWE aesthetic aggressively:
- Standings table styled like a title belt ranking (gold gradient for 1st, metallic effects)
- Member profiles get "entrance video" treatment (animated GIF backgrounds, dramatic text reveals)
- Game history uses fight card metaphors ("Main Event", "Undercard", "Rivalry Match")
- Logging a game shows a "Tale of the Tape" preview (vs. screen with both players' stats)

**Pros:** Maximum personality, unforgettable  
**Cons:** High design effort, may feel too playful for serious competitive pods  

---

### Direction B: Refined Scoreboard
Emphasize clean, modern data visualization:
- Standings as a gradient-ranked list (like Spotify Wrapped year-end stats)
- Member profiles focused on stats (win rate, avg placement, recent form)
- Game history as a timeline (vertical line with nodes for each game)
- Logging a game shows statistical impact ("This moves you from 3rd to 2nd")

**Pros:** Scalable, professional, great for data-driven players  
**Cons:** Loses some of the whimsy (superstar names, catchphrases feel less important)

---

### Direction C: Social Feed Hybrid
Make league page feel like a social feed:
- Standings visible at top (hero), then a chronological feed of games + member updates mixed
- Member profiles integrated into feed ("X updated their catchphrase", "Y changed their entrance music")
- Logging a game creates a feed post ("X dominated Game 7! Click to see results")
- Comments on games (optional feature)

**Pros:** Feels alive and social, encourages engagement  
**Cons:** Higher complexity (requires feed logic, infinite scroll, real-time updates)

---

**Recommendation:** Start with **Direction A visual style** (championship belt scoreboard, member personalities front and center) but keep the **Direction B structure** (clean tabs, data-first on standings). This gives you personality without requiring a full feed architecture rebuild.

---

## Next Steps

1. **Choose priority level** — do you want Critical only (5 items, ~8 hours) or Critical + High (10 items, ~20 hours)?
2. **Visual mockup or direct implementation?** — I can either create a visual mockup (HTML preview page) or go straight to implementing changes in the actual components.
3. **Mobile-first or desktop-first fix order?** — Given this feature is for game night (phones), should we prioritize mobile optimizations first?

Let me know your preference and I'll proceed.
