# Project Plan

## Current status
- Project: MTG Assistant
- State: Active development

## Active tasks
<!-- Agents: add tasks here as they come up -->

## Known issues
<!-- Agents: log bugs, tech debt, and risks here -->

## Recent changes
<!-- Agents: add a bullet after each task you complete. Newest first. -->
- **Creature avatar icon sizing fix**: Picker buttons icon `w-6 h-6` → `w-8 h-8`; large avatar display iconClass `w-12 h-12` → `w-14 h-14`. Matches mockup's ~77% icon-to-container fill ratio (40px icon in 52px circle).
- **Creature avatar system — 19 archetypes finalized**: Rewrote `creatureIcons.jsx` with `makeIcon()` factory + imports from `iconAlternatives.js`. Expanded `avatarPresets.js` to 19 entries (dragon, goblin, wizard, zombie, elf, vampire, vampire-bat, knight, knight-mounted, rogue, minotaur, orc, dwarf, ninja, samurai, griffin, wyvern, skeleton, pirate) — each with `bg` gradient + `iconColor` theme data + new `CREATURE_PRESET_MAP` export. Updated `ProfilePage.jsx` to use per-archetype themed circles (`renderCreatureAvatar` helper). Updated `IconMockupPage.jsx`: knight now shows 2 confirmed picks, 10 archetypes promoted from OTHER_ARCHETYPES into GROUPS with gold rings, OTHER_ARCHETYPES trimmed to 8 unconfirmed entries.
- **Pending cleanup**: remove `/mockup` route from `App.jsx`, delete `IconMockupPage.jsx`, delete orphaned old icon functions (DragonIcon–MerfolkIcon) from `creatureIcons.jsx`. Also: backend preset URL validation fix; mobile nav Profile button calls `signOut()` instead of navigating.
- **Profile page avatar presets**: Added 8 MTG mana pip–style SVG preset avatars (W/U/B/R/G/Colorless/Gold/Planeswalker) to ProfilePage. Users can pick a preset or upload their own image. Preset icons stored in `frontend/src/lib/avatarPresets.js`.
- **SVG data URI fix**: Replaced `btoa()` with `encodeURIComponent` + `data:image/svg+xml;charset=utf-8,` prefix to avoid `InvalidCharacterError` crash on non-Latin1 SVG strings.
- **Nested `<a>` fix in DashboardPage**: Replaced `<Link>` wrapper on history cards with `<div role="button">` + `useNavigate()` to fix invalid nested anchor HTML. Inner Moxfield `<a>` link preserved.
- **Sidebar profile area**: Desktop sidebar now shows username (if set) above email in muted text; full area has hover ring + `cursor-pointer` affordance linking to `/profile`.
- **Email removed from ProfilePage**: Email is no longer shown as editable text on the profile page (only used internally for avatar initials fallback).

## Decisions
<!-- Agents: record architectural or design decisions and the reasoning -->
