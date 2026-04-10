import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function CollectionPage() {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [collection, setCollection] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getCollection()
      .then(data => setCollection(data))
      .catch(() => {}) // silently ignore; user may not have uploaded yet
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) uploadFile(file)
  }

  const uploadFile = async (file) => {
    setUploading(true)
    setError(null)
    setStatus(null)
    try {
      const result = await api.uploadCollection(file)
      setStatus(`Imported ${result.cards_imported} cards`)
      // Refresh collection display
      const updated = await api.getCollection()
      setCollection(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const filteredCards = collection?.cards
    ? collection.cards.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : []

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-6">
      <h2 className="font-[var(--font-heading)] text-2xl text-[var(--color-primary)] mb-2">
        My Collection
      </h2>
      <p className="text-[var(--color-muted)] text-sm mb-8">
        Export your collection from Moxfield (Tools → Export → CSV) and upload it here.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-[var(--color-primary)] bg-[var(--color-surface)]'
            : uploading
            ? 'border-[var(--color-muted)] opacity-60'
            : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
        }`}
        onClick={() => !uploading && document.getElementById('csv-input').click()}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--color-muted)] text-sm">Uploading…</span>
          </div>
        ) : (
          <>
            <p className="text-[var(--color-muted)] mb-2">Drop your Moxfield CSV here</p>
            <p className="text-[var(--color-muted)] text-sm">or click to browse</p>
          </>
        )}
        <input id="csv-input" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileInput} />
      </div>

      {status && <p className="mt-4 text-[var(--color-success)] text-sm">{status}</p>}
      {error && <p className="mt-4 text-[var(--color-danger)] text-sm">{error}</p>}

      {collection?.cards?.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--color-text)] font-medium">
              {collection.cards.length} cards
              {collection.updated_at && (
                <span className="text-[var(--color-muted)] text-sm font-normal ml-2">
                  · updated {new Date(collection.updated_at).toLocaleDateString()}
                </span>
              )}
            </h3>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards…"
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[var(--color-primary)] w-48"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredCards.map((card, i) => (
              <div
                key={i}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-2 flex items-center justify-between"
              >
                <span className="text-[var(--color-text)] text-sm truncate">{card.name}</span>
                <span className="text-[var(--color-muted)] font-[var(--font-mono)] text-xs ml-2 shrink-0">×{card.quantity}</span>
              </div>
            ))}
          </div>

          {search && filteredCards.length === 0 && (
            <p className="text-[var(--color-muted)] text-sm mt-4">No cards match "{search}"</p>
          )}
        </div>
      )}
    </div>
  )
}
