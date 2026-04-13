import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../lib/useTheme'
import { isPresetUrl, urlToPresetId, isCreaturePreset, CREATURE_PRESET_MAP } from '../lib/avatarPresets'
import { CreaturePresetIcon } from '../lib/creatureIcons'

function UserAvatar({ email, avatarUrl, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-10 h-10'
  }
  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-7 h-7'
  }
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  if (avatarUrl && isPresetUrl(avatarUrl)) {
    const id = urlToPresetId(avatarUrl)
    if (isCreaturePreset(id)) {
      const p = CREATURE_PRESET_MAP[id]
      return (
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden shrink-0`}
          style={{ background: p?.bg ?? '#1e293b', color: p?.iconColor ?? '#94a3b8', border: '2px solid rgba(255,255,255,0.08)' }}
        >
          <CreaturePresetIcon id={id} className={iconSizeClasses[size]}/>
        </div>
      )
    }
    return (
      <i
        className={`ms ms-${id} ms-cost ms-shadow shrink-0`}
        style={{ fontSize: size === 'sm' ? '1.5rem' : size === 'lg' ? '2.25rem' : '2rem' }}
        aria-label="profile icon"
      />
    )
  }
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Profile"
        className={`${sizeClasses[size]} rounded-lg object-cover border border-[var(--color-secondary-border)] shrink-0`}
      />
    )
  }
  const initials = email ? email.slice(0, 2).toUpperCase() : '?'
  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0 shadow-[0_2px_8px_var(--color-primary-glow)]`}>
      <span className={`${textSizeClasses[size]} text-[var(--color-text-on-primary)] font-semibold font-mono`}>{initials}</span>
    </div>
  )
}

/** Horizontal top navigation bar with logo, nav links, and user avatar. */
export default function TopNavbar() {
  const { session, profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const email = session?.user?.email || ''

  return (
    <>
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-surface)]/85 border-b border-[var(--color-border)]" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}>
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 min-h-[64px]">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <NavLink
              to="/"
              className="flex items-center gap-2 hover:brightness-110 transition-all"
            >
              <img src="/logo.svg" alt="MTG Assistant" className="h-8 w-auto" />
              <span className="font-brand text-[var(--color-primary)] text-[18px] tracking-wide hidden sm:inline">
                MTG Assistant
              </span>
            </NavLink>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--color-secondary-subtle)] text-[var(--color-text)] border border-[var(--color-secondary-border)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-secondary-subtle)]'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/collection"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--color-secondary-subtle)] text-[var(--color-text)] border border-[var(--color-secondary-border)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-secondary-subtle)]'
                  }`
                }
              >
                Collection
              </NavLink>
              <NavLink
                to="/leagues"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--color-secondary-subtle)] text-[var(--color-text)] border border-[var(--color-secondary-border)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-secondary-subtle)]'
                  }`
                }
              >
                Leagues
              </NavLink>
            </div>
          </div>

          {/* Right side: user avatar + dropdown */}
          <div className="flex items-center gap-3">
            {/* User button with dropdown */}
            <div className="relative group">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-all group"
                title="Profile"
              >
                <UserAvatar email={email} avatarUrl={profile?.avatar_url} size="md" />
                <div className="hidden lg:block text-left">
                  {profile?.username && (
                    <p className="text-[var(--color-text)] text-xs font-medium leading-tight">{profile.username}</p>
                  )}
                  <p className="text-[var(--color-muted)] text-xs leading-tight">{email}</p>
                </div>
              </button>

              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl shadow-black/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={() => navigate('/help')}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
                  </svg>
                  Help & Resources
                </button>
                <button
                  onClick={toggleTheme}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors flex items-center gap-2"
                >
                  {theme === 'dark' ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
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
                      Light Mode
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                      </svg>
                      Dark Mode
                    </>
                  )}
                </button>
                <div className="border-t border-[var(--color-border)]" />
                <button
                  onClick={signOut}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-surface-2)] transition-colors flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </nav>

    {/* Mobile bottom navigation bar — OUTSIDE nav to avoid backdrop-filter containing block */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-md bg-[var(--color-surface)]/95 border-t border-[var(--color-border)] z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[72px] ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              }`
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
              <path d="M9 21V12h6v9" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </NavLink>
          <NavLink
            to="/leagues"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[72px] ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              }`
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7" />
              <path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 20" />
              <path d="M18 2H6v7a6 6 0 0012 0V2z" />
            </svg>
            <span className="text-xs font-medium">Leagues</span>
          </NavLink>
          <NavLink
            to="/collection"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[72px] ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              }`
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-4 0v2" />
              <path d="M7 7V5a2 2 0 00-4 0v2" />
            </svg>
            <span className="text-xs font-medium">Collection</span>
          </NavLink>
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-all min-w-[72px]"
          >
            <UserAvatar email={email} avatarUrl={profile?.avatar_url} size="sm" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
    </div>
    </>
  )
}
