import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Users } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { LeagueCardSkeleton } from '../components/Skeletons'
import { SwordsIcon, TrophyIcon } from '../components/LeagueIcons'
import PageTransition from '../components/PageTransition'

const PREMADE_AWARDS = [
  { id: 'entrance_bonus', title: 'WWE Entrance of the Week', description: 'Best themed or dramatic entrance to the weekly pod', points: 1 },
  { id: 'first_blood',   title: 'First Blood',               description: 'First to deal combat damage to another player', points: 1 },
  { id: 'spicy_play',    title: 'Wildest Play / Spicy Play',  description: 'Most creative, devastating, or unhinged play of the game', points: 1 },
  { id: 'card_of_match', title: 'Card of the Match',          description: 'Pod votes — most impactful or memorable card played', points: 1 },
  { id: 'villain',       title: 'The Villain',                description: 'Most cutthroat/backstabbing moment — betrayal, infinite combo out of nowhere', points: 1 },
  { id: 'jobber',        title: 'The Jobber',                 description: 'Eliminated early but nominated by pod for going out in style; consolation prize', points: 1 },
  { id: 'kingslayer',    title: 'Kingslayer',                 description: 'Eliminated the current #1 player in the standings during that game', points: 1 },
]

const DEFAULT_BONUS_AWARDS = PREMADE_AWARDS.map((a, i) => ({ ...a, enabled: i < 3, isCustom: false }))

function CreateLeagueModal({ onClose, onCreate, creating }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [seasonStart, setSeasonStart] = useState('')
  const [seasonEnd, setSeasonEnd] = useState('')
  const [bonusAwards, setBonusAwards] = useState(DEFAULT_BONUS_AWARDS)
  const [showAddBonus, setShowAddBonus] = useState(false)
  const [newBonus, setNewBonus] = useState({ title: '', description: '', points: 1 })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const findEnabled = (id) => bonusAwards.find(a => a.id === id)?.enabled ?? false
    await onCreate({
      name,
      description,
      season_start: seasonStart,
      season_end: seasonEnd,
      status: 'active',
      scoring_config: {
        entrance_bonus: findEnabled('entrance_bonus'),
        first_blood:    findEnabled('first_blood'),
        spicy_play:     findEnabled('spicy_play'),
        bonus_awards:   bonusAwards,
      },
    })
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !creating) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-brand font-bold text-[var(--color-text)]">
            Create New Campaign
          </h2>
          <button
            onClick={onClose}
            disabled={creating}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-2xl leading-none transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Commander Gauntlet"
              required
              disabled={creating}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
              Description / Rules (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste your campaign rules or description here..."
              rows={6}
              disabled={creating}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] font-mono text-sm disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                Season Start
              </label>
              <input
                type="date"
                value={seasonStart}
                onChange={(e) => setSeasonStart(e.target.value)}
                required
                disabled={creating}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                Season End
              </label>
              <input
                type="date"
                value={seasonEnd}
                onChange={(e) => setSeasonEnd(e.target.value)}
                required
                disabled={creating}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Bonus Awards
            </label>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid items-center gap-3 px-4 py-2 bg-[var(--color-bg)]/60 border-b border-[var(--color-border)]" style={{gridTemplateColumns: '2rem 1fr 2fr 4rem'}}>
                <div />
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Title</div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Description</div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">Pts</div>
              </div>

              {/* Award rows */}
              {bonusAwards.map((award, idx) => (
                <div
                  key={award.id}
                  className={`grid items-start gap-3 px-4 py-3 border-b border-[var(--color-border)] transition-opacity ${!award.enabled ? 'opacity-40' : ''}`}
                  style={{gridTemplateColumns: '2rem 1fr 2fr 4rem'}}
                >
                  <input
                    type="checkbox"
                    checked={award.enabled}
                    onChange={(e) => setBonusAwards(prev => prev.map((a, i) => i === idx ? { ...a, enabled: e.target.checked } : a))}
                    disabled={creating}
                    className="mt-0.5 w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer disabled:opacity-50"
                  />
                  <div className="text-sm font-medium text-[var(--color-text)] leading-snug">{award.title}</div>
                  <div className="text-xs text-[var(--color-text-muted)] leading-relaxed">{award.description}</div>
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={award.points}
                      onChange={(e) => setBonusAwards(prev => prev.map((a, i) => i === idx ? { ...a, points: Math.max(0, Number(e.target.value)) } : a))}
                      disabled={!award.enabled || creating}
                      className="w-12 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm text-center text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-40"
                    />
                    {award.isCustom && (
                      <button
                        type="button"
                        onClick={() => setBonusAwards(prev => prev.filter((_, i) => i !== idx))}
                        disabled={creating}
                        aria-label="Remove award"
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-50"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Custom Bonus */}
              {!showAddBonus ? (
                <button
                  type="button"
                  onClick={() => setShowAddBonus(true)}
                  disabled={creating}
                  className="w-full px-4 py-2.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 text-left font-medium transition-colors disabled:opacity-50"
                >
                  + Add Custom Bonus
                </button>
              ) : (
                <div className="px-4 py-3 bg-[var(--color-bg)]/40 space-y-3">
                  <div className="grid gap-3" style={{gridTemplateColumns: '1fr 2fr 4rem'}}>
                    <input
                      type="text"
                      value={newBonus.title}
                      onChange={(e) => setNewBonus(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Title"
                      className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <input
                      type="text"
                      value={newBonus.description}
                      onChange={(e) => setNewBonus(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description"
                      className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={newBonus.points}
                      onChange={(e) => setNewBonus(prev => ({ ...prev, points: Math.max(0, Number(e.target.value)) }))}
                      className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-2 text-sm text-center text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!newBonus.title.trim()) return
                        setBonusAwards(prev => [...prev, {
                          id: `custom_${Date.now()}`,
                          title: newBonus.title.trim(),
                          description: newBonus.description.trim(),
                          points: newBonus.points,
                          enabled: true,
                          isCustom: true,
                        }])
                        setNewBonus({ title: '', description: '', points: 1 })
                        setShowAddBonus(false)
                      }}
                      className="px-3 py-1.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm rounded-lg font-medium transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddBonus(false); setNewBonus({ title: '', description: '', points: 1 }) }}
                      className="px-3 py-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary min-w-[120px]"
            >
              {creating ? 'Creating…' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCompleted, setShowCompleted] = useState(true)

  const { session } = useAuth()

  useEffect(() => {
    if (!session?.access_token) return
    loadLeagues()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

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

  async function handleCreateLeague(leagueData) {
    setCreating(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await api.createLeague(leagueData)
      setShowCreateModal(false)
      setSuccessMessage('Campaign created successfully!')
      // Reload leagues
      await loadLeagues()
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
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
      {showCreateModal && (
        <CreateLeagueModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateLeague}
          creating={creating}
        />
      )}
      <div className="max-w-[1400px] mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-[var(--color-text)] mb-2">
              My Campaigns
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              Track your Commander campaign sessions, standings, and legendary moments
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            + Create Campaign
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-[var(--color-success-subtle)] border border-[var(--color-success-border)] text-[var(--color-success)] px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Bulk Actions */}
        {!loading && leagues.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleRefreshDecks}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Decks'}
            </button>
            <button
              onClick={handleArchiveCompleted}
              disabled={archiving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
            >
              {archiving ? 'Archiving...' : 'Archive Completed'}
            </button>
            {completedLeagues.length > 0 && (
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                {showCompleted ? 'Hide Completed' : `Show Completed (${completedLeagues.length})`}
              </button>
            )}
          </div>
        )}

        {/* Loading/Empty States */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <LeagueCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && leagues.length === 0 && (
          <div className="text-center py-20">
            <SwordsIcon className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-2xl font-brand font-bold text-[var(--color-text)] mb-3">
              Form your first pod.
            </h3>
            <p className="text-[var(--color-text-muted)] mb-2 text-lg">
              Build a rivalry. Claim the championship.
            </p>
            <p className="text-[var(--color-text-muted)]/60 text-sm mb-6">
              Create a campaign to start tracking standings and legendary moments.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary px-6 py-2.5 rounded-lg font-medium"
            >
              Create Your First Campaign
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
                className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--color-secondary)]/5 transition-all group"
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
                        ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                        : 'bg-[var(--color-secondary-subtle)] text-[var(--color-secondary)]'
                    }`}
                  >
                    {league.status.charAt(0).toUpperCase() + league.status.slice(1)}
                  </span>
                </div>

                <div className="text-sm text-[var(--color-text-muted)] space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    {new Date(league.season_start).toLocaleDateString()} —{' '}
                    {new Date(league.season_end).toLocaleDateString()}
                  </div>
                  {league.league_members && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      {league.league_members.length} pilots
                    </div>
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
                  <p className="mt-3 text-xs text-[var(--color-text-muted)] line-clamp-2">
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
