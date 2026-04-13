import PageTransition from '../components/PageTransition'

export default function HelpPage() {
  const sections = [
    {
      title: "Getting Started",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
      ),
      content: (
        <>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            Welcome to MTG Assistant! This tool helps you manage your Magic: The Gathering collection, analyze Commander decks, and track league performance.
          </p>
          <p className="text-[var(--color-text)] leading-relaxed">
            Start by setting up your profile, then import your collection or add your first deck to begin analyzing your cards and strategies.
          </p>
        </>
      )
    },
    {
      title: "Managing Your Collection",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 3v4M8 3v4" />
        </svg>
      ),
      content: (
        <>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            Upload your collection as a CSV file to track which cards you own. This helps identify cards you already have when analyzing decks.
          </p>
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-4 mb-3">
            <p className="text-sm text-[var(--color-muted)] mb-2">CSV Format Required:</p>
            <code className="text-xs text-amber-400 font-mono block bg-slate-900/50 p-2 rounded">
              Card Name,Set Code,Quantity,Foil
            </code>
          </div>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            <strong className="text-amber-400">Generate your collection CSV:</strong>
          </p>
          <a
            href="https://vredeza.github.io/bimf/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium transition-all group"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            BIMF Collection Manager
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </>
      )
    },
    {
      title: "Adding & Analyzing Decks",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      ),
      content: (
        <>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            Import Commander decks from Moxfield by pasting a deck URL. The app will analyze:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] mb-3">
            <li>Ramp package (mana acceleration)</li>
            <li>Card draw engines</li>
            <li>Removal suite</li>
            <li>Win conditions</li>
            <li>Mana curve and color distribution</li>
          </ul>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            <strong className="text-amber-400">Build decks on Moxfield:</strong>
          </p>
          <a
            href="https://www.moxfield.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium transition-all group"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Moxfield Deck Builder
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </>
      )
    },
    {
      title: "AI Analysis Features",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
      content: (
        <>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            When you open a deck, Gemini automatically analyzes it across four tabs:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[var(--color-text)] mb-4">
            <li><strong>Strategy</strong> — A full breakdown of your deck's game plan, win conditions, and mulligan strategy</li>
            <li><strong>Improvements</strong> — Specific card swap recommendations with reasons to cut and add</li>
            <li><strong>Collection Upgrades</strong> — Upgrade suggestions pulled from cards you already own</li>
            <li><strong>Scenarios</strong> — Pick cards to add or remove and see an AI analysis of how the change would affect the deck</li>
          </ul>
          <div className="bg-slate-900/30 border border-amber-500/20 rounded-lg p-4">
            <p className="text-sm text-amber-400 font-medium mb-2">💡 Pro Tip:</p>
            <p className="text-sm text-[var(--color-muted)]">
              Upload your collection first — the Collection Upgrades tab only suggests cards you already own, so you get actionable upgrades without spending a dime.
            </p>
          </div>
        </>
      )
    },
    {
      title: "Tracking Leagues & Pods",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      content: (
        <>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            Create leagues to track Commander pod performance over multiple game nights:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[var(--color-text)] mb-3">
            <li><strong>Create a league:</strong> Set a name, description, and add players</li>
            <li><strong>Add members:</strong> Invite players with deck names, personas, and entrance music</li>
            <li><strong>Log games:</strong> Record who played, placement, and special achievements</li>
            <li><strong>Track standings:</strong> See leaderboard with points, wins, and statistics</li>
          </ol>
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-muted)] mb-2"><strong>Point System:</strong></p>
            <ul className="space-y-1 text-sm text-[var(--color-text)]">
              <li>🥇 1st place: 4 points</li>
              <li>🥈 2nd place: 3 points</li>
              <li>🥉 3rd place: 2 points</li>
              <li>4th place: 1 point</li>
            </ul>
          </div>
        </>
      )
    },
    {
      title: "Card Information & Resources",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      content: (
        <>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            Need detailed card information, rulings, or prices? Scryfall is the definitive Magic card database.
          </p>
          <a
            href="https://scryfall.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium transition-all group mb-4"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Scryfall Card Search
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
          <p className="text-sm text-[var(--color-muted)]">
            Scryfall provides card images, Oracle text, prices, legality, and advanced search filters.
          </p>
        </>
      )
    }
  ]

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-primary)] mb-4">
            Help & Resources
          </h1>
          <p className="text-lg text-[var(--color-muted)] max-w-2xl mx-auto">
            Learn how to get the most out of MTG Assistant
          </p>
        </div>

        {/* Help Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div
              key={index}
              className="backdrop-blur-sm bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(251,191,36,0.1)] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                    {section.title}
                  </h2>
                  {section.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center backdrop-blur-sm bg-[var(--color-surface)]/80 border border-amber-500/30 rounded-xl p-8">
          <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">
            Still have questions?
          </h3>
          <p className="text-[var(--color-muted)] mb-4">
            The best way to learn is by exploring! Start by importing a deck or uploading your collection.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold rounded-lg transition-all shadow-lg shadow-amber-500/25"
            >
              Go to Dashboard
            </a>
            <a
              href="/collection"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-semibold rounded-lg transition-all"
            >
              Manage Collection
            </a>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  )
}
