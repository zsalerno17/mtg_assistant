# Collection Metrics — Implementation Plan

> **Commander-focused collection analysis and insights**
> Created: April 14, 2026

## Overview

Extend the Collection page beyond basic card listing to provide **strategic insights** that help players understand:
- What functional pieces they own (ramp, draw, removal by quality)
- Which archetypes they can build
- Where their collection is strong vs weak
- How to make smart acquisition decisions

**Key differentiator:** Analyze collections through a Commander strategy lens, not just raw card data.

---

## Design Philosophy

### What Makes This Unique

**Existing tools** (EDHREC, Moxfield, Archidekt):
- Show card counts by type, mana value, color, set
- Track prices and total collection value
- Provide search/filter capabilities

**Our approach:**
- **Function over form** — "You have 23 ramp spells" broken down by quality (land ramp vs rocks vs dorks) and speed (≤2 CMC vs expensive)
- **Archetype readiness** — "Your collection supports Control (strong) and Combo (partial)" based on functional density
- **Color identity building blocks** — show which color pairs are well-supported for deck building
- **Collection efficiency** — track utilization rates, identify high-value cards not in decks, show duplicate opportunities
- **Staple coverage** — compare against curated Commander staple lists to guide acquisitions

### Commander-Specific Logic

Must account for:
- **Power level context** — cEDH needs different ramp thresholds than casual (fast mana rocks vs creature-based)
- **Color identity** — Simic has different removal needs (instants > sorceries) than Golgari (recursion-based)
- **Multiplayer dynamics** — board wipes and politics matter more than 1v1 formats
- **99-card singleton constraint** — collection depth for a function matters (having 20 removal options > having 3)

---

## Implementation Phases

### Phase 1: Collection Depth by Function (Priority: HIGH)

**Goal:** Show functional capability breakdown — the building blocks available for deck construction.

**UI Section:** Stats dashboard at top of Collection page

**Metrics:**

1. **Ramp Analysis** (23 total)
   - Land ramp: 8 cards (best for landfall, hard to remove)
   - Mana rocks ≤2 CMC: 12 cards (fast mana, but fragile)
   - Expensive rocks (3+ CMC): 3 cards (late-game only)
   - Mana dorks: 0 cards (vulnerable to board wipes)

2. **Card Draw Analysis** (31 total)
   - Draw engines (repeatable): 12 cards
   - One-shot draw: 19 cards
   - Wheel effects: 2 cards

3. **Removal Quality Tiers** (38 total)
   - Exile-based: 8 cards ⭐ (bypasses recursion)
   - Destroy: 24 cards
   - Damage-based: 6 cards
   - Bounce/Tuck: 4 cards (temporary solutions)
   - Exile %: 21%

4. **Board Control** (18 total)
   - Board wipes: 12 cards (3 asymmetric, 9 symmetrical)
   - Protection effects: 6 cards

5. **Interaction** (25 total)
   - Counterspells: 18 cards
   - Instant-speed removal: 12 cards
   - Instant-speed ratio: 48%

6. **Tutors** (5 total)
   - Unconditional: 2 cards
   - Conditional/restricted: 3 cards

**Technical Implementation:**

#### Backend: New Deno Edge Function

**File:** `supabase/functions/collection/analyze.ts`

```typescript
// New endpoint: GET /collection/analyze
// Returns functional breakdown of collection

import { Card } from "../_shared/models.ts";

export interface CollectionDepth {
  ramp: RampBreakdown;
  draw: DrawBreakdown;
  removal: RemovalBreakdown;
  board_control: BoardControlBreakdown;
  interaction: InteractionBreakdown;
  tutors: TutorBreakdown;
}

interface RampBreakdown {
  total: number;
  land_ramp: number;
  fast_rocks: number; // ≤2 CMC
  expensive_rocks: number; // 3+ CMC
  mana_dorks: number;
  cards: {
    land_ramp: string[];
    fast_rocks: string[];
    expensive_rocks: string[];
    mana_dorks: string[];
  };
}

interface DrawBreakdown {
  total: number;
  engines: number; // repeatable
  one_shots: number;
  wheels: number;
  cards: {
    engines: string[];
    one_shots: string[];
    wheels: string[];
  };
}

interface RemovalBreakdown {
  total: number;
  exile: number;
  destroy: number;
  damage: number;
  bounce_tuck: number;
  exile_percentage: number;
  cards: {
    exile: string[];
    destroy: string[];
    damage: string[];
    bounce_tuck: string[];
  };
}

interface BoardControlBreakdown {
  total: number;
  board_wipes: number;
  asymmetric_wipes: number;
  symmetrical_wipes: number;
  protection: number;
  cards: {
    board_wipes: string[];
    protection: string[];
  };
}

interface InteractionBreakdown {
  total: number;
  counterspells: number;
  instant_speed_removal: number;
  instant_speed_percentage: number;
}

interface TutorBreakdown {
  total: number;
  unconditional: number;
  conditional: number;
  cards: {
    unconditional: string[];
    conditional: string[];
  };
}
```

**Implementation strategy:**
- Reuse existing card categorization logic from `deck_analyzer.ts`
- Port Python regex patterns for oracle text matching
- Add collection-specific functions:

```typescript
export function analyzeCollectionDepth(cards: Card[]): CollectionDepth {
  return {
    ramp: analyzeRamp(cards),
    draw: analyzeDraw(cards),
    removal: analyzeRemoval(cards),
    board_control: analyzeBoardControl(cards),
    interaction: analyzeInteraction(cards),
    tutors: analyzeTutors(cards),
  };
}

function analyzeRamp(cards: Card[]): RampBreakdown {
  const rampCards = cards.filter(isRamp);
  
  const landRamp = rampCards.filter(c => 
    /search.*library.*land|put.*land.*battlefield/i.test(c.oracle_text)
  );
  
  const rocks = rampCards.filter(c => 
    c.type_line.includes("Artifact") && 
    /{t}.*add|produces.*mana/i.test(c.oracle_text)
  );
  
  const fastRocks = rocks.filter(c => c.cmc <= 2);
  const expensiveRocks = rocks.filter(c => c.cmc >= 3);
  
  const dorks = rampCards.filter(c =>
    c.type_line.includes("Creature") &&
    /{t}.*add/i.test(c.oracle_text)
  );
  
  return {
    total: rampCards.length,
    land_ramp: landRamp.length,
    fast_rocks: fastRocks.length,
    expensive_rocks: expensiveRocks.length,
    mana_dorks: dorks.length,
    cards: {
      land_ramp: landRamp.map(c => c.name),
      fast_rocks: fastRocks.map(c => c.name),
      expensive_rocks: expensiveRocks.map(c => c.name),
      mana_dorks: dorks.map(c => c.name),
    },
  };
}

// Similar functions for analyzeDraw, analyzeRemoval, etc.
```

**Reuse from deck_analyzer.ts:**
- `countRamp()`, `countDraw()`, `countRemoval()` — base detection logic
- Oracle text pattern matching utilities
- Color identity filtering

#### Frontend: Stats Dashboard Component

**File:** `frontend/src/components/CollectionDepth.jsx`

```jsx
export default function CollectionDepth({ analysis }) {
  const { ramp, draw, removal, board_control, interaction, tutors } = analysis;
  
  return (
    <div className="collection-depth">
      <h2>Collection Depth</h2>
      
      {/* Ramp Section */}
      <DepthCard 
        title="Ramp"
        total={ramp.total}
        breakdown={[
          { label: 'Land Ramp', count: ramp.land_ramp, quality: 'high' },
          { label: 'Fast Rocks (≤2 CMC)', count: ramp.fast_rocks, quality: 'high' },
          { label: 'Expensive Rocks', count: ramp.expensive_rocks, quality: 'medium' },
          { label: 'Mana Dorks', count: ramp.mana_dorks, quality: 'medium' },
        ]}
        cards={ramp.cards}
      />
      
      {/* Removal Quality */}
      <DepthCard
        title="Removal Quality"
        total={removal.total}
        breakdown={[
          { label: 'Exile ⭐', count: removal.exile, quality: 'high' },
          { label: 'Destroy', count: removal.destroy, quality: 'medium' },
          { label: 'Damage-based', count: removal.damage, quality: 'medium' },
          { label: 'Bounce/Tuck', count: removal.bounce_tuck, quality: 'low' },
        ]}
        metric={`${removal.exile_percentage}% exile`}
        cards={removal.cards}
      />
      
      {/* Draw, Board Control, Interaction, Tutors... */}
    </div>
  );
}

function DepthCard({ title, total, breakdown, metric, cards }) {
  return (
    <div className="depth-card">
      <div className="depth-header">
        <h3>{title}</h3>
        <span className="total">{total} total</span>
        {metric && <span className="metric">{metric}</span>}
      </div>
      
      <div className="depth-breakdown">
        {breakdown.map(item => (
          <DepthRow 
            key={item.label}
            label={item.label}
            count={item.count}
            quality={item.quality}
            cards={cards?.[item.label]}
          />
        ))}
      </div>
    </div>
  );
}

function DepthRow({ label, count, quality, cards }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className={`depth-row quality-${quality}`}>
      <div className="row-header" onClick={() => setExpanded(!expanded)}>
        <span className="label">{label}</span>
        <span className="count">{count}</span>
      </div>
      
      {expanded && cards && (
        <div className="card-list">
          {cards.map(name => (
            <CardTooltip key={name} cardName={name}>
              <span className="card-name">{name}</span>
            </CardTooltip>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Design specs (Phase 38 compliance):**
- Use `--accent-primary` (blue) for high-quality indicators (exile removal, land ramp)
- Use `--accent-tan` for medium-quality (destroy removal, expensive rocks)
- Use `--text-muted` for low-quality (bounce, conditional tutors)
- Progress bars for percentage metrics (exile %, instant-speed %)
- Crisp flat cards (no glass morphism) for data rows
- Expandable sections to see full card lists

---

### Phase 2: Archetype Readiness Matrix (Priority: HIGH)

**Goal:** Answer "What deck strategies can I actually build with my collection?"

**UI Section:** Visual grid showing supported archetypes

**Metrics:**

```
Archetype Readiness
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Control (Strong)
   • 18 counterspells
   • 12 board wipes
   • 31 draw sources
   • Gap: Need 3 more instant-speed interaction pieces

⚠️ Combo (Partial)
   • 5 tutors (need 8+ for consistency)
   • 23 ramp (good)
   • 12 protection effects (good)
   • Gap: Add fast mana (Mana Crypt, Chrome Mox)

❌ Tokens/Go-Wide (Weak)
   • Only 3 anthem effects
   • Only 2 token generators
   • Gap: Need 10+ token producers and 5+ anthems

✅ Reanimator (Strong)
   • 8 reanimation effects
   • 14 discard outlets
   • 12 board wipes (clear way)
   • Gap: None — ready to build

⚠️ Voltron (Partial)
   • 6 equipment
   • 7 auras
   • Only 2 protection spells (need 8+)
   • Gap: Add hexproof/indestructible effects
```

**Technical Implementation:**

#### Backend: Archetype Detection Logic

**File:** `supabase/functions/collection/archetypes.ts`

```typescript
export interface ArchetypeReadiness {
  name: string;
  status: 'strong' | 'partial' | 'weak';
  strengths: string[];
  gaps: string[];
  required_pieces: ArchetypeRequirements;
  owned_pieces: ArchetypePieces;
}

interface ArchetypeRequirements {
  archetype: string;
  min_counts: Record<string, number>;
  recommended_counts: Record<string, number>;
}

// Define thresholds for each archetype
const ARCHETYPE_REQUIREMENTS: ArchetypeRequirements[] = [
  {
    archetype: 'Control',
    min_counts: {
      counterspells: 10,
      board_wipes: 5,
      draw_sources: 15,
      instant_removal: 8,
    },
    recommended_counts: {
      counterspells: 15,
      board_wipes: 8,
      draw_sources: 20,
      instant_removal: 12,
    },
  },
  {
    archetype: 'Combo',
    min_counts: {
      tutors: 5,
      ramp: 15,
      protection: 6,
      fast_mana: 3,
    },
    recommended_counts: {
      tutors: 8,
      ramp: 20,
      protection: 10,
      fast_mana: 5,
    },
  },
  {
    archetype: 'Tokens',
    min_counts: {
      token_generators: 10,
      anthems: 5,
      board_wipes: 3,
      draw: 10,
    },
    recommended_counts: {
      token_generators: 15,
      anthems: 8,
      board_wipes: 5,
      draw: 15,
    },
  },
  // Reanimator, Voltron, Aristocrats, Spellslinger, Stax, Aggro...
];

export function assessArchetypeReadiness(
  cards: Card[]
): ArchetypeReadiness[] {
  const depth = analyzeCollectionDepth(cards);
  const archetypes: ArchetypeReadiness[] = [];
  
  for (const req of ARCHETYPE_REQUIREMENTS) {
    const owned = countArchetypePieces(cards, req.archetype);
    const status = determineStatus(owned, req);
    const strengths = identifyStrengths(owned, req.recommended_counts);
    const gaps = identifyGaps(owned, req.min_counts);
    
    archetypes.push({
      name: req.archetype,
      status,
      strengths,
      gaps,
      required_pieces: req,
      owned_pieces: owned,
    });
  }
  
  return archetypes.sort((a, b) => 
    statusPriority(a.status) - statusPriority(b.status)
  );
}

function determineStatus(
  owned: ArchetypePieces,
  req: ArchetypeRequirements
): 'strong' | 'partial' | 'weak' {
  const minMet = Object.entries(req.min_counts).every(
    ([key, min]) => owned[key] >= min
  );
  
  const recommendedMet = Object.entries(req.recommended_counts).every(
    ([key, rec]) => owned[key] >= rec
  );
  
  if (recommendedMet) return 'strong';
  if (minMet) return 'partial';
  return 'weak';
}
```

**Archetype-specific card detection:**

```typescript
function countArchetypePieces(
  cards: Card[],
  archetype: string
): ArchetypePieces {
  switch (archetype) {
    case 'Tokens':
      return {
        token_generators: cards.filter(c =>
          /create.*token|populate|doubling season/i.test(c.oracle_text)
        ).length,
        anthems: cards.filter(c =>
          /creatures you control get \+\d|creatures.*\+\d\/\+\d/i.test(c.oracle_text)
        ).length,
        // ... other token-specific counts
      };
      
    case 'Reanimator':
      return {
        reanimation: cards.filter(c =>
          /return.*creature.*graveyard.*battlefield|reanimate/i.test(c.oracle_text)
        ).length,
        discard_outlets: cards.filter(c =>
          /discard.*card|loot|rummage/i.test(c.oracle_text)
        ).length,
        // ... other reanimator-specific counts
      };
      
    // ... other archetypes
  }
}
```

#### Frontend: Archetype Grid

**File:** `frontend/src/components/ArchetypeReadiness.jsx`

```jsx
export default function ArchetypeReadiness({ archetypes }) {
  return (
    <div className="archetype-grid">
      <h2>Archetype Readiness</h2>
      <p className="subtitle">
        Which Commander strategies your collection can support
      </p>
      
      <div className="archetype-cards">
        {archetypes.map(archetype => (
          <ArchetypeCard key={archetype.name} archetype={archetype} />
        ))}
      </div>
    </div>
  );
}

function ArchetypeCard({ archetype }) {
  const statusConfig = {
    strong: { icon: '✅', color: 'var(--accent-success)', label: 'Ready to Build' },
    partial: { icon: '⚠️', color: 'var(--accent-tan)', label: 'Partially Supported' },
    weak: { icon: '❌', color: 'var(--text-muted)', label: 'Insufficient Cards' },
  };
  
  const config = statusConfig[archetype.status];
  
  return (
    <div className={`archetype-card status-${archetype.status}`}>
      <div className="archetype-header">
        <span className="status-icon">{config.icon}</span>
        <h3>{archetype.name}</h3>
        <span className="status-label" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
      
      {/* Strengths */}
      {archetype.strengths.length > 0 && (
        <div className="archetype-strengths">
          {archetype.strengths.map(strength => (
            <div key={strength} className="strength-item">
              • {strength}
            </div>
          ))}
        </div>
      )}
      
      {/* Gaps */}
      {archetype.gaps.length > 0 && (
        <div className="archetype-gaps">
          <span className="gap-label">Gap:</span>
          {archetype.gaps.map(gap => (
            <div key={gap} className="gap-item">
              {gap}
            </div>
          ))}
        </div>
      )}
      
      {/* Progress bars for key metrics */}
      <div className="archetype-metrics">
        {Object.entries(archetype.owned_pieces).map(([key, count]) => {
          const required = archetype.required_pieces.recommended_counts[key];
          const percentage = Math.min((count / required) * 100, 100);
          
          return (
            <div key={key} className="metric-bar">
              <span className="metric-label">{key}</span>
              <div className="progress-container">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: percentage >= 100 ? 'var(--accent-success)' : 'var(--accent-tan)'
                  }}
                />
              </div>
              <span className="metric-count">{count}/{required}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Design notes:**
- Strong archetypes at top (green accent)
- Partial archetypes in middle (tan accent)
- Weak archetypes at bottom (muted)
- Clickable to expand and see full card list for each category

---

### Phase 3: Color Identity Building Blocks (Priority: MEDIUM)

**Goal:** Show which color combinations are well-supported for deck construction.

**UI Section:** Heatmap or matrix visualization

**Metrics:**

```
Color Pair Strength
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         W    U    B    R    G
    W   [12] [15] [08] [05] [14]
    U        [38] [22] [29] [38]
    B             [19] [18] [26]
    R                  [11] [21]
    G                       [32]

Strong: Simic (38), Izzet (29), Golgari (26)
Weak: Boros (5), Orzhov (8), Rakdos (11)

Color Identity Recommendations:
• Simic: 38 staples → Build Thrasios, Aesi, or Kinnan
• Izzet: 29 staples → Build Niv-Mizzet, Mizzix, or Adeliz
• Golgari: 26 staples → Build Meren, Gitrog, or Jarad
```

**Technical Implementation:**

#### Backend: Color Identity Analysis

```typescript
interface ColorPairStrength {
  pair: string; // e.g., "WU", "UBR"
  staple_count: number;
  total_cards: number;
  suggested_commanders: string[];
  categories: {
    ramp: number;
    draw: number;
    removal: number;
    threats: number;
  };
}

export function analyzeColorIdentity(cards: Card[]): {
  pairs: ColorPairStrength[];
  matrix: number[][];
  recommendations: ColorRecommendation[];
} {
  const pairs: Map<string, Card[]> = new Map();
  
  // Group cards by color identity
  for (const card of cards) {
    if (card.is_land) continue; // exclude lands from color analysis
    
    const identity = card.color_identity.sort().join('');
    if (!identity) continue; // skip colorless
    
    if (!pairs.has(identity)) {
      pairs.set(identity, []);
    }
    pairs.get(identity)!.push(card);
  }
  
  // Build 2D matrix for visualization
  const colors = ['W', 'U', 'B', 'R', 'G'];
  const matrix: number[][] = Array(5).fill(0).map(() => Array(5).fill(0));
  
  for (const [identity, identityCards] of pairs.entries()) {
    if (identity.length === 2) {
      const [c1, c2] = identity.split('');
      const i1 = colors.indexOf(c1);
      const i2 = colors.indexOf(c2);
      if (i1 >= 0 && i2 >= 0) {
        matrix[i1][i2] = identityCards.length;
        matrix[i2][i1] = identityCards.length;
      }
    }
  }
  
  // Identify strong pairs and recommend commanders
  const recommendations = generateColorRecommendations(pairs);
  
  return {
    pairs: Array.from(pairs.entries()).map(([pair, cards]) => ({
      pair,
      staple_count: countStaples(cards),
      total_cards: cards.length,
      suggested_commanders: getCommandersForColors(pair),
      categories: categorizeByFunction(cards),
    })),
    matrix,
    recommendations,
  };
}

function generateColorRecommendations(
  pairs: Map<string, Card[]>
): ColorRecommendation[] {
  const recommendations: ColorRecommendation[] = [];
  
  for (const [identity, cards] of pairs.entries()) {
    const staples = countStaples(cards);
    
    if (staples >= 20) { // threshold for "strong" color pair
      recommendations.push({
        colors: identity,
        staple_count: staples,
        reason: `Strong ${identity} card pool`,
        commanders: getCommandersForColors(identity).slice(0, 3),
      });
    }
  }
  
  return recommendations.sort((a, b) => b.staple_count - a.staple_count);
}
```

#### Frontend: Color Matrix Visualization

**File:** `frontend/src/components/ColorIdentityMatrix.jsx`

```jsx
export default function ColorIdentityMatrix({ colorData }) {
  const { pairs, matrix, recommendations } = colorData;
  const colors = ['W', 'U', 'B', 'R', 'G'];
  const colorNames = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
  };
  
  const maxCount = Math.max(...matrix.flat());
  
  return (
    <div className="color-identity-section">
      <h2>Color Identity Building Blocks</h2>
      
      {/* Heatmap Matrix */}
      <div className="color-matrix">
        <table>
          <thead>
            <tr>
              <th></th>
              {colors.map(c => (
                <th key={c} className={`color-${c}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((row, i) => (
              <tr key={row}>
                <th className={`color-${row}`}>{row}</th>
                {colors.map((col, j) => {
                  const count = matrix[i][j];
                  const intensity = count / maxCount;
                  
                  return (
                    <td 
                      key={col}
                      className={i === j ? 'diagonal' : 'pair'}
                      style={{
                        backgroundColor: `rgba(45, 130, 183, ${intensity})`,
                      }}
                      title={`${colorNames[row]}-${colorNames[col]}: ${count} staples`}
                    >
                      {count > 0 ? count : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Recommendations */}
      <div className="color-recommendations">
        <h3>Deck Building Recommendations</h3>
        <div className="recommendation-list">
          {recommendations.map(rec => (
            <div key={rec.colors} className="recommendation-card">
              <div className="rec-header">
                <ColorPips colors={rec.colors} />
                <span className="staple-count">{rec.staple_count} staples</span>
              </div>
              <p className="rec-reason">{rec.reason}</p>
              <div className="suggested-commanders">
                <span className="label">Suggested commanders:</span>
                {rec.commanders.map(cmd => (
                  <span key={cmd} className="commander-name">{cmd}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Design specs:**
- Heatmap uses `--accent-primary` (blue) with opacity gradient
- Strong pairs (20+ staples) get full opacity
- Weak pairs fade to transparency
- Interactive hover shows color names and counts
- Recommendation cards use Phase 38 crisp card styling

---

### Phase 4: Collection Efficiency Metrics (Priority: MEDIUM)

**Goal:** Understand collection utilization and opportunity cost.

**Prerequisites:**
- Requires cross-referencing user's active decks
- Requires price data integration (Scryfall bulk data or TCGplayer API)

**Metrics:**

1. **Utilization Rate**
   - Cards in decks: 287 (18% of collection)
   - Cards not in decks: 1,301 (82% of collection)
   - Value in decks: $1,245
   - Value unused: $3,890

2. **Duplicate Analysis**
   - Cards owned 3+ times: 47 cards
   - High-value duplicates:
     - Cyclonic Rift: 3 copies, using 1, trade value: $80
     - Rhystic Study: 2 copies, using 1, trade value: $45
     - Smothering Tithe: 2 copies, using 2, trade value: $0

3. **High-Value Unused Cards**
   - Top 10 expensive cards not in any deck (sorted by price)
   - Suggests: "These cards have trade value or deck-building potential"

4. **Missing Staples Gap**
   - Budget staples ($1-$5): 84/100 owned — ✅ Strong coverage
   - Mid-tier staples ($5-$20): 32/50 owned — ⚠️ Partial
   - cEDH fast mana: 3/7 owned — ❌ Weak
   - Recommended acquisitions: [list of highest-impact missing staples]

**Technical Implementation:**

#### Backend: Utilization Analysis

```typescript
interface UtilizationMetrics {
  cards_in_decks: number;
  cards_unused: number;
  value_in_decks: number;
  value_unused: number;
  utilization_rate: number;
  duplicates: DuplicateCard[];
  high_value_unused: UnusedCard[];
  staple_gaps: StapleCoverage[];
}

export async function analyzeCollectionEfficiency(
  userId: string,
  cards: Card[]
): Promise<UtilizationMetrics> {
  // Fetch user's active decks
  const { data: decks } = await supabase
    .from('decks')
    .select('cards_json')
    .eq('user_id', userId);
  
  const cardsInDecks = new Map<string, number>(); // card name -> count
  
  for (const deck of decks || []) {
    for (const card of deck.cards_json) {
      const name = card.name.toLowerCase();
      cardsInDecks.set(name, (cardsInDecks.get(name) || 0) + 1);
    }
  }
  
  // Analyze each collection card
  const duplicates: DuplicateCard[] = [];
  const unusedHighValue: UnusedCard[] = [];
  
  let totalValue = 0;
  let valueInDecks = 0;
  let cardsInDecksCount = 0;
  
  for (const card of cards) {
    const inDeckCount = cardsInDecks.get(card.name.toLowerCase()) || 0;
    const owned = card.quantity;
    const price = card.prices?.usd ? parseFloat(card.prices.usd) : 0;
    
    totalValue += price * owned;
    valueInDecks += price * Math.min(inDeckCount, owned);
    
    if (inDeckCount > 0) {
      cardsInDecksCount += Math.min(inDeckCount, owned);
    }
    
    // Track duplicates
    if (owned >= 3) {
      duplicates.push({
        name: card.name,
        owned,
        in_decks: inDeckCount,
        trade_value: price * Math.max(0, owned - inDeckCount),
      });
    }
    
    // Track high-value unused
    if (inDeckCount === 0 && price >= 10) {
      unusedHighValue.push({
        name: card.name,
        price,
        reason: determineWhyUnused(card),
      });
    }
  }
  
  // Sort and limit
  duplicates.sort((a, b) => b.trade_value - a.trade_value);
  unusedHighValue.sort((a, b) => b.price - a.price).splice(0, 10);
  
  // Analyze staple gaps (requires curated lists)
  const stapleCoverage = await analyzeStapleCoverage(cards);
  
  return {
    cards_in_decks: cardsInDecksCount,
    cards_unused: cards.length - cardsInDecksCount,
    value_in_decks: valueInDecks,
    value_unused: totalValue - valueInDecks,
    utilization_rate: cardsInDecksCount / cards.length,
    duplicates: duplicates.slice(0, 20),
    high_value_unused: unusedHighValue,
    staple_gaps: stapleCoverage,
  };
}
```

**Staple list data:**

Store curated Commander staple lists in Supabase:

```sql
-- Migration: Create staples table
CREATE TABLE commander_staples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'budget', 'mid', 'cedh_fast_mana', etc.
  tier TEXT NOT NULL, -- 'essential', 'recommended', 'optional'
  price_range TEXT, -- '$1-5', '$5-20', '$20+'
  color_identity TEXT[], -- ['U', 'B']
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staples_category ON commander_staples(category);
CREATE INDEX idx_staples_tier ON commander_staples(tier);
```

Populate with curated lists from EDHREC "Top Cards" by power level.

#### Frontend: Efficiency Dashboard

```jsx
export default function CollectionEfficiency({ efficiency, loading }) {
  if (loading) return <Spinner />;
  
  const utilizationPercent = Math.round(efficiency.utilization_rate * 100);
  
  return (
    <div className="collection-efficiency">
      <h2>Collection Efficiency</h2>
      
      {/* Utilization Overview */}
      <div className="efficiency-overview">
        <StatCard
          label="Cards in Active Decks"
          value={efficiency.cards_in_decks}
          subtitle={`${utilizationPercent}% utilization`}
          color="var(--accent-success)"
        />
        <StatCard
          label="Value in Decks"
          value={`$${efficiency.value_in_decks.toFixed(0)}`}
          subtitle={`$${efficiency.value_unused.toFixed(0)} unused`}
          color="var(--accent-primary)"
        />
      </div>
      
      {/* High-Value Unused Cards */}
      <div className="unused-cards-section">
        <h3>High-Value Cards Not in Decks</h3>
        <p className="subtitle">Trade opportunities or deck-building potential</p>
        
        <div className="card-list">
          {efficiency.high_value_unused.map(card => (
            <UnusedCardRow key={card.name} card={card} />
          ))}
        </div>
      </div>
      
      {/* Duplicates */}
      <div className="duplicates-section">
        <h3>Duplicate Analysis</h3>
        <div className="duplicate-list">
          {efficiency.duplicates.map(dup => (
            <DuplicateRow key={dup.name} duplicate={dup} />
          ))}
        </div>
      </div>
      
      {/* Staple Coverage */}
      <StapleCoverageSection gaps={efficiency.staple_gaps} />
    </div>
  );
}
```

---

### Phase 5: Commander Staples Coverage (Priority: LOW)

**Goal:** Compare collection against established staple lists to guide acquisitions.

**Metrics:**

```
Staple Coverage by Tier
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Budget Staples ($1-5):    84/100 ✅ Strong
Mid-Tier Staples ($5-20): 32/50  ⚠️ Partial
High-End Staples ($20+):  12/30  ❌ Weak
cEDH Fast Mana:            3/7   ❌ Weak

Top Missing Staples (by impact):
1. Fierce Guardianship ($40) — free counterspell
2. Force of Negation ($60) — free interaction
3. Mana Crypt ($180) — cEDH fast mana
4. Smothering Tithe ($15) — white ramp engine
5. Esper Sentinel ($20) — card draw

Acquisition Roadmap:
• Phase 1 (Budget): Complete budget ramp suite — $23 total
• Phase 2 (Mid): Add missing interaction — $85 total
• Phase 3 (High-End): cEDH fast mana — $400+ total
```

**Technical Implementation:**

Requires curated staple lists by category and tier. Cross-reference owned cards against lists and surface gaps sorted by impact (defined by EDHREC rank, price, and functional category).

---

## Data Requirements

### Existing Data (Available Now)

From `collections.cards_json`:
- `name`, `quantity`, `cmc`, `type_line`, `oracle_text`, `color_identity`
- Available via GET `/collection`

### New Data (Required for Full Implementation)

1. **Price data** (for efficiency metrics)
   - Source: Scryfall bulk data `default_cards.json` includes `prices.usd`
   - Update: Refresh daily via cron job
   - Storage: Add `prices` JSONB column to cards in `cards_json`

2. **Staple lists** (for coverage metrics)
   - Source: EDHREC "Top 100" lists by power level
   - Storage: New table `commander_staples` (see Phase 4)
   - Maintenance: Update quarterly or on-demand

3. **Deck cross-reference** (for utilization metrics)
   - Source: Existing `decks` table
   - Query: Join `collections.user_id` with `decks.user_id`
   - No new data needed

### Data Enrichment Schedule

**One-time setup:**
1. Port deck_analyzer.ts categorization logic to collection analyzer
2. Create curated staple lists table
3. Add price data to collection upload flow

**Recurring maintenance:**
- Price data: Refresh daily (Scryfall bulk data API)
- Staple lists: Update quarterly
- Analysis cache: Recompute on collection change

---

## API Endpoints

### New Endpoints

**GET /collection/analyze**
- Returns: `CollectionDepth` (functional breakdown)
- Cache: 1 hour TTL
- Dependency: None

**GET /collection/archetypes**
- Returns: `ArchetypeReadiness[]` (supported strategies)
- Cache: 1 hour TTL
- Dependency: Collection depth analysis

**GET /collection/color-identity**
- Returns: `ColorPairStrength[]` + heatmap matrix
- Cache: 1 hour TTL
- Dependency: None

**GET /collection/efficiency**
- Returns: `UtilizationMetrics` (usage stats, duplicates, gaps)
- Cache: 30 min TTL
- Dependency: User decks, price data

**GET /collection/staples**
- Returns: `StapleCoverage[]` (missing staples by tier)
- Cache: 6 hours TTL
- Dependency: Staple lists table

### Caching Strategy

Store analysis results in new table:

```sql
CREATE TABLE collection_analyses (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  depth_analysis JSONB,
  archetype_analysis JSONB,
  color_analysis JSONB,
  efficiency_analysis JSONB,
  staples_analysis JSONB,
  computed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Invalidate cache on collection upload.

---

## UI/UX Design

### Page Layout

**CollectionPage structure:**

```
┌──────────────────────────────────────────────┐
│  My Collection                               │
│  Upload your Moxfield CSV...                 │
├──────────────────────────────────────────────┤
│  📤 UPLOAD SECTION (existing)                │
├──────────────────────────────────────────────┤
│  📊 STATS OVERVIEW (Phase 38 mockup)         │
│  • Total Cards   • Avg Value                 │
│  • Total Value   • Last Updated              │
├──────────────────────────────────────────────┤
│  🎯 COLLECTION DEPTH (Phase 1)               │
│  Functional breakdown with expandable rows   │
├──────────────────────────────────────────────┤
│  🎲 ARCHETYPE READINESS (Phase 2)            │
│  Grid of supported strategies                │
├──────────────────────────────────────────────┤
│  🎨 COLOR IDENTITY (Phase 3)                 │
│  Heatmap matrix + recommendations            │
├──────────────────────────────────────────────┤
│  📈 EFFICIENCY METRICS (Phase 4)             │
│  Utilization, duplicates, high-value unused  │
├──────────────────────────────────────────────┤
│  ⭐ STAPLE COVERAGE (Phase 5)                │
│  Missing staples by tier + roadmap           │
├──────────────────────────────────────────────┤
│  🃏 CARD GRID (existing — move to end)       │
│  Searchable, filterable card list            │
└──────────────────────────────────────────────┘
```

### Tab-Based Alternative

For large collections, consider tabs:

```
[ Overview ] [ Card List ] [ Archetypes ] [ Efficiency ]
```

- **Overview:** Depth + Color Identity
- **Card List:** Existing card grid (searchable)
- **Archetypes:** Readiness matrix + detailed breakdowns
- **Efficiency:** Utilization + Staples Coverage

User preference: Ask during Phase 1 implementation.

---

## Testing Strategy

### Unit Tests

**Backend (Deno):**
- `collection_analyzer_test.ts` — test categorization functions
- `archetype_detector_test.ts` — validate readiness logic
- Mock collection data with known card types

**Frontend (Vitest):**
- `CollectionDepth.test.jsx` — rendering with various states
- `ArchetypeReadiness.test.jsx` — status colors and expansion
- Mock API responses

### Integration Tests

- Upload CSV → trigger analysis → verify cached results
- Update collection → invalidate cache → recompute
- Cross-reference with decks → utilization metrics accurate

### Manual Testing

- Test with small collection (100 cards)
- Test with large collection (2,000+ cards)
- Verify performance (analysis should complete <2s)
- Test empty state (no collection uploaded)

---

## Performance Considerations

### Backend

- **Batch operations:** Process cards in chunks (avoid iterating 2,000+ cards serially)
- **Caching:** Store computed analysis, invalidate on collection update only
- **Lazy loading:** Return partial results first (depth), then compute archetype/efficiency asynchronously
- **Database indexes:** Index on `user_id`, `category` in staples table

### Frontend

- **Lazy render:** Use `IntersectionObserver` to render sections as user scrolls
- **Virtualized lists:** For card lists >500 items (react-window)
- **Debounced search:** Wait 300ms before filtering card grid
- **Progressive enhancement:** Show basic stats immediately, load detailed analysis after

---

## Rollout Plan

### Phase 1: MVP (Collection Depth)
**Timeline:** 1 week
- Backend: Port categorization logic, create `/analyze` endpoint
- Frontend: Build `CollectionDepth` component
- Deploy: Soft launch to beta users
- Success metric: Users expand/collapse sections, inspect card lists

### Phase 2: Strategic Insights (Archetypes + Color)
**Timeline:** 1 week
- Backend: Build archetype readiness + color identity analysis
- Frontend: Build matrix visualizations
- Deploy: Full rollout
- Success metric: Users use color recommendations to pick next deck

### Phase 3: Efficiency Metrics
**Timeline:** 1.5 weeks (includes price data integration)
- Backend: Integrate price API, cross-reference decks
- Frontend: Build efficiency dashboard
- Deploy: Staged rollout (requires price data refresh)
- Success metric: Users identify trade opportunities, track utilization

### Phase 4: Staples Coverage
**Timeline:** 1 week (includes curating staple lists)
- Backend: Create staples table, populate from EDHREC
- Frontend: Build coverage visualization + acquisition roadmap
- Deploy: Full rollout
- Success metric: Users reference gap analysis when purchasing cards

### Phase 5: Refinement & Polish
**Timeline:** Ongoing
- Add filters: "Show only ramp I own"
- Add sorting: Sort removals by quality tier
- Add export: CSV of missing staples
- Add sharing: Share collection stats with friends

---

## Success Metrics

### Engagement
- % of users who upload collections (baseline: measure after Phase 1)
- Time spent on Collection page (target: 2x increase)
- % of users who expand depth sections (target: >60%)

### Utility
- Deck imports that reference "I have these cards" (track via collection cross-ref)
- Users who identify trade opportunities from duplicates (survey)
- Users who report "built a deck based on color recommendations" (survey)

### Differentiation
- Unique feature vs competitors (validate: no other tool has functional depth analysis)
- User retention: Do users return to Collection page between deck builds?

---

## Known Challenges

### 1. Card Categorization Accuracy

**Challenge:** Oracle text matching is fuzzy — "destroy target creature" vs "exile target creature" requires regex tuning.

**Mitigation:**
- Port proven patterns from `deck_analyzer.ts`
- Build test suite with edge cases (modal cards, double-faced cards, split cards)
- Allow manual overrides (future: user can tag cards)

### 2. Price Data Freshness

**Challenge:** Card prices fluctuate; Scryfall bulk data refreshes daily.

**Mitigation:**
- Set expectations: "Prices updated daily"
- Cache price data locally, refresh overnight
- For high-value cards, show price ranges ($X - $Y)

### 3. Staple List Subjectivity

**Challenge:** "Staples" depends on power level and meta.

**Mitigation:**
- Segment by tier: budget, mid, high-end, cEDH
- Source from EDHREC (objective data: most-played cards)
- Allow users to customize (future: personal staple lists)

### 4. Performance with Large Collections

**Challenge:** Users with 5,000+ card collections could slow analysis.

**Mitigation:**
- Lazy computation: Only compute visible sections
- Background processing: Offload to async job
- Pagination: Show top N results, "Load more" button

### 5. Deck Cross-Reference Complexity

**Challenge:** Utilization metrics require joining collections with decks (N×M complexity).

**Mitigation:**
- Precompute and cache (only recompute on deck/collection change)
- Limit to decks marked "active" (skip archived decks)
- Use Supabase edge function parallelism

---

## Future Enhancements

### Phase 6+: Power User Features

1. **Deck Builder Assistant Filters**
   - "Show only my ramp" (sorted by speed)
   - "Show only my removal" (sorted by quality)
   - "Cards that enable new archetypes"

2. **Collection Comparison**
   - Compare your collection to a friend's
   - Identify trading opportunities (I have X, you need X; you have Y, I need Y)

3. **Wishlist & Acquisition Tracking**
   - Track cards you want to acquire
   - Alert when price drops below threshold
   - Mark cards as "acquired" and auto-update collection

4. **Collection History**
   - Track collection growth over time (charts!)
   - "You've added 47 cards this month"
   - "Your collection value increased 12%"

5. **Bulk Actions**
   - "Move all duplicates to tradelist"
   - "Mark all cards <$1 as bulk"
   - Export filterable CSV

---

## Dependencies

### External APIs
- **Scryfall:** Card data (already integrated)
- **Scryfall Bulk Data:** Price data (`default_cards.json`)
- **Optional — TCGplayer:** Real-time market prices (future consideration)

### Internal Systems
- `deck_analyzer.ts` — reuse categorization logic
- `collections` table — existing storage
- `decks` table — for utilization metrics

### New Infrastructure
- `commander_staples` table — curated lists
- `collection_analyses` table — cached results
- Cron job for price refresh (Supabase Edge Function with scheduled trigger)

---

## Documentation Updates

### User-Facing
- Update HelpPage.jsx with "Collection Metrics" section
- Tooltip definitions for new terms (archetype readiness, utilization rate, etc.)
- Add to onboarding flow: "Upload collection to unlock insights"

### Developer-Facing
- Add collection analyzer to `references/mtg-knowledge.md`
- Document API endpoints in `.github/API.md` (if it exists)
- Add test coverage report

---

## Conclusion

This plan provides **5 phases of incremental Commander-focused collection insights** that differentiate mtg-assistant from competitors. Each phase delivers standalone value while building toward a comprehensive collection management system.

**Key differentiators:**
- ✅ **Nobody else analyzes collection by function** (ramp quality, removal tiers, archetype readiness)
- ✅ **Commander-specific thresholds** (not generic card metrics)
- ✅ **Actionable insights** (not just charts, but "build this deck" or "acquire these cards")

**Implementation priority:** Phase 1 → Phase 2 → Phase 3, then reassess based on user feedback.

**Next steps:**
1. User approval of plan
2. Create GitHub issues for each phase
3. Start Phase 1 implementation (Collection Depth)
