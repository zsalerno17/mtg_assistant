import { useState, useEffect, useMemo, Fragment } from 'react'
import { motion } from 'framer-motion' // eslint-disable-line no-unused-vars
import { useParams, Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Image as ImageIcon, Flame, Layers, Target, TrendingUp } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { StandingsRowSkeleton, MemberCardSkeleton, GameCardSkeleton } from '../components/Skeletons'
import { TrophyIcon, CrownIcon, SwordsIcon } from '../components/LeagueIcons'
import PageTransition from '../components/PageTransition'
import { AvatarDisplay } from '../components/AvatarDisplay'
import SelectField from '../components/shared/SelectField'

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

function initBonusAwards(scoringConfig) {
  if (scoringConfig?.bonus_awards?.length) {
    return scoringConfig.bonus_awards.map(a => ({ ...a, isCustom: a.isCustom ?? false }))
  }
  return DEFAULT_BONUS_AWARDS
}

function EditCampaignModal({ league, onClose, onSave, saving }) {
  const [name, setName] = useState(league.name || '')
  const [description, setDescription] = useState(league.description || '')
  const [seasonStart, setSeasonStart] = useState(
    league.season_start ? league.season_start.slice(0, 10) : ''
  )
  const [seasonEnd, setSeasonEnd] = useState(
    league.season_end ? league.season_end.slice(0, 10) : ''
  )
  const [status, setStatus] = useState(league.status || 'active')
  const [bonusAwards, setBonusAwards] = useState(() => initBonusAwards(league.scoring_config))
  const [placementPoints, setPlacementPoints] = useState(
    () => league.scoring_config?.points ?? { 1: 3, 2: 2, 3: 1, 4: 0 }
  )
  const [showAddBonus, setShowAddBonus] = useState(false)
  const [newBonus, setNewBonus] = useState({ title: '', description: '', points: 1 })

  const handleSubmit = (e) => {
    e.preventDefault()
    const findEnabled = (id) => bonusAwards.find(a => a.id === id)?.enabled ?? false
    onSave({
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      season_start: seasonStart || null,
      season_end: seasonEnd || null,
      status,
      scoring_config: {
        entrance_bonus: findEnabled('entrance_bonus'),
        first_blood:    findEnabled('first_blood'),
        spicy_play:     findEnabled('spicy_play'),
        bonus_awards:   bonusAwards,
        points:         placementPoints,
      },
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-brand font-bold text-[var(--color-text)]">Edit Campaign</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-2xl leading-none transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={saving}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Description / Rules (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste your campaign rules or description here..."
              rows={6}
              disabled={saving}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] font-mono text-sm disabled:opacity-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Season Start</label>
              <input
                type="date"
                value={seasonStart}
                onChange={(e) => setSeasonStart(e.target.value)}
                disabled={saving}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Season End</label>
              <input
                type="date"
                value={seasonEnd}
                onChange={(e) => setSeasonEnd(e.target.value)}
                disabled={saving}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Status</label>
            <SelectField
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={saving}
              className="w-full"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </SelectField>
          </div>

          {/* Placement Points */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Placement Points</label>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="grid items-center gap-3 px-4 py-2 bg-[var(--color-bg)]/60 border-b border-[var(--color-border)]" style={{gridTemplateColumns: '1fr 4rem'}}>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Placement</div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">Pts</div>
              </div>
              {[
                { place: 1, label: '1st (Winner)' },
                { place: 2, label: '2nd' },
                { place: 3, label: '3rd' },
                { place: 4, label: '4th+ (last place & beyond)' },
              ].map(({ place, label }) => (
                <div key={place} className="grid items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0" style={{gridTemplateColumns: '1fr 4rem'}}>
                  <div className="text-sm text-[var(--color-text)]">{label}</div>
                  <div className="flex justify-end">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={placementPoints[place] ?? 0}
                      onChange={(e) => setPlacementPoints(prev => ({ ...prev, [place]: Math.max(0, Number(e.target.value)) }))}
                      disabled={saving}
                      className="w-12 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm text-center text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-40"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus Awards */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Bonus Awards</label>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="grid items-center gap-3 px-4 py-2 bg-[var(--color-bg)]/60 border-b border-[var(--color-border)]" style={{gridTemplateColumns: '2rem 1fr 2fr 4rem'}}>
                <div />
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Title</div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Description</div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">Pts</div>
              </div>
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
                    disabled={saving}
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
                      disabled={!award.enabled || saving}
                      className="w-12 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm text-center text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-40"
                    />
                    {award.isCustom && (
                      <button
                        type="button"
                        onClick={() => setBonusAwards(prev => prev.filter((_, i) => i !== idx))}
                        disabled={saving}
                        aria-label="Remove award"
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer disabled:opacity-50"
                      >✕</button>
                    )}
                  </div>
                </div>
              ))}
              {!showAddBonus ? (
                <button
                  type="button"
                  onClick={() => setShowAddBonus(true)}
                  disabled={saving}
                  className="w-full px-4 py-2.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 text-left font-medium transition-colors cursor-pointer disabled:opacity-50"
                >+ Add Custom Bonus</button>
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
                      className="px-3 py-1.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm rounded-lg font-medium transition-colors cursor-pointer"
                    >Add</button>
                    <button
                      type="button"
                      onClick={() => { setShowAddBonus(false); setNewBonus({ title: '', description: '', points: 1 }) }}
                      className="px-3 py-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm transition-colors cursor-pointer"
                    >Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer disabled:opacity-50"
            >Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary min-w-[120px]"
            >{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LeaguePage() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [league, setLeague] = useState(null)
  const [standings, setStandings] = useState([])
  const [games, setGames] = useState([])
  const [gamesPage, setGamesPage] = useState(1)
  const [hasMoreGames, setHasMoreGames] = useState(false)
  const [loadingMoreGames, setLoadingMoreGames] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('standings') // standings | games | members
  const [inviteToken, setInviteToken] = useState(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [activeMusicPreview, setActiveMusicPreview] = useState(null)
  const [gameVotes, setGameVotes] = useState({}) // { [gameId]: { votes: [], myVotes: {} } }
  const [votingGameId, setVotingGameId] = useState(null)
  const [exportingImage, setExportingImage] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!session?.access_token) return
    loadLeagueData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, session?.user?.id])

  async function loadLeagueData() {
    setLoading(true)
    setError(null)
    try {
      const [leagueData, standingsData, gamesData] = await Promise.all([
        api.getLeague(leagueId),
        api.getLeagueStandings(leagueId),
        api.getLeagueGames(leagueId),
      ])
      setLeague(leagueData.league)
      setStandings(standingsData.standings || [])
      setGames(gamesData.games || [])
      setHasMoreGames(gamesData.has_more || false)
      setGamesPage(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isCreator = league?.created_by === session?.user?.id

  // Compute per-member season stats from game results (no additional API calls)
  const seasonStats = useMemo(() => {
    if (!games.length) return {}
    const memberMap = {}
    const sortedGames = [...games].sort((a, b) => new Date(a.played_at) - new Date(b.played_at))
    sortedGames.forEach(game => {
      ;(game.league_game_results || []).forEach(r => {
        const list = memberMap[r.member_id] || (memberMap[r.member_id] = [])
        list.push({ placement: r.placement, deck_id: r.deck_id, deck_name: r.user_decks?.deck_name })
      })
    })
    const stats = {}
    for (const [memberId, results] of Object.entries(memberMap)) {
      const placements = results.map(r => r.placement).filter(Boolean)
      const avgPlacement = placements.length ? placements.reduce((a, b) => a + b, 0) / placements.length : null
      let maxStreak = 0, cur = 0, currentStreak = 0
      for (const r of results) {
        if (r.placement === 1) { cur++; maxStreak = Math.max(maxStreak, cur) }
        else cur = 0
      }
      for (const r of [...results].reverse()) {
        if (r.placement === 1) currentStreak++
        else break
      }
      const deckMap = {}
      results.forEach(r => {
        if (!r.deck_id) return
        const d = deckMap[r.deck_id] || (deckMap[r.deck_id] = { name: r.deck_name || 'Unknown Deck', wins: 0, games: 0 })
        d.games++
        if (r.placement === 1) d.wins++
      })
      const bestDeck = Object.values(deckMap).filter(d => d.games >= 2).sort((a, b) => (b.wins / b.games) - (a.wins / a.games))[0] || null
      const uniqueCommanders = new Set(results.filter(r => r.deck_id).map(r => r.deck_id)).size
      stats[memberId] = { avgPlacement, maxStreak, currentStreak, bestDeck, uniqueCommanders }
    }
    return stats
  }, [games])

  const seasonHighlights = useMemo(() => {
    if (!games.length || !standings.length) return null
    const enriched = standings.map(m => ({ name: m.superstar_name, member_id: m.member_id, ...(seasonStats[m.member_id] || {}) }))
    const streakLeader = [...enriched].filter(m => (m.maxStreak || 0) > 0).sort((a, b) => b.maxStreak - a.maxStreak)[0]
    const commanderLeader = [...enriched].filter(m => (m.uniqueCommanders || 0) > 0).sort((a, b) => b.uniqueCommanders - a.uniqueCommanders)[0]
    const avgLeader = [...enriched].filter(m => m.avgPlacement != null).sort((a, b) => a.avgPlacement - b.avgPlacement)[0]
    const deckLeader = [...enriched].filter(m => m.bestDeck).sort((a, b) => (b.bestDeck.wins / b.bestDeck.games) - (a.bestDeck.wins / a.bestDeck.games))[0]
    if (!streakLeader && !commanderLeader && !avgLeader && !deckLeader) return null
    return { streakLeader, commanderLeader, avgLeader, deckLeader }
  }, [games, standings, seasonStats])

  // Bonus award counts per member, derived from game results
  const bonusAwardStandings = useMemo(() => {
    if (!games.length || !standings.length) return null
    const cfg = league?.scoring_config
    const bonusAwardsConfig = Array.isArray(cfg?.bonus_awards) ? cfg.bonus_awards : []

    // Build the enabled awards list from config.
    // Premade awards that may have legacy flat-key format:
    const PREMADE_IDS = ['entrance_bonus', 'first_blood', 'spicy_play']
    function isPremadeEnabled(awardId) {
      if (bonusAwardsConfig.length) {
        const found = bonusAwardsConfig.find(a => a.id === awardId)
        return found ? found.enabled !== false : false
      }
      // Legacy flat-key format
      return cfg ? cfg[awardId] !== false : true
    }

    const premadeTracked = [
      { id: 'entrance_bonus', title: 'WWE Entrance of the Week' },
      { id: 'first_blood',   title: 'First Blood' },
      { id: 'spicy_play',    title: 'Spicy Play' },
    ].filter(a => isPremadeEnabled(a.id))

    const customTracked = bonusAwardsConfig
      .filter(a => a.isCustom && a.enabled !== false)
      .map(a => ({ id: a.id, title: a.title }))

    const enabledAwards = [...premadeTracked, ...customTracked]
    if (!enabledAwards.length) return null

    // Count per award per member_id
    const counts = {}
    enabledAwards.forEach(a => { counts[a.id] = {} })
    for (const game of games) {
      for (const r of (game.league_game_results || [])) {
        if (counts.entrance_bonus && r.earned_entrance_bonus) {
          counts.entrance_bonus[r.member_id] = (counts.entrance_bonus[r.member_id] || 0) + 1
        }
        if (counts.first_blood && r.earned_first_blood) {
          counts.first_blood[r.member_id] = (counts.first_blood[r.member_id] || 0) + 1
        }
      }
      if (counts.spicy_play && game.spicy_play_winner_id) {
        const mid = String(game.spicy_play_winner_id)
        counts.spicy_play[mid] = (counts.spicy_play[mid] || 0) + 1
      }
      // Custom awards stored in custom_bonus_winners: { awardId: memberId }
      for (const [awardId, memberId] of Object.entries(game.custom_bonus_winners || {})) {
        if (counts[awardId] && memberId) {
          const mid = String(memberId)
          counts[awardId][mid] = (counts[awardId][mid] || 0) + 1
        }
      }
    }
    // Total bonus wins per member (sum across all award types)
    const totalByMember = {}
    for (const awardCounts of Object.values(counts)) {
      for (const [mid, n] of Object.entries(awardCounts)) {
        totalByMember[mid] = (totalByMember[mid] || 0) + n
      }
    }

    return { enabledAwards, counts, totalByMember }
  }, [games, standings, league])

  // Vote categories derived from enabled bonus awards — only show votes for configured awards
  const voteCategories = useMemo(() => {
    const AWARD_TO_VOTE = {
      entrance_bonus: { category: 'entrance', label: 'Best Entrance' },
      spicy_play:     { category: 'spicy_play', label: 'Spiciest Play' },
    }
    const awards = league?.scoring_config?.bonus_awards || []
    return awards
      .filter(a => a.enabled && AWARD_TO_VOTE[a.id])
      .map(a => AWARD_TO_VOTE[a.id])
  }, [league])

  function getH2H(memberId1, memberId2) {
    let wins1 = 0, wins2 = 0
    for (const game of games) {
      const results = game.league_game_results || []
      const r1 = results.find(r => r.member_id === memberId1)
      const r2 = results.find(r => r.member_id === memberId2)
      if (r1 && r2) {
        if (r1.placement < r2.placement) wins1++
        else if (r2.placement < r1.placement) wins2++
      }
    }
    if (wins1 === 0 && wins2 === 0) return null
    return { wins1, wins2 }
  }


  function getSeasonTimeRemaining() {
    if (!league?.season_end) return null
    const end = new Date(league.season_end)
    const now = new Date()
    const diff = end - now
    if (diff <= 0) return 'Season complete'
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days <= 7) return `Season ends in ${days} day${days === 1 ? '' : 's'}`
    const weeks = Math.ceil(days / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'} left in season`
  }

  function getEntranceMusicEmbed(url) {
    if (!url) return null
    try {
      const parsed = new URL(url)
      // YouTube
      if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
        let videoId = null
        if (parsed.hostname.includes('youtu.be')) {
          videoId = parsed.pathname.slice(1)
        } else {
          videoId = parsed.searchParams.get('v')
        }
        if (videoId) {
          return { type: 'youtube', videoId }
        }
      }
      // Spotify
      if (parsed.hostname.includes('spotify.com')) {
        const match = parsed.pathname.match(/\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
        if (match) {
          return { type: 'spotify', contentType: match[1], id: match[2] }
        }
      }
    } catch {
      // invalid URL — fall through
    }
    return { type: 'external', url }
  }

  async function loadGameVotes(gameId) {
    try {
      const data = await api.getGameVotes(leagueId, gameId)
      const votes = data.votes || []
      // Find current user's member_id
      const myMember = league?.league_members?.find(m => m.user_id === session?.user?.id)
      const myVotes = {}
      votes.forEach(v => {
        if (v.voter_id === myMember?.id) {
          myVotes[v.category] = v.nominee_id
        }
      })
      setGameVotes(prev => ({ ...prev, [gameId]: { votes, myVotes } }))
    } catch (err) {
      console.error('Failed to load votes:', err)
    }
  }

  async function handleVote(gameId, category, nomineeId) {
    try {
      await api.castVote(leagueId, gameId, { category, nominee_id: nomineeId })
      await loadGameVotes(gameId)
    } catch (err) {
      setError(err.message)
    }
  }

  function getVoteTally(gameId, category) {
    const votes = gameVotes[gameId]?.votes || []
    const tally = {}
    votes.filter(v => v.category === category).forEach(v => {
      tally[v.nominee_id] = (tally[v.nominee_id] || 0) + 1
    })
    return tally
  }

  async function handleExportImage() {
    if (!standings.length) return
    setExportingImage(true)
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const rowHeight = 44
      const headerHeight = 60
      const padding = 32
      const width = 700
      const height = headerHeight + padding * 2 + standings.length * rowHeight + 20

      canvas.width = width * 2
      canvas.height = height * 2
      ctx.scale(2, 2)

      // Background
      ctx.fillStyle = '#0a0f1a'
      ctx.fillRect(0, 0, width, height)

      // Title
      ctx.fillStyle = '#f1f5f9'
      ctx.font = 'bold 22px serif'
      ctx.fillText(league?.name || 'Campaign Standings', padding, padding + 22)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '13px sans-serif'
      const dateLabel = [
        league?.season_start ? new Date(league.season_start).toLocaleDateString() : null,
        league?.season_end ? new Date(league.season_end).toLocaleDateString() : null,
      ].filter(Boolean).join(' — ')
      if (dateLabel) ctx.fillText(`Season ${dateLabel}`, padding, padding + 42)

      // Column headers
      const cols = [
        { label: '#', x: padding, w: 30 },
        { label: 'Player', x: padding + 40, w: 200 },
        { label: 'Pts', x: padding + 280, w: 50 },
        { label: 'W', x: padding + 340, w: 40 },
        { label: '2nd', x: padding + 390, w: 40 },
        { label: '3rd', x: padding + 440, w: 40 },
        { label: 'GP', x: padding + 500, w: 40 },
      ]

      const tableY = headerHeight + padding
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 12px sans-serif'
      cols.forEach(col => ctx.fillText(col.label, col.x, tableY))

      // Rows
      standings.forEach((m, idx) => {
        const y = tableY + (idx + 1) * rowHeight
        // Highlight first place
        if (idx === 0) {
          // Get --color-secondary-subtle value
          const styles = getComputedStyle(document.documentElement)
          ctx.fillStyle = styles.getPropertyValue('--color-secondary-subtle').trim() || 'rgba(216,168,72,0.12)'
          ctx.fillRect(padding - 8, y - rowHeight + 12, width - padding * 2 + 16, rowHeight)
        }

        const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim() || '#d8a848'
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#ecf2fa'
        const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#92a8c8'
        
        ctx.fillStyle = idx === 0 ? secondaryColor : textColor
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText(`${idx + 1}`, cols[0].x, y)
        ctx.font = idx === 0 ? 'bold 14px serif' : '14px sans-serif'
        ctx.fillText(m.superstar_name || '', cols[1].x, y)
        ctx.fillStyle = secondaryColor
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText(`${m.total_points}`, cols[2].x, y)
        ctx.fillStyle = mutedColor
        ctx.font = '13px sans-serif'
        ctx.fillText(`${m.wins}`, cols[3].x, y)
        ctx.fillText(`${m.second_places || 0}`, cols[4].x, y)
        ctx.fillText(`${m.third_places || 0}`, cols[5].x, y)
        ctx.fillText(`${m.games_played}`, cols[6].x, y)
      })

      // Watermark
      ctx.fillStyle = '#94a3b830'
      ctx.font = '10px sans-serif'
      ctx.fillText('MTG Assistant', width - padding - 80, height - 12)

      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${league?.name || 'standings'}-standings.png`
        a.click()
        URL.revokeObjectURL(url)
        setExportingImage(false)
      }, 'image/png')
    } catch (err) {
      console.error('Export failed:', err)
      setExportingImage(false)
    }
  }

  function handlePrintPDF() {
    window.print()
  }

  async function handleEditLeague(updates) {
    setEditing(true)
    setError(null)
    try {
      await api.updateLeague(leagueId, updates)
      setShowEditModal(false)
      await loadLeagueData()
    } catch (err) {
      setError(err.message)
    } finally {
      setEditing(false)
    }
  }

  async function handleLeaveLeague() {
    if (!confirm('Are you sure you want to leave this campaign? Your skirmish history will be preserved.')) return
    setLeaving(true)
    try {
      await api.leaveLeague(leagueId)
      navigate('/leagues')
    } catch (err) {
      setError(err.message)
      setLeaving(false)
    }
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true)
    try {
      const data = await api.generateInviteLink(leagueId)
      setInviteToken(data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingInvite(false)
    }
  }

  function handleExportCSV() {
    if (!standings.length) return
    const headers = ['Rank', 'Pilot Name', 'Total Points', 'Wins', '2nds', '3rds', 'Entrance Bonuses', 'Skirmishes']
    const rows = standings.map((m, i) => [
      i + 1,
      `"${(m.superstar_name || '').replace(/"/g, '""')}"`,
      m.total_points,
      m.wins,
      m.second_places || 0,
      m.third_places || 0,
      m.entrance_bonuses,
      m.games_played,
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${league?.name || 'league'}-standings.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
        <div className="max-w-[1400px] mx-auto px-8 py-10">
          {/* Skeleton hero */}
          <div className="mb-8 animate-pulse">
            <div className="h-4 w-32 bg-[var(--color-border)] rounded mb-3" />
            <div className="h-8 w-64 bg-[var(--color-border)] rounded mb-2" />
            <div className="h-4 w-48 bg-[var(--color-border)] rounded" />
          </div>
          <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-6 mb-8 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[var(--color-border)] rounded-full" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-[var(--color-border)] rounded" />
                <div className="h-6 w-48 bg-[var(--color-border)] rounded" />
              </div>
            </div>
          </div>
          {/* Skeleton tabs */}
          <div className="flex gap-4 border-b border-[var(--color-border)] mb-8">
            {[1, 2, 3].map(i => <div key={i} className="h-8 w-20 bg-[var(--color-border)] rounded mb-2 animate-pulse" />)}
          </div>
          {/* Skeleton standings */}
          <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <tbody>{[1, 2, 3, 4].map(i => <StandingsRowSkeleton key={i} />)}</tbody>
            </table>
          </div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="max-w-[1400px] mx-auto px-8 py-10">
          <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
    )
  }

  if (!league) return null

  return (
    <PageTransition>
      {showEditModal && league && (
        <EditCampaignModal
          league={league}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditLeague}
          saving={editing}
        />
      )}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <div className="mb-8">
          {/* Title + Badge */}
          <div className="flex items-center gap-3 mb-3">
            <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-[var(--color-text)]">
              {league.name}
            </h1>
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

          {/* Dates + Time Remaining */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--color-text-muted)] mb-4">
            {(league.season_start || league.season_end) && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                {league.season_start && new Date(league.season_start).toLocaleDateString()}
                {league.season_start && league.season_end && ' — '}
                {league.season_end && new Date(league.season_end).toLocaleDateString()}
              </span>
            )}
            {getSeasonTimeRemaining() && (
              <span className="text-[var(--color-primary)] font-medium">{getSeasonTimeRemaining()}</span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isCreator && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowEditModal(true) }}
                  className="px-4 py-2.5 rounded-lg font-medium text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                >
                  Edit Campaign
                </button>
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="px-4 py-2.5 rounded-lg font-medium text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                >
                  {generatingInvite ? 'Generating...' : 'Invite Link'}
                </button>
              </>
            )}
            {!isCreator && (
              <button
                onClick={handleLeaveLeague}
                disabled={leaving}
                className="px-4 py-2.5 rounded-lg font-medium text-sm border border-[var(--color-danger-border)] text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
              >
                {leaving ? 'Leaving...' : 'Leave Campaign'}
              </button>
            )}
            <Link
              to={`/leagues/${leagueId}/log-game`}
              className="btn btn-primary px-5 py-2.5 rounded-lg font-medium"
            >
              + Log Skirmish
            </Link>
          </div>

          {/* Invite Link Display */}
          {inviteToken && (
            <div className="mt-4 bg-[var(--color-primary)]/10 border border-[var(--color-border)] rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text)] mb-1">Share this invite link:</div>
                  <code className="block text-xs text-[var(--color-primary)] break-all bg-[var(--color-bg)]/80 rounded px-3 py-2">
                    {window.location.origin}/leagues/join/{inviteToken}
                  </code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/leagues/join/${inviteToken}`)
                    setInviteToken(null)
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 transition-colors whitespace-nowrap"
                >
                  Copy & Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Leader / Champion Hero */}
        {games.length > 0 && standings.length > 0 ? (
          <div className="bg-[var(--color-secondary-subtle)] border border-[var(--color-secondary-border)] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TrophyIcon className="w-10 h-10 text-[var(--color-secondary)]" />
                <div>
                  <div className="text-xs font-brand font-medium text-[var(--color-secondary)] uppercase tracking-wider mb-1">
                    {league.status === 'completed' ? 'Season Champion' : 'Current Leader'}
                  </div>
                  <div className="text-3xl font-brand font-bold text-[var(--color-text)]">{standings[0].superstar_name}</div>
                  <div className="text-sm text-[var(--color-text-muted)] mt-1">
                    {standings[0].total_points} pts · {standings[0].wins} wins · {standings[0].games_played} skirmishes
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--color-secondary-subtle)] border border-[var(--color-secondary-border)] rounded-xl p-6 mb-8 text-center">
            <CrownIcon className="w-8 h-8 text-[var(--color-secondary)] opacity-60 mx-auto mb-2" />
            <div className="text-lg font-brand font-bold text-[var(--color-text)]">The throne is empty.</div>
            <div className="text-sm text-[var(--color-text-muted)]">Log a game to stake your claim.</div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] mb-8" role="tablist" aria-label="Campaign sections">
          {['members', 'standings', 'skirmishes'].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded-t-lg ${
                activeTab === tab
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div role="tabpanel" id="tabpanel-standings" aria-labelledby="tab-standings" aria-live="polite">
            {standings.length > 0 && (
              <div className="flex justify-end gap-2 mb-3">
                <button
                  onClick={handleExportImage}
                  disabled={exportingImage}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingImage ? 'Exporting...' : 'Export Image'}
                </button>
                <button
                  onClick={handlePrintPDF}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  Print / PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  Export CSV
                </button>
              </div>
            )}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl overflow-x-auto">
            <table className="w-full" aria-label="Campaign standings">
              <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] w-10">#</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">Pilot</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">Pts</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">W</th>
                  <th className="hidden sm:table-cell text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">2nd</th>
                  <th className="hidden sm:table-cell text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">3rd</th>
                  <th className="hidden sm:table-cell text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">Avg</th>
                  <th className="hidden sm:table-cell text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]" title="Unique commanders used this season">Cmds</th>
                  <th className="hidden sm:table-cell text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">Bonuses</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">GP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent/20">
                {standings.map((member, idx) => (
                  <tr key={member.member_id} className={`hover:bg-[var(--color-surface)]/40 transition-colors ${
                    idx === 0 ? 'bg-[var(--color-secondary-subtle)]' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${
                          idx === 0
                            ? 'bg-[var(--color-secondary-subtle)] text-[var(--color-secondary)]'
                            : idx === 1
                            ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                            : idx === 2
                            ? 'bg-[var(--color-secondary-subtle)] text-[var(--color-secondary)]'
                            : 'bg-[var(--color-primary)]/10 text-[var(--color-text-muted)]'
                        }`}
                      >
                        <span className="sr-only">{idx === 0 ? '1st place' : idx === 1 ? '2nd place' : idx === 2 ? '3rd place' : `${idx + 1}th place`}</span>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-brand font-bold ${idx === 0 ? 'text-base text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                        {member.superstar_name}
                      </span>
                      {idx === 0 && <span className="ml-2 text-xs text-[var(--color-secondary)] font-medium">Leader</span>}
                      {idx > 0 && standings[idx - 1].total_points === member.total_points && (() => {
                        const h2h = getH2H(member.member_id, standings[idx - 1].member_id)
                        if (!h2h) return null
                        return (
                          <span className={`ml-2 text-xs font-medium ${h2h.wins1 > h2h.wins2 ? 'text-[var(--color-success)]' : h2h.wins1 < h2h.wins2 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`} title={`H2H vs ${standings[idx - 1].superstar_name}`}>
                            H2H {h2h.wins1}-{h2h.wins2}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-[var(--color-primary)]">{member.total_points}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--color-text-muted)]">{member.wins}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center text-[var(--color-text-muted)]">
                      {member.second_places || 0}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center text-[var(--color-text-muted)]">
                      {member.third_places || 0}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center text-[var(--color-text-muted)] text-sm">
                      {seasonStats[member.member_id]?.avgPlacement?.toFixed(1) ?? '—'}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center text-[var(--color-text-muted)] text-sm">
                      {seasonStats[member.member_id]?.uniqueCommanders ?? '—'}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center text-[var(--color-text-muted)]">
                      {bonusAwardStandings
                        ? (bonusAwardStandings.totalByMember[member.member_id] || 0)
                        : member.entrance_bonuses}
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--color-text-muted)]">
                      {member.games_played}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {standings.length === 0 && (
              <div className="text-center py-16 text-[var(--color-text-muted)]">
                <SwordsIcon className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
                <div className="font-brand text-lg font-bold text-[var(--color-text)] mb-1">The season awaits.</div>
                <div>Log your first skirmish to stake your claim.</div>
              </div>
            )}
            </div>

            {/* Season Highlights */}
            {seasonHighlights && (
              <div className="mt-6">
                <h3 className="text-xs font-brand font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                  Season Highlights
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {seasonHighlights.streakLeader && (
                    <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-4 h-4 text-orange-400" aria-hidden="true" />
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">Win Streak</span>
                      </div>
                      <div className="text-2xl font-brand font-bold text-[var(--color-text)]">
                        {seasonHighlights.streakLeader.maxStreak}
                        <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">in a row</span>
                      </div>
                      <div className="text-sm text-[var(--color-text-muted)] mt-1">{seasonHighlights.streakLeader.name}</div>
                    </div>
                  )}
                  {seasonHighlights.commanderLeader && (
                    <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">Most Diverse</span>
                      </div>
                      <div className="text-2xl font-brand font-bold text-[var(--color-text)]">
                        {seasonHighlights.commanderLeader.uniqueCommanders}
                        <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">commanders</span>
                      </div>
                      <div className="text-sm text-[var(--color-text-muted)] mt-1">{seasonHighlights.commanderLeader.name}</div>
                    </div>
                  )}
                  {seasonHighlights.deckLeader && (
                    <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-[var(--color-secondary)]" aria-hidden="true" />
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">Best Winrate</span>
                      </div>
                      <div className="text-2xl font-brand font-bold text-[var(--color-text)]">
                        {Math.round(seasonHighlights.deckLeader.bestDeck.wins / seasonHighlights.deckLeader.bestDeck.games * 100)}%
                      </div>
                      <div className="text-sm text-[var(--color-text-muted)] mt-0.5">{seasonHighlights.deckLeader.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)]/60 mt-0.5 truncate">{seasonHighlights.deckLeader.bestDeck.name}</div>
                    </div>
                  )}
                  {seasonHighlights.avgLeader && seasonHighlights.avgLeader.avgPlacement != null && (
                    <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-400" aria-hidden="true" />
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">Best Avg. Finish</span>
                      </div>
                      <div className="text-2xl font-brand font-bold text-[var(--color-text)]">
                        {seasonHighlights.avgLeader.avgPlacement.toFixed(1)}
                      </div>
                      <div className="text-sm text-[var(--color-text-muted)] mt-1">{seasonHighlights.avgLeader.name}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bonus Award Standings */}
            {bonusAwardStandings && (
              <div className="mt-6">
                <h3 className="text-xs font-brand font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                  Bonus Award Standings
                </h3>
                <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[500px]" aria-label="Bonus award standings">
                    <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="text-left px-2 py-3 text-sm font-medium text-[var(--color-text-muted)] min-w-20">
                          Award
                        </th>
                        {standings.map(m => (
                          <th key={m.member_id} className="text-center px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                            {m.superstar_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {bonusAwardStandings.enabledAwards.map(award => (
                        <tr key={award.id} className="hover:bg-[var(--color-surface)]/40 transition-colors">
                          <td className="px-2 py-3 text-xs text-[var(--color-text)] font-medium leading-tight">
                            {award.title}
                          </td>
                          {standings.map(m => {
                            const count = bonusAwardStandings.counts[award.id]?.[m.member_id] || 0
                            return (
                              <td key={m.member_id} className="px-4 py-3 text-center text-sm">
                                {count > 0
                                  ? <span className="font-bold text-[var(--color-primary)]">{count}</span>
                                  : <span className="text-[var(--color-text-muted)]">—</span>
                                }
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skirmishes Tab */}
        {activeTab === 'skirmishes' && (
          <div role="tabpanel" id="tabpanel-skirmishes" aria-labelledby="tab-skirmishes" className="space-y-4">
            {games.length === 0 && (
              <div className="text-center py-16 text-[var(--color-text-muted)] bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl">
                <SwordsIcon className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
                <div className="font-brand text-lg font-bold text-[var(--color-text)] mb-1">No battles yet.</div>
                <div className="mb-4">Make history.</div>
                <Link to={`/leagues/${leagueId}/log-game`} className="text-[var(--color-primary)] hover:underline">
                  Log your first skirmish →
                </Link>
              </div>
            )}

            {games.length > 0 && (
              <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl overflow-hidden">
                <table className="w-full" aria-label="Skirmishes history">
                  <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] w-10">#</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Results</th>
                      <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Awards</th>
                      <th className="px-4 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {games.map((game, index) => {
                      const sorted = (game.league_game_results || []).slice().sort((a, b) => a.placement - b.placement)
                      const entranceWinner = sorted.find(r => r.earned_entrance_bonus)
                      const firstBloodWinner = sorted.find(r => r.earned_first_blood)
                      const spicyWinner = game.spicy_play_winner_id
                        ? (sorted.find(r => String(r.member_id) === String(game.spicy_play_winner_id)) || null)
                        : null
                      const gameAwards = [
                        entranceWinner && { label: 'Entrance', name: entranceWinner.league_members?.superstar_name, color: 'text-[var(--color-secondary)]' },
                        firstBloodWinner && { label: 'First Blood', name: firstBloodWinner.league_members?.superstar_name, color: 'text-red-400' },
                        spicyWinner && { label: 'Spicy Play', name: spicyWinner.league_members?.superstar_name, color: 'text-orange-400' },
                        ].filter(Boolean)
                      return (
                        <Fragment key={game.id}>
                          <motion.tr
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: index * 0.04 }}
                            className="hover:bg-[var(--color-surface)]/40 transition-colors align-top"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                              {game.game_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                              {new Date(game.played_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {sorted.map(result => (
                                  <div key={result.id} className="flex items-center gap-1.5 text-sm flex-wrap">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0 ${result.placement === 1 ? 'bg-[var(--color-secondary-subtle)] text-[var(--color-secondary)]' : 'bg-[var(--color-primary)]/10 text-[var(--color-text-muted)]'}`}>
                                      {result.placement}
                                    </span>
                                    <span className={`font-medium ${result.placement === 1 ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                                      {result.league_members?.superstar_name}
                                    </span>
                                    {result.user_decks?.deck_name && (
                                      <span className="hidden sm:inline text-xs text-[var(--color-text-muted)]/60">({result.user_decks.deck_name})</span>
                                    )}
                                    <span className="text-xs font-bold text-[var(--color-primary)]">+{result.total_points}</span>
                                  </div>
                                ))}
                              </div>
                              {game.spicy_play_description && (
                                <div className="md:hidden mt-2 pt-2 border-t border-[var(--color-border)]/50 text-xs">
                                  <span className="font-medium text-orange-400">Spicy: </span>
                                  <span className="text-[var(--color-text-muted)]">{game.spicy_play_description}</span>
                                </div>
                              )}
                            </td>
                            <td className="hidden md:table-cell px-4 py-3 align-top">
                              {gameAwards.length > 0 ? (
                                <div className="space-y-1">
                                  {gameAwards.map(award => (
                                    <div key={award.label} className="flex items-baseline gap-1.5 text-xs">
                                      <span className={`font-medium whitespace-nowrap ${award.color}`}>{award.label}:</span>
                                      <span className="text-[var(--color-text-muted)]">{award.name}</span>
                                    </div>
                                  ))}
                                  {game.spicy_play_description && (
                                    <div className="mt-1 pt-1 border-t border-[var(--color-border)]/40 text-xs text-[var(--color-text-muted)]/70 italic line-clamp-2">
                                      {game.spicy_play_description}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--color-text-muted)]/40">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center gap-2 justify-end">
                                {game.screenshot_url && (
                                  <a
                                    href={game.screenshot_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--color-primary)] hover:opacity-80 transition-opacity"
                                    aria-label="View screenshot"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                  </a>
                                )}
                                {voteCategories.length > 0 && (
                                  <button
                                    onClick={() => {
                                      if (!gameVotes[game.id]) loadGameVotes(game.id)
                                      setVotingGameId(prev => prev === game.id ? null : game.id)
                                    }}
                                    className={`text-xs transition-colors cursor-pointer ${votingGameId === game.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}
                                  >
                                    Vote
                                  </button>
                                )}
                                <Link
                                  to={`/leagues/${leagueId}/games/${game.id}/edit`}
                                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2 py-0.5 hover:border-[var(--color-primary)] transition-colors"
                                >
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </motion.tr>
                          {votingGameId === game.id && gameVotes[game.id] && (
                            <tr className="bg-[var(--color-surface)]/20">
                              <td colSpan={5} className="px-4 pb-4 pt-3">
                                <div className="space-y-3">
                                  {voteCategories.map(({ category, label }) => {
                                    const tally = getVoteTally(game.id, category)
                                    const myVote = gameVotes[game.id]?.myVotes?.[category]
                                    const members = league?.league_members || []
                                    return (
                                      <div key={category}>
                                        <div className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                                          {label}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {members.map(m => (
                                            <button
                                              key={m.id}
                                              onClick={() => handleVote(game.id, category, m.id)}
                                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                myVote === m.id
                                                  ? 'bg-[var(--color-primary)]/30 text-[var(--color-primary)] border border-[var(--color-primary)]'
                                                  : 'bg-[var(--color-surface)]/60 text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/50'
                                              }`}
                                            >
                                              {m.superstar_name}
                                              {tally[m.id] ? ` (${tally[m.id]})` : ''}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {hasMoreGames && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={async () => {
                    setLoadingMoreGames(true)
                    try {
                      const nextPage = gamesPage + 1
                      const moreData = await api.getLeagueGames(leagueId, nextPage)
                      setGames(prev => [...prev, ...(moreData.games || [])])
                      setHasMoreGames(moreData.has_more || false)
                      setGamesPage(nextPage)
                    } catch (err) {
                      setError(err.message)
                    } finally {
                      setLoadingMoreGames(false)
                    }
                  }}
                  disabled={loadingMoreGames}
                  className="px-6 py-2.5 bg-surface border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                >
                  {loadingMoreGames ? 'Loading...' : 'Load More Skirmishes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div role="tabpanel" id="tabpanel-members" aria-labelledby="tab-members" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {league.league_members?.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.06,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--color-secondary)]/5 transition-all"
              >
                <div className="flex items-center gap-4">
                  <AvatarDisplay
                    avatarUrl={member.user_profiles?.avatar_url}
                    fallbackLabel={member.superstar_name}
                    size="xl"
                    alt={member.superstar_name}
                  />
                  <div className="flex-1">
                    <h3 className="text-2xl font-brand font-bold text-[var(--color-text)]">
                      {member.superstar_name}
                    </h3>
                    {member.current_title && (
                      <div className="inline-block px-3 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold rounded-full mb-3">
                        {member.current_title}
                      </div>
                    )}
                    {member.catchphrase && (
                      <div className="text-base italic text-[var(--color-text-muted)] mb-3">
                        "{member.catchphrase}"
                      </div>
                    )}
                    {member.entrance_music_url && (() => {
                      const embed = getEntranceMusicEmbed(member.entrance_music_url)
                      return (
                        <div>
                          <button
                            onClick={() => setActiveMusicPreview(activeMusicPreview === member.id ? null : member.id)}
                            className="inline-flex items-center gap-2 bg-[var(--color-primary)]/20 px-4 py-2 rounded-lg text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 transition-colors"
                          >
                            {activeMusicPreview === member.id ? 'Close Preview' : (() => {
                              if (embed.type === 'youtube') return '▶ YouTube'
                              if (embed.type === 'spotify') return '▶ Spotify'
                              return '▶ Listen'
                            })()}
                          </button>
                          {activeMusicPreview === member.id && (
                            <div className="mt-3">
                              {embed.type === 'youtube' && (
                                <iframe
                                  width="100%"
                                  height="80"
                                  src={`https://www.youtube.com/embed/${encodeURIComponent(embed.videoId)}?autoplay=0`}
                                  title="Entrance Music"
                                  allow="encrypted-media"
                                  className="rounded-lg"
                                />
                              )}
                              {embed.type === 'spotify' && (
                                <iframe
                                  src={`https://open.spotify.com/embed/${encodeURIComponent(embed.contentType)}/${encodeURIComponent(embed.id)}?theme=0`}
                                  width="100%"
                                  height="80"
                                  allow="encrypted-media"
                                  title="Entrance Music"
                                  className="rounded-lg"
                                />
                              )}
                              {embed.type === 'external' && (
                                <a
                                  href={member.entrance_music_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-[var(--color-primary)] hover:underline"
                                >
                                  Open in new tab
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}      </div>
    </PageTransition>
  )
}
