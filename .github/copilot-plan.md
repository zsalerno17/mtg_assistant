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
- **Profile page avatar presets**: Added 8 MTG mana pip–style SVG preset avatars (W/U/B/R/G/Colorless/Gold/Planeswalker) to ProfilePage. Users can pick a preset or upload their own image. Preset icons stored in `frontend/src/lib/avatarPresets.js`.
- **SVG data URI fix**: Replaced `btoa()` with `encodeURIComponent` + `data:image/svg+xml;charset=utf-8,` prefix to avoid `InvalidCharacterError` crash on non-Latin1 SVG strings.
- **Nested `<a>` fix in DashboardPage**: Replaced `<Link>` wrapper on history cards with `<div role="button">` + `useNavigate()` to fix invalid nested anchor HTML. Inner Moxfield `<a>` link preserved.
- **Sidebar profile area**: Desktop sidebar now shows username (if set) above email in muted text; full area has hover ring + `cursor-pointer` affordance linking to `/profile`.
- **Email removed from ProfilePage**: Email is no longer shown as editable text on the profile page (only used internally for avatar initials fallback).

## Decisions
<!-- Agents: record architectural or design decisions and the reasoning -->
