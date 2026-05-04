'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { useApp } from '@/contexts/AppContext'
import type { MacroBoard } from '@/lib/types'

const CATS = ['Central Banks & Monetary Policy','Inflation & CPI','FX & Interest Rates','Geopolitics & Trade','Recession / Growth Outlook','Credit Markets','Equity Macro']

export default function MacroView() {
  const { user, openModal, closeModal, showToast } = useApp()
  const supabase = createClient()
  const [boards, setBoards]   = useState<MacroBoard[]>([])
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [cat, setCat]         = useState(CATS[0])
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data } = await supabase.from('macro_boards').select('*, profiles(*)').order('created_at', { ascending: false })
    setBoards((data ?? []) as MacroBoard[])
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('macro-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'macro_boards' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function submit() {
    if (!user) return
    if (!title.trim()) { showToast('⚠ Enter a title'); return }
    setSubmitting(true)

    let media_url: string | null = null
    let file_name: string | null = null
    if (mediaFile) {
      const isPdf = mediaFile.name.toLowerCase().endsWith('.pdf')
      const bucket = isPdf ? 'post-files' : 'post-media'
      const path = `${user.id}/${Date.now()}.${mediaFile.name.split('.').pop()}`
      const { error } = await supabase.storage.from(bucket).upload(path, mediaFile)
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        media_url  = data.publicUrl
        file_name  = mediaFile.name
      }
    }

    await supabase.from('macro_boards').insert({ user_id: user.id, title: title.trim(), body: body.trim() || null, category: cat, media_url, file_name })
    setTitle(''); setBody(''); setMediaFile(null)
    setSubmitting(false)
    closeModal('discModal')
    showToast('✓ Discussion created')
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-title">Macro</div>
        </div>
      </div>
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
        <button className="btn btn-primary btn-sm" onClick={() => user ? openModal('discModal') : openModal('signInModal')}>+ New Discussion</button>
      </div>

      {!boards.length
        ? <div className="section-empty"><div className="section-empty-icon">🌐</div>No discussions yet. Start one!</div>
        : boards.map((b, i) => (
          <div key={b.id} className="disc-board" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="disc-meta">
              <span className="cat-badge">{b.category}</span>
              <span style={{ fontSize:9, color:'var(--text4)', fontFamily:'IBM Plex Mono,monospace', marginLeft:'auto' }}>{new Date(b.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
            </div>
            <div className="disc-title">{b.title}</div>
            {b.body && <div style={{ fontSize:12, color:'var(--text2)', margin:'6px 0', lineHeight:1.55 }}>{b.body}</div>}
            {b.media_url && !b.file_name?.endsWith('.pdf') && (
              <img src={b.media_url} alt="" style={{ maxWidth:'100%', borderRadius:3, margin:'6px 0', border:'1px solid var(--border)' }} />
            )}
            {b.file_name?.endsWith('.pdf') && (
              <div style={{ fontSize:11, color:'var(--blue)', margin:'4px 0' }}>📄 {b.file_name}</div>
            )}
            <div className="disc-stats">
              <span>💬 {b.replies_count} replies</span>
              <span>👁 {b.views_count.toLocaleString()} views</span>
              <span style={{ color:'var(--gold)', cursor:'pointer' }} onClick={() => showToast('💬 Opening thread…')}>Join discussion →</span>
            </div>
          </div>
        ))
      }

      {/* New Discussion Modal */}
      <Modal id="discModal" title="New Macro Discussion"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => closeModal('discModal')}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Creating…' : 'Create Discussion'}</button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Impact of Fed QT on credit spreads" />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-input" value={cat} onChange={e => setCat(e.target.value)}>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Opening Post</label>
          <textarea className="form-input" value={body} onChange={e => setBody(e.target.value)} style={{ minHeight:120 }} placeholder="Start the conversation…" />
        </div>
        <div className="form-group">
          <label className="form-label">Attach Image or PDF (optional)</label>
          <div className="upload-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor='var(--border3)' }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='' }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor=''; const f=e.dataTransfer.files[0]; if(f) setMediaFile(f) }}>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.pdf" style={{ display:'none' }} onChange={e => e.target.files && setMediaFile(e.target.files[0])} />
            {mediaFile
              ? <><div className="upload-zone-icon">✅</div><div className="upload-zone-text" style={{ color:'var(--text)' }}>{mediaFile.name}</div><div className="upload-zone-sub"><span style={{ color:'var(--red)', cursor:'pointer' }} onClick={e => { e.stopPropagation(); setMediaFile(null) }}>Remove</span></div></>
              : <><div className="upload-zone-icon">📎</div><div className="upload-zone-text">Drag image or PDF here or click to browse</div><div className="upload-zone-sub">.jpg · .png · .gif · .pdf · optional</div></>
            }
          </div>
        </div>
      </Modal>
    </div>
  )
}
