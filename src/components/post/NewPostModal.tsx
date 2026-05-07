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
const MACRO_CATS = ['Central Banks & Monetary Policy','Inflation & CPI','FX & Interest Rates','Geopolitics & Trade','Recession / Growth Outlook','Credit Markets','Equity Macro','Other']

export default function NewPostModal() {
  const { user, closeModal, showToast, setView } = useApp()
  const supabase = createClient()

  const [type, setType]       = useState<string>('model')
  const [mtype, setMtype]     = useState<string>('dcf')
  const [macroCat, setMacroCat] = useState<string>(MACRO_CATS[0])
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [files, setFiles]     = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setTitle(''); setBody(''); setFiles([]); setType('model'); setMtype('dcf'); setMacroCat(MACRO_CATS[0])
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      const newOnes = Array.from(incoming).filter(f => !existing.has(f.name))
      return [...prev, ...newOnes]
    })
  }

  function removeFile(name: string) {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  async function submit() {
    if (!user) return
    if (!title.trim() && !body.trim()) { showToast('⚠ Add a title or description'); return }
    setLoading(true)

    let uploadedFiles: { url: string; name: string; size: string }[] = []

    if (files.length > 0 && (type === 'model' || type === 'script')) {
      const uploads = await Promise.all(files.map(async file => {
        const ext  = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('post-files').upload(path, file)
        if (upErr) return null
        const { data: urlData } = supabase.storage.from('post-files').getPublicUrl(path)
        return { url: urlData.publicUrl, name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB` }
      }))
      uploadedFiles = uploads.filter(Boolean) as typeof uploadedFiles
    }

    const first = uploadedFiles[0] ?? null

    await supabase.from('posts').insert({
      user_id:    user.id,
      type,
      model_type: type === 'model' ? mtype : null,
      title:      title.trim() || null,
      body:       body.trim()  || null,
      file_url:   first?.url  ?? null,
      file_name:  first?.name ?? null,
      file_size:  first?.size ?? null,
      files:      uploadedFiles,
    })

    if (type === 'macro' || type === 'discussion') {
      await supabase.from('macro_boards').insert({
        user_id:  user.id,
        title:    title.trim() || null,
        body:     body.trim()  || null,
        category: macroCat,
      })
    }

    setLoading(false)
    resetForm()
    closeModal('newPostModal')
    setView('feed')
    showToast('✓ Post published!')
  }

  const showFile = type === 'model' || type === 'script' || type === 'discussion'
  const totalSize = files.reduce((acc, f) => acc + f.size, 0)

  return (
    <Modal id="newPostModal" title="Create a Post"
      footer={
        <>
          <button className="btn btn-outline" onClick={() => { closeModal('newPostModal'); resetForm() }}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? 'Publishing…' : 'Publish Post'}</button>
        </>
      }>
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

      {(type === 'macro' || type === 'discussion') && (
        <div className="form-group">
          <label className="form-label">Topic Category</label>
          <select className="form-input" value={macroCat} onChange={e => setMacroCat(e.target.value)}>
            {MACRO_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
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

      {showFile && (
        <div className="form-group">
          <label className="form-label">Attach Files</label>
          <div className="upload-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor='var(--border3)' }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='' }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor=''; addFiles(e.dataTransfer.files) }}>
            <input ref={fileRef} type="file" multiple accept=".xlsx,.xlsm,.xls,.py,.pine" style={{ display:'none' }} onChange={e => addFiles(e.target.files)} />
            {files.length === 0
              ? <><div className="upload-zone-icon">📂</div><div className="upload-zone-text">Drag files here or click to browse</div><div className="upload-zone-sub">.xlsx · .xlsm · .xls · .py · .pine · max 50 MB each</div></>
              : <><div className="upload-zone-icon">📂</div><div className="upload-zone-text">Click or drag to add more files</div><div className="upload-zone-sub">{files.length} file{files.length > 1 ? 's' : ''} · {(totalSize/1024/1024).toFixed(1)} MB total</div></>
            }
          </div>
          {files.length > 0 && (
            <div style={{ marginTop: 8, display:'flex', flexDirection:'column', gap: 4 }}>
              {files.map(f => (
                <div key={f.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--surface2)', borderRadius:4, fontSize:12 }}>
                  <span>📄</span>
                  <span style={{ flex:1 }}>{f.name}</span>
                  <span style={{ color:'var(--text3)' }}>{(f.size/1024/1024).toFixed(1)} MB</span>
                  <button onClick={e => { e.stopPropagation(); removeFile(f.name) }} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
