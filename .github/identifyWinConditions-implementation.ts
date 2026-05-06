// Win condition detection implementation for Phase 2

/**
 * identifyWinConditions - Detect how the deck is trying to win
 * 
 * Returns array of WinCondition objects with type, description, cards, and reliability.
 * Types: combo (two-card infinites), combat (aggro/voltron/tokens), alternate_wincon (Thoracle), value_grind (fallback)
 * 
 * @param deck - Deck object
 * @param themes - Array of ThemeResult from identifyThemes()
 * @returns WinCondition[] ordered by reliability (primary first)
 */
export function identifyWinConditions(deck: Deck, themes: ThemeResult[]): WinCondition[] {
  const allCards = getAllCards(deck);
  const cardNameSet = new Set(allCards.map(c => c.name.toLowerCase()));
  const winConditions: WinCondition[] = [];

  // ─── 1. Detect Infinite Combos ─────────────────────────────────────────────
  const foundCombos: Array<{ piece1: string; piece2: string }> = [];
  
  for (const card of allCards) {
    const nameLower = card.name.toLowerCase();
    const comboPartners = KNOWN_COMBOS[nameLower];
    
    if (comboPartners) {
      for (const partner of comboPartners) {
        if (cardNameSet.has(partner)) {
          // Found a combo! Avoid duplicates by sorting names
          const sorted = [nameLower, partner].sort();
          const isDuplicate = foundCombos.some(
            c => c.piece1 === sorted[0] && c.piece2 === sorted[1]
          );
          if (!isDuplicate) {
            foundCombos.push({ piece1: sorted[0], piece2: sorted[1] });
          }
        }
      }
    }
  }

  // Add combo win conditions
  for (const combo of foundCombos) {
    const description = `Infinite combo: ${combo.piece1} + ${combo.piece2}`;
    winConditions.push({
      type: "combo",
      description,
      cards: [combo.piece1, combo.piece2],
      reliability: foundCombos.length === 1 ? "primary" : "secondary",
    });
  }

  // ─── 2. Detect Alternate Win Cons (Thoracle, Lab Man, etc.) ────────────────
  const alternateWincons = [
    "thassa's oracle",
    "laboratory maniac",
    "jace, wielder of mysteries",
    "approach of the second sun",
    "maze's end",
    "coalition victory",
    "felidar sovereign",
    "helix pinnacle",
    "mortal combat",
  ];

  for (const card of allCards) {
    const nameLower = card.name.toLowerCase();
    if (alternateWincons.includes(nameLower)) {
      winConditions.push({
        type: "alternate_wincon",
        description: `Alternate win condition: ${card.name}`,
        cards: [nameLower],
        reliability: foundCombos.length > 0 ? "secondary" : "primary",
      });
    }
  }

  // ─── 3. Detect Combat Strategies ───────────────────────────────────────────
  const tokenTheme = themes.find(t => t.name.toLowerCase() === "tokens");
  const voltronTheme = themes.find(t => t.name.toLowerCase() === "voltron");
  const tribalTheme = themes.find(t => t.name.toLowerCase() === "tribal");
  
  if (tokenTheme && tokenTheme.count >= 8) {
    winConditions.push({
      type: "combat",
      description: `Go-wide combat with ${tokenTheme.count} token generators`,
      cards: [],
      reliability: foundCombos.length > 0 || winConditions.some(w => w.type === "alternate_wincon") 
        ? "backup" 
        : "primary",
    });
  }

  if (voltronTheme && voltronTheme.count >= 6) {
    winConditions.push({
      type: "combat",
      description: `Voltron strategy with ${voltronTheme.count} equipment/auras`,
      cards: [],
      reliability: foundCombos.length > 0 || winConditions.some(w => w.type === "alternate_wincon")
        ? "backup"
        : "primary",
    });
  }

  if (tribalTheme && tribalTheme.count >= 15) {
    winConditions.push({
      type: "combat",
      description: `Tribal combat with ${tribalTheme.count}+ synergistic creatures`,
      cards: [],
      reliability: foundCombos.length > 0 || winConditions.some(w => w.type === "alternate_wincon")
        ? "backup"
        : "primary",
    });
  }

  // Generic aggro if we have lots of creatures but no specific theme
  const creatureCount = allCards.filter(c => isCreature(c)).length;
  if (creatureCount >= 25 && !tokenTheme && !tribalTheme && !voltronTheme) {
    winConditions.push({
      type: "combat",
      description: `Combat damage with ${creatureCount} creatures`,
      cards: [],
      reliability: foundCombos.length > 0 || winConditions.some(w => w.type === "alternate_wincon")
        ? "backup"
        : "secondary",
    });
  }

  // ─── 4. Value Grind (Fallback) ─────────────────────────────────────────────
  // If no clear win condition detected, assume value-based control/midrange
  if (winConditions.length === 0) {
    winConditions.push({
      type: "value_grind",
      description: "Value-based grind — win through card advantage and superior board state",
      cards: [],
      reliability: "primary",
    });
  }

  // Sort by reliability: primary > secondary > backup
  const reliabilityOrder = { primary: 0, secondary: 1, backup: 2 };
  winConditions.sort((a, b) => reliabilityOrder[a.reliability] - reliabilityOrder[b.reliability]);

  return winConditions;
}
