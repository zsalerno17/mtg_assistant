import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Swords } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { GameCardSkeleton } from '../components/Skeletons'
import PageTransition from '../components/PageTransition'

function ordinal(n) {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

function PlacementBadge({ placement }) {
  const isWin = placement === 1
  return (
    <span
      className={`px-2.5 py-1 rounded text-xs font-bold ${
        isWin
          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
          : 'bg-[var(--color-surface-2)] text-[var(--color-muted)]'
      }`}
    >
      {ordinal(placement)}
    </span>
  )
}

function GameCard({ game, deckMap, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const deck = game.user_decks || (game.deck_id ? deckMap[game.deck_id] : null)
  const date = new Date(game.played_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const time = new Date(game.played_at).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  })

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
        {/* Left: date + pod info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-sm font-medium text-[var(--color-text)]">{date}</span>
            <span className="text-[var(--color-muted)]/50">·</span>
            <span className="text-sm text-[var(--color-muted)]">{time}</span>
            <span className="text-[var(--color-muted)]/50">·</span>
            <span className="text-sm text-[var(--color-muted)]">{game.pod_size}-player pod</span>
          </div>

          {/* Deck info */}
          {deck ? (
            <div className="flex items-center gap-2 mt-1.5">
              {deck.commander_image_uri && (
                <img
                  src={deck.commander_image_uri}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)]"
                />
              )}
              <span className="text-sm text-[var(--color-muted)]">{deck.deck_name}</span>
            </div>
          ) : (
            <span className="text-xs text-[var(--color-muted)]/50 italic">No deck recorded</span>
          )}

          {/* Notes */}
          {game.notes && (
            <p className="mt-2 text-xs text-[var(--color-muted)] leading-relaxed line-clamp-2">
              {game.notes.slice(0, 120)}{game.notes.length > 120 ? '…' : ''}
            </p>
          )}
        </div>

        {/* Right: placement + delete */}
        <div className="flex items-center gap-3 shrink-0">
          <PlacementBadge placement={game.placement} />

          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-[var(--color-danger)] font-medium hover:underline disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors p-1 rounded"
              aria-label="Delete game"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GamesPage() {
  const { session } = useAuth()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [error, setError] = useState(null)
  const [deckMap, setDeckMap] = useState({})

  useEffect(() => {
    if (!session?.access_token) return
    loadInitial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function loadInitial() {
    setLoading(true)
    setError(null)
    try {
      const [gamesData, decksData] = await Promise.all([
        api.getPersonalGames(1),
        api.getDeckLibrary(),
      ])
      setGames(gamesData.games || [])
      setHasMore(gamesData.has_more || false)
      setPage(1)

      // Build id → deck lookup for cards without embedded user_decks
      const map = {}
      for (const d of decksData.decks || []) map[d.id] = d
      setDeckMap(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const data = await api.getPersonalGames(nextPage)
      setGames((prev) => [...prev, ...(data.games || [])])
      setHasMore(data.has_more || false)
      setPage(nextPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  function handleDelete(gameId) {
    setGames((prev) => prev.filter((g) => g.id !== gameId))
  }

  const stats = useMemo(() => {
    if (!games.length) return null
    const total = games.length
    const wins = games.filter((g) => g.placement === 1).length
    const winRate = Math.round((wins / total) * 100)
    const avgPlacement = (games.reduce((sum, g) => sum + g.placement, 0) / total).toFixed(1)

    // Top deck: most wins by deck_id
    const deckWins = {}
    for (const g of games) {
      if (g.placement === 1 && g.deck_id) {
        deckWins[g.deck_id] = (deckWins[g.deck_id] || 0) + 1
      }
    }
    const topDeckId = Object.entries(deckWins).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topDeck = topDeckId
      ? (games.find((g) => g.deck_id === topDeckId)?.user_decks?.deck_name || deckMap[topDeckId]?.deck_name)
      : null

    return { total, wins, winRate, avgPlacement, topDeck }
  }, [games, deckMap])

  return (
    <PageTransition>
      <div className="max-w-[1400px] mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-[var(--color-text)] mb-2">
              My Skirmishes
            </h1>
            <p className="text-[var(--color-muted)] text-sm">
              Track your Commander sessions without a league
            </p>
          </div>
          <Link to="/games/log" className="btn btn-primary">
            + Log Skirmish
          </Link>
        </div>

        {error && (
          <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats tiles */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-text)] mb-0.5">{stats.total}</div>
              <div className="text-xs text-[var(--color-muted)]">Skirmishes Fought</div>
            </div>
            <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400 mb-0.5">{stats.winRate}%</div>
              <div className="text-xs text-[var(--color-muted)]">Win Rate</div>
            </div>
            <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-text)] mb-0.5">{stats.avgPlacement}</div>
              <div className="text-xs text-[var(--color-muted)]">Avg Placement</div>
            </div>
            <div className="bg-[var(--color-surface)]/80 border border-[var(--color-border)] rounded-xl p-4 text-center">
              <div className="text-sm font-bold text-[var(--color-primary)] mb-0.5 truncate px-2" title={stats.topDeck || '—'}>
                {stats.topDeck || '—'}
              </div>
              <div className="text-xs text-[var(--color-muted)]">Top Deck</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <GameCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && games.length === 0 && (
          <div className="text-center py-20">
            <Swords className="w-16 h-16 text-[var(--color-muted)] mx-auto mb-4" />
            <h3 className="text-2xl font-brand font-bold text-[var(--color-text)] mb-3">
              No skirmishes logged yet.
            </h3>
            <p className="text-[var(--color-muted)] mb-6">
              Start tracking your Commander sessions.
            </p>
            <Link to="/games/log" className="btn btn-primary px-6 py-2.5 rounded-lg font-medium">
              Log Your First Skirmish
            </Link>
          </div>
        )}

        {/* Game list */}
        {!loading && games.length > 0 && (
          <div className="space-y-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                deckMap={deckMap}
                onDelete={handleDelete}
              />
            ))}

            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
