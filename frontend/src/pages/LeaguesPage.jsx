import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { LeagueCardSkeleton } from '../components/Skeletons'
import { SwordsIcon, TrophyIcon } from '../components/LeagueIcons'
import PageTransition from '../components/PageTransition'

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCompleted, setShowCompleted] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [seasonStart, setSeasonStart] = useState('')
  const [seasonEnd, setSeasonEnd] = useState('')

  const { session } = useAuth()

  useEffect(() => {
    if (!session?.access_token) return
    loadLeagues()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  async function loadLeagues() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getLeagues()
      setLeagues(data.leagues || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLeague(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.createLeague({
        name,
        description,
        season_start: seasonStart,
        season_end: seasonEnd,
        status: 'active',
      })
      // Reset form
      setName('')
      setDescription('')
      setSeasonStart('')
      setSeasonEnd('')
      setShowCreateForm(false)
      // Reload leagues
      await loadLeagues()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleArchiveCompleted() {
    setArchiving(true)
    setError(null)
    try {
      const result = await api.archiveCompletedLeagues()
      if (result.archived > 0) {
        await loadLeagues()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setArchiving(false)
    }
  }

  async function handleRefreshDecks() {
    setRefreshing(true)
    setError(null)
    try {
      // Refresh deck library from Moxfield
      await api.getDeckLibrary()
      // Reload leagues to pick up any changes
      await loadLeagues()
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const activeLeagues = leagues.filter(l => l.status === 'active' || l.status === 'draft')
  const completedLeagues = leagues.filter(l => l.status === 'completed')
  const displayLeagues = showCompleted ? leagues : activeLeagues

  return (
    <PageTransition>
      <div className="max-w-[1400px] mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-brand font-bold text-[var(--color-text)] mb-2">
              My Leagues
            </h1>
            <p className="text-[var(--color-muted)] text-sm">
              Track your Commander pod sessions, standings, and legendary moments
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary"
          >
            {showCreateForm ? 'Cancel' : '+ Create League'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Bulk Actions */}
        {!loading && leagues.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleRefreshDecks}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Decks'}
            </button>
            <button
              onClick={handleArchiveCompleted}
              disabled={archiving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
            >
              {archiving ? 'Archiving...' : 'Archive Completed'}
            </button>
            {completedLeagues.length > 0 && (
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                {showCompleted ? 'Hide Completed' : `Show Completed (${completedLeagues.length})`}
              </button>
            )}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 mb-8">
            <h2 className="text-xl font-brand font-bold text-[var(--color-text)] mb-4">
              Create New League
            </h2>
            <form onSubmit={handleCreateLeague} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-muted)] mb-1.5">
                  League Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Commander Gauntlet"
                  required
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-muted)] mb-1.5">
                  Description / Rules (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Paste your league rules or description here..."
                  rows={6}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-muted)] mb-1.5">
                    Season Start
                  </label>
                  <input
                    type="date"
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                    required
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-muted)] mb-1.5">
                    Season End
                  </label>
                  <input
                    type="date"
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                    required
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="btn-primary px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create League'}
              </button>
            </form>
          </div>
        )}

        {/* Loading/Empty States */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <LeagueCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && leagues.length === 0 && !showCreateForm && (
          <div className="text-center py-20">
            <SwordsIcon className="w-16 h-16 text-[var(--color-muted)] mx-auto mb-4" />
            <h3 className="text-2xl font-brand font-bold text-[var(--color-text)] mb-3">
              Form your first pod.
            </h3>
            <p className="text-[var(--color-muted)] mb-2 text-lg">
              Build a rivalry. Claim the championship.
            </p>
            <p className="text-[var(--color-muted)]/60 text-sm mb-6">
              Create a league to start tracking pod sessions, standings, and legendary moments.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary px-6 py-2.5 rounded-lg font-medium"
            >
              Create Your First League
            </button>
          </div>
        )}

        {/* Leagues Grid */}
        {!loading && leagues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayLeagues.map((league) => (
              <Link
                key={league.id}
                to={`/leagues/${league.id}`}
                className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-brand font-bold text-[var(--color-text)] group-hover:text-[var(--color-text)] transition-colors">
                    {league.name}
                  </h3>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      league.status === 'active'
                        ? 'bg-green-500/20 text-green-300'
                        : league.status === 'completed'
                        ? 'bg-gray-500/20 text-gray-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}
                  >
                    {league.status}
                  </span>
                </div>

                <div className="text-sm text-[var(--color-muted)] space-y-1.5">
                  <div>
                    📅 {new Date(league.season_start).toLocaleDateString()} —{' '}
                    {new Date(league.season_end).toLocaleDateString()}
                  </div>
                  {league.league_members && (
                    <div>👥 {league.league_members.length} members</div>
                  )}
                  {(() => {
                    // Calculate color identity from all league decks
                    const colors = new Set()
                    ;(league.league_members || []).forEach(member => {
                      ;(member.deck_color_identity || []).forEach(c => colors.add(c))
                    })
                    const colorArray = Array.from(colors).sort((a, b) => 'WUBRG'.indexOf(a) - 'WUBRG'.indexOf(b))
                    const colorNames = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' }
                    return colorArray.length > 0 ? (
                      <div className="flex gap-1 mt-1" title={`Colors played: ${colorArray.map(c => colorNames[c]).join(', ')}`}>
                        {colorArray.map(color => (
                          <i key={color} className={`ms ms-${color.toLowerCase()} ms-cost`} style={{ fontSize: '14px' }} />
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>

                {league.description && (
                  <p className="mt-3 text-xs text-[var(--color-muted)] line-clamp-2">
                    {league.description.slice(0, 120)}...
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
