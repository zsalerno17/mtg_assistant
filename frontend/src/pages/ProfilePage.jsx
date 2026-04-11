import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { AVATAR_PRESETS, svgDataUrl } from '../lib/avatarPresets'

export default function ProfilePage() {
  const { session, profile, refreshProfile, signOut } = useAuth()
  const userId = session?.user?.id
  const email = session?.user?.email || ''

  const [username, setUsername] = useState(profile?.username || '')
  const [avatarPreview, setAvatarPreview] = useState(null) // local file preview URL
  const [pendingFile, setPendingFile] = useState(null)     // File object awaiting save
  const [selectedPresetId, setSelectedPresetId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)

  // Displayed avatar: local preview > stored profile avatar > null
  const displayAvatar = avatarPreview || profile?.avatar_url || null

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2 MB.')
      return
    }
    setError(null)
    setSelectedPresetId(null)
    setPendingFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handlePresetSelect = (preset) => {
    const svgBlob = new Blob([preset.svg], { type: 'image/svg+xml' })
    const svgFile = new File([svgBlob], `${preset.id}.svg`, { type: 'image/svg+xml' })
    setError(null)
    setSelectedPresetId(preset.id)
    setPendingFile(svgFile)
    setAvatarPreview(svgDataUrl(preset.svg))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      let avatarUrl = profile?.avatar_url || null

      // Upload new avatar to Supabase Storage if one was selected
      if (pendingFile && userId) {
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(userId, pendingFile, { upsert: true, contentType: pendingFile.type })

        if (uploadError) {
          throw new Error(`Avatar upload failed: ${uploadError.message}`)
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(userId)
        avatarUrl = data.publicUrl
        // Clear local preview now that the real URL is set
        setAvatarPreview(null)
        setPendingFile(null)
      }

      // Save profile to backend
      await api.updateProfile({
        username: username.trim() || null,
        avatar_url: avatarUrl,
      })

      await refreshProfile()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-[var(--font-heading)] text-3xl text-[var(--color-text)] tracking-wide mb-2">
            Profile
          </h2>
          <div className="h-px w-16 bg-gradient-to-r from-[var(--color-primary)] to-transparent mb-3" />
          <p className="text-[var(--color-muted)] text-sm">
            Set a username and profile picture for use across the app.
          </p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-border)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center">
                  <span className="text-[var(--color-primary)] text-2xl font-semibold font-[var(--font-mono)]">
                    {email.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                {displayAvatar ? 'Upload your own' : 'Upload a photo'}
              </button>
              <p className="text-[var(--color-muted)] text-xs">
                JPG, PNG, GIF — max 2 MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Preset icons */}
          <div className="space-y-2">
            <p className="text-[var(--color-muted)] text-xs">Or choose an icon:</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-all ${
                    selectedPresetId === preset.id
                      ? 'border-[var(--color-primary)] scale-110 shadow-[0_0_0_2px_var(--color-primary)]/30'
                      : 'border-transparent hover:border-[var(--color-border)] hover:scale-105'
                  }`}
                >
                  <img
                    src={svgDataUrl(preset.svg)}
                    alt={preset.label}
                    className="w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text)]">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3–20 chars: letters, numbers, - _"
              maxLength={20}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]"
            />
            <p className="text-[var(--color-muted)] text-xs">
              This is how you'll appear in league standings.
            </p>
          </div>

          {/* Error / success */}
          {error && (
            <p className="text-[var(--color-danger)] text-sm">{error}</p>
          )}
          {success && (
            <p className="text-emerald-400 text-sm">Profile saved.</p>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-bg)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Sign out */}
        <div className="mt-6">
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
