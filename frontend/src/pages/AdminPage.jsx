import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Shield, UserPlus, AlertCircle, UserX } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { AvatarDisplay } from '../components/AvatarDisplay'

const ADMIN_EMAIL = 'zsalerno17@gmail.com'

export default function AdminPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [addError, setAddError] = useState(null)
  const [removingEmail, setRemovingEmail] = useState(null)

  const userEmail = session?.user?.email || ''
  const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL

  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/', { replace: true })
    }
  }, [isAdmin, loading, navigate])

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
  }, [isAdmin])

  async function loadUsers() {
    try {
      setLoading(true)
      setError(null)
      const data = await api.admin.getAllowedUsers()
      setUsers(data.allowed_users || [])
    } catch (err) {
      console.error('[AdminPage] Failed to load users:', err)
      setError(err.message || 'Failed to load allowed users')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddEmail(e) {
    e.preventDefault()
    if (!newEmail.trim()) return
    try {
      setAddingEmail(true)
      setAddError(null)
      await api.admin.addAllowedUser(newEmail.trim())
      setNewEmail('')
      await loadUsers()
    } catch (err) {
      console.error('[AdminPage] Failed to add email:', err)
      setAddError(err.message || 'Failed to add email')
    } finally {
      setAddingEmail(false)
    }
  }

  async function handleRemoveEmail(email) {
    if (!confirm(`Remove ${email} from allowlist?`)) return
    try {
      setRemovingEmail(email)
      await api.admin.removeAllowedUser(email)
      await loadUsers()
    } catch (err) {
      console.error('[AdminPage] Failed to remove email:', err)
      alert(err.message || 'Failed to remove email')
    } finally {
      setRemovingEmail(null)
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr))
  }

  if (!isAdmin) return null

  return (
    <PageTransition>
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12">

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-7 h-7 text-[var(--color-primary)]" strokeWidth={2} />
              <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-[var(--color-text)]">
                Admin Panel
              </h1>
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Manage user access. Add or remove emails from the allowlist.
            </p>
          </div>

          {/* Add user form */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 mb-8">
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              Add New User
            </h2>
            <form onSubmit={handleAddEmail} className="flex gap-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-4 py-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-sm"
                disabled={addingEmail}
              />
              <button
                type="submit"
                disabled={addingEmail || !newEmail.trim()}
                className="px-5 py-2.5 bg-[var(--color-primary)] text-[var(--color-background)] text-sm font-medium rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {addingEmail ? 'Adding…' : 'Add'}
              </button>
            </form>
            {addError && (
              <div className="mt-3 flex items-start gap-2 text-sm text-[var(--color-danger)]">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                <span>{addError}</span>
              </div>
            )}
          </div>

          {/* Users table */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Allowed Users
              </h2>
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-full">
                {users.length}
              </span>
            </div>

            {loading && (
              <div className="px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
                Loading…
              </div>
            )}

            {error && (
              <div className="px-6 py-16 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-danger)] mb-3">
                  <AlertCircle className="w-4 h-4" strokeWidth={2} />
                  <span>{error}</span>
                </div>
                <button onClick={loadUsers} className="text-xs text-[var(--color-primary)] hover:underline">
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && users.length === 0 && (
              <div className="px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
                No users in allowlist
              </div>
            )}

            {!loading && !error && users.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Profile Name
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Decks
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {users.map((user) => (
                      <tr
                        key={user.email}
                        className="hover:bg-[var(--color-surface-2)] transition-colors"
                      >
                        {/* Profile icon + email */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <AvatarDisplay
                              avatarUrl={user.avatar_url}
                              fallbackLabel={user.email}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="text-[var(--color-text)] font-medium truncate">
                                {user.email}
                              </p>
                              {user.email === ADMIN_EMAIL && (
                                <span className="inline-block mt-0.5 px-1.5 py-0 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-medium rounded">
                                  Admin
                                </span>
                              )}
                              {!user.has_signed_in && (
                                <span className="inline-block mt-0.5 text-xs text-[var(--color-text-muted)]">
                                  Invited — never signed in
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Profile name */}
                        <td className="px-4 py-4 text-[var(--color-text-secondary)]">
                          {user.username || <span className="text-[var(--color-text-muted)]">—</span>}
                        </td>

                        {/* Deck count */}
                        <td className="px-4 py-4 text-center">
                          <span className="text-[var(--color-text)]">
                            {user.has_signed_in ? user.deck_count : <span className="text-[var(--color-text-muted)]">—</span>}
                          </span>
                        </td>

                        {/* Last login */}
                        <td className="px-4 py-4 text-[var(--color-text-secondary)]">
                          {formatDate(user.last_sign_in_at)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleRemoveEmail(user.email)}
                            disabled={user.email === ADMIN_EMAIL || removingEmail === user.email}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-danger)] border border-[var(--color-danger)]/30 rounded-lg hover:bg-[var(--color-danger)]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title={user.email === ADMIN_EMAIL ? 'Cannot remove admin' : 'Remove from allowlist'}
                          >
                            {removingEmail === user.email ? (
                              <div className="w-3 h-3 border-2 border-[var(--color-danger)] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <UserX className="w-3 h-3" strokeWidth={2} />
                            )}
                            Un-allow
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  )
}
