/**
 * DEV-ONLY: Icon Showcase Page
 * Visual audit of all current inline SVG icons across the app.
 * Route: /icons-dev
 * See: .github/icon-audit-plan.md
 */

// ─── LeagueIcons.jsx ──────────────────────────────────────────────────────────

function TrophyIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function CrownIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 19h19v2h-19zM22.5 7l-5 5-5.5-7L6.5 12l-5-5 2 14h18z" />
    </svg>
  )
}

function SwordsIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
      <path d="M9.5 6.5 21 18v3h-3L6.5 9.5" />
      <path d="M11 5l-6 6" />
      <path d="M8 8 4 4" />
      <path d="M5 3 3 5" />
    </svg>
  )
}

function FlameIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-3.147 2.4-5.858 5-8.514.357-.365.714-.727 1.056-1.1C11.37 6.065 11.67 5.7 12 5c.33.7.63 1.065.944 1.386.342.373.699.735 1.056 1.1C16.6 10.142 19 12.853 19 16c0 3.866-3.134 7-7 7zm0-14.16C9.948 11.14 7 13.88 7 16c0 2.757 2.243 5 5 5s5-2.243 5-5c0-2.12-2.948-4.86-5-7.16z" />
    </svg>
  )
}

// ─── DeckPage.jsx ─────────────────────────────────────────────────────────────

function OverviewIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function UpgradeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  )
}

function StrategyIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  )
}

function ImprovementsIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  )
}

function ScenariosIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function WarningIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CheckIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronDownIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronLeftIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

// ─── TopNavbar.jsx ────────────────────────────────────────────────────────────

function UserIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function HelpCircleIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  )
}

function SunIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function LogOutIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function HomeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function CollectionNavIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-4 0v2" />
      <path d="M7 7V5a2 2 0 00-4 0v2" />
    </svg>
  )
}

// ─── DashboardPage.jsx ────────────────────────────────────────────────────────

function EyeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function SpinnerIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  )
}

function AnalyzeCheckIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  )
}

// ─── CollectionPage.jsx ───────────────────────────────────────────────────────

function CloudUploadIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  )
}

// ─── HelpPage.jsx ─────────────────────────────────────────────────────────────

function FileTextIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function LayersIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}

function UsersIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function SearchIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function ExternalLinkIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function ChevronRightIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function PackageIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 3v4M8 3v4" />
    </svg>
  )
}

// ─── Showcase layout ──────────────────────────────────────────────────────────

const ICON_GROUPS = [
  {
    title: 'League Icons',
    file: 'LeagueIcons.jsx',
    icons: [
      { name: 'TrophyIcon', lucide: 'Trophy', strokeWidth: '1.5', component: TrophyIcon },
      { name: 'CrownIcon', lucide: 'Crown', strokeWidth: 'fill', component: CrownIcon },
      { name: 'SwordsIcon', lucide: 'Swords', strokeWidth: '1.5', component: SwordsIcon },
      { name: 'FlameIcon', lucide: 'Flame', strokeWidth: 'fill', component: FlameIcon },
    ],
  },
  {
    title: 'Deck Page — Tabs',
    file: 'DeckPage.jsx',
    icons: [
      { name: 'OverviewIcon', lucide: 'LayoutGrid', strokeWidth: '2', component: OverviewIcon },
      { name: 'UpgradeIcon', lucide: 'ArrowUp', strokeWidth: '2', component: UpgradeIcon },
      { name: 'StrategyIcon', lucide: 'CirclePlay', strokeWidth: '2', component: StrategyIcon },
      { name: 'ImprovementsIcon', lucide: 'TrendingUp', strokeWidth: '2', component: ImprovementsIcon },
      { name: 'ScenariosIcon', lucide: 'MessageSquare', strokeWidth: '2', component: ScenariosIcon },
    ],
  },
  {
    title: 'Deck Page — Utility',
    file: 'DeckPage.jsx',
    icons: [
      { name: 'WarningIcon', lucide: 'AlertTriangle', strokeWidth: '2', component: WarningIcon },
      { name: 'CheckIcon', lucide: 'Check', strokeWidth: '2', component: CheckIcon },
      { name: 'ChevronDownIcon', lucide: 'ChevronDown', strokeWidth: '2', component: ChevronDownIcon },
      { name: 'ChevronLeftIcon', lucide: 'ChevronLeft', strokeWidth: '2', component: ChevronLeftIcon },
    ],
  },
  {
    title: 'Navigation',
    file: 'TopNavbar.jsx',
    icons: [
      { name: 'HomeIcon', lucide: 'House', strokeWidth: '2', component: HomeIcon },
      { name: 'TrophyIcon (nav)', lucide: 'Trophy', strokeWidth: '2', component: TrophyIcon },
      { name: 'CollectionNavIcon', lucide: 'Package', strokeWidth: '2', component: CollectionNavIcon },
      { name: 'UserIcon', lucide: 'User', strokeWidth: '2', component: UserIcon },
      { name: 'HelpCircleIcon', lucide: 'CircleHelp', strokeWidth: '2', component: HelpCircleIcon },
      { name: 'SunIcon', lucide: 'Sun', strokeWidth: '2', component: SunIcon },
      { name: 'MoonIcon', lucide: 'Moon', strokeWidth: '2', component: MoonIcon },
      { name: 'LogOutIcon', lucide: 'LogOut', strokeWidth: '2', component: LogOutIcon },
    ],
  },
  {
    title: 'Dashboard — Status & Empty State',
    file: 'DashboardPage.jsx',
    icons: [
      { name: 'EyeIcon', lucide: 'Eye', strokeWidth: '2.5', component: EyeIcon },
      { name: 'SpinnerIcon', lucide: 'LoaderCircle', strokeWidth: '2', component: SpinnerIcon },
      { name: 'AnalyzeCheckIcon', lucide: 'ClipboardCheck', strokeWidth: '2.5', component: AnalyzeCheckIcon },
      { name: 'SwordsIcon (empty)', lucide: 'Swords', strokeWidth: '1.5', component: SwordsIcon },
    ],
  },
  {
    title: 'Collection — Empty State',
    file: 'CollectionPage.jsx',
    icons: [
      { name: 'CloudUploadIcon', lucide: 'CloudUpload', strokeWidth: '1.5', component: CloudUploadIcon },
    ],
  },
  {
    title: 'Help Page — Sections & Links',
    file: 'HelpPage.jsx',
    icons: [
      { name: 'HelpCircleIcon', lucide: 'CircleHelp', strokeWidth: '2', component: HelpCircleIcon },
      { name: 'PackageIcon', lucide: 'Package', strokeWidth: '2', component: PackageIcon },
      { name: 'FileTextIcon', lucide: 'FileText', strokeWidth: '2', component: FileTextIcon },
      { name: 'LayersIcon', lucide: 'Layers', strokeWidth: '2', component: LayersIcon },
      { name: 'UsersIcon', lucide: 'Users', strokeWidth: '2', component: UsersIcon },
      { name: 'SearchIcon', lucide: 'Search', strokeWidth: '2', component: SearchIcon },
      { name: 'ExternalLinkIcon', lucide: 'ExternalLink', strokeWidth: '2', component: ExternalLinkIcon },
      { name: 'ChevronRightIcon', lucide: 'ChevronRight', strokeWidth: '2', component: ChevronRightIcon },
    ],
  },
]

function IconCard({ name, lucide, strokeWidth, component: Icon }) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)]/50 transition-colors group">
      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-[var(--color-surface-2)] group-hover:bg-[var(--color-primary)]/10 transition-colors text-[var(--color-text)]">
        <Icon size={24} />
      </div>
      <div className="text-center space-y-1 w-full">
        <p className="text-xs font-mono text-[var(--color-text)] truncate" title={name}>{name}</p>
        <p className="text-[10px] text-[var(--color-primary)] font-medium truncate" title={`→ lucide: ${lucide}`}>
          → {lucide}
        </p>
        <p className="text-[10px] text-[var(--color-muted)]">sw: {strokeWidth}</p>
      </div>
    </div>
  )
}

export default function IconShowcasePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-6 md:p-10">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2 py-0.5 text-xs font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded">DEV ONLY</span>
          <span className="text-[var(--color-muted)] text-sm">Route: /icons-dev</span>
        </div>
        <h1 className="font-heading text-3xl text-[var(--color-text)] mb-2">Icon System Audit</h1>
        <p className="text-[var(--color-muted)] mb-4">
          All current inline SVG icons across the app. Each card shows the current icon, its component name, 
          the planned Lucide replacement, and current strokeWidth.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            <span className="text-[var(--color-muted)]">Icon name (current)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
            <span className="text-[var(--color-primary)] font-mono text-xs">→ LucideName</span>
            <span className="text-[var(--color-muted)]">Planned Lucide replacement</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
            <span className="text-[var(--color-muted)] font-mono text-xs">sw: 2</span>
            <span className="text-[var(--color-muted)]">Current strokeWidth</span>
          </div>
        </div>
      </div>

      {/* Icon groups */}
      <div className="max-w-6xl mx-auto space-y-10">
        {ICON_GROUPS.map((group) => (
          <section key={group.title}>
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="font-heading text-lg text-[var(--color-text)]">{group.title}</h2>
              <span className="text-xs font-mono text-[var(--color-muted)]">{group.file}</span>
              <span className="text-xs text-[var(--color-muted)] opacity-60">{group.icons.length} icons</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {group.icons.map((icon) => (
                <IconCard key={icon.name} {...icon} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <div className="max-w-6xl mx-auto mt-14 pt-8 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-muted)]">
          See <span className="font-mono text-[var(--color-primary)]">.github/icon-audit-plan.md</span> for full migration plan.
          Install Lucide with <span className="font-mono text-amber-400">npm install lucide-react</span> in the frontend directory.
        </p>
      </div>
    </div>
  )
}
