import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { StandingsRowSkeleton, MemberCardSkeleton, GameCardSkeleton } from '../components/Skeletons'
import { TrophyIcon, CrownIcon, SwordsIcon } from '../components/LeagueIcons'

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

  useEffect(() => {
    loadLeagueData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, session?.access_token])

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

  function getGameNarrative(game) {
    const sorted = game.league_game_results?.sort((a, b) => a.placement - b.placement) || []
    const winner = sorted.find(r => r.placement === 1)?.league_members?.superstar_name
    const playerCount = sorted.length
    if (game.spicy_play_description) {
      return `Game ${game.game_number}: ${winner || 'Unknown'} Claims Victory`
    }
    if (playerCount >= 4 && winner) {
      return `Game ${game.game_number}: ${winner} Dominates a ${playerCount}-Way Clash`
    }
    if (winner) {
      return `Game ${game.game_number}: ${winner} Takes the Crown`
    }
    return `Game ${game.game_number}`
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
      ctx.fillText(league?.name || 'League Standings', padding, padding + 22)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '13px sans-serif'
      ctx.fillText(`Season ${new Date(league?.season_start).toLocaleDateString()} — ${new Date(league?.season_end).toLocaleDateString()}`, padding, padding + 42)

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
          ctx.fillStyle = 'rgba(251, 191, 36, 0.1)'
          ctx.fillRect(padding - 8, y - rowHeight + 12, width - padding * 2 + 16, rowHeight)
        }

        ctx.fillStyle = idx === 0 ? '#fbbf24' : '#f1f5f9'
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText(`${idx + 1}`, cols[0].x, y)
        ctx.font = idx === 0 ? 'bold 14px serif' : '14px sans-serif'
        ctx.fillText(m.superstar_name || '', cols[1].x, y)
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText(`${m.total_points}`, cols[2].x, y)
        ctx.fillStyle = '#94a3b8'
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

  async function handleLeaveLeague() {
    if (!confirm('Are you sure you want to leave this league? Your game history will be preserved.')) return
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
    const headers = ['Rank', 'Superstar Name', 'Total Points', 'Wins', '2nds', '3rds', 'Entrance Bonuses', 'Games']
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
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
    )
  }

  if (!league) return null

  return (
      <div className="max-w-[1400px] mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)] mb-3">
            <Link to="/leagues" className="hover:text-[var(--color-text)]">
              Leagues
            </Link>
            <span>/</span>
            <span className="text-[var(--color-text)]">{league.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-brand font-bold text-[var(--color-text)] mb-2">
                {league.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-[var(--color-muted)]">
                <span>
                  📅 {new Date(league.season_start).toLocaleDateString()} —{' '}
                  {new Date(league.season_end).toLocaleDateString()}
                </span>
                {getSeasonTimeRemaining() && (
                  <span className="text-[var(--color-primary)] font-medium">{getSeasonTimeRemaining()}</span>
                )}
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
            </div>

            <div className="flex items-center gap-3">
              {isCreator && (
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="px-4 py-2.5 rounded-lg font-medium text-sm border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                >
                  {generatingInvite ? 'Generating...' : 'Invite Link'}
                </button>
              )}
              {!isCreator && (
                <button
                  onClick={handleLeaveLeague}
                  disabled={leaving}
                  className="px-4 py-2.5 rounded-lg font-medium text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                >
                  {leaving ? 'Leaving...' : 'Leave League'}
                </button>
              )}
              <Link
                to={`/leagues/${leagueId}/log-game`}
                className="btn-primary px-5 py-2.5 rounded-lg font-medium"
              >
                + Log Game
              </Link>
            </div>
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

        {/* Current Champion Hero */}
        {standings.length > 0 ? (
          <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TrophyIcon className="w-10 h-10 text-yellow-400" />
                <div>
                  <div className="text-xs font-brand font-medium text-yellow-400/80 uppercase tracking-wider mb-1">Current Champion</div>
                  <div className="text-3xl font-brand font-bold text-[var(--color-text)]">{standings[0].superstar_name}</div>
                  <div className="text-sm text-[var(--color-muted)] mt-1">
                    {standings[0].total_points} pts · {standings[0].wins} wins · {standings[0].games_played} games
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-xl p-6 mb-8 text-center">
            <CrownIcon className="w-8 h-8 text-yellow-400/60 mx-auto mb-2" />
            <div className="text-lg font-brand font-bold text-[var(--color-text)]">The throne is empty.</div>
            <div className="text-sm text-[var(--color-muted)]">Who will claim it first?</div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] mb-8" role="tablist" aria-label="League sections">
          {['members', 'standings', 'games'].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded-t-lg ${
                activeTab === tab
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
                >
                  {exportingImage ? 'Exporting...' : 'Export Image'}
                </button>
                <button
                  onClick={handlePrintPDF}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  Print / PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  Export CSV
                </button>
              </div>
            )}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl overflow-hidden">
            <table className="w-full" aria-label="League standings">
              <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[var(--color-muted)]">
                    Rank
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[var(--color-muted)]">
                    Superstar Name
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[var(--color-muted)]">
                    Total Points
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[var(--color-muted)]">
                    Wins
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[var(--color-muted)]">
                    2nds
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[var(--color-muted)]">
                    3rds
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[var(--color-muted)]">
                    Entrance Bonuses
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[var(--color-muted)]">
                    Games
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent/20">
                {standings.map((member, idx) => (
                  <tr key={member.member_id} className={`hover:bg-[var(--color-surface)]/40 transition-colors ${
                    idx === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''
                  }`}>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          idx === 0
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : idx === 1
                            ? 'bg-gray-400/20 text-gray-300'
                            : idx === 2
                            ? 'bg-amber-700/20 text-amber-600'
                            : 'bg-[var(--color-primary)]/10 text-[var(--color-muted)]'
                        }`}
                      >
                      <span className="sr-only">{idx === 0 ? '1st place' : idx === 1 ? '2nd place' : idx === 2 ? '3rd place' : `${idx + 1}th place`}</span>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-brand font-bold ${idx === 0 ? 'text-lg text-[var(--color-text)]' : idx < 3 ? 'text-base text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                        {member.superstar_name}
                      </span>
                      {idx === 0 && <span className="ml-2 text-xs text-yellow-400 font-medium">Champion</span>}
                      {idx > 0 && standings[idx - 1].total_points === member.total_points && (() => {
                        const h2h = getH2H(member.member_id, standings[idx - 1].member_id)
                        if (!h2h) return null
                        return (
                          <span className={`ml-2 text-xs font-medium ${h2h.wins1 > h2h.wins2 ? 'text-green-400' : h2h.wins1 < h2h.wins2 ? 'text-red-400' : 'text-[var(--color-muted)]'}`} title={`H2H vs ${standings[idx - 1].superstar_name}`}>
                            H2H {h2h.wins1}-{h2h.wins2}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xl font-bold text-[var(--color-primary)]">{member.total_points}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-[var(--color-muted)]">{member.wins}</td>
                    <td className="px-6 py-4 text-center text-[var(--color-muted)]">
                      {member.second_places || 0}
                    </td>
                    <td className="px-6 py-4 text-center text-[var(--color-muted)]">
                      {member.third_places || 0}
                    </td>
                    <td className="px-6 py-4 text-center text-[var(--color-muted)]">
                      {member.entrance_bonuses}
                    </td>
                    <td className="px-6 py-4 text-center text-[var(--color-muted)]">
                      {member.games_played}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {standings.length === 0 && (
              <div className="text-center py-16 text-[var(--color-muted)]">
                <SwordsIcon className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" />
                <div className="font-brand text-lg font-bold text-[var(--color-text)] mb-1">The season awaits.</div>
                <div>Log your first game to stake your claim.</div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div role="tabpanel" id="tabpanel-games" aria-labelledby="tab-games" className="space-y-4">
            {games.length === 0 && (
              <div className="text-center py-16 text-[var(--color-muted)] bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl">
                <SwordsIcon className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" />
                <div className="font-brand text-lg font-bold text-[var(--color-text)] mb-1">No battles yet.</div>
                <div className="mb-4">Make history.</div>
                <Link to={`/leagues/${leagueId}/log-game`} className="text-[var(--color-primary)] hover:underline">
                  Log your first game →
                </Link>
              </div>
            )}

            {games.map((game) => (
              <div
                key={game.id}
                className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-brand font-bold text-[var(--color-text)]">
                      {getGameNarrative(game)}
                    </h3>
                    <div className="text-sm text-[var(--color-muted)]">
                      {new Date(game.played_at).toLocaleDateString()} at{' '}
                      {new Date(game.played_at).toLocaleTimeString()}
                    </div>
                  </div>
                  {game.screenshot_url && (
                    <a
                      href={game.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      📸 Screenshot
                    </a>
                  )}
                </div>

                {/* Results */}
                <div className="space-y-2 mb-4">
                  {game.league_game_results
                    ?.sort((a, b) => a.placement - b.placement)
                    .map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface)]/40 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              result.placement === 1
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-[var(--color-primary)]/10 text-[var(--color-muted)]'
                            }`}
                          >
                            {result.placement}
                          </span>
                          <span className="font-medium text-[var(--color-text)]">
                            {result.league_members?.superstar_name}
                          </span>
                          {result.user_decks?.deck_name && (
                            <span className="text-xs text-[var(--color-muted)]">
                              ({result.user_decks.deck_name})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {result.earned_win && <span className="text-green-400">Win</span>}
                          {result.earned_entrance_bonus && (
                            <span className="text-yellow-400">Entrance</span>
                          )}
                          <span className="font-bold text-[var(--color-primary)]">{result.total_points} pts</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Spicy Play */}
                {game.spicy_play_description && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-3">
                    <div className="text-xs font-brand font-medium text-orange-400 uppercase tracking-wider mb-1">
                      Spicy Play of the Week
                    </div>
                    <div className="text-sm text-[var(--color-text)]">{game.spicy_play_description}</div>
                  </div>
                )}

                {game.notes && (
                  <div className="mt-3 text-sm text-[var(--color-muted)] italic">{game.notes}</div>
                )}

                {/* Voting Section */}
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  {!gameVotes[game.id] ? (
                    <button
                      onClick={() => { loadGameVotes(game.id); setVotingGameId(game.id) }}
                      className="text-xs text-[var(--color-primary)] hover:underline"
                    >
                      Vote on awards
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {['entrance', 'spicy_play'].map(category => {
                        const tally = getVoteTally(game.id, category)
                        const myVote = gameVotes[game.id]?.myVotes?.[category]
                        const members = league?.league_members || []
                        return (
                          <div key={category}>
                            <div className="text-xs font-medium text-[var(--color-muted)] mb-1.5">
                              {category === 'entrance' ? 'Best Entrance' : 'Spiciest Play'}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {members.map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => handleVote(game.id, category, m.id)}
                                  className={`px-2.5 py-1 rounded-[7px] text-xs font-medium transition-all ${
                                    myVote === m.id
                                      ? 'bg-[var(--color-primary)]/30 text-[var(--color-primary)] border border-[var(--color-primary)]'
                                      : 'bg-[var(--color-surface)]/60 text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/50'
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
                  )}
                </div>
              </div>
            ))}

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
                  className="px-6 py-2.5 bg-surface border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                >
                  {loadingMoreGames ? 'Loading...' : 'Load More Games'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div role="tabpanel" id="tabpanel-members" aria-labelledby="tab-members" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {league.league_members?.map((member) => (
              <div
                key={member.id}
                className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5 transition-all"
              >
                <div className="flex items-start gap-4">
                  {member.user_profiles?.avatar_url ? (
                    <img
                      src={member.user_profiles.avatar_url}
                      alt={member.superstar_name}
                      className="w-16 h-16 rounded-full border-2 border-[var(--color-primary)]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/20 border-2 border-[var(--color-primary)] flex items-center justify-center">
                      <SwordsIcon className="w-7 h-7 text-[var(--color-primary)]" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-brand font-bold text-[var(--color-text)] mb-1">
                      {member.superstar_name}
                    </h3>
                    {member.user_profiles?.display_name && (
                      <div className="text-sm text-[var(--color-muted)] mb-2">
                        @{member.user_profiles.display_name}
                      </div>
                    )}
                    {member.current_title && (
                      <div className="inline-block px-3 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold rounded-full mb-3">
                        {member.current_title}
                      </div>
                    )}
                    {member.catchphrase && (
                      <div className="text-base italic text-[var(--color-muted)] mb-3">
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
              </div>
            ))}
          </div>
        )}
      </div>
  )
}
