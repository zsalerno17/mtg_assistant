export function getDeckBracket(powerLevel) {
  if (powerLevel == null) return null;
  if (powerLevel <= 3) return { bracket: 1, label: 'Precon' };
  if (powerLevel <= 5) return { bracket: 2, label: 'Casual' };
  if (powerLevel <= 7) return { bracket: 3, label: 'Focused' };
  if (powerLevel <= 9) return { bracket: 3, label: 'Optimized' };
  return { bracket: 4, label: 'cEDH' };
}
