import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import PageTransition from '../components/PageTransition'
import { SelectField } from '../components/shared'

function ordinal(n) {
  if (n === 1) return '1st (Winner)'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

export default function LogPersonalGamePage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [myDecks, setMyDecks] = useState([])
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 16))
  const [podSize, setPodSize] = useState(4)
  const [placement, setPlacement] = useState(1)
  const [deckId, setDeckId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!session?.access_token) return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getDeckLibrary()
      setMyDecks(data.decks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Keep placement in bounds when pod size changes
  function handlePodSizeChange(newSize) {
    const size = Number(newSize)
    setPodSize(size)
    if (placement > size) setPlacement(size)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.logPersonalGame({
        played_at: new Date(playedAt).toISOString(),
        pod_size: podSize,
        placement,
        deck_id: deckId || null,
        notes: notes.trim() || null,
      })
      setSuccess(true)
      setTimeout(() => navigate('/games'), 1500)
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
            Log a Skirmish
          </h1>
          <p className="text-[var(--color-text-muted)]">Track a Commander session without a campaign</p>
        </div>

        {error && (
          <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-[var(--color-success-border)] text-[var(--color-success)] px-6 py-4 rounded-lg mb-6 text-center">
            <div className="text-2xl font-brand font-bold mb-1">Skirmish logged!</div>
            <div className="text-sm">Heading back to your skirmish history…</div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Skirmish Details */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-brand font-bold text-[var(--color-text)] mb-4">
                Skirmish Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="played-at" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Date &amp; Time
                  </label>
                  <input
                    id="played-at"
                    type="datetime-local"
                    value={playedAt}
                    onChange={(e) => setPlayedAt(e.target.value)}
                    required
                    disabled={saving}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="pod-size" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Pod Size
                  </label>
                  <SelectField
                    id="pod-size"
                    value={podSize}
                    onChange={(e) => handlePodSizeChange(e.target.value)}
                    disabled={saving}
                    className="w-full"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>{n} players</option>
                    ))}
                  </SelectField>
                </div>
              </div>
            </div>

            {/* Your Result */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-brand font-bold text-[var(--color-text)] mb-4">
                Your Result
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="placement" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Placement
                  </label>
                  <SelectField
                    id="placement"
                    value={placement}
                    onChange={(e) => setPlacement(Number(e.target.value))}
                    disabled={saving}
                    className="w-full"
                  >
                    {Array.from({ length: podSize }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{ordinal(n)}</option>
                    ))}
                  </SelectField>
                </div>

                <div>
                  <label htmlFor="deck" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Deck Played <span className="text-[var(--color-text-muted)]/60">(optional)</span>
                  </label>
                  {myDecks.length > 0 ? (
                    <SelectField
                      id="deck"
                      value={deckId}
                      onChange={(e) => setDeckId(e.target.value)}
                      disabled={saving}
                      className="w-full"
                    >
                      <option value="">— No deck selected —</option>
                      {myDecks.map((deck) => (
                        <option key={deck.id} value={deck.id}>{deck.deck_name}</option>
                      ))}
                    </SelectField>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)] italic py-2">
                      No decks in your library yet. Import one to track deck performance.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Notes <span className="text-[var(--color-text-muted)]/60">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Memorable moments, opponents played, game highlights…"
                    rows={4}
                    disabled={saving}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] font-mono text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => navigate('/games')}
                disabled={saving}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary min-w-[140px]"
              >
                {saving ? 'Saving…' : 'Log Skirmish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </PageTransition>
  )
}
