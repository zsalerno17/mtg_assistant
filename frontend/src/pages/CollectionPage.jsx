import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import PageTransition from '../components/PageTransition'

export default function CollectionPage() {
  const { session } = useAuth()
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [collection, setCollection] = useState(null)
  const [search, setSearch] = useState('')
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  const loadingMessages = [
    "Consulting the Scryfall oracle...",
    "Calculating mana curves...",
    "Categorizing card types...",
    "Reading oracle text...",
    "Identifying color identities...",
    "Enchanting your collection...",
    "Shuffling through the multiverse...",
    "Tapping into card data...",
    "Casting data enrichment spells...",
    "Searching plane by plane...",
  ]

  useEffect(() => {
    if (!session?.access_token) return
    api.getCollection()
      .then(data => setCollection(data))
      .catch(() => {}) // silently ignore; user may not have uploaded yet
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  useEffect(() => {
    if (!uploading) {
      setLoadingMessageIndex(0)
      return
    }
    
    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length)
    }, 2500)
    
    return () => clearInterval(interval)
  }, [uploading, loadingMessages.length])

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
    <PageTransition>
      <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-8 pt-10 pb-6">
      <div className="mb-8">
        <h2 className="font-brand text-3xl sm:text-4xl text-[var(--color-primary)] tracking-wide mb-2">
          My Collection
        </h2>
        <div className="h-px w-20 bg-[var(--color-primary-border)] mb-3" />
        <p className="text-[var(--color-muted)] text-sm font-heading">
          Export your collection from Moxfield and upload it here.
        </p>
        <p className="text-[var(--color-muted)] text-xs mt-2 opacity-75">
          Re-uploading will replace your existing collection — no duplicates or deduping needed.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-[var(--color-primary)] bg-[var(--color-surface)]/80 backdrop-blur-sm'
            : uploading
            ? 'border-[var(--color-muted)] opacity-60'
            : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
        }`}
        onClick={() => !uploading && document.getElementById('csv-input').click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            
            <div className="text-center space-y-3 max-w-xs">
              <p className="text-[var(--color-text)] text-sm font-medium transition-all duration-500">
                {loadingMessages[loadingMessageIndex]}
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-[var(--color-secondary)] animate-pulse" 
                     style={{ width: '100%' }} 
                />
              </div>
              
              <p className="text-[var(--color-muted)] text-xs">
                This takes 30–60 seconds for large collections
              </p>
            </div>
          </div>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-3 text-[var(--color-muted)] opacity-50">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
            </svg>
            <p className="text-[var(--color-text)] font-medium mb-1">Drop your Moxfield CSV here</p>
            <p className="text-[var(--color-muted)] text-sm mb-2">or click to browse</p>
            <a
              href="https://www.moxfield.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--color-secondary)] text-xs hover:underline"
            >
              How to export from Moxfield ↗
            </a>
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
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(251,191,36,0.12)] transition-all w-48"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: i * 0.03,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-lg px-3 py-2 flex items-center justify-between hover:border-[var(--color-muted)]/60 transition-colors"
              >
                <span className="text-[var(--color-text)] text-sm truncate">{card.name}</span>
                <span className="text-[var(--color-muted)] font-mono text-xs ml-2 shrink-0">×{card.quantity}</span>
              </motion.div>
            ))}
          </div>

          {search && filteredCards.length === 0 && (
            <p className="text-[var(--color-muted)] text-sm mt-4">No cards match "{search}"</p>
          )}
        </div>
      )}
      </div>
    </div>
    </PageTransition>
  )
}
