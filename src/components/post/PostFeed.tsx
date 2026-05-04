'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PostCard from './PostCard'
import type { Post } from '@/lib/types'
import { useApp } from '@/contexts/AppContext'

type Props = {
  filter?: (p: Post) => boolean
  emptyMsg?: string
  realtimeKey?: string
}

function engagementScore(p: Post) {
  return p.likes_count + p.comments_count * 2 + p.saves_count
}

export default function PostFeed({ filter, emptyMsg = 'No posts yet.', realtimeKey }: Props) {
  const supabase = createClient()
  const { user } = useApp()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const loadPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (!data) { setLoading(false); return }

    let enriched = data as Post[]

    // attach liked/saved state for current user
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

    if (filter) enriched = enriched.filter(filter)
    enriched.sort((a, b) => engagementScore(b) - engagementScore(a))
    setPosts(enriched)
    setLoading(false)
  }, [supabase, user, filter])

  useEffect(() => { loadPosts() }, [loadPosts])

  // realtime: new posts
  useEffect(() => {
    const channel = supabase
      .channel(realtimeKey ?? 'posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
        () => loadPosts())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' },
        () => loadPosts())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadPosts, realtimeKey])

  if (loading) return <div className="section-empty" style={{ paddingTop: 40 }}><div style={{ fontSize: 24 }}>◌</div></div>
  if (!posts.length) return <div className="section-empty"><div className="section-empty-icon">📭</div>{emptyMsg}</div>

  return <>{posts.map((p, i) => <PostCard key={p.id} post={p} delay={i * 0.055} />)}</>
}
