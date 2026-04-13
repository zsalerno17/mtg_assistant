import { CircleHelp, Library, BookOpen, WandSparkles, Users, Search, ExternalLink, ChevronRight, Info } from 'lucide-react'
import PageTransition from '../components/PageTransition'

export default function HelpPage() {
  const sections = [
    {
      title: "Getting Started",
      icon: (
        <CircleHelp className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
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
        <Library className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
      ),
      content: (
        <>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            Upload your collection as a CSV file to track which cards you own. This helps identify cards you already have when analyzing decks.
          </p>
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-4 mb-3">
            <p className="text-sm text-[var(--color-muted)] mb-2">CSV Format Required:</p>
            <code className="text-xs text-[var(--color-secondary)] font-mono block bg-[var(--color-surface-2)] p-2 rounded">
              Card Name,Set Code,Quantity,Foil
            </code>
          </div>
          <p className="text-[var(--color-text)] leading-relaxed mb-3">
            <strong className="text-[var(--color-secondary)]">Generate your collection CSV:</strong>
          </p>
          <a
            href="https://vredeza.github.io/bimf/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-secondary-subtle)] hover:bg-[var(--color-secondary-subtle)] border border-[var(--color-secondary-border)] rounded-lg text-[var(--color-secondary)] text-sm font-medium transition-all group"
          >
            <ExternalLink className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            BIMF Collection Manager
            <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={2} aria-hidden="true" />
          </a>
        </>
      )
    },
    {
      title: "Adding & Analyzing Decks",
      icon: (
        <BookOpen className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
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
            <strong className="text-[var(--color-secondary)]">Build decks on Moxfield:</strong>
          </p>
          <a
            href="https://www.moxfield.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-secondary-subtle)] hover:bg-[var(--color-secondary-subtle)] border border-[var(--color-secondary-border)] rounded-lg text-[var(--color-secondary)] text-sm font-medium transition-all group"
          >
            <ExternalLink className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Moxfield Deck Builder
            <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={2} aria-hidden="true" />
          </a>
        </>
      )
    },
    {
      title: "AI Analysis Features",
      icon: (
        <WandSparkles className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
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
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-secondary-border)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-secondary)] font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              Pro Tip:
            </p>
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
        <Users className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
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
        <Search className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-secondary-subtle)] hover:bg-[var(--color-secondary-subtle)] border border-[var(--color-secondary-border)] rounded-lg text-[var(--color-secondary)] text-sm font-medium transition-all group mb-4"
          >
            <ExternalLink className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Scryfall Card Search
            <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={2} aria-hidden="true" />
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
      <div className="min-h-screen">
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
                <div className="p-3 bg-[var(--color-secondary-subtle)] rounded-lg text-[var(--color-secondary)] shrink-0">
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
        <div className="mt-12 text-center backdrop-blur-sm bg-[var(--color-surface)]/80 border border-[var(--color-secondary-border)] rounded-xl p-8">
          <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">
            Still have questions?
          </h3>
          <p className="text-[var(--color-muted)] mb-4">
            The best way to learn is by exploring! Start by importing a deck or uploading your collection.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="/"
              className="btn btn-primary"
            >
              Go to Dashboard
            </a>
            <a
              href="/collection"
              className="btn btn-secondary"
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
