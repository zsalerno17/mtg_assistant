import React, { useState } from 'react';
import { Target, DollarSign, Sparkles, Zap } from 'lucide-react';
import SelectField from './SelectField';

/**
 * DirectionUI - User goals input for upgrade path planning
 * Allows users to set target power level, budget, theme emphasis, and playstyle
 */
export default function DirectionUI({ currentPower, themes, onGoalsChange }) {
  const [goals, setGoals] = useState({
    targetPowerLevel: Math.min(currentPower + 2, 10),
    budgetConstraint: 100,
    themeEmphasis: [],
    style: 'casual',
  });
  const [hasChanges, setHasChanges] = useState(false);

  const updateGoal = (key, value) => {
    const newGoals = { ...goals, [key]: value };
    setGoals(newGoals);
    setHasChanges(true);
  };
  
  const applyChanges = () => {
    onGoalsChange?.(goals);
    setHasChanges(false);
  };

  const toggleTheme = (themeName) => {
    const newThemes = goals.themeEmphasis.includes(themeName)
      ? goals.themeEmphasis.filter(t => t !== themeName)
      : [...goals.themeEmphasis, themeName];
    updateGoal('themeEmphasis', newThemes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-5 h-5 text-[var(--color-primary)]" />
        <h3 className="font-heading text-[var(--color-text)] text-2xs font-semibold uppercase tracking-widest">Upgrade Goals</h3>
      </div>

      {/* Target Power Level */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Target Power Level
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={currentPower}
            max="10"
            step="1"
            value={goals.targetPowerLevel}
            onChange={(e) => updateGoal('targetPowerLevel', parseInt(e.target.value))}
            className="flex-1 h-2 bg-[var(--color-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
          />
          <span className="text-lg font-bold text-[var(--color-primary)] min-w-[3ch]">
            {goals.targetPowerLevel}
          </span>
        </div>
        <div className="text-xs text-[var(--color-text-muted)] mt-1">
          Current: {currentPower} → Target: {goals.targetPowerLevel}
        </div>
      </div>

      {/* Budget Constraint */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          <DollarSign className="w-4 h-4 inline-block mr-1" />
          Budget (USD)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="25"
            max="500"
            step="25"
            value={goals.budgetConstraint}
            onChange={(e) => updateGoal('budgetConstraint', parseInt(e.target.value))}
            className="flex-1 h-2 bg-[var(--color-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--color-success)]"
          />
          <span className="text-lg font-bold text-[var(--color-success)] min-w-[4ch]">
            ${goals.budgetConstraint}
          </span>
        </div>
      </div>

      {/* Theme Emphasis */}
      {themes && themes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            <Sparkles className="w-4 h-4 inline-block mr-1" />
            Emphasize Themes (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {themes.map(theme => (
              <button
                key={theme.name}
                onClick={() => toggleTheme(theme.name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  goals.themeEmphasis.includes(theme.name)
                    ? 'bg-[var(--color-secondary)] text-white border-2 border-[var(--color-secondary)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Playstyle */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          <Zap className="w-4 h-4 inline-block mr-1" />
          Playstyle
        </label>
        <SelectField
          value={goals.style}
          onChange={(e) => updateGoal('style', e.target.value)}
          className="w-full"
        >
          <option value="casual">Casual — Fun first, power second</option>
          <option value="competitive">Competitive — Win-focused, optimized</option>
          <option value="thematic">Thematic — Flavor and synergy over power</option>
          <option value="budget">Budget — Maximum value per dollar</option>
        </SelectField>
      </div>
      
      {/* Apply Button */}
      <div className="pt-3 border-t border-[var(--color-border)]">
        <button
          onClick={applyChanges}
          disabled={!hasChanges}
          className="w-full px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
        >
          {hasChanges ? 'Apply & Build Upgrade Path' : 'No Changes'}
        </button>
      </div>
    </div>
  );
}
