# Button Design System Consolidation Plan

> **Status:** Planning complete, ready for implementation  
> **Date:** April 12, 2026  
> **Phase:** Phase 37 (follows Phase 36 Chart Redesign)

---

## Problem Statement

Buttons across the app don't follow the established design principles. Multiple inconsistent patterns exist despite having a proper design system defined in components.css.

**Design Principles (from copilot-plan.md):**
- **Component Style:** Crisp (flat surfaces, borders carry structure, NO gradients except primary CTA glow in dark mode)
- **Visual Conventions:** CTA buttons use primary with glow shadow in dark mode
- **Motion:** 350ms duration, hover lift (-translate-y-0.5), 1.02x scale

---

## Current State Analysis

### Button Patterns Found

1. **✅ Design System Classes** (components.css) — EXIST but UNDERUTILIZED
   - `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-text`, `.btn-icon`
   - Follow "Crisp" style: flat surfaces, borders, no gradients
   - Only ~8-10 uses across entire app

2. **❌ Inline Gradient Buttons** — MOST COMMON (~25+ instances)
   - Pattern: `bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]`
   - Found in: DashboardPage, ProfilePage, ImportDeckPage, LeaguesPage, HelpPage
   - Violates design system (gradients not part of "Crisp" style)
