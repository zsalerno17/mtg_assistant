# MTG Assistant — Full UI/UX Design Analysis

> Conducted April 2026. Covers all 4 pages + Layout shell.
> The design system (Option A palette) is **correctly implemented** — this analysis is about hierarchy, depth, IA, and premium feel, not color correctness.

---

## Executive Summary

The app has a solid foundation: the right dark-arcane palette, Cinzel for headings, semantic CSS vars, and a responsive sidebar/bottom-nav shell. But it reads **flat and generic** — the kind of flatness that comes from a well-coded design that hasn't been pushed to feel like a *product*. The two root causes:

1. **Hierarchy is missing at the page level.** Every section on every page has roughly equal visual weight. The user's eye has nowhere to land first.
2. **The core value proposition is buried.** The app's differentiators (weakness explanations, strategy advice, collection-aware upgrades) are hidden behind tabs while the above-the-fold screen shows a mana curve — which Moxfield already does.

These two problems compound: users see generic stats first, don't feel the value, and may not explore further.

---

## Page-by-Page Diagnosis

---

### 1. Login Page

**Current state:** Centered layout — title, tagline, Google button. Functional. Completely generic.

**Problems:**
- **No personality.** It looks like every generic "Sign in with Google" screen. The product is about Magic: The Gathering — there is zero MTG aesthetic on the first screen a user ever sees.
- **Cinzel is used right** (title 4xl, amber) — but it's floating on an empty dark background with no compositional context.
- **The tagline is accurate but cold.** "Deck recommendations, play strategies, and scenario analysis" is a feature list, not a promise. It doesn't tell users *why* this is exciting.
- **No visual anchor.** The button is the only interactive element but there's nothing drawing the eye to it — no visual weight difference vs. the background it sits on.

**What's missing:** Any sense of the app's personality. The color pips of MTG (W/U/B/R/G), a subtle card art reference, a background texture, or even just the radial glow from the body pushed more strongly here would help. This is the first impression and it's currently forgettable.

---

### 2. Dashboard Page

**Current state:** max-w-2xl, stacked URL form → history list.

**Problems:**

**Hierarchy:**
- The page title "Dashboard" is generic. It tells users where they are (technically) but not *what to do*. A new user who just signed in sees "Dashboard" and a URL input with no context.
- Below the form is `h2 "Analyze a Deck"` — this should be the *primary call-to-action label*, not a page section header.
- The form card has `ring-1 ring-[color-primary]/8` — that's 8% opacity on the ring. This is invisible. The form is one of the most important elements on the page and it has no visual prominence.
- The decorative `h-px w-16` gradient underline under "Dashboard" is present but meaningless — it signals "there's a design system" without contributing to hierarchy.

**Information density in history list:**
- Each history item shows deck name, up to 3 theme tags, a date, and a Moxfield link. This is fine for the MVP but there's no health signal — users can't scan their history list and know which decks need work.
- No commander name shown in the list items, which is the single most important card in a Commander deck.
- Color identity pips are mentioned in PLAN.md as a desired addition — this is the right call. It's the fastest visual way to communicate deck identity.

**Empty state:** The existing empty state is adequate (icon + copy + micro-instruction). Not a priority.

**Width constraint:** max-w-2xl is appropriate for a focused tool, but it means the history list feels narrow when there's content. Consider max-w-3xl to give list items more breathing room.

---

### 3. Deck Page — The Most Important Page

This is where users spend the most time. It has the most to fix.

**Current state:** Full-width top bar → horizontal tab bar → max-w-5xl tab content.

**Critical problem — failing the 5-second test:**
A user who just analyzed their deck lands on Overview and sees: a verdict paragraph, two small callout buttons, "Commander: [name]", a 7-badge stat row, a mana curve chart, card type breakdown, themes, weaknesses. This is an information dump. There is no single dominant element that communicates what this app does that Moxfield doesn't.

**Tab bar problems:**
- "Collection Upgrades" and "Improvements" both call `api.getImprovements()` — this is both a functional bug *and* a UX problem (two tabs for the same content).
- The tab order doesn't reflect value: Overview → Collection Upgrades → Strategy → Improvements → Scenarios. Strategy and Collection Upgrades are the differentiators — they should be more prominent, not buried at position 2 and 3.
- Five tabs is at the edge of comfortable for a horizontal tab bar, especially on mobile where "Collection Upgrades" is a long label.

**Overview tab — hierarchy issues:**
- Commander name is styled with Cinzel at text-xl amber — this is good. But it lives below the stat badges in the document order, which is backwards. The commander IS the deck. It should be the visual anchor.
- StatBadge grid: `grid-cols-3 sm:grid-cols-7`. On mobile, 7 badges wrap to 3+3+1 — the last row gets a lone badge. This is an awkward layout.
- The mana curve chart is appropriately sized and styled. No changes needed here.
- Card types breakdown is a flat grid of label→count pairs. Functional, but visually identical in weight to the stat badges above it.
- Weaknesses — this is actually the **best-executed UI element in the entire app**. The expandable `<details>` with warning color border, the why/look_for/examples structure — this is genuinely differentiated and premium. It just needs to be *more prominent*, not buried at the bottom of a long scroll.

**The stat badge ambiguity:**
Badges show green/red for healthy/warning states. Good. But "Avg CMC 2.91 (green)" and "Ramp 7 (red)" require users to know Commander conventions to interpret. The badges would benefit from a tooltip or a small contextual note (already partially addressed by the weakness cards, but the connection isn't visual — users don't know that the red "Ramp 7" badge has an explanation in Weaknesses).

**Top bar:**
- The top bar with back link + deck name is clean. But on a wide desktop, it's just a thin strip with two items — it feels like leftover space. The commander name and color identity could live here.

**Tab content area — no max-width on full container:**
- `<div className="max-w-5xl py-6">` is only applied to the inner content, not the outer wrapper. The tab bar itself goes full width, which is fine. But consistent with the rest of the shell.

---

### 4. Collection Page

**Current state:** Upload zone + card grid.

**Problems:**

**No max-width constraint:**
The page has `p-6` but no `max-w-*` container. The drag-drop zone stretches full width. On a 1400px wide screen, the upload zone is enormous and the text inside feels lost. This also breaks the scannable layout — there's no clear center of gravity.

**The card grid:**
- `max-h-[480px] overflow-y-auto` — a fixed-height scrollable box inside a full-height page is a poor pattern. It creates a "box within a box" scroll context and feels like a developer shortcut rather than a design decision.
- Cards in the grid display name + quantity. That's all. For a collection of 1000+ cards, this is purely functional — but there's an opportunity to add color identity or card type indicators here without much effort.
- The search input is right-aligned next to the card count — this is fine on desktop but the alignment breaks awkwardly on tablet widths.

**Missing:** A progress/status section. Users should understand their collection's coverage — how many of their decks' recommended cards they already own. This surfaces the "Collection Upgrades" tab value.

---

### 5. Layout / Shell

**Current state:** Sidebar on desktop (w-16 collapsed / w-60 expanded), bottom nav on mobile.

**Problems:**

**Mobile bottom nav — don't-sign-me-out trap:**
The "Profile" button in the bottom nav calls `signOut()` directly. Users who tap "Profile" expecting account details or preferences will accidentally be signed out. This is a trust-destroying interaction. The button should navigate to a profile/settings view, or at minimum show a confirmation. No other well-designed app makes "tap your avatar" call signOut.

**Sidebar brand:**
- The brand in the sidebar is `"MTG Assistant"` in Cinzel amber, with a drop shadow glow. This is correct and premium. On collapsed (w-16) it shows just "M" — this works.
- The sidebar has no visual element that signals "this is a Magic app" — no small icon, no color pips, nothing. On w-16 view on mid-size screens, users just see "M" with nav icons. Not obviously an MTG tool.

**No active state on deck pages:**
When on a DeckPage, neither "Home" nor "Collection" is highlighted in the nav — there's no active breadcrumb. This is a minor disorientation (the user came from Home, but Home is no longer showing as active).

---

## Cinzel Underuse

Cinzel appears on: Login title, Dashboard h1, Collection h2, Commander name in Overview, DeckPage top-bar deck name, Layout brand.

It does **not** appear on:
- Section labels (currently `text-xs uppercase tracking-wider` in body font)
- Tab labels
- Stat badge labels
- Any of the themed "section identity" moments

The `text-xs uppercase tracking-wider` pattern for section heads is the single easiest and highest-impact fix: switching these to `font-[var(--font-heading)] text-xs tracking-widest` would immediately make the app read as crafted rather than generic, because Cinzel will render those section labels with serifs and old-style proportions even at tiny sizes.

---

## Priority Rankings

### High (hierarchy/value demonstration — do these first)

1. **Fix the 5-second test on DeckPage** — restructure Overview tab: commander + color identity at the TOP as a hero element, then stats, then mana curve, then weaknesses in a more prominent position. Weaknesses are the app's killer feature — they should not be discoverable only by scrolling to the bottom.

2. **Expose the differentiators** — the Strategy/Improvements tabs should feel like destinations, not afterthoughts. The Overview's differentiator callout buttons are a start but are styled as small ghost buttons. They need to be a real section with a hook — e.g. a "What else can you do?" card that previews what's in Strategy and Collection Upgrades.

3. **Fix the Collection Upgrades / Improvements bug** — they both call `api.getImprovements()`. These should be distinct or merged into one tab.

4. **Profile button in mobile nav must not call signOut** — this is the most egregious UX bug in the app. Swap it to a settings/profile view or remove signOut from that tap target.

### Medium (polish and depth)

5. **Apply Cinzel to section headers** — swap all `text-xs uppercase tracking-wider` (body font) section labels to Cinzel. Instant premium feel.

6. **Add color identity pips to Dashboard history items** — show MTG W/U/B/R/G pips next to deck name based on `result_json.colors` or commander colors. This is the highest-impact single visual addition to the history list.

7. **Dashboard form visual prominence** — increase the `ring-[color-primary]/8` to something visible (~20–30% opacity), and add a subtle inner glow on focus. The form card is the primary CTA and should look more prominent.

8. **Collection page max-width** — add `max-w-4xl mx-auto` to the collection page container. Remove the fixed `max-h-[480px]` scroll box; let the card grid flow naturally.

9. **StatBadge mobile layout** — change `grid-cols-3 sm:grid-cols-7` to `grid-cols-4 sm:grid-cols-7` to avoid the lone-badge orphan. Or group the 7 badges into logical clusters (e.g. 4 + 3 with a gap).

### Low (personality and delight)

10. **Login page visual identity** — add MTG color pip symbols (◆ W/U/B/R/G row), a subtle texture or card-back pattern to the background, or a tagline that feels exciting rather than informational. "Build better commanders. Before the match." > "Deck recommendations, play strategies…"

11. **Deck top bar depth** — add commander name + color identity in the top bar (subtitle under the deck name). This immediately orients the user without requiring them to scroll into Overview.

12. **Sidebar brand icon** — add a small MTG-flavored icon or visual element to the collapsed sidebar state (w-16 view) so "M" has a bit more context.

---

## Quick Wins vs. Design Investments

| Change | Effort | Impact |
|---|---|---|
| Section headers → Cinzel | 30 min | High |
| Profile nav button → fix signOut | 1 hour | Critical |
| Collection page max-width | 15 min | Medium |
| Ring opacity on dashboard form | 10 min | Medium |
| Color pips in history list | 2 hours | High |
| Fix Collection Upgrades / Improvements dupe | 1 hour | High |
| Commander as hero in DeckPage Overview | 3 hours | High |
| Login page visual personality | 2 hours | Medium |
| StatBadge grid cols fix | 15 min | Low |

---

## What's Already Good (don't change)

- **The color palette** — Option A is the right call. Deep navy background with amber accents feels premium MTG-adjacent without being garish.
- **The weakness cards** (`<details>` expand with why/look_for/examples) — the single best-executed piece of UI in the entire app. Genuinely differentiated. Needs to be made more prominent, not redesigned.
- **StatBadge color semantics** (red warning, green healthy) — clear and correct. Thresholds are sensible.
- **Mobile responsive structure** — sidebar/bottom-nav pattern is well-implemented. The tab bar's `overflow-x-auto` handles long tab labels correctly.
- **Theme pill tooltips** — hover to reveal definition is a good progressive disclosure pattern. Keep it.
- **Mana curve chart** — correctly colored, appropriately sized, good use of space.
- **The overall typography pairing** — Cinzel + Inter + JetBrains Mono is cohesive and fitting for the domain.
