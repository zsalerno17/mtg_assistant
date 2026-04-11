import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: HomeIcon, exact: true },
  { to: '/collection', label: 'Collection', icon: CollectionIcon },
]

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function CollectionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-4 0v2" />
      <path d="M7 7V5a2 2 0 00-4 0v2" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function UserAvatar({ email, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Profile"
        className="w-8 h-8 rounded-full object-cover border border-amber-500/30 shrink-0"
      />
    )
  }
  const initials = email ? email.slice(0, 2).toUpperCase() : '?'
  return (
    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
      <span className="text-[var(--color-primary)] text-xs font-semibold font-[var(--font-mono)]">{initials}</span>
    </div>
  )
}

function NavItem({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium border-l-2 ${
          isActive
            ? 'border-[var(--color-primary)] bg-amber-500/10 text-[var(--color-primary)]'
            : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
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
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const email = session?.user?.email || ''

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-[var(--color-bg)]">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex flex-col w-16 lg:w-60 shrink-0 border-r border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg)] sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-[var(--color-border)]">
          <span className="font-[var(--font-heading)] text-[var(--color-primary)] text-base hidden lg:block drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
            MTG Assistant
          </span>
          <span className="font-[var(--font-heading)] text-[var(--color-primary)] text-lg lg:hidden drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">M</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* User / profile / sign out */}
        <div className="p-3 border-t border-[var(--color-border)] space-y-2">
          {/* Clickable profile area — navigates to /profile */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 w-full px-2 py-1 rounded-lg hover:bg-[var(--color-bg)] transition-colors text-left"
          >
            <UserAvatar email={email} avatarUrl={profile?.avatar_url} />
            {email && (
              <div className="hidden lg:block min-w-0">
                {profile?.username && (
                  <p className="text-[var(--color-text)] text-xs font-medium truncate">{profile.username}</p>
                )}
                <p className="text-[var(--color-muted)] text-xs truncate">{email}</p>
              </div>
            )}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border-l-2 border-transparent text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface)] transition-colors text-sm"
          >
            <SignOutIcon />
            <span className="hidden lg:block">Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto pb-[72px] md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden backdrop-blur-sm bg-[var(--color-surface)]/95 border-t border-[var(--color-border)] flex items-center justify-around px-2 z-50 min-h-[72px]">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 min-w-[64px] min-h-[56px] px-4 py-2 rounded-lg transition-colors justify-center ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              }`
            }
          >
            <Icon />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
        {/* Profile slot — navigates to profile page */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center gap-0.5 min-w-[64px] min-h-[56px] px-4 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors justify-center"
        >
          <UserAvatar email={email} avatarUrl={profile?.avatar_url} />
          <span className="text-xs">Profile</span>
        </button>
      </nav>
    </div>
  )
}
