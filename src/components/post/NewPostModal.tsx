'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { useApp } from '@/contexts/AppContext'

const POST_TYPES = [
  { id: 'model',      icon: '📊', name: 'Financial Model', desc: 'DCF, LBO, M&A, Custom' },
  { id: 'script',     icon: '⌨',  name: 'Trading Script',  desc: 'Python, Pine, R, MQL' },
  { id: 'macro',      icon: '🌐', name: 'Macro Discussion', desc: 'Rates, FX, Geopolitics' },
  { id: 'discussion', icon: '💬', name: 'Discussion',       desc: 'Analysis, Q&A, Debate' },
]
const MODEL_SUBTYPES = ['dcf','lbo','ma','3stmt','comps','custom']

export default function NewPostModal() {
  const { user, closeModal, showToast, setView } = useApp()
  const supabase = createClient()

  const [type, setType]       = useState<string>('model')
  const [mtype, setMtype]     = useState<string>('dcf')
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setTitle(''); setBody(''); setFile(null); setType('model'); setMtype('dcf')
  }

  async function submit() {
    if (!user) return
    if (!title.trim() && !body.trim()) { showToast('⚠ Add a title or description'); return }
    setLoading(true)

    let file_url: string | null = null
    let file_name: string | null = null
    let file_size: string | null = null

    if (file && (type === 'model' || type === 'script')) {
      const ext  = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('post-files').upload(path, file)
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('post-files').getPublicUrl(path)
        file_url  = urlData.publicUrl
        file_name = file.name
        file_size = `${(file.size / 1024 / 1024).toFixed(1)} MB`
      }
    }

    await supabase.from('posts').insert({
      user_id:    user.id,
      type,
      model_type: type === 'model' ? mtype : null,
      title:      title.trim() || null,
      body:       body.trim()  || null,
      file_url, file_name, file_size,
    })

    setLoading(false)
    resetForm()
    closeModal('newPostModal')
    setView('feed')
    showToast('✓ Post published!')
  }

  const showFile = type === 'model' || type === 'script'

  return (
    <Modal id="newPostModal" title="Create a Post"
      footer={
        <>
          <button className="btn btn-outline" onClick={() => { closeModal('newPostModal'); resetForm() }}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? 'Publishing…' : 'Publish Post'}</button>
        </>
      }>
      {/* post type */}
      <div className="form-group">
        <label className="form-label">Choose Category</label>
        <div className="post-type-grid">
          {POST_TYPES.map(t => (
            <div key={t.id} className={`ptype-card${type === t.id ? ' sel' : ''}`} onClick={() => setType(t.id)}>
              <div className="ptype-icon">{t.icon}</div>
              <div className="ptype-name">{t.name}</div>
              <div className="ptype-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* model subtype */}
      {type === 'model' && (
        <div className="form-group">
          <label className="form-label">Model Type</label>
          <div className="model-sub-row">
            {MODEL_SUBTYPES.map(s => (
              <button key={s} className={`msub${mtype === s ? ' sel' : ''}`} onClick={() => setMtype(s)}>{s.toUpperCase()}</button>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. NVDA DCF — FY2025 Projections" />
      </div>
      <div className="form-group">
        <label className="form-label">Description &amp; Analysis</label>
        <textarea className="form-input" value={body} onChange={e => setBody(e.target.value)} style={{ minHeight:90 }} placeholder="Describe your methodology, assumptions, and key projections…" />
      </div>

      {/* file upload */}
      {showFile && (
        <div className="form-group">
          <label className="form-label">Attach File</label>
          <div className="upload-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor='var(--border3)' }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='' }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor=''; const f=e.dataTransfer.files[0]; if(f) setFile(f) }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls,.py,.pine" style={{ display:'none' }} onChange={e => e.target.files && setFile(e.target.files[0])} />
            {file
              ? <><div className="upload-zone-icon">✅</div><div className="upload-zone-text" style={{ color:'var(--text)' }}>{file.name}</div><div className="upload-zone-sub">{(file.size/1024/1024).toFixed(1)} MB · Ready to publish · <span style={{ color:'var(--red)', cursor:'pointer' }} onClick={e => { e.stopPropagation(); setFile(null) }}>Remove</span></div></>
              : <><div className="upload-zone-icon">📂</div><div className="upload-zone-text">Drag file here or click to browse</div><div className="upload-zone-sub">.xlsx · .xlsm · .xls · .py · .pine · max 50 MB</div></>
            }
          </div>
        </div>
      )}
    </Modal>
  )
}
