'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/ui/Avatar'
import { useApp } from '@/contexts/AppContext'

const BG_PRESETS = [
  'linear-gradient(135deg,#1a1a2e,#16213e)',
  'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
  'linear-gradient(135deg,#1a0533,#2d0b5a)',
  'linear-gradient(135deg,#0a0a0a,#1a1a1a)',
  'linear-gradient(135deg,#051937,#004d7a,#008793)',
]

export default function EditProfileModal() {
  const { user, profile, closeModal, showToast, refreshProfile } = useApp()
  const supabase = createClient()
  const picRef = useRef<HTMLInputElement>(null)
  const bgRef  = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [role, setRole]               = useState(profile?.role ?? '')
  const [bio, setBio]                 = useState(profile?.bio ?? '')
  const [picFile, setPicFile]         = useState<File | null>(null)
  const [picPreview, setPicPreview]   = useState<string | null>(profile?.avatar_url ?? null)
  const [bgFile, setBgFile]           = useState<File | null>(null)
  const [bgGradient, setBgGradient]   = useState<string | null>(profile?.bg_gradient ?? null)
  const [saving, setSaving]           = useState(false)

  function onPicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setPicFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPicPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }
  function onBgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setBgFile(f); setBgGradient(null)
    showToast('✓ Background image selected')
  }

  async function save() {
    if (!user) return
    setSaving(true)
    const updates: Record<string, string | null> = { display_name: displayName, role, bio }

    if (picFile) {
      const path = `${user.id}/avatar.${picFile.name.split('.').pop()}`
      const { error: picErr } = await supabase.storage.from('avatars').upload(path, picFile, { upsert: true })
      if (picErr) { showToast('⚠ Photo upload failed: ' + picErr.message); setSaving(false); return }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      updates.avatar_url = data.publicUrl + '?t=' + Date.now()
    }
    if (bgFile) {
      const path = `${user.id}/bg.${bgFile.name.split('.').pop()}`
      const { error: bgErr } = await supabase.storage.from('backgrounds').upload(path, bgFile, { upsert: true })
      if (bgErr) { showToast('⚠ Background upload failed: ' + bgErr.message); setSaving(false); return }
      const { data } = supabase.storage.from('backgrounds').getPublicUrl(path)
      updates.bg_url = data.publicUrl + '?t=' + Date.now()
      updates.bg_gradient = null
    } else if (bgGradient) {
      updates.bg_gradient = bgGradient
      updates.bg_url = null
    }

    const { error: profileErr } = await supabase.from('profiles').update(updates).eq('id', user.id)
    if (profileErr) { showToast('⚠ Profile save failed: ' + profileErr.message); setSaving(false); return }
    await refreshProfile()
    setSaving(false)
    closeModal('editProfileModal')
    showToast('✓ Profile updated')
  }

  const initials = (profile?.username ?? 'U').slice(0, 2).toUpperCase()

  return (
    <Modal id="editProfileModal" title="Edit Profile"
      footer={
        <>
          <button className="btn btn-outline" onClick={() => closeModal('editProfileModal')}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </>
      }>
      <div className="form-group">
        <label className="form-label">Profile Picture</label>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:4 }}>
          <Avatar size="xl" src={picPreview} initials={initials} />
          <div>
            <button className="btn btn-outline btn-sm" onClick={() => picRef.current?.click()}>Upload Photo</button>
            <input ref={picRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onPicChange} />
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:5 }}>Square image recommended</div>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Profile Background</label>
        <div style={{ marginTop:4 }}>
          <button className="btn btn-outline btn-sm" onClick={() => bgRef.current?.click()}>Upload Background Image</button>
          <input ref={bgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onBgChange} />
          <div className="bg-presets">
            {BG_PRESETS.map(g => (
              <div key={g} className={`bg-preset${bgGradient === g ? ' sel' : ''}`}
                style={{ background: g }}
                onClick={() => { setBgGradient(g); setBgFile(null) }} />
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Display Name</label>
        <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Alex Johnson" />
      </div>
      <div className="form-group">
        <label className="form-label">Title / Role</label>
        <input className="form-input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Goldman Sachs Analyst" />
      </div>
      <div className="form-group">
        <label className="form-label">Bio</label>
        <textarea className="form-input" value={bio} onChange={e => setBio(e.target.value)} style={{ minHeight:90 }} placeholder="Tell the community about yourself…" />
      </div>
    </Modal>
  )
}
