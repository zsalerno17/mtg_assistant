import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../lib/api'

export default function LeaguePage() {
  const { leagueId } = useParams()
  const [league, setLeague] = useState(null)
  const [standings, setStandings] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('standings') // standings | games | members

  useEffect(() => {
    loadLeagueData()
  }, [leagueId])

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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-secondary">Loading league...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-[1400px] mx-auto px-8 py-10">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </Layout>
    )
  }

  if (!league) return null

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-secondary mb-3">
            <Link to="/leagues" className="hover:text-accent">
              Leagues
            </Link>
            <span>/</span>
            <span className="text-primary">{league.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-brand font-bold text-primary mb-2">
                {league.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-secondary">
                <span>
                  📅 {new Date(league.season_start).toLocaleDateString()} —{' '}
                  {new Date(league.season_end).toLocaleDateString()}
                </span>
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
            </div>

            <Link
              to={`/leagues/${leagueId}/log-game`}
              className="btn-primary px-5 py-2.5 rounded-lg font-medium"
            >
              + Log Game
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-accent/30 mb-8">
          {['standings', 'games', 'members'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div className="bg-surface border border-accent/30 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-black/40 border-b border-accent/30">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-secondary">
                    Rank
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-secondary">
                    Superstar Name
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-secondary">
                    Total Points
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-secondary">
                    Wins
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-secondary">
                    First Bloods
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-secondary">
                    Last Stands
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-secondary">
                    Entrance Bonuses
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-secondary">
                    Games
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent/20">
                {standings.map((member, idx) => (
                  <tr key={member.member_id} className="hover:bg-black/20 transition-colors">
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          idx === 0
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : idx === 1
                            ? 'bg-gray-400/20 text-gray-300'
                            : idx === 2
                            ? 'bg-amber-700/20 text-amber-600'
                            : 'bg-accent/10 text-secondary'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-primary">
                      {member.superstar_name}
                    </td>
                    <td className="px-6 py-4 text-center text-lg font-bold text-accent">
                      {member.total_points}
                    </td>
                    <td className="px-6 py-4 text-center text-secondary">{member.wins}</td>
                    <td className="px-6 py-4 text-center text-secondary">
                      {member.first_bloods}
                    </td>
                    <td className="px-6 py-4 text-center text-secondary">
                      {member.last_stands}
                    </td>
                    <td className="px-6 py-4 text-center text-secondary">
                      {member.entrance_bonuses}
                    </td>
                    <td className="px-6 py-4 text-center text-secondary">
                      {member.games_played}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {standings.length === 0 && (
              <div className="text-center py-12 text-secondary">
                No games logged yet. Log your first session to start tracking standings!
              </div>
            )}
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="space-y-4">
            {games.length === 0 && (
              <div className="text-center py-12 text-secondary bg-surface border border-accent/30 rounded-xl">
                No games logged yet.{' '}
                <Link to={`/leagues/${leagueId}/log-game`} className="text-accent hover:underline">
                  Log your first game
                </Link>
              </div>
            )}

            {games.map((game) => (
              <div
                key={game.id}
                className="bg-surface border border-accent/30 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-brand font-bold text-primary">
                      Game #{game.game_number}
                    </h3>
                    <div className="text-sm text-secondary">
                      {new Date(game.played_at).toLocaleDateString()} at{' '}
                      {new Date(game.played_at).toLocaleTimeString()}
                    </div>
                  </div>
                  {game.screenshot_url && (
                    <a
                      href={game.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent hover:underline"
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
                        className="flex items-center justify-between px-4 py-3 bg-black/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              result.placement === 1
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-accent/10 text-secondary'
                            }`}
                          >
                            {result.placement}
                          </span>
                          <span className="font-medium text-primary">
                            {result.league_members?.superstar_name}
                          </span>
                          {result.user_decks?.deck_name && (
                            <span className="text-xs text-secondary">
                              ({result.user_decks.deck_name})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {result.earned_win && <span className="text-green-400">🏆 Win</span>}
                          {result.earned_first_blood && (
                            <span className="text-red-400">🩸 First Blood</span>
                          )}
                          {result.earned_last_stand && (
                            <span className="text-blue-400">⚔️ Last Stand</span>
                          )}
                          {result.earned_entrance_bonus && (
                            <span className="text-yellow-400">🎤 Entrance</span>
                          )}
                          <span className="font-bold text-accent">{result.total_points} pts</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Spicy Play */}
                {game.spicy_play_description && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-3">
                    <div className="text-xs font-medium text-orange-400 mb-1">
                      🔥 Spicy Play of the Week
                    </div>
                    <div className="text-sm text-primary">{game.spicy_play_description}</div>
                  </div>
                )}

                {game.notes && (
                  <div className="mt-3 text-sm text-secondary italic">{game.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {league.league_members?.map((member) => (
              <div
                key={member.id}
                className="bg-surface border border-accent/30 rounded-xl p-6"
              >
                <div className="flex items-start gap-4">
                  {member.user_profiles?.avatar_url ? (
                    <img
                      src={member.user_profiles.avatar_url}
                      alt={member.superstar_name}
                      className="w-16 h-16 rounded-full border-2 border-accent"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-2xl">
                      ⚔️
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-brand font-bold text-primary mb-1">
                      {member.superstar_name}
                    </h3>
                    {member.user_profiles?.display_name && (
                      <div className="text-sm text-secondary mb-2">
                        @{member.user_profiles.display_name}
                      </div>
                    )}
                    {member.current_title && (
                      <div className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-medium rounded-full mb-3">
                        {member.current_title}
                      </div>
                    )}
                    {member.catchphrase && (
                      <div className="text-sm italic text-secondary mb-2">
                        "{member.catchphrase}"
                      </div>
                    )}
                    {member.entrance_music_url && (
                      <a
                        href={member.entrance_music_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        🎵 Entrance Music
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
