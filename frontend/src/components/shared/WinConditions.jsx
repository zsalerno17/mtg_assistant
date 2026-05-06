import React from 'react';
import { Target, Swords, Trophy, TrendingUp } from 'lucide-react';

/**
 * WinConditions - Displays how the deck is trying to win
 * 
 * @param {Object[]} winConditions - Array of WinCondition objects from deck analysis
 */
export default function WinConditions({ winConditions }) {
  if (!winConditions || winConditions.length === 0) {
    return null;
  }

  const getIcon = (type) => {
    switch (type) {
      case 'combo':
        return <Target className="w-5 h-5" />;
      case 'combat':
        return <Swords className="w-5 h-5" />;
      case 'alternate_wincon':
        return <Trophy className="w-5 h-5" />;
      case 'value_grind':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'combo':
        return 'Infinite Combo';
      case 'combat':
        return 'Combat Damage';
      case 'alternate_wincon':
        return 'Alternate Win';
      case 'value_grind':
        return 'Value Grind';
      default:
        return 'Win Condition';
    }
  };

  const getReliabilityColor = (reliability) => {
    switch (reliability) {
      case 'primary':
        return 'text-green-400 bg-green-950/50 border-green-800';
      case 'secondary':
        return 'text-yellow-400 bg-yellow-950/50 border-yellow-800';
      case 'backup':
        return 'text-slate-400 bg-slate-950/50 border-slate-700';
      default:
        return 'text-slate-400 bg-slate-950/50 border-slate-700';
    }
  };

  const getReliabilityLabel = (reliability) => {
    switch (reliability) {
      case 'primary':
        return 'Primary';
      case 'secondary':
        return 'Secondary';
      case 'backup':
        return 'Backup';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        Win Conditions
      </h3>
      
      <div className="space-y-2">
        {winConditions.map((wincon, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border ${getReliabilityColor(wincon.reliability)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getIcon(wincon.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {getTypeLabel(wincon.type)}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded border border-current opacity-70">
                    {getReliabilityLabel(wincon.reliability)}
                  </span>
                </div>
                
                <p className="text-sm opacity-90">
                  {wincon.description}
                </p>
                
                {wincon.cards && wincon.cards.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {wincon.cards.map((cardName, cardIdx) => (
                      <span
                        key={cardIdx}
                        className="text-xs px-2 py-0.5 rounded bg-black/30 font-mono"
                      >
                        {cardName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
