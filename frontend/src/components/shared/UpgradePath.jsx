import React, { useState } from 'react';
import { ChevronDown, TrendingUp, DollarSign, Zap, ArrowRight } from 'lucide-react';
import CardTooltip from '../CardTooltip';
import PowerDeltaBadge from './PowerDeltaBadge';
import TooltipWrapper from './TooltipWrapper';

/**
 * UpgradePath - Displays phased upgrade plan with cost and power gain breakdown
 */
export default function UpgradePath({ upgradePath }) {
  const [expandedPhases, setExpandedPhases] = useState(new Set([1])); // First phase expanded by default

  if (!upgradePath || !upgradePath.phases || upgradePath.phases.length === 0) {
    return (
      <div className="p-5 bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl text-center text-[var(--color-text-muted)]">
        <p>{upgradePath?.summary || 'No upgrade path available'}</p>
      </div>
    );
  }

  const togglePhase = (phaseNum) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseNum)) {
      newExpanded.delete(phaseNum);
    } else {
      newExpanded.add(phaseNum);
    }
    setExpandedPhases(newExpanded);
  };

  return (
    <div className="space-y-3">
      {/* Summary Header */}
      <div className="p-4 bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">{upgradePath.summary}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[var(--color-text-muted)]">
              <Zap className="w-4 h-4 inline-block mr-1 text-[var(--color-warning)]" />
              {upgradePath.currentPower} → {upgradePath.targetPower}
            </span>
            <span className="text-[var(--color-text-muted)]">
              <DollarSign className="w-4 h-4 inline-block mr-1 text-[var(--color-success)]" />
              ${upgradePath.totalBudget.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Phases */}
      {upgradePath.phases.map(phase => {
        const isExpanded = expandedPhases.has(phase.phaseNumber);
        
        return (
          <div
            key={phase.phaseNumber}
            className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]/80"
          >
            {/* Phase Header */}
            <button
              onClick={() => togglePhase(phase.phaseNumber)}
              className="w-full p-4 flex items-center justify-between hover:bg-[var(--color-bg)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white font-bold flex items-center justify-center text-sm">
                  {phase.phaseNumber}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--color-text)]">{phase.title}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {phase.powerGain?.toFixed(1) || '0.0'} power gain · ${phase.estimatedCost?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
              
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Phase Content */}
            {isExpanded && (
              <div className="p-4 pt-0 space-y-3 border-t border-[var(--color-border)]">
                {(() => {
                  // Group swaps by cardOut.name
                  const groupedSwaps = {};
                  phase.swaps.forEach(swap => {
                    const key = swap.cardOut?.name || 'Unknown';
                    if (!groupedSwaps[key]) {
                      groupedSwaps[key] = [];
                    }
                    groupedSwaps[key].push(swap);
                  });

                  // Sort groups by highest power delta in group, then sort alternatives within each group
                  const sortedGroups = Object.entries(groupedSwaps).map(([cardOutName, swaps]) => {
                    const sortedSwaps = [...swaps].sort((a, b) => {
                      const deltaA = a.powerDelta?.change ?? 0;
                      const deltaB = b.powerDelta?.change ?? 0;
                      return deltaB - deltaA; // Highest power first
                    });
                    const maxPowerDelta = sortedSwaps[0]?.powerDelta?.change ?? 0;
                    return { cardOutName, swaps: sortedSwaps, maxPowerDelta };
                  }).sort((a, b) => b.maxPowerDelta - a.maxPowerDelta);

                  return sortedGroups.map((group, groupIdx) => {
                    const hasMultipleOptions = group.swaps.length > 1;
                    
                    return (
                      <div key={groupIdx} className="space-y-2">
                        {/* Group header - only show if multiple alternatives */}
                        {hasMultipleOptions && (
                          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-2 px-2">
                            <span>Remove: {group.cardOutName}</span>
                            <span className="text-2xs opacity-60">({group.swaps.length} options)</span>
                          </div>
                        )}
                        
                        {/* Alternatives */}
                        <div className={`space-y-2 ${hasMultipleOptions ? 'pl-3 border-l-2 border-[var(--color-primary)]/30' : ''}`}>
                          {group.swaps.map((swap, altIdx) => (
                            <div
                              key={altIdx}
                              className="flex items-start gap-3 p-3 bg-[var(--color-bg)] rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {hasMultipleOptions && (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-2xs font-bold shrink-0">
                                      {altIdx + 1}
                                    </span>
                                  )}
                                  {!hasMultipleOptions && (
                                    <CardTooltip cardName={swap.cardOut.name}>
                                      <span className="text-sm text-[var(--color-danger)] font-medium line-through">
                                        {swap.cardOut.name}
                                      </span>
                                    </CardTooltip>
                                  )}
                                  {!hasMultipleOptions && (
                                    <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                                  )}
                                  <CardTooltip cardName={swap.cardIn.name}>
                                    <span className="text-sm text-[var(--color-success)] font-medium">
                                      {swap.cardIn.name}
                                    </span>
                                  </CardTooltip>
                                  {swap.cardIn.in_decks?.length > 0 && (
                                    <TooltipWrapper content={swap.cardIn.in_decks.length === 1 ? `In: ${swap.cardIn.in_decks[0]}` : `In: ${swap.cardIn.in_decks.join(', ')}`}>
                                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-[var(--color-warning)]/10 text-[var(--color-warning)] cursor-help">in a deck</span>
                                    </TooltipWrapper>
                                  )}
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)]">{swap.reason}</p>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                {swap.powerDelta && (
                                  <PowerDeltaBadge
                                    powerDelta={swap.powerDelta}
                                    size="sm"
                                  />
                                )}
                                {swap.cost > 0 && (
                                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                                    ${swap.cost.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
