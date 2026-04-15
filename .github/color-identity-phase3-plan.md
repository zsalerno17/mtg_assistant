# Color Identity Building Blocks — Phase 3 Implementation Plan

> Created: April 15, 2026  
> MTG Specialist review: Complete — findings incorporated  
> Status: Ready for implementation

---

## Context

The Colors tab on the Collection page shows color pair analysis to help players understand which Commander color combinations their collection supports. Three bugs and two missing features need to be addressed:

1. **All combinations show "Needs Cards"** — staple counts are near-zero because:
   - Cards are grouped by *exact* color identity (a GU card only counts in GU, never G or U)
   - Colorless staples (Sol Ring, Lightning Greaves, etc.) are excluded entirely despite being legal in every Commander deck
   - Thresholds were set for the broken counts, not realistic ones
2. **Commander suggestions were hardcoded** — already fixed in previous session (now pulled from collection's Legendary Creatures)
3. **Commander list is plain bullet links** — should be a table with Scryfall card image on hover
4. **Combo names have no descriptions** — players don't know what "Sultai" or "Witch-Maw" means
5. **5-color will always show "Ready"** after the subset fix since WUBRG is a superset of every card — thresholds must scale by color count

---

## Phase 1: Backend — Fix Staple Counting

**File:** `supabase/functions/_shared/collection_analyzer.ts`

### 1A — Include colorless staples

Remove the colorless skip for staple-counting purposes. Cards with `color_identity: []` (Sol Ring, Arcane Signet, Lightning Greaves, Skullclamp, Commander's Sphere, etc.) are legal in every Commander deck and must count toward every pair's `deck_staples`. Keep excluding them from the 5×5 matrix cell values and from `card_count`.

Current code to change (line ~1102):
```typescript
if (colorIdentity.length === 0) continue; // skip colorless  ← REMOVE THIS
```

### 1B — Add `deck_staples` field with subset logic

Add `deck_staples: number` to the `ColorPairStrength` interface.

After building all pairs, compute it by filtering the full `cards` array for staples whose `color_identity` is a subset of the pair's colors. This aligns with actual Commander rules: a GU deck can legally run all mono-G, mono-U, GU-exact, and colorless cards.

```typescript
function isColorSubset(cardColors: string[], pairColors: string[]): boolean {
  // Colorless cards (empty array) are a subset of everything
  if (cardColors.length === 0) return true;
  const pairSet = new Set(pairColors);
  return cardColors.every(c => pairSet.has(c));
}

// After pairs array is built, enrich each with deck_staples
for (const pair of pairs) {
  const pairColorsArray = pair.colors.split('');
  pair.deck_staples = cards.filter(card => {
    const typeLine = (card.type_line || '').toLowerCase();
    if (typeLine.includes('land')) return false;
    return isColorSubset(card.color_identity || [], pairColorsArray) && isStapleCard(card);
  }).length;
}
```

### 1C — Sync `strong_pairs` threshold

Update `strong_pairs` from ≥20 to ≥30 so backend and UI agree on what "strong" means:
```typescript
const strong_pairs = multi_color.filter(p => p.staple_count >= 30); // was 20
```

### Phase 1 Test
Deploy: `npx supabase functions deploy collection` (from `supabase/` dir)

Verify via browser console on the Colors tab:
- `deck_staples` should appear on each pair object (check Network tab → `/analyze` response)
- A 2-color pair like Simic (GU) should have `deck_staples` in the 30–100+ range (not 3–15)
- Colorless cards (Sol Ring) should be reflected in every pair's count

---

## Phase 2: Frontend — Fix Status Logic

**File:** `frontend/src/components/ColorIdentityMatrix.jsx`

### 2A — Scale thresholds by color count

Replace the flat thresholds with color-count-scaled ones. Without scaling, WUBRG will always show "Ready" after the subset fix since it includes every card in the collection:

```javascript
function getStatus(pair) {
  const s = pair.deck_staples ?? 0;
  const thresholds = {
    1: { ready: 15, developing: 8  },
    2: { ready: 30, developing: 15 },
    3: { ready: 45, developing: 25 },
    4: { ready: 55, developing: 35 },
    5: { ready: 65, developing: 45 },
  };
  const t = thresholds[pair.colors.length] || thresholds[2];
  if (s >= t.ready)      return 'ready';
  if (s >= t.developing) return 'developing';
  return 'needs-cards';
}
```

### 2B — Show deck_staples in row summary

Update the card count display from `{pair.card_count} cards · {pair.staple_count} staples` to `{pair.deck_staples} staples · {pair.card_count} cards` so the primary metric is the meaningful one.

Add a section-level note: *"Staple counts include all cards legally playable in that color identity."*

### Phase 2 Test
- Colors tab shows varied statuses (Ready / Developing / Needs Cards) instead of all "Needs Cards"
- 5-color (WUBRG) does not trivially show "Ready" — requires ≥65 deck_staples
- Row shows staple count prominently

---

## Phase 3: Frontend — Commander Table with Card Hover

**File:** `frontend/src/components/ColorIdentityMatrix.jsx`

Import `CardTooltip` (already used in `CollectionDepth.jsx` and `CollectionEfficiency.jsx`):
```javascript
import CardTooltip from './CardTooltip';
```

In `ColorPairCard`'s expanded panel, replace the bullet `<a>` links with a compact table. Each commander name is wrapped in `CardTooltip` for Scryfall image on hover and Scryfall link on click:

```jsx
{pair.commander_suggestions?.length > 0 ? (
  <>
    <div className="text-xs text-[var(--color-muted)] mb-1.5">
      Commanders in your collection:
    </div>
    <table className="w-full">
      <tbody>
        {pair.commander_suggestions.map(name => (
          <tr key={name} className="border-b border-[var(--color-border)] last:border-0">
            <td className="py-1.5">
              <CardTooltip cardName={name}>
                <a
                  href={`https://scryfall.com/search?q=!%22${encodeURIComponent(name)}%22`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-link)] hover:underline"
                >
                  {name}
                </a>
              </CardTooltip>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
) : (
  <div className="text-xs text-[var(--color-muted)] italic">
    No legendary creatures in your collection for this color identity
  </div>
)}
```

### Phase 3 Test
- Expand any color combination row → commander table renders
- Hover a commander name → Scryfall card image appears (150ms delay)
- Click a commander name → Scryfall opens in new tab
- Empty state ("No legendary creatures...") appears for combos with no matching commanders

---

## Phase 4: Frontend — Combo Name Tooltips

**File:** `frontend/src/components/ColorIdentityMatrix.jsx`

Add a `COMBO_DESCRIPTIONS` lookup at the top of the file. All descriptions reviewed and corrected by MTG specialist (key correction: Simic is "card advantage" not "control"):

```javascript
const COMBO_DESCRIPTIONS = {
  // Guilds
  'UW': 'Azorius — Control and taxation. Counterspells, board wipes, and pillowfort effects. Struggles with ramp but excels at staying alive.',
  'BW': 'Orzhov — Aristocrats and life drain. Sacrifice synergies, reanimation, and incremental drain win conditions.',
  'RW': 'Boros — Aggro and equipment. Commander damage, go-wide tokens, and combat tricks. The weakest pair for card draw and ramp.',
  'GW': 'Selesnya — Tokens and counters. Wide creature strategies, anthems, and lifegain. Good ramp, but lacks removal flexibility.',
  'BU': 'Dimir — Control and reanimation. Card draw, tutors, counterspells, and graveyard recursion. One of the most consistent pairs for combo.',
  'RU': 'Izzet — Spellslinger and combo. Instants/sorceries matter, copy effects, and wheels. Lacks targeted removal outside bounce and counters.',
  'GU': 'Simic — Ramp and card advantage. Land ramp, mana dorks, card draw, and big threats. Strong in midrange and infinite mana combos.',
  'BR': 'Rakdos — Aristocrats and reanimation. Sacrifice outlets, haste threats, efficient removal, and resource denial.',
  'BG': 'Golgari — Graveyard and recursion. Self-mill, reanimation, and sacrifice loops. Black tutors plus Green ramp makes this extremely consistent.',
  'GR': 'Gruul — Ramp and aggro. Ramp into large threats and deal combat damage quickly. Weak at card draw and interaction.',
  // Shards & Wedges
  'GUW': 'Bant — Value midrange. Ramp, counterspells, and ETB creatures. Strong flicker synergies and resilient threats.',
  'BUW': 'Esper — Artifacts and control. The premier artifact-matters combination. Counterspells, board wipes, tutors, and graveyard recursion.',
  'BRU': 'Grixis — Control and combo. Efficient answers, card draw, and combo lines. Strong in cEDH due to access to the best interaction.',
  'BGR': 'Jund — Midrange and attrition. Removal, wheels, and ramp. Strong in pods that want to grind value.',
  'GRW': 'Naya — Big creatures and tokens. Ramp into large threats and wide boards. Limited counterspell access — relies on being faster or bigger.',
  'BGW': 'Abzan — Resilient midrange. Ramp, removal, recursion, and +1/+1 counters. No countermagic but the most flexible removal suite of any wedge.',
  'RUW': 'Jeskai — Spellslinger and control. Counterspells, board wipes, and draw engines built around spell-casting triggers.',
  'BGU': 'Sultai — Combo and control. Tutors, counterspells, card draw, and self-mill. Arguably the strongest 3-color combination for competitive Commander.',
  'BRW': 'Mardu — Aggro and drain. Strong removal, fast threats, and reanimation. Lacks Green ramp, limiting consistency.',
  'GRU': 'Temur — Ramp and big spells. Large creatures, counterspells, and card draw. Lacks targeted removal and Black tutors.',
  // 4-color
  'BRUW': 'Yore-Tiller (no Green) — Artifacts, control, and aggro without ramp.',
  'BGUW': 'Witch-Maw (no Red) — Proliferate, counters, and slow value engines. Atraxa colors.',
  'GRUW': 'Ink-Treader (no Black) — Lands, spells, and creature synergies. Omnath colors.',
  'BGRW': 'Dune-Brood (no Blue) — Aggro, sacrifice, and wide boards. Saskia colors.',
  'BGRU': 'Glint-Eye (no White) — Cascade, chaos, and high-variance plays. Yidris colors.',
  // 5-color
  'BGRUW': 'Five-Color — All five colors. Maximum card access and flexibility, but high mana base requirements.',
};
```

Apply with dotted underline on the combo name span in `ColorPairCard`:
```jsx
<span
  className="text-sm font-medium text-[var(--color-text)] cursor-help border-b border-dotted border-[var(--color-muted)]"
  title={COMBO_DESCRIPTIONS[pair.colors]}
>
  {colorName}
</span>
```

### Phase 4 Test
- Hover any combo name (e.g. "Simic") → tooltip appears with description
- Dotted underline signals the name is hoverable
- Mono-color names (White, Blue, etc.) show no underline (no description entry — intentional)

---

## Known Limitations (documented, not fixed)

- **Board wipe regex** misses -X/-X sweepers (Toxic Deluge, Languish) — they won't count as staples
- **Tutor regex** has minor edge case risk on unusual "search library" phrasing
- **Colorless exclusion from matrix** — Sol Ring won't appear in the 5×5 heatmap cells (correct behavior — it has no color to display)

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/_shared/collection_analyzer.ts` | Colorless inclusion, `deck_staples` field + subset logic, `strong_pairs` threshold sync |
| `frontend/src/components/ColorIdentityMatrix.jsx` | Scaled thresholds, CardTooltip import, commander table, combo descriptions |
