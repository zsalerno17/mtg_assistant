import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Shield, UserPlus, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import PageTransition from '../components/PageTransition'

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

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/', { replace: true })
    }
  }, [isAdmin, loading, navigate])

  // Load allowed users
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
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  // Don't render anything if not admin (will redirect)
  if (!isAdmin) {
    return null
  }

  return (
    <PageTransition>
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-[var(--color-primary)]" strokeWidth={2} />
              <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-[var(--color-text)]">
                Admin Panel
              </h1>
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
              Manage user access to MTG Assistant. Add or remove email addresses from the allowlist.
            </p>
          </div>

          {/* Add user form */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" strokeWidth={2} />
              Add New User
            </h2>
            <form onSubmit={handleAddEmail} className="flex gap-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-4 py-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                disabled={addingEmail}
              />
              <button
                type="submit"
                disabled={addingEmail || !newEmail.trim()}
                className="px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-background)] font-medium rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {addingEmail ? 'Adding...' : 'Add User'}
              </button>
            </form>
            {addError && (
              <div className="mt-3 flex items-start gap-2 text-sm text-[var(--color-danger)]">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                <span>{addError}</span>
              </div>
            )}
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Emails are automatically converted to lowercase to match OAuth providers.
            </p>
          </div>

          {/* Users list */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Allowed Users ({users.length})
              </h2>
            </div>

            {loading && (
              <div className="px-6 py-12 text-center text-[var(--color-muted)]">
                Loading users...
              </div>
            )}

            {error && (
              <div className="px-6 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-[var(--color-danger)]">
                  <AlertCircle className="w-5 h-5" strokeWidth={2} />
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadUsers}
                  className="mt-4 text-sm text-[var(--color-primary)] hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && users.length === 0 && (
              <div className="px-6 py-12 text-center text-[var(--color-muted)]">
                No users in allowlist
              </div>
            )}

            {!loading && !error && users.length > 0 && (
              <div className="divide-y divide-[var(--color-border)]">
                {users.map((user) => (
                  <div
                    key={user.email}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[var(--color-surface-2)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium text-[var(--color-text)]">
                          {user.email}
                        </p>
                        {user.email === ADMIN_EMAIL && (
                          <span className="px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-medium rounded">
                            Admin
                          </span>
                        )}
                        {user.has_signed_in ? (
                          <CheckCircle className="w-4 h-4 text-green-500" strokeWidth={2} title="Active user" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[var(--color-muted)]" strokeWidth={2} title="Never signed in" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                        {user.has_signed_in ? (
                          <>
                            <span>Created: {formatDate(user.created_at)}</span>
                            <span>•</span>
                            <span>Last sign-in: {formatDate(user.last_sign_in_at)}</span>
                          </>
                        ) : (
                          <span>Invited (never signed in)</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveEmail(user.email)}
                      disabled={user.email === ADMIN_EMAIL || removingEmail === user.email}
                      className="p-2 text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title={user.email === ADMIN_EMAIL ? 'Cannot remove admin' : 'Remove user'}
                    >
                      {removingEmail === user.email ? (
                        <div className="w-5 h-5 border-2 border-[var(--color-muted)] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="mt-8 bg-[var(--color-secondary-subtle)] border border-[var(--color-secondary-border)] rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--color-secondary)] mt-0.5 shrink-0" strokeWidth={2} />
              <div className="text-sm text-[var(--color-text)]">
                <p className="font-semibold text-[var(--color-secondary)] mb-2">How it works:</p>
                <ul className="space-y-1 text-[var(--color-muted)]">
                  <li>• Users must be in the allowlist to access the app</li>
                  <li>• Email addresses are stored in lowercase to match OAuth providers (Google, etc.)</li>
                  <li>• Users appear as "Active" once they sign in for the first time</li>
                  <li>• Removing a user revokes their access immediately</li>
                  <li>• The admin email ({ADMIN_EMAIL}) cannot be removed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
