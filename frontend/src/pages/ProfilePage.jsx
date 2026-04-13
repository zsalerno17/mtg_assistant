import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { AVATAR_PRESETS, CREATURE_PRESETS, CREATURE_PRESET_MAP, isPresetUrl, urlToPresetId, presetIdToUrl, isCreaturePreset } from '../lib/avatarPresets'
import { CreaturePresetIcon } from '../lib/creatureIcons'
import PageTransition from '../components/PageTransition'

export default function ProfilePage() {
  const { session, profile, refreshProfile, signOut } = useAuth()
  const [searchParams] = useSearchParams()
  const isFirstTime = searchParams.get('firstTime') === '1'
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
    setError(null)
    setSelectedPresetId(preset.id)
    setPendingFile(null)
    setAvatarPreview(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      let avatarUrl = profile?.avatar_url || null

      // Preset: store the preset ID directly — no file upload needed
      if (selectedPresetId) {
        avatarUrl = presetIdToUrl(selectedPresetId)
      } else if (pendingFile && userId) {
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
      // (no else needed — preset case handled above)

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

  const renderCreatureAvatar = (id, sizeClass = 'w-20 h-20', iconClass = 'w-14 h-14') => {
    const p = CREATURE_PRESET_MAP[id]
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center overflow-hidden`}
        style={{ background: p?.bg ?? '#1e293b', color: p?.iconColor ?? '#94a3b8', border: '2px solid rgba(255,255,255,0.08)' }}
      >
        <CreaturePresetIcon id={id} className={iconClass} />
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-8 pt-10 pb-6">
        {/* First-time welcome banner */}
        {isFirstTime && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4">
            <p className="font-heading text-[var(--color-primary)] text-sm tracking-wide mb-1">Welcome to MTG Assistant!</p>
            <p className="text-[var(--color-muted)] text-xs">Pick a username and avatar, then head to the dashboard to import your first deck.</p>
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-brand text-3xl sm:text-4xl text-[var(--color-primary)] tracking-wide mb-2">
            Profile
          </h2>
          <div className="h-px w-20 bg-[var(--color-primary-border)] mb-3" />
          <p className="text-[var(--color-muted)] text-sm font-heading">
            Set a username and profile picture for use across the app.
          </p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {selectedPresetId ? (
                isCreaturePreset(selectedPresetId) ? (
                  renderCreatureAvatar(selectedPresetId)
                ) : (
                  <i className={`ms ms-${selectedPresetId} ms-cost ms-shadow`} style={{ fontSize: '5rem' }} aria-label={selectedPresetId}/>
                )
              ) : isPresetUrl(displayAvatar) ? (
                isCreaturePreset(urlToPresetId(displayAvatar)) ? (
                  renderCreatureAvatar(urlToPresetId(displayAvatar))
                ) : (
                  <i className={`ms ms-${urlToPresetId(displayAvatar)} ms-cost ms-shadow`} style={{ fontSize: '5rem' }} aria-label={urlToPresetId(displayAvatar)}
                />
                )
              ) : displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-border)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center">
                  <span className="text-[var(--color-primary)] text-2xl font-semibold font-mono">
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

          {/* Preset icons — mana symbols */}
          <div className="space-y-2">
            <p className="text-[var(--color-muted)] text-xs">Mana symbols</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  className={`flex items-center justify-center transition-all outline-none rounded-full ${
                    selectedPresetId === preset.id
                      ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)] scale-110'
                      : 'opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <i className={`ms ms-${preset.id} ms-cost ms-shadow`} style={{ fontSize: '2.5rem' }} aria-hidden="true"/>
                </button>
              ))}
            </div>
          </div>

          {/* Preset icons — creature archetypes */}
          <div className="space-y-2">
            <p className="text-[var(--color-muted)] text-xs">Characters</p>
            <div className="flex flex-wrap gap-2">
              {CREATURE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-all outline-none ${
                    selectedPresetId === preset.id
                      ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)] scale-110'
                      : 'opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ background: preset.bg, color: preset.iconColor, border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <CreaturePresetIcon id={preset.id} className="w-8 h-8"/>
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
            className="btn btn-primary w-full"
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
    </PageTransition>
  )
}
