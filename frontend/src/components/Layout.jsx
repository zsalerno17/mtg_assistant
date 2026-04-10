import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: HomeIcon, exact: true },
  { to: '/collection', label: 'Collection', icon: CollectionIcon },
]

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function CollectionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-4 0v2" />
      <path d="M7 7V5a2 2 0 00-4 0v2" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function NavItem({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
          isActive
            ? 'bg-[var(--color-surface)] text-[var(--color-primary)]'
            : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
        }`
      }
    >
      <Icon />
      <span className="hidden lg:block">{label}</span>
    </NavLink>
  )
}

/** Wraps page content with responsive nav: bottom bar on mobile, sidebar on desktop. */
export default function Layout({ children }) {
  const { session, signOut } = useAuth()

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-[var(--color-bg)]">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex flex-col w-14 lg:w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)] sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-[var(--color-border)]">
          <span className="font-[var(--font-heading)] text-[var(--color-primary)] text-base hidden lg:block">MTG Assistant</span>
          <span className="font-[var(--font-heading)] text-[var(--color-primary)] text-lg lg:hidden">M</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* User / sign out */}
        <div className="p-3 border-t border-[var(--color-border)]">
          {session?.user?.email && (
            <p className="text-[var(--color-muted)] text-xs px-4 py-1 truncate hidden lg:block">
              {session.user.email}
            </p>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface)] transition-colors text-sm"
          >
            <SignOutIcon />
            <span className="hidden lg:block">Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-around px-2 py-2 z-50">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              }`
            }
          >
            <Icon />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
        <button
          onClick={signOut}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors"
        >
          <SignOutIcon />
          <span className="text-xs">Sign out</span>
        </button>
      </nav>
    </div>
  )
}
