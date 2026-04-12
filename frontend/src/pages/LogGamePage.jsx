import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function LogGamePage() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [league, setLeague] = useState(null)
  const [members, setMembers] = useState([])
  const [myDecks, setMyDecks] = useState([])

  // Game metadata
  const [gameNumber, setGameNumber] = useState(1)
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 16))
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [spicyPlayDescription, setSpicyPlayDescription] = useState('')
  const [spicyPlayWinnerId, setSpicyPlayWinnerId] = useState('')
  const [entranceWinnerId, setEntranceWinnerId] = useState('')
  const [notes, setNotes] = useState('')

  // Player results (keyed by member_id)
  const [results, setResults] = useState({})

  useEffect(() => {
    loadData()
  }, [leagueId])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [leagueData, membersData, decksData, gamesData] = await Promise.all([
        api.getLeague(leagueId),
        api.getLeagueMembers(leagueId),
        api.getDeckLibrary(),
        api.getLeagueGames(leagueId),
      ])
      setLeague(leagueData.league)
      setMembers(membersData.members || [])
      setMyDecks(decksData.decks || [])

      // Auto-increment game number
      const lastGame = gamesData.games?.[0]
      if (lastGame) {
        setGameNumber(lastGame.game_number + 1)
      }

      // Initialize results for each member
      const initialResults = {}
      membersData.members?.forEach((member) => {
        initialResults[member.id] = {
          placement: null,
          deck_id: null,
          notes: '',
        }
      })
      setResults(initialResults)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateResult(memberId, field, value) {
    setResults((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: value,
      },
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Validate placements
      const placements = Object.values(results)
        .map((r) => r.placement)
        .filter((p) => p !== null && p !== '')
        .map(Number)

      if (placements.length === 0) {
        throw new Error('Please assign placements to at least one player')
      }

      const uniquePlacements = new Set(placements)
      if (uniquePlacements.size !== placements.length) {
        throw new Error('Each player must have a unique placement')
      }

      // Build results array
      const gameResults = Object.entries(results)
        .filter(([_, r]) => r.placement !== null && r.placement !== '')
        .map(([memberId, r]) => {
          const placement = Number(r.placement)
          
          // FIXED SCORING SYSTEM: Standard placement points (3-2-1-0) + Entrance Bonus
          // This replaces the broken First Blood/Last Stand system that awarded
          // 4th place (1pt) more than 3rd place (0pts)
          const earned_win = placement === 1
          const earned_second_place = placement === 2
          const earned_third_place = placement === 3
          const earned_entrance_bonus = memberId === entranceWinnerId

          return {
            member_id: memberId,
            deck_id: r.deck_id || null,
            placement,
            earned_win,
            earned_second_place,
            earned_third_place,
            earned_entrance_bonus,
            // Legacy fields for backward compatibility (always false now)
            earned_first_blood: false,
            earned_last_stand: false,
            notes: r.notes || null,
          }
        })

      await api.logGame(leagueId, {
        game: {
          game_number: Number(gameNumber),
          played_at: new Date(playedAt).toISOString(),
          screenshot_url: screenshotUrl || null,
          spicy_play_description: spicyPlayDescription || null,
          spicy_play_winner_id: spicyPlayWinnerId || null,
          entrance_winner_id: entranceWinnerId || null,
          notes: notes || null,
        },
        results: gameResults,
      })

      // Navigate back to league page
      navigate(`/leagues/${leagueId}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-secondary">Loading...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-[900px] mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-brand font-bold text-primary mb-2">
            Log Game Session
          </h1>
          <p className="text-secondary">{league?.name}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Game Metadata */}
          <div className="bg-surface border border-accent/30 rounded-xl p-6">
            <h2 className="text-lg font-brand font-bold text-primary mb-4">
              Game Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  Game Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={gameNumber}
                  onChange={(e) => setGameNumber(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={playedAt}
                  onChange={(e) => setPlayedAt(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Screenshot URL (optional)
              </label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Player Results */}
          <div className="bg-surface border border-accent/30 rounded-xl p-6">
            <h2 className="text-lg font-brand font-bold text-primary mb-4">
              Player Results
            </h2>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-black/20 rounded-lg p-4 grid grid-cols-3 gap-4 items-start"
                >
                  <div>
                    <div className="font-medium text-primary mb-1">
                      {member.superstar_name}
                    </div>
                    <div className="text-xs text-secondary">
                      @{member.user_profiles?.display_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">
                      Placement
                    </label>
                    <select
                      value={results[member.id]?.placement || ''}
                      onChange={(e) => updateResult(member.id, 'placement', e.target.value)}
                      className="w-full bg-black/40 border border-accent/30 rounded-lg px-3 py-2 text-sm text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                    >
                      <option value="">—</option>
                      <option value="1">1st (Winner)</option>
                      <option value="2">2nd</option>
                      <option value="3">3rd</option>
                      <option value="4">4th (First Out)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">
                      Deck (optional)
                    </label>
                    {member.user_id === session?.user?.id ? (
                      <select
                        value={results[member.id]?.deck_id || ''}
                        onChange={(e) => updateResult(member.id, 'deck_id', e.target.value)}
                        className="w-full bg-black/40 border border-accent/30 rounded-lg px-3 py-2 text-sm text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                      >
                        <option value="">—</option>
                        {myDecks.map((deck) => (
                          <option key={deck.id} value={deck.id}>
                            {deck.deck_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-secondary italic py-2">
                        Only the deck owner can select
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs text-secondary">
              <strong>Points awarded automatically:</strong> 1st = 3pts, 2nd = 2pts, 3rd = 1pt, 4th+ = 0pts. Entrance bonus = +1pt.
            </div>
          </div>

          {/* Special Awards */}
          <div className="bg-surface border border-accent/30 rounded-xl p-6">
            <h2 className="text-lg font-brand font-bold text-primary mb-4">
              Special Awards
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  🎤 WWE Entrance of the Week (+1pt)
                </label>
                <select
                  value={entranceWinnerId}
                  onChange={(e) => setEntranceWinnerId(e.target.value)}
                  className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">— No winner —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.superstar_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  🔥 Spicy Play of the Week
                </label>
                <textarea
                  value={spicyPlayDescription}
                  onChange={(e) => setSpicyPlayDescription(e.target.value)}
                  placeholder="Describe the most unhinged, creative, or devastating play..."
                  rows={2}
                  className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  Spicy Play Player
                </label>
                <select
                  value={spicyPlayWinnerId}
                  onChange={(e) => setSpicyPlayWinnerId(e.target.value)}
                  className="w-full bg-black/40 border border-accent/30 rounded-lg px-4 py-2.5 text-primary focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">— No winner —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.superstar_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(`/leagues/${leagueId}`)}
              className="text-secondary hover:text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-8 py-3 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Log Game'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
