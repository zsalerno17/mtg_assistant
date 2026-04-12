import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../lib/api'

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
    <Layout>
      <div className="max-w-[1400px] mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-brand font-bold text-primary mb-2">
              🏆 My Leagues
            </h1>
            <p className="text-secondary text-sm">
              Track your Commander pod sessions, standings, and legendary moments
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary px-5 py-2.5 rounded-lg font-medium"
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
          <div className="bg-surface border border-accent/30 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-brand font-bold text-primary mb-4">
              Create New League
            </h2>
            <form onSubmit={handleCreateLeague} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  League Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Commander Gauntlet"
                  required
                  className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  Description / Rules (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Paste your league rules or description here..."
                  rows={6}
                  className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Season Start
                  </label>
                  <input
                    type="date"
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Season End
                  </label>
                  <input
                    type="date"
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
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
          <div className="flex items-center justify-center py-20">
            <div className="text-secondary">Loading leagues...</div>
          </div>
        )}

        {!loading && leagues.length === 0 && !showCreateForm && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚔️</div>
            <h3 className="text-xl font-brand font-bold text-primary mb-2">
              No leagues yet
            </h3>
            <p className="text-secondary mb-6">
              Create your first league to start tracking pod sessions and standings
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
                className="bg-surface border border-accent/30 rounded-xl p-6 hover:border-accent transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-brand font-bold text-primary group-hover:text-accent transition-colors">
                    {league.name}
                  </h3>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      league.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : league.status === 'completed'
                        ? 'bg-gray-500/20 text-gray-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {league.status}
                  </span>
                </div>

                <div className="text-sm text-secondary space-y-1.5">
                  <div>
                    📅 {new Date(league.season_start).toLocaleDateString()} —{' '}
                    {new Date(league.season_end).toLocaleDateString()}
                  </div>
                  {league.league_members && (
                    <div>👥 {league.league_members.length} members</div>
                  )}
                </div>

                {league.description && (
                  <p className="mt-3 text-xs text-secondary line-clamp-2">
                    {league.description.slice(0, 120)}...
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
