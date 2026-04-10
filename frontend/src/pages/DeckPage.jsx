import { useState } from 'react'

const TABS = ['Overview', 'Collection Upgrades', 'Strategy', 'Improvements', 'Scenarios']

export default function DeckPage() {
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-6">
      <h2 className="font-[var(--font-heading)] text-2xl text-[var(--color-primary)] mb-6">
        Deck Analysis
      </h2>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] mb-6 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content — wired in Phase 3/4 */}
      <div className="text-[var(--color-muted)] text-sm">
        {activeTab} content loading... (Phase 3 wiring pending)
      </div>
    </div>
  )
}
