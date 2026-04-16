import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Users, Trash2, Swords } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { LeagueCardSkeleton, GameCardSkeleton } from '../components/Skeletons'
import { SwordsIcon, TrophyIcon } from '../components/LeagueIcons'
import PageTransition from '../components/PageTransition'

// ---------------------------------------------------------------------------
// Shared constants / helpers
// ---------------------------------------------------------------------------

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

function ordinal(n) {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

// ---------------------------------------------------------------------------
// Create Campaign Modal (adapted from LeaguesPage CreateLeagueModal)
// ---------------------------------------------------------------------------

function CreateCampaignModal({ onClose, onCreate, creating }) {
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-brand font-bold text-[var(--color-text)]">Create New Campaign</h2>
          <button onClick={onClose} disabled={creating} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-2xl leading-none transition-colors disabled:opacity-50" aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-muted)] mb-1.5">Campaign Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Commander Gauntlet" required disabled={creating} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-muted)] mb-1.5">Description / Rules (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste your league rules or description here..." rows={5} disabled={creating} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] font-mono text-sm disabled:opacity-50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-muted)] mb-1.5">Season Start</label>
              <input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} required disabled={creating} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-muted)] mb-1.5">Season End</label>
              <input type="date" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} required disabled={creating} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50" />
            </div>
          </div>

          {/* Bonus Awards */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-muted)] mb-2">Bonus Awards</label>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="grid items-center gap-3 px-4 py-2 bg-[var(--color-bg)]/60 border-b border-[var(--color-border)]" style={{gridTemplateColumns: '2rem 1fr 2fr 4rem'}}>
                <div /><div className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Title</div><div className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Description</div><div className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide text-right">Pts</div>
              </div>
              {bonusAwards.map((award, idx) => (
                <div key={award.id} className={`grid items-start gap-3 px-4 py-3 border-b border-[var(--color-border)] transition-opacity ${!award.enabled ? 'opacity-40' : ''}`} style={{gridTemplateColumns: '2rem 1fr 2fr 4rem'}}>
                  <input type="checkbox" checked={award.enabled} onChange={(e) => setBonusAwards(prev => prev.map((a, i) => i === idx ? { ...a, enabled: e.target.checked } : a))} disabled={creating} className="mt-0.5 w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer disabled:opacity-50" />
                  <div className="text-sm font-medium text-[var(--color-text)] leading-snug">{award.title}</div>
                  <div className="text-xs text-[var(--color-muted)] leading-relaxed">{award.description}</div>
                  <div className="flex items-center justify-end gap-1.5">
                    <input type="number" min="0" max="10" value={award.points} onChange={(e) => setBonusAwards(prev => prev.map((a, i) => i === idx ? { ...a, points: Math.max(0, Number(e.target.value)) } : a))} disabled={!award.enabled || creating} className="w-12 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm text-center text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-40" />
                    {award.isCustom && (
                      <button type="button" onClick={() => setBonusAwards(prev => prev.filter((_, i) => i !== idx))} disabled={creating} aria-label="Remove award" className="text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-50">✕</button>
                    )}
                  </div>
                </div>
              ))}
              {!showAddBonus ? (
                <button type="button" onClick={() => setShowAddBonus(true)} disabled={creating} className="w-full px-4 py-2.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 text-left font-medium transition-colors disabled:opacity-50">+ Add Custom Bonus</button>
              ) : (
                <div className="px-4 py-3 bg-[var(--color-bg)]/40 space-y-3">
                  <div className="grid gap-3" style={{gridTemplateColumns: '1fr 2fr 4rem'}}>
                    <input type="text" value={newBonus.title} onChange={(e) => setNewBonus(prev => ({ ...prev, title: e.target.value }))} placeholder="Title" className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                    <input type="text" value={newBonus.description} onChange={(e) => setNewBonus(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                    <input type="number" min="0" max="10" value={newBonus.points} onChange={(e) => setNewBonus(prev => ({ ...prev, points: Math.max(0, Number(e.target.value)) }))} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-2 text-sm text-center text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { if (!newBonus.title.trim()) return; setBonusAwards(prev => [...prev, { id: `custom_${Date.now()}`, title: newBonus.title.trim(), description: newBonus.description.trim(), points: newBonus.points, enabled: true, isCustom: true }]); setNewBonus({ title: '', description: '', points: 1 }); setShowAddBonus(false) }} className="px-3 py-1.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm rounded-lg font-medium transition-colors">Add</button>
                    <button type="button" onClick={() => { setShowAddBonus(false); setNewBonus({ title: '', description: '', points: 1 }) }} className="px-3 py-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} disabled={creating} className="px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={creating} className="btn btn-primary min-w-[140px]">{creating ? 'Creating…' : 'Create Campaign'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skirmish card
// ---------------------------------------------------------------------------

function SkirmishCard({ game, deckMap, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const deck = game.user_decks || (game.deck_id ? deckMap[game.deck_id] : null)
  const date = new Date(game.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = new Date(game.played_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const isWin = game.placement === 1

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deletePersonalGame(game.id)
      onDelete(game.id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-sm font-medium text-[var(--color-text)]">{date}</span>
            <span className="text-[var(--color-muted)]/50">·</span>
            <span className="text-sm text-[var(--color-muted)]">{time}</span>
            <span className="text-[var(--color-muted)]/50">·</span>
            <span className="text-sm text-[var(--color-muted)]">{game.pod_size}-player pod</span>
            {game.league_name && (
              <>
                <span className="text-[var(--color-muted)]/50">·</span>
                <span className="px-2 py-0.5 rounded text-xs bg-[var(--color-secondary-subtle)] text-[var(--color-secondary)] border border-[var(--color-secondary-border)]">
                  {game.league_name}
                </span>
              </>
            )}
          </div>
          {deck ? (
            <div className="flex items-center gap-2 mt-1.5">
              {deck.commander_image_uri && (
                <img src={deck.commander_image_uri} alt="" className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)]" />
              )}
              <span className="text-sm text-[var(--color-muted)]">{deck.deck_name}</span>
            </div>
          ) : (
            <span className="text-xs text-[var(--color-muted)]/50 italic">No deck recorded</span>
          )}
          {game.notes && (
            <p className="mt-2 text-xs text-[var(--color-muted)] leading-relaxed line-clamp-2">
              {game.notes.slice(0, 120)}{game.notes.length > 120 ? '…' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-2.5 py-1 rounded text-xs font-bold ${isWin ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-muted)]'}`}>
            {ordinal(game.placement)}
          </span>
          {!game.is_league_game && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <button onClick={handleDelete} disabled={deleting} className="text-xs text-[var(--color-danger)] font-medium hover:underline disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors p-1 rounded" aria-label="Delete skirmish">
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BattlefieldPage
// ---------------------------------------------------------------------------

export default function BattlefieldPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('campaigns')

  // ── Campaigns state ──────────────────────────────────────────────────────
  const [leagues, setLeagues] = useState([])
  const [leaguesLoaded, setLeaguesLoaded] = useState(false)
  const [leaguesLoading, setLeaguesLoading] = useState(false)
  const [leaguesError, setLeaguesError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCompleted, setShowCompleted] = useState(true)

  // ── Skirmishes state ─────────────────────────────────────────────────────
  const [games, setGames] = useState([])
  const [gamesLoaded, setGamesLoaded] = useState(false)
  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamesError, setGamesError] = useState(null)
  const [gamesPage, setGamesPage] = useState(1)
  const [hasMoreGames, setHasMoreGames] = useState(false)
  const [loadingMoreGames, setLoadingMoreGames] = useState(false)
  const [deckMap, setDeckMap] = useState({})

  // Lazy-load each tab on first visit
  useEffect(() => {
    if (!session?.access_token) return
    if (activeTab === 'campaigns' && !leaguesLoaded) loadLeagues()
    if (activeTab === 'skirmishes' && !gamesLoaded) loadSkirmishes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, session?.user?.id])

  // ── Campaigns actions ────────────────────────────────────────────────────

  async function loadLeagues() {
    setLeaguesLoading(true)
    setLeaguesError(null)
    try {
      const data = await api.getLeagues()
      setLeagues(data.leagues || [])
      setLeaguesLoaded(true)
    } catch (err) {
      setLeaguesError(err.message)
    } finally {
      setLeaguesLoading(false)
    }
  }

  async function handleCreateLeague(leagueData) {
    setCreating(true)
    setLeaguesError(null)
    setSuccessMessage(null)
    try {
      await api.createLeague(leagueData)
      setShowCreateModal(false)
      setSuccessMessage('Campaign created successfully!')
      await loadLeagues()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setLeaguesError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleArchiveCompleted() {
    setArchiving(true)
    setLeaguesError(null)
    try {
      const result = await api.archiveCompletedLeagues()
      if (result.archived > 0) await loadLeagues()
    } catch (err) {
      setLeaguesError(err.message)
    } finally {
      setArchiving(false)
    }
  }

  async function handleRefreshDecks() {
    setRefreshing(true)
    setLeaguesError(null)
    try {
      await api.getDeckLibrary()
      await loadLeagues()
    } catch (err) {
      setLeaguesError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const activeLeagues = leagues.filter(l => l.status === 'active' || l.status === 'draft')
  const completedLeagues = leagues.filter(l => l.status === 'completed')
  const displayLeagues = showCompleted ? leagues : activeLeagues

  // ── Skirmishes actions ───────────────────────────────────────────────────

  async function loadSkirmishes() {
    setGamesLoading(true)
    setGamesError(null)
    try {
      const [gamesData, leagueGamesData, decksData] = await Promise.all([
        api.getPersonalGames(1),
        api.getLeagueGames(),
        api.getDeckLibrary(),
      ])
      const personal = gamesData.games || []
      const league = leagueGamesData.games || []
      const merged = [...personal, ...league].sort(
        (a, b) => new Date(b.played_at) - new Date(a.played_at)
      )
      setGames(merged)
      setHasMoreGames(gamesData.has_more || false)
      setGamesPage(1)
      setGamesLoaded(true)
      const map = {}
      for (const d of decksData.decks || []) map[d.id] = d
      setDeckMap(map)
    } catch (err) {
      setGamesError(err.message)
    } finally {
      setGamesLoading(false)
    }
  }

  async function loadMoreSkirmishes() {
    setLoadingMoreGames(true)
    try {
      const nextPage = gamesPage + 1
      const data = await api.getPersonalGames(nextPage)
      // Append only personal games on load-more; league games are already fully loaded
      setGames((prev) => {
        const newPersonal = data.games || []
        return [...prev, ...newPersonal].sort(
          (a, b) => new Date(b.played_at) - new Date(a.played_at)
        )
      })
      setHasMoreGames(data.has_more || false)
      setGamesPage(nextPage)
    } catch (err) {
      setGamesError(err.message)
    } finally {
      setLoadingMoreGames(false)
    }
  }

  function handleDeleteSkirmish(gameId) {
    setGames((prev) => prev.filter((g) => g.id !== gameId))
  }

  const skirmishStats = useMemo(() => {
    if (!games.length) return null
    const total = games.length
    const wins = games.filter((g) => g.placement === 1).length
    const winRate = Math.round((wins / total) * 100)
    const avgPlacement = (games.reduce((sum, g) => sum + g.placement, 0) / total).toFixed(1)
    const deckWins = {}
    for (const g of games) {
      if (g.placement === 1 && g.deck_id) deckWins[g.deck_id] = (deckWins[g.deck_id] || 0) + 1
    }
    const topDeckId = Object.entries(deckWins).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topDeck = topDeckId
      ? (games.find((g) => g.deck_id === topDeckId)?.user_decks?.deck_name || deckMap[topDeckId]?.deck_name)
      : null
    return { total, wins, winRate, avgPlacement, topDeck }
  }, [games, deckMap])

  // ── Shared tab styles ────────────────────────────────────────────────────

  const tabClass = (tab) =>
    `px-5 py-2.5 text-sm font-medium transition-all border-b-2 ${
      activeTab === tab
        ? 'border-[var(--color-primary)] text-[var(--color-text)]'
        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
    }`

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateLeague}
          creating={creating}
        />
      )}

      <div className="max-w-[1400px] mx-auto px-8 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-[var(--color-text)] mb-2">
              The Battlefield
            </h1>
            <p className="text-[var(--color-muted)] text-sm">
              Campaigns, skirmishes, standings, and legendary moments
            </p>
          </div>
          {activeTab === 'campaigns' && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + Create Campaign
            </button>
          )}
          {activeTab === 'skirmishes' && (
            <Link to="/games/log" className="btn btn-primary">
              + Log Skirmish
            </Link>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--color-border)] mb-8 -mx-1">
          <button className={tabClass('campaigns')} onClick={() => setActiveTab('campaigns')}>
            Campaigns
          </button>
          <button className={tabClass('skirmishes')} onClick={() => setActiveTab('skirmishes')}>
            Skirmishes
          </button>
        </div>

        {/* ── CAMPAIGNS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'campaigns' && (
          <>
            {successMessage && (
              <div className="bg-[var(--color-success-subtle)] border border-[var(--color-success-border)] text-[var(--color-success)] px-4 py-3 rounded-lg mb-6">
                {successMessage}
              </div>
            )}
            {leaguesError && (
              <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg mb-6">
                {leaguesError}
              </div>
            )}

            {/* Bulk actions */}
            {!leaguesLoading && leagues.length > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <button onClick={handleRefreshDecks} disabled={refreshing} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50">
                  {refreshing ? 'Refreshing...' : 'Refresh Decks'}
                </button>
                <button onClick={handleArchiveCompleted} disabled={archiving} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50">
                  {archiving ? 'Archiving...' : 'Archive Completed'}
                </button>
                {completedLeagues.length > 0 && (
                  <button onClick={() => setShowCompleted(!showCompleted)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
                    {showCompleted ? 'Hide Completed' : `Show Completed (${completedLeagues.length})`}
                  </button>
                )}
              </div>
            )}

            {/* Loading */}
            {leaguesLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <LeagueCardSkeleton key={i} />)}
              </div>
            )}

            {/* Empty */}
            {!leaguesLoading && leagues.length === 0 && (
              <div className="text-center py-20">
                <TrophyIcon className="w-16 h-16 text-[var(--color-muted)] mx-auto mb-4" />
                <h3 className="text-2xl font-brand font-bold text-[var(--color-text)] mb-3">No campaigns yet.</h3>
                <p className="text-[var(--color-muted)] mb-6">Create a campaign to start tracking your pod sessions and standings.</p>
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary px-6 py-2.5 rounded-lg font-medium">
                  Create Your First Campaign
                </button>
              </div>
            )}

            {/* Campaign grid */}
            {!leaguesLoading && leagues.length > 0 && (
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
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                        league.status === 'active' ? 'bg-green-500/20 text-green-300'
                        : league.status === 'completed' ? 'bg-gray-500/20 text-gray-300'
                        : 'bg-[var(--color-secondary-subtle)] text-[var(--color-secondary)]'
                      }`}>
                        {league.status.charAt(0).toUpperCase() + league.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--color-muted)] space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        {new Date(league.season_start).toLocaleDateString()} —{' '}
                        {new Date(league.season_end).toLocaleDateString()}
                      </div>
                      {league.league_members && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                          {league.league_members.length} members
                        </div>
                      )}
                      {(() => {
                        const colors = new Set()
                        ;(league.league_members || []).forEach(m => (m.deck_color_identity || []).forEach(c => colors.add(c)))
                        const colorArray = Array.from(colors).sort((a, b) => 'WUBRG'.indexOf(a) - 'WUBRG'.indexOf(b))
                        return colorArray.length > 0 ? (
                          <div className="flex gap-1 mt-1">
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
          </>
        )}

        {/* ── SKIRMISHES TAB ────────────────────────────────────────────── */}
        {activeTab === 'skirmishes' && (
          <>
            {gamesError && (
              <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg mb-6">
                {gamesError}
              </div>
            )}

            {/* Stats tiles */}
            {skirmishStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[var(--color-text)] mb-0.5">{skirmishStats.total}</div>
                  <div className="text-xs text-[var(--color-muted)]">Skirmishes</div>
                </div>
                <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-0.5">{skirmishStats.winRate}%</div>
                  <div className="text-xs text-[var(--color-muted)]">Win Rate</div>
                </div>
                <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-[var(--color-text)] mb-0.5">{skirmishStats.avgPlacement}</div>
                  <div className="text-xs text-[var(--color-muted)]">Avg Placement</div>
                </div>
                <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 text-center">
                  <div className="text-sm font-bold text-[var(--color-primary)] mb-0.5 truncate px-2" title={skirmishStats.topDeck || '—'}>
                    {skirmishStats.topDeck || '—'}
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">Top Deck</div>
                </div>
              </div>
            )}

            {/* Loading */}
            {gamesLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <GameCardSkeleton key={i} />)}
              </div>
            )}

            {/* Empty */}
            {!gamesLoading && games.length === 0 && (
              <div className="text-center py-20">
                <Swords className="w-16 h-16 text-[var(--color-muted)] mx-auto mb-4" />
                <h3 className="text-2xl font-brand font-bold text-[var(--color-text)] mb-3">No skirmishes logged yet.</h3>
                <p className="text-[var(--color-muted)] mb-6">Start tracking your Commander sessions.</p>
                <Link to="/games/log" className="btn btn-primary px-6 py-2.5 rounded-lg font-medium">
                  Log Your First Skirmish
                </Link>
              </div>
            )}

            {/* Skirmish list */}
            {!gamesLoading && games.length > 0 && (
              <div className="space-y-4">
                {games.map((game) => (
                  <SkirmishCard
                    key={game.id}
                    game={game}
                    deckMap={deckMap}
                    onDelete={handleDeleteSkirmish}
                  />
                ))}
                {hasMoreGames && (
                  <div className="text-center pt-4">
                    <button onClick={loadMoreSkirmishes} disabled={loadingMoreGames} className="px-6 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50">
                      {loadingMoreGames ? 'Loading…' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  )
}
