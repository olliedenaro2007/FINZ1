'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/ui/Avatar'
import { useApp } from '@/contexts/AppContext'
import type { MacroBoard, Profile } from '@/lib/types'

type Reply = { id: string; body: string; created_at: string; user_id: string; profiles?: Profile }

const CATS = ['Central Banks & Monetary Policy','Inflation & CPI','FX & Interest Rates','Geopolitics & Trade','Recession / Growth Outlook','Credit Markets','Equity Macro','Other']
export default function MacroView() {
  const { user, openModal, closeModal, showToast } = useApp()
  const supabase = createClient()
  const [boards, setBoards]     = useState<MacroBoard[]>([])
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [cat, setCat]           = useState(CATS[0])
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [openBoard, setOpenBoard] = useState<string | null>(null)
  const [replies, setReplies]   = useState<Record<string, Reply[]>>({})
  const [replyText, setReplyText] = useState('')
  const [loadingReplies, setLoadingReplies] = useState(false)

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

  async function openThread(boardId: string) {
    if (openBoard === boardId) { setOpenBoard(null); return }
    setOpenBoard(boardId)
    if (replies[boardId]) return
    setLoadingReplies(true)
    const { data } = await supabase.from('macro_replies').select('*, profiles(*)').eq('macro_board_id', boardId).order('created_at', { ascending: true })
    setReplies(prev => ({ ...prev, [boardId]: (data ?? []) as Reply[] }))
    setLoadingReplies(false)
  }

  async function postReply(boardId: string) {
    if (!user) { openModal('signInModal'); return }
    if (!replyText.trim()) return
    const { data, error } = await supabase.from('macro_replies').insert({ macro_board_id: boardId, user_id: user.id, body: replyText.trim() }).select('*, profiles(*)').single()
    if (error || !data) return
    setReplies(prev => ({ ...prev, [boardId]: [...(prev[boardId] ?? []), data as Reply] }))
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, replies_count: b.replies_count + 1 } : b))
    setReplyText('')
  }

  async function deleteReply(boardId: string, replyId: string) {
    if (!user) return
    await supabase.from('macro_replies').delete().eq('id', replyId).eq('user_id', user.id)
    setReplies(prev => ({ ...prev, [boardId]: prev[boardId].filter(r => r.id !== replyId) }))
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, replies_count: Math.max(0, b.replies_count - 1) } : b))
  }

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
        media_url = data.publicUrl
        file_name = mediaFile.name
      }
    }

    await supabase.from('macro_boards').insert({ user_id: user.id, title: title.trim(), body: body.trim() || null, category: cat, media_url, file_name })
    await supabase.from('posts').insert({ user_id: user.id, type: 'macro', title: title.trim(), body: body.trim() || null, media_url })
    setTitle(''); setBody(''); setMediaFile(null)
    setSubmitting(false)
    closeModal('discModal')
    showToast('✓ Discussion created')
  }

  async function deleteBoard(id: string, boardTitle: string) {
    if (!user) return
    if (!confirm('Delete this discussion?')) return
    await supabase.from('macro_boards').delete().eq('id', id).eq('user_id', user.id)
    await supabase.from('posts').delete().eq('user_id', user.id).eq('type', 'macro').eq('title', boardTitle)
    setBoards(prev => prev.filter(b => b.id !== id))
    showToast('🗑 Discussion deleted')
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
              {user?.id === b.user_id && (
                <button onClick={() => deleteBoard(b.id, b.title)} style={{ marginLeft:8, background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:11 }}>✕ Delete</button>
              )}
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
              <span style={{ color:'var(--gold)', cursor:'pointer' }} onClick={() => openThread(b.id)}>
                {openBoard === b.id ? 'Close thread ↑' : 'Join discussion →'}
              </span>
            </div>

            {openBoard === b.id && (
              <div style={{ marginTop:12, borderTop:'1px solid var(--border)', paddingTop:12 }}>
                {loadingReplies && <div style={{ fontSize:11, color:'var(--text3)', padding:'8px 0' }}>Loading…</div>}
                {(replies[b.id] ?? []).map(r => {
                  const rp = r.profiles
                  const name = rp?.display_name || rp?.username || 'Unknown'
                  return (
                    <div key={r.id} style={{ display:'flex', gap:8, marginBottom:10 }}>
                      <Avatar size="sm" src={rp?.avatar_url} initials={(rp?.username ?? '?').slice(0,2).toUpperCase()} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:12, fontWeight:700 }}>{name}</span>
                          <span style={{ fontSize:10, color:'var(--text3)' }}>{new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
                          {user?.id === r.user_id && (
                            <button onClick={() => deleteReply(b.id, r.id)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:10 }}>✕</button>
                          )}
                        </div>
                        <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{r.body}</div>
                      </div>
                    </div>
                  )
                })}
                {!(replies[b.id] ?? []).length && !loadingReplies && (
                  <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>No replies yet — be the first!</div>
                )}
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <input
                    style={{ flex:1, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px', fontSize:12, color:'var(--text1)' }}
                    placeholder={user ? 'Write a reply…' : 'Sign in to reply'}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && postReply(b.id)}
                    disabled={!user}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => postReply(b.id)}>Reply</button>
                </div>
              </div>
            )}
          </div>
        ))
      }

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
