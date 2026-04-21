# Set-Restricted Upgrade Suggestions

Allow users to filter AI improvement suggestions to only cards from specific sets they own (e.g., "only TMNT Secret Lair cards", "only Fallout precon cards", or both).

---

## Phase 1: Backend — Accept and apply set filter
**Goal:** Filter collection to specified sets before Gemini sees it → suggestions only include cards from those sets

- [x] `supabase/functions/_shared/gemini.ts` — Add optional `allowedSets?: string[]` param; add constraint line to prompt when sets are active
- [x] `supabase/functions/ai/index.ts` — Destructure `allowed_sets` from request body; filter `collectionCards` before passing to Gemini; pass filtered cards into `ownedLower`; adjust cache key to include sets
- [x] `supabase/functions/collection/index.ts` — Store `set_code` in `cards_json` on upload (prerequisite for set filtering; users must re-import collection to enable set picker)

---

## Phase 2: Frontend — Set filter UI on Improvements tab
**Goal:** Users can pick one or more sets from their collection and re-run suggestions filtered to those sets

- [x] `frontend/src/lib/api.js` — Update `getImprovements` to accept and pass `allowedSets`
- [x] `frontend/src/pages/DeckPage.jsx` — Add `selectedSets` state; fetch collection to derive available sets; render chip-based multi-select filter; show active filter banner with clear button; handle empty-collection-for-set edge case

---

## Verification

1. Import a collection with cards from multiple sets
2. Open an analyzed deck → Improvements tab
3. Select one set → confirm suggestions only reference that set's cards
4. Select multiple sets → confirm both sets' cards appear
5. Clear filter → confirm full collection suggestions return
6. Select a set with zero owned cards → confirm friendly empty-state message
