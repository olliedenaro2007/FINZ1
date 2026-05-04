'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PostCard from '@/components/post/PostCard'
import { useApp } from '@/contexts/AppContext'
import type { Post } from '@/lib/types'

export default function BookmarksView() {
  const { user, openModal } = useApp()
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    async function load() {
      const { data } = await supabase
        .from('bookmarks')
        .select('post_id, posts(*, profiles(*))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      const fetched = (data ?? []).map((r: Record<string, unknown>) => ({ ...(r.posts as Post), saved: true }))
      setPosts(fetched)
      setLoading(false)
    }
    load()
  }, [user])

  if (!user) return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Bookmarks</div></div></div>
      <div className="auth-gate"><div className="auth-gate-icon">🔖</div><div className="auth-gate-msg">Sign in to see your bookmarks.</div>
        <button className="btn btn-primary" onClick={() => openModal('signInModal')}>Sign In</button></div>
    </div>
  )

  return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Bookmarks</div></div></div>
      {loading
        ? <div className="section-empty" style={{ paddingTop:40 }}><div style={{ fontSize:24 }}>◌</div></div>
        : !posts.length
          ? <div className="section-empty"><div className="section-empty-icon">🔖</div>No bookmarks yet. Hit 🔖 on any post to save it here.</div>
          : posts.map((p, i) => <PostCard key={p.id} post={p} delay={i * 0.055} />)
      }
    </div>
  )
}
