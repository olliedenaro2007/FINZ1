'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import type { Post, Comment } from '@/lib/types'
import { useApp } from '@/contexts/AppContext'

const BADGE: Record<string, string> = { dcf:'badge-dcf', lbo:'badge-lbo', ma:'badge-ma', custom:'badge-custom', script:'badge-script', macro:'badge-macro' }
const ICONS: Record<string, string> = { dcf:'📊', lbo:'⚡', ma:'🔀', custom:'🔧', script:'⌨', macro:'🌐' }

type Props = { post: Post; delay?: number }

export default function PostCard({ post, delay = 0 }: Props) {
  const { user, openModal, showToast, setView } = useApp()
  const supabase = createClient()
  const [liked, setLiked]     = useState(post.liked ?? false)
  const [likes, setLikes]     = useState(post.likes_count)
  const [saved, setSaved]     = useState(post.saved ?? false)
  const [saves, setSaves]     = useState(post.saves_count)
  const [comments, setComments] = useState(post.comments_count)
  const [panelOpen, setPanelOpen] = useState(false)
  const [commentList, setCommentList] = useState<Comment[]>([])
  const [cmtBody, setCmtBody] = useState('')
  const [loadingCmts, setLoadingCmts] = useState(false)

  const profile = post.profiles
  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? '??'
  const displayName = profile?.display_name || profile?.username || 'Unknown'
  const handle = '@' + (profile?.username ?? 'unknown')
  const timeStr = new Date(post.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })

  function requireAuth(cb: () => void) {
    if (!user) { openModal('signInModal'); return }
    cb()
  }

  async function toggleLike() {
    requireAuth(async () => {
      if (liked) {
        await supabase.from('likes').delete().match({ post_id: post.id, user_id: user!.id })
        setLiked(false); setLikes(l => l - 1)
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user!.id })
        setLiked(true); setLikes(l => l + 1)
        // notify post author
        if (profile?.id && profile.id !== user!.id) {
          await supabase.from('notifications').insert({ user_id: profile.id, from_user_id: user!.id, type: 'like', post_id: post.id, message: `@${user!.email?.split('@')[0]} liked your post` })
        }
      }
    })
  }

  async function toggleSave() {
    requireAuth(async () => {
      if (saved) {
        await supabase.from('bookmarks').delete().match({ post_id: post.id, user_id: user!.id })
        setSaved(false); setSaves(s => s - 1)
        showToast('🔖 Removed from bookmarks')
      } else {
        await supabase.from('bookmarks').insert({ post_id: post.id, user_id: user!.id })
        setSaved(true); setSaves(s => s + 1)
        showToast('🔖 Bookmarked')
      }
    })
  }

  async function openComments() {
    requireAuth(async () => {
      setPanelOpen(o => !o)
      if (!panelOpen && !commentList.length) {
        setLoadingCmts(true)
        const { data } = await supabase.from('comments').select('*, profiles(*)').eq('post_id', post.id).order('created_at', { ascending: false }).limit(20)
        setCommentList((data ?? []) as Comment[])
        setLoadingCmts(false)
      }
    })
  }

  async function postComment() {
    if (!user || !cmtBody.trim()) return
    const { data, error } = await supabase.from('comments').insert({ post_id: post.id, user_id: user.id, body: cmtBody.trim() }).select('*, profiles(*)').single()
    if (error || !data) return
    setCommentList(prev => [data as Comment, ...prev])
    setComments(c => c + 1)
    setCmtBody('')
    // notify post author
    if (profile?.id && profile.id !== user.id) {
      await supabase.from('notifications').insert({ user_id: profile.id, from_user_id: user.id, type: 'comment', post_id: post.id, message: `@${user.email?.split('@')[0]} commented on your post` })
    }
  }

  return (
    <div className="post" style={{ animationDelay: `${delay}s` }}>
      <div className="post-inner">
        <Avatar size="md" src={profile?.avatar_url} initials={initials} />
        <div className="post-body">
          <div className="post-header">
            <span className="poster-name">{displayName}</span>
            <span className="poster-handle">{handle}</span>
            {profile?.role && <span className="role-tag">{profile.role}</span>}
            <span className="post-time">{timeStr}</span>
          </div>
          <div className="post-text">{post.body || post.title}</div>

          {/* Model card */}
          {post.type === 'model' && post.title && (
            <div className="model-card">
              <div className="model-card-top">
                <div className="model-type-icon">{ICONS[post.model_type ?? 'custom'] ?? '📄'}</div>
                <div className="model-title-area">
                  <div className="model-title">{post.title}</div>
                  <span className={`model-badge ${BADGE[post.model_type ?? 'custom'] ?? 'badge-custom'}`}>
                    {(post.model_type ?? 'custom').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="model-kpis">
                {[{ l:'EV', v:'TBD' }, { l:'IRR', v:'—' }, { l:'MoM', v:'—' }].map(k => (
                  <div key={k.l} className="kpi"><div className="kpi-label">{k.l}</div><div className="kpi-val w">{k.v}</div></div>
                ))}
              </div>
              {post.file_name && (
                <div className="model-card-foot">
                  {post.file_url
                    ? <a className="file-pill" href={post.file_url} download={post.file_name}>📄 {post.file_name}</a>
                    : <span className="file-pill">📄 {post.file_name}</span>
                  }
                  {post.file_size && <span style={{ marginLeft:'auto' }}>{post.file_size}</span>}
                </div>
              )}
            </div>
          )}

          {/* Macro media */}
          {post.media_url && (
            <img src={post.media_url} alt="" style={{ maxWidth:'100%', borderRadius:3, marginBottom:8, border:'1px solid var(--border)' }} />
          )}

          {/* Post actions */}
          <div className="post-actions">
            <button className={`act${liked ? ' liked' : ''}`} onClick={toggleLike}>
              <span className="act-icon">♥</span><span>{likes}</span>
            </button>
            <button className="act" onClick={openComments}>
              <span className="act-icon">💬</span><span>{comments}</span>
            </button>
            <button className={`act${saved ? ' saved' : ''}`} onClick={toggleSave}>
              <span className="act-icon">🔖</span><span>{saves}</span>
            </button>
            <button className="act" onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast('🔗 Link copied!') }}>
              <span className="act-icon">↗</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline comment panel */}
      <div className={`comment-panel${panelOpen ? ' open' : ''}`}>
        <div className="cp-header">
          <span className="cp-title">Comments · {comments}</span>
          <button className="cp-close" onClick={() => setPanelOpen(false)}>✕ Close</button>
        </div>
        <div className="comment-list">
          {loadingCmts && <div style={{ padding:'12px 16px', fontSize:11, color:'var(--text3)' }}>Loading…</div>}
          {commentList.map(c => {
            const cp = c.profiles
            return (
              <div key={c.id} className="cmt-item">
                <Avatar size="sm" src={cp?.avatar_url} initials={(cp?.username ?? '?').slice(0, 2).toUpperCase()} />
                <div className="cmt-body">
                  <div className="cmt-head">
                    <span className="cmt-author">{cp?.display_name || cp?.username}</span>
                    <span className="cmt-time">{new Date(c.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
                  </div>
                  <div className="cmt-text">{c.body}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="comment-input-row">
          <input className="comment-input" value={cmtBody} onChange={e => setCmtBody(e.target.value)} placeholder="Write a comment…" onKeyDown={e => e.key === 'Enter' && postComment()} />
          <button className="comment-send" onClick={postComment}>Post</button>
        </div>
      </div>
    </div>
  )
}
