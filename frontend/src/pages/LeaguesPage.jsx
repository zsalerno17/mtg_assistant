import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { LeagueCardSkeleton } from '../components/Skeletons'
import { SwordsIcon, TrophyIcon } from '../components/LeagueIcons'

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [seasonStart, setSeasonStart] = useState('')
  const [seasonEnd, setSeasonEnd] = useState('')

  useEffect(() => {
    loadLeagues()
  }, [])

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

  return (
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
            className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-black font-semibold font-body rounded-lg px-5 py-2.5 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(251,191,36,0.3)] active:translate-y-0 transition-all"
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
            {leagues.map((league) => (
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
  )
}
