import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { SwordsIcon } from '../components/LeagueIcons'
import PageTransition from '../components/PageTransition'

export default function JoinLeaguePage() {
  const { inviteToken } = useParams()
  const navigate = useNavigate()
  const [superstarName, setSuperstarName] = useState('')
  const [catchphrase, setCatchphrase] = useState('')
  const [entranceMusicUrl, setEntranceMusicUrl] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  async function handleJoin(e) {
    e.preventDefault()
    setJoining(true)
    setError(null)
    try {
      const data = await api.joinViaInvite(inviteToken, {
        superstar_name: superstarName,
        entrance_music_url: entranceMusicUrl || null,
        catchphrase: catchphrase || null,
      })
      navigate(`/leagues/${data.league_id}`)
    } catch (err) {
      setError(err.message)
      setJoining(false)
    }
  }

  return (
    <PageTransition>
      <div className="max-w-[600px] mx-auto px-8 py-10">
      <div className="text-center mb-8">
        <SwordsIcon className="w-14 h-14 text-[var(--color-primary)] mx-auto mb-4" />
        <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl font-bold text-primary mb-2">
          Join the Battle
        </h1>
        <p className="text-secondary">
          You've been invited to join a Commander league. Create your wrestler persona below!
        </p>
      </div>

      {error && (
        <div className="bg-[var(--color-danger-subtle)] border border-[var(--color-danger-border)] text-[var(--color-danger)] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleJoin} className="bg-surface border border-accent/30 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">
            Superstar Name *
          </label>
          <input
            type="text"
            value={superstarName}
            onChange={(e) => setSuperstarName(e.target.value)}
            placeholder="The Undisputed Champion"
            required
            maxLength={100}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-secondary)] mb-1.5">
            Catchphrase (optional)
          </label>
          <input
            type="text"
            value={catchphrase}
            onChange={(e) => setCatchphrase(e.target.value)}
            placeholder="Can you smell what The Rock is cooking?"
            maxLength={500}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-secondary)] mb-1.5">
            Entrance Music URL (optional)
          </label>
          <input
            type="url"
            value={entranceMusicUrl}
            onChange={(e) => setEntranceMusicUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <button
          type="submit"
          disabled={joining || !superstarName.trim()}
          className="w-full btn btn-primary px-6 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {joining ? 'Joining...' : 'Enter the Arena'}
        </button>
      </form>
    </div>
    </PageTransition>
  )
}
