import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isPresetUrl, urlToPresetId, isCreaturePreset, CREATURE_PRESET_MAP } from '../lib/avatarPresets'
import { CreaturePresetIcon } from '../lib/creatureIcons'
import { User, CircleHelp, LogOut, House, Trophy, Library, Swords } from 'lucide-react'

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
  const navigate = useNavigate()
  const location = useLocation()
  const email = session?.user?.email || ''
  const isBattlefieldActive = location.pathname.startsWith('/battlefield') || location.pathname.startsWith('/leagues') || location.pathname.startsWith('/games')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-surface)]/85 border-b border-[var(--color-border)]" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}>
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 min-h-[64px] overflow-visible">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <NavLink
              to="/"
              className="flex items-center gap-3 hover:brightness-110 transition-all"
            >
              <img src="/logo.svg" alt="MTG Assistant" className="h-[120px] translate-y-[22px] md:h-[150px] md:translate-y-[27px] w-auto shrink-0 drop-shadow-[0_6px_20px_rgba(0,0,0,0.6)]" />
              <span className="font-brand font-bold text-[var(--color-primary)] text-[20px] tracking-wide hidden sm:inline">
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
                to="/battlefield"
                className={() =>
                  `px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
                    isBattlefieldActive
                      ? 'bg-[var(--color-secondary-subtle)] text-[var(--color-text)] border border-[var(--color-secondary-border)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-secondary-subtle)]'
                  }`
                }
              >
                The Battlefield
              </NavLink>
            </div>
          </div>

          {/* Right side: user avatar + dropdown */}
          <div className="flex items-center gap-3">
            {/* User button with dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-all cursor-pointer"
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
              <div className={`absolute right-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl shadow-black/50 transition-all overflow-hidden ${menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <button
                  onClick={() => { navigate('/profile'); setMenuOpen(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  Profile
                </button>
                <button
                  onClick={() => { navigate('/help'); setMenuOpen(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <CircleHelp className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  Help & Resources
                </button>
                <div className="border-t border-[var(--color-border)]" />
                <button
                  onClick={() => { signOut(); setMenuOpen(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-surface-2)] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
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
            <House className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            <span className="text-xs font-medium">Home</span>
          </NavLink>
          <NavLink
            to="/battlefield"
            className={() =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[72px] ${
                isBattlefieldActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              }`
            }
          >
            <Swords className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            <span className="text-xs font-medium">Battlefield</span>
          </NavLink>
          <NavLink
            to="/collection"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[72px] ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
              }`
            }
          >
            <Library className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            <span className="text-xs font-medium">Collection</span>
          </NavLink>
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-all min-w-[72px] cursor-pointer"
          >
            <UserAvatar email={email} avatarUrl={profile?.avatar_url} size="sm" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
    </div>
    </>
  )
}
