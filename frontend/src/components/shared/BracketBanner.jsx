import React from 'react';
import { Shield, Users, Target, Clock } from 'lucide-react';

/**
 * BracketBanner - Displays multiplayer dynamics guidance based on power bracket
 * Shows political considerations, threat assessment, and win timing
 */
export default function BracketBanner({ bracket, bracketLabel }) {
  const bracketGuidance = {
    1: {
      label: "Precon",
      political_notes: "Casual table talk, minimal politics. Focus on learning and having fun.",
      threat_assessment: "Board state matters most — count creatures and enchantments. Watch for commanders that grow exponentially.",
      win_timing: "Games last 10+ turns. Take your time building up — rushing can backfire as you'll run out of gas.",
      color: "bg-[var(--color-bg)] border-[var(--color-border)]",
      accentColor: "text-[var(--color-text-muted)]",
    },
    2: {
      label: "Casual",
      political_notes: "Bargaining starts here — offer deals like 'I won't attack if you don't counter my spell.' Avoid kingmaking.",
      threat_assessment: "Track who's ahead on cards and mana. Player with most cards in hand is often the real threat.",
      win_timing: "Close games by turn 8-10. If you're far ahead by turn 6, expect to be targeted.",
      color: "bg-[var(--color-surface)] border-[var(--color-info)]/30",
      accentColor: "text-[var(--color-info)]",
    },
    3: {
      label: "Focused/Optimized",
      political_notes: "Politics are cutthroat — alliances shift fast. Watch for players sandbagging threats to look weak.",
      threat_assessment: "Count interaction — player with 7 cards in hand in blue? Probably has answers. Check for combo pieces in play.",
      win_timing: "Games end turn 6-8 (Focused) or 4-6 (Optimized). Hold interaction for game-winning plays, not every threat.",
      color: "bg-[var(--color-surface)] border-[var(--color-warning)]/30",
      accentColor: "text-[var(--color-warning)]",
    },
    4: {
      label: "cEDH",
      political_notes: "Minimal politics — this is a race. Focus on efficient sequencing and holding up interaction.",
      threat_assessment: "Know the meta combos. Track tutors and combo pieces. One resolved tutor often means GG next turn.",
      win_timing: "Win on turn 2-4 or disrupt others from winning. Every turn counts — mulliganing aggressively is correct.",
      color: "bg-[var(--color-surface)] border-[var(--color-danger)]/30",
      accentColor: "text-[var(--color-danger)]",
    },
  };

  const guide = bracketGuidance[bracket];
  if (!guide) return null;

  return (
    <div className={`border rounded-xl p-5 ${guide.color}`}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className={`w-5 h-5 ${guide.accentColor}`} />
        <h3 className="font-heading text-[var(--color-text)] text-2xs font-semibold uppercase tracking-widest">
          Bracket {bracket} ({bracketLabel}) Multiplayer Guide
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Users className={`w-5 h-5 mt-0.5 shrink-0 ${guide.accentColor}`} />
          <div>
            <div className="text-sm font-medium text-[var(--color-text)] mb-1">Political Considerations</div>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{guide.political_notes}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Target className={`w-5 h-5 mt-0.5 shrink-0 ${guide.accentColor}`} />
          <div>
            <div className="text-sm font-medium text-[var(--color-text)] mb-1">Threat Assessment</div>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{guide.threat_assessment}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className={`w-5 h-5 mt-0.5 shrink-0 ${guide.accentColor}`} />
          <div>
            <div className="text-sm font-medium text-[var(--color-text)] mb-1">Win Timing</div>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{guide.win_timing}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
