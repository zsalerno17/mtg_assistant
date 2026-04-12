import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isPresetUrl, urlToPresetId, isCreaturePreset } from '../lib/avatarPresets'
import { CreaturePresetIcon } from '../lib/creatureIcons'

function UserAvatar({ email, avatarUrl, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-10 h-10'
  }
  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  if (avatarUrl && isPresetUrl(avatarUrl)) {
    const id = urlToPresetId(avatarUrl)
    if (isCreaturePreset(id)) {
      return (
        <div className={`${sizeClasses[size]} rounded-[7px] bg-slate-800 border border-slate-600 flex items-center justify-center shrink-0`}>
          <CreaturePresetIcon id={id} className={`${iconSizeClasses[size]} text-amber-400`}/>
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
        className={`${sizeClasses[size]} rounded-[7px] object-cover border border-amber-500/30 shrink-0`}
      />
    )
  }
  const initials = email ? email.slice(0, 2).toUpperCase() : '?'
  return (
    <div className={`${sizeClasses[size]} rounded-[7px] bg-gradient-to-br from-[var(--color-primary)] to-[#f59e0b] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(251,191,36,0.25)]`}>
      <span className={`${textSizeClasses[size]} text-black font-semibold font-mono`}>{initials}</span>
    </div>
  )
}

/** Horizontal top navigation bar with logo, nav links, and user avatar. */
export default function TopNavbar() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const email = session?.user?.email || ''

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-surface)]/85 border-b border-[var(--color-border)]">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <NavLink
              to="/"
              className="font-brand text-[var(--color-primary)] text-[18px] tracking-wide hover:brightness-110 transition-all"
            >
              MTG Assistant
            </NavLink>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-[7px] text-sm font-body font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500/[0.12] text-[var(--color-text)] border border-amber-500/20'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-amber-500/[0.08]'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/collection"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-[7px] text-sm font-body font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500/[0.12] text-[var(--color-text)] border border-amber-500/20'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-amber-500/[0.08]'
                  }`
                }
              >
                Collection
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

      {/* Mobile bottom navigation bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-md bg-[var(--color-surface)]/95 border-t border-[var(--color-border)] z-40">
        <div className="flex items-center justify-around px-2 py-2">
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
    </nav>
  )
}
