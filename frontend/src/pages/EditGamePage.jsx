import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import PageTransition from '../components/PageTransition'
import { SelectField } from '../components/shared'

// Supports both old flat-key format and new bonus_awards array format
function isAwardEnabled(league, awardId) {
  const cfg = league?.scoring_config
  if (!cfg) return true
  if (Array.isArray(cfg.bonus_awards)) {
    const found = cfg.bonus_awards.find(a => a.id === awardId)
    return found ? found.enabled !== false : false
  }
  // Legacy flat keys
  return cfg[awardId] !== false
}

export default function EditGamePage() {
  const { leagueId, gameId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [league, setLeague] = useState(null)
  const [members, setMembers] = useState([])
  const [myDecks, setMyDecks] = useState([])

  // Game metadata (gameNumber is read-only, set from loaded game for display)
  const [gameNumber, setGameNumber] = useState(null)
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 16))
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [spicyPlayDescription, setSpicyPlayDescription] = useState('')
  const [spicyPlayWinnerId, setSpicyPlayWinnerId] = useState('')
  const [entranceWinnerId, setEntranceWinnerId] = useState('')
  const [firstBloodWinnerId, setFirstBloodWinnerId] = useState('')
  const [notes, setNotes] = useState('')

  const [podSize, setPodSize] = useState(4)
  const [results, setResults] = useState({})

  useEffect(() => {
    if (!session?.access_token) return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, gameId, session?.user?.id])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [leagueData, membersData, decksData, gameData] = await Promise.all([
        api.getLeague(leagueId),
        api.getLeagueMembers(leagueId),
        api.getDeckLibrary(),
        api.getGame(leagueId, gameId),
      ])
      setLeague(leagueData.league)
      setMembers(membersData.members || [])
      setMyDecks(decksData.decks || [])

      const game = gameData.game
      // Pre-fill game metadata
      setGameNumber(game.game_number)
      setPlayedAt(new Date(game.played_at).toISOString().slice(0, 16))
      setScreenshotUrl(game.screenshot_url || '')
      setSpicyPlayDescription(game.spicy_play_description || '')
      setSpicyPlayWinnerId(game.spicy_play_winner_id || '')
      setEntranceWinnerId(game.entrance_winner_id || '')
      setPodSize(Math.max(2, Math.min(10, membersData.members?.length || 4)))
      setNotes(game.notes || '')

      // Pre-fill per-player results
      const existingResults = {}
      const gameResultsByMember = {}
      for (const r of game.league_game_results || []) {
        gameResultsByMember[r.member_id] = r
      }
      // Find first blood winner
      const fbResult = game.league_game_results?.find(r => r.earned_first_blood)
      if (fbResult) setFirstBloodWinnerId(fbResult.member_id)

      for (const member of membersData.members || []) {
        const existing = gameResultsByMember[member.id]
        existingResults[member.id] = {
          placement: existing?.placement ?? null,
          deck_id: existing?.deck_id ?? null,
          notes: existing?.notes ?? '',
        }
      }
      setResults(existingResults)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateResult(memberId, field, value) {
    setResults((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], [field]: value },
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const placements = Object.values(results)
        .map((r) => r.placement)
        .filter((p) => p !== null && p !== '')
        .map(Number)

      if (placements.length === 0)
        throw new Error('Please assign placements to at least one pilot')

      const uniquePlacements = new Set(placements)
      if (uniquePlacements.size !== placements.length)
        throw new Error('Each pilot must have a unique placement')

      const gameResults = Object.entries(results)
        .filter(([_, r]) => r.placement !== null && r.placement !== '')
        .map(([memberId, r]) => {
          const placement = Number(r.placement)
          return {
            member_id: memberId,
            deck_id: r.deck_id || null,
            placement,
            earned_win: placement === 1,
            earned_second_place: placement === 2,
            earned_third_place: placement === 3,
            earned_entrance_bonus: memberId === entranceWinnerId,
            earned_first_blood: memberId === firstBloodWinnerId,
            earned_last_stand: false,
            notes: r.notes || null,
          }
        })

      await api.editGame(leagueId, gameId, {
        game: {
          played_at: new Date(playedAt).toISOString(),
          screenshot_url: screenshotUrl || null,
          spicy_play_description: spicyPlayDescription || null,
          spicy_play_winner_id: spicyPlayWinnerId || null,
          entrance_winner_id: entranceWinnerId || null,
          notes: notes || null,
        },
        results: gameResults,
      })

      navigate(`/leagues/${leagueId}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[var(--color-text-muted)]">Loading skirmish...</div>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-[900px] mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-[var(--color-text)] mb-2">
            Edit Skirmish #{gameNumber}
          </h1>
          <p className="text-[var(--color-text-muted)]">{league?.name}</p>
        </div>

        {error && (
          <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Game Metadata */}
          <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
            <h2 className="text-lg font-brand font-bold text-[var(--color-text)] mb-4">Skirmish Details</h2>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Date &amp; Time</label>
              <input
                type="datetime-local"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                required
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Screenshot URL (optional)</label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Player Results */}
          <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-brand font-bold text-[var(--color-text)]">Pilot Results</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--color-text-muted)]">Pod size:</label>
                <select
                  value={podSize}
                  onChange={(e) => setPodSize(Number(e.target.value))}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text)]"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>{n} pilots</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {members.map((member) => {
                const placement = results[member.id]?.placement ? Number(results[member.id].placement) : null
                const placementPts = placement === 1 ? 3 : placement === 2 ? 2 : placement === 3 ? 1 : 0
                const entrancePts = member.id === entranceWinnerId ? 1 : 0
                const firstBloodPts = member.id === firstBloodWinnerId ? 1 : 0
                const totalPreview = placement ? placementPts + entrancePts + firstBloodPts : null

                return (
                  <div key={member.id} className="bg-[var(--color-surface)]/40 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                      <div>
                        <div className="font-medium text-[var(--color-text)] mb-1">{member.superstar_name}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Placement</label>
                        <select
                          value={results[member.id]?.placement || ''}
                          onChange={(e) => updateResult(member.id, 'placement', e.target.value)}
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)]"
                        >
                          <option value="">—</option>
                          {Array.from({ length: podSize }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n === 1 ? '1st (Winner)' : n === podSize ? `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} (Last Out)` : `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Deck (optional)</label>
                        {member.user_id === session?.user?.id ? (
                          <select
                            value={results[member.id]?.deck_id || ''}
                            onChange={(e) => updateResult(member.id, 'deck_id', e.target.value)}
                            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)]"
                          >
                            <option value="">—</option>
                            {myDecks.map((deck) => (
                              <option key={deck.id} value={deck.id}>{deck.deck_name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-xs text-[var(--color-text-muted)] italic py-2">Only the deck owner can select</div>
                        )}
                      </div>
                    </div>
                    {totalPreview !== null && (
                      <div className="mt-2 pt-2 border-t border-[var(--color-primary)]/10 flex items-center gap-3 text-xs">
                        <span className="text-[var(--color-text-muted)]">
                          {placement === 1 ? '1st → 3 pts' : placement === 2 ? '2nd → 2 pts' : placement === 3 ? '3rd → 1 pt' : `${placement}th → 0 pts`}
                        </span>
                        {entrancePts > 0 && <span className="text-[var(--color-secondary)]">+1 entrance</span>}
                        {firstBloodPts > 0 && <span className="text-red-400">+1 first blood</span>}
                        <span className="ml-auto font-bold text-[var(--color-primary)]">{totalPreview} pts total</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Special Awards */}
          <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
            <h2 className="text-lg font-brand font-bold text-[var(--color-text)] mb-4">Special Awards</h2>
            <div className="space-y-4">
              {isAwardEnabled(league, 'entrance_bonus') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    WWE Entrance of the Week (+1pt)
                  </label>
                  <select
                    value={entranceWinnerId}
                    onChange={(e) => setEntranceWinnerId(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)]"
                  >
                    <option value="">— No winner —</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.superstar_name}</option>)}
                  </select>
                </div>
              )}
              {isAwardEnabled(league, 'first_blood') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    First Blood — First to Deal Damage (+1pt)
                  </label>
                  <select
                    value={firstBloodWinnerId}
                    onChange={(e) => setFirstBloodWinnerId(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)]"
                  >
                    <option value="">— No winner —</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.superstar_name}</option>)}
                  </select>
                </div>
              )}
              {isAwardEnabled(league, 'spicy_play') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                      Spicy Play of the Week
                    </label>
                    <textarea
                      value={spicyPlayDescription}
                      onChange={(e) => setSpicyPlayDescription(e.target.value)}
                      placeholder="Describe the most unhinged, creative, or devastating play..."
                      rows={2}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">Spicy Play Player</label>
                    <select
                      value={spicyPlayWinnerId}
                      onChange={(e) => setSpicyPlayWinnerId(e.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)]"
                    >
                      <option value="">— No winner —</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.superstar_name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(`/leagues/${leagueId}`)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary px-8 py-3 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  )
}
