import { useState } from 'react'

export default function CollectionPage() {
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState(null)

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

  const uploadFile = (file) => {
    // Phase 3: wire to POST /api/collection/upload
    setStatus(`Selected: ${file.name} — API wiring pending (Phase 3)`)
  }

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
            : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
        }`}
        onClick={() => document.getElementById('csv-input').click()}
      >
        <p className="text-[var(--color-muted)] mb-2">Drop your Moxfield CSV here</p>
        <p className="text-[var(--color-muted)] text-sm">or click to browse</p>
        <input id="csv-input" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileInput} />
      </div>

      {status && (
        <p className="mt-4 text-[var(--color-success)] text-sm">{status}</p>
      )}
    </div>
  )
}
