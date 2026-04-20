import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import PageTransition from '../components/PageTransition'
import { SelectField } from '../components/shared'

function ordinal(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

function getPointsForPlacement(placement, league) {
  const pts = league?.scoring_config?.points
  if (!pts) return placement === 1 ? 3 : placement === 2 ? 2 : placement === 3 ? 1 : 0
  // Last key in the config is the fallback for any placement beyond it
  const sortedKeys = Object.keys(pts).map(Number).sort((a, b) => a - b)
  const lastKey = sortedKeys[sortedKeys.length - 1]
  return pts[String(placement)] ?? pts[String(lastKey)] ?? 0
}

function getPlacementHelperText(league) {
  const pts = league?.scoring_config?.points ?? { '1': 3, '2': 2, '3': 1, '4': 0 }
  const sortedKeys = Object.keys(pts).map(Number).sort((a, b) => a - b)
  const lastKey = sortedKeys[sortedKeys.length - 1]
  return sortedKeys.map((k) => {
    const p = pts[String(k)]
    const label = k === lastKey ? `${ordinal(k)}+` : ordinal(k)
    return `${label} = ${p}pt${p !== 1 ? 's' : ''}`
  }).join(', ')
}

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

export default function LogGamePage() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [league, setLeague] = useState(null)
  const [members, setMembers] = useState([])
  const [myDecks, setMyDecks] = useState([])

  // Game metadata
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 16))
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [spicyPlayDescription, setSpicyPlayDescription] = useState('')
  const [spicyPlayWinnerId, setSpicyPlayWinnerId] = useState('')
  const [entranceWinnerId, setEntranceWinnerId] = useState('')
  const [firstBloodWinnerId, setFirstBloodWinnerId] = useState('')
  const [notes, setNotes] = useState('')

  // Pod size (determines placement options)
  const [podSize, setPodSize] = useState(4)

  // Player results (keyed by member_id)
  const [results, setResults] = useState({})

  useEffect(() => {
    if (!session?.access_token) return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, session?.user?.id])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [leagueData, membersData, decksData] = await Promise.all([
        api.getLeague(leagueId),
        api.getLeagueMembers(leagueId),
        api.getDeckLibrary(),
      ])
      setLeague(leagueData.league)
      setMembers(membersData.members || [])
      setMyDecks(decksData.decks || [])

      // Default pod size to number of members (clamped 2-10)
      const memberCount = membersData.members?.length || 4
      setPodSize(Math.max(2, Math.min(10, memberCount)))

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
        throw new Error('Please assign placements to at least one pilot')
      }

      const uniquePlacements = new Set(placements)
      if (uniquePlacements.size !== placements.length) {
        throw new Error('Each pilot must have a unique placement')
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
            earned_first_blood: memberId === firstBloodWinnerId,
            earned_last_stand: false,
            notes: r.notes || null,
          }
        })

      await api.logGame(leagueId, {
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

      // Find the winner's name for the success message
      const winnerResult = gameResults.find(r => r.earned_win)
      const winnerMember = winnerResult ? members.find(m => m.id === winnerResult.member_id) : null
      const winnerName = winnerMember?.superstar_name || 'The champion'
      
      setSuccess(`Skirmish logged! ${winnerName} claims victory!`)
      setSaving(false)
      
      // Navigate after a brief celebration
      setTimeout(() => navigate(`/leagues/${leagueId}`), 2000)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-[var(--color-text-muted)]">Loading...</div>
        </div>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-[900px] mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-[var(--color-text)] mb-2">
            Log Campaign Skirmish
          </h1>
          <p className="text-[var(--color-text-muted)]">{league?.name}</p>
        </div>

        {error && (
          <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-[var(--color-success-border)] text-[var(--color-success)] px-6 py-4 rounded-lg mb-6 text-center">
            <div className="text-2xl font-brand font-bold mb-1">{success}</div>
            <div className="text-sm text-[var(--color-success)]">Redirecting to campaign page...</div>
          </div>
        )}

        {!success && (

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Game Metadata */}
          <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
            <h2 className="text-lg font-brand font-bold text-[var(--color-text)] mb-4">
              Skirmish Details
            </h2>
            <div>
              <label htmlFor="played-at" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                Date & Time
              </label>
              <input
                id="played-at"
                type="datetime-local"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                required
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="screenshot-url" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                Screenshot URL (optional)
              </label>
              <input
                id="screenshot-url"
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="game-notes" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                Notes (optional)
              </label>
              <textarea
                id="game-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Pilot Results */}
          <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-lg font-brand font-bold text-[var(--color-text)]">
                Pilot Results
              </h2>
            </div>
            <div className="space-y-4">
              {members.map((member) => {
                const placement = results[member.id]?.placement ? Number(results[member.id].placement) : null
                const placementPts = placement ? getPointsForPlacement(placement, league) : 0
                const entrancePts = member.id === entranceWinnerId ? 1 : 0
                const firstBloodPts = member.id === firstBloodWinnerId ? 1 : 0
                const totalPreview = placement ? placementPts + entrancePts + firstBloodPts : null
                
                return (
                <div
                  key={member.id}
                  className="bg-[var(--color-surface)]/40 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div>
                    <div className="text-xs mb-1.5 invisible select-none" aria-hidden="true">·</div>
                    <div className="font-medium text-[var(--color-text)]">
                      {member.superstar_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                      Placement
                    </label>
                    <SelectField
                      value={results[member.id]?.placement || ''}
                      onChange={(e) => updateResult(member.id, 'placement', e.target.value)}
                      className="w-full"
                    >
                      <option value="">—</option>
                      {Array.from({ length: podSize }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? '1st (Winner)' : n === podSize ? `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} (First Out)` : `${n}${n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                      Deck (optional)
                    </label>
                    {member.user_id === session?.user?.id ? (
                      <SelectField
                        value={results[member.id]?.deck_id || ''}
                        onChange={(e) => updateResult(member.id, 'deck_id', e.target.value)}
                        className="w-full"
                      >
                        <option value="">—</option>
                        {myDecks.map((deck) => (
                          <option key={deck.id} value={deck.id}>
                            {deck.deck_name}
                          </option>
                        ))}
                      </SelectField>
                    ) : (
                      <div className="text-xs text-[var(--color-text-muted)] italic py-2">
                        Only the deck owner can select
                      </div>
                    )}
                  </div>
                  </div>
                  {/* Live Points Preview */}
                  {totalPreview !== null && (
                    <div className="mt-2 pt-2 border-t border-[var(--color-primary)]/10 flex items-center gap-3 text-xs">
                      <span className="text-[var(--color-text-muted)]">
                        {ordinal(placement)} → {placementPts} pt{placementPts !== 1 ? 's' : ''}
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

            <div className="mt-4 text-xs text-[var(--color-text-muted)]">
              <strong>Points awarded automatically:</strong> {getPlacementHelperText(league)}. Special award bonuses are assigned below.
            </div>
          </div>

          {/* Special Awards */}
          <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
            <h2 className="text-lg font-brand font-bold text-[var(--color-text)] mb-4">
              Special Awards
            </h2>

            <div className="space-y-4">
              {isAwardEnabled(league, 'entrance_bonus') && (
              <div>
                <label htmlFor="entrance-winner" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                  WWE Entrance of the Week (+1pt)
                </label>
                <SelectField
                  id="entrance-winner"
                  value={entranceWinnerId}
                  onChange={(e) => setEntranceWinnerId(e.target.value)}
                  className="w-full"
                >
                  <option value="">— No winner —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.superstar_name}
                    </option>
                  ))}
                </SelectField>
              </div>
              )}

              {isAwardEnabled(league, 'first_blood') && (
              <div>
                <label htmlFor="first-blood-winner" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                  First Blood — First to Deal Damage (+1pt)
                </label>
                <SelectField
                  id="first-blood-winner"
                  value={firstBloodWinnerId}
                  onChange={(e) => setFirstBloodWinnerId(e.target.value)}
                  className="w-full"
                >
                  <option value="">— No winner —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.superstar_name}
                    </option>
                  ))}
                </SelectField>
              </div>
              )}

              {isAwardEnabled(league, 'spicy_play') && (
              <>
              <div>
                <label htmlFor="spicy-play" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                  Spicy Play of the Week
                </label>
                <textarea
                  id="spicy-play"
                  value={spicyPlayDescription}
                  onChange={(e) => setSpicyPlayDescription(e.target.value)}
                  placeholder="Describe the most unhinged, creative, or devastating play..."
                  rows={2}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label htmlFor="spicy-player" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                  Spicy Play Player
                </label>
                <SelectField
                  id="spicy-player"
                  value={spicyPlayWinnerId}
                  onChange={(e) => setSpicyPlayWinnerId(e.target.value)}
                  className="w-full"
                >
                  <option value="">— No winner —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.superstar_name}
                    </option>
                  ))}
                </SelectField>
              </div>
              </>
              )}
            </div>
          </div>
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
              {saving ? 'Saving...' : 'Log Skirmish'}
            </button>
          </div>
        </form>
        )}
      </div>
    </PageTransition>
  )
}
