# Archidekt Import

## Goal

Add Archidekt (archidekt.com) as a second deck and collection import source alongside Moxfield. Users paste an Archidekt URL exactly as they would a Moxfield URL — no separate flow.

## Phases

### Phase 1 — DB Migration
**Goal:** Schema supports decks from multiple sources without breaking existing Moxfield rows.

- [x] Create `supabase/migrations/021_add_source_to_decks.sql`
  - Add `source TEXT NOT NULL DEFAULT 'moxfield'` to `decks` table
  - Add `source TEXT NOT NULL DEFAULT 'moxfield'` to `user_decks` table
  - No UNIQUE constraint changes needed (Moxfield IDs are Base62 strings, Archidekt IDs are short integers — no collision risk)

### Phase 2 — Archidekt API Client
**Goal:** `_shared/archidekt.ts` mirrors `moxfield.ts` in interface.

- [x] Create `supabase/functions/_shared/archidekt.ts`
  - `extractDeckId(url)` — match `/decks/(\d+)/` in archidekt.com URLs
  - `getDeck(deckId)` — `GET https://archidekt.com/api/decks/{id}/`, 10s timeout
  - `getDeckWithMeta(deckId)` — same + returns `updatedAt` timestamp
  - `parseArchidektDeck(data)` — maps `categories[]` → `Deck` model
    - Category named `"Commander"` → commander/partner slots
    - Category named `"Sideboard"` → sideboard
    - Everything else → mainboard
    - `entry.card.uid` → `scryfall_id`, image URI constructed from Scryfall CDN

### Phase 3 — Edge Function Updates
**Goal:** `decks/index.ts` auto-detects source and routes to the right client.

- [x] Add `detectSource(url)` helper → `"moxfield" | "archidekt"`
- [x] Update `handleFetch` — source-aware DB lookup/insert
- [x] Update `handleAddToLibrary` — source-aware, returns `source` in response
- [x] Update `handleAnalyze` — accepts `source` in body, calls correct re-fetch API
- [x] Update `handleGetLibrary` — passes `source` through in result objects

### Phase 4 — Collection CSV
**Goal:** Archidekt CSV exports (which use `"Quantity"` column) parse correctly.

- [x] Update `_shared/collection_parser.ts` — accept `"Quantity"` fallback alongside `"Count"`

### Phase 5 — Frontend
**Goal:** UI accepts both URL formats; `source` flows through analyze call.

- [x] `frontend/src/lib/api.js` — `analyzeDeck(deckId, source)` passes source in body
- [x] `frontend/src/pages/ImportDeckPage.jsx` — update label/placeholder/description text
- [x] `frontend/src/pages/CollectionPage.jsx` — update upload zone text
- [x] `frontend/src/pages/DashboardPage.jsx` — pass `source` into `analyzeDeck` call
