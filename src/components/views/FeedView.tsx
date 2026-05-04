'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PostCard from '@/components/post/PostCard'
import type { Post } from '@/lib/types'
import { useApp } from '@/contexts/AppContext'

const FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'model',      label: 'Models' },
  { id: 'script',     label: 'Scripts' },
  { id: 'macro',      label: 'Macro' },
  { id: 'discussion', label: 'Discussion' },
]

function engagementScore(p: Post) {
  return p.likes_count + p.comments_count * 2 + p.saves_count
}

export default function FeedView() {
  const supabase = createClient()
  const { user } = useApp()
  const [tab, setTab]       = useState<'foryou' | 'trending'>('foryou')
  const [filter, setFilter] = useState('all')
  const [posts, setPosts]   = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('posts').select('*, profiles(*)')

    if (tab === 'trending') {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', cutoff).order('likes_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    if (filter !== 'all') query = query.eq('type', filter)
    query = query.limit(100)

    const { data } = await query
    if (!data) { setLoading(false); return }

    let enriched = data as Post[]

    if (user) {
      const ids = enriched.map(p => p.id)
      const [{ data: likedRows }, { data: savedRows }] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('bookmarks').select('post_id').eq('user_id', user.id).in('post_id', ids),
      ])
      const likedSet = new Set(likedRows?.map(r => r.post_id) ?? [])
      const savedSet = new Set(savedRows?.map(r => r.post_id) ?? [])
      enriched = enriched.map(p => ({ ...p, liked: likedSet.has(p.id), saved: savedSet.has(p.id) }))
    }

    if (tab === 'foryou') enriched.sort((a, b) => engagementScore(b) - engagementScore(a))

    setPosts(enriched)
    setLoading(false)
  }, [supabase, user, tab, filter])

  useEffect(() => { loadPosts() }, [loadPosts])

  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => loadPosts())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, () => loadPosts())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadPosts])

  return (
    <div>
      <div className="topbar">
        <div className="topbar-tabs">
          <button className={`t-tab${tab === 'foryou' ? ' active' : ''}`} onClick={() => setTab('foryou')}>For You</button>
          <button className={`t-tab${tab === 'trending' ? ' active' : ''}`} onClick={() => setTab('trending')}>Trending</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, padding:'10px 16px', borderBottom:'1px solid var(--border)', overflowX:'auto' }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding:'4px 12px', borderRadius:20, fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
              background: filter === f.id ? 'var(--accent)' : 'var(--surface2)',
              color: filter === f.id ? '#fff' : 'var(--text2)',
              border: 'none',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading
        ? <div className="section-empty" style={{ paddingTop:40 }}><div style={{ fontSize:24 }}>◌</div></div>
        : !posts.length
          ? <div className="section-empty"><div className="section-empty-icon">📭</div>No posts yet.</div>
          : posts.map((p, i) => <PostCard key={p.id} post={p} delay={i * 0.055} />)
      }
    </div>
  )
}
