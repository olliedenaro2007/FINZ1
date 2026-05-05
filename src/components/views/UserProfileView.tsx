'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import PostCard from '@/components/post/PostCard'
import { useApp } from '@/contexts/AppContext'
import type { Post, Profile } from '@/lib/types'

export default function UserProfileView() {
  const { user, viewingUserId, setView, setViewingUserId, setPendingChatPartnerId } = useApp()
  const supabase = createClient()
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [posts, setPosts]           = useState<Post[]>([])
  const [following, setFollowing]   = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!viewingUserId) return
    async function load() {
      setLoading(true)
      const [profRes, postsRes, fcntRes, followRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', viewingUserId!).single(),
        supabase.from('posts').select('*, profiles(*)').eq('user_id', viewingUserId!).order('created_at', { ascending: false }).limit(50),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', viewingUserId!),
        user
          ? supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', viewingUserId!).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      setProfile(profRes.data as Profile)
      setPosts((postsRes.data ?? []) as Post[])
      setFollowerCount(fcntRes.count ?? 0)
      setFollowing(!!(followRes as { data: unknown }).data)
      setLoading(false)
    }
    load()
  }, [viewingUserId, user, supabase])

  async function toggleFollow() {
    if (!user || !viewingUserId) return
    if (following) {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: viewingUserId })
      setFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: viewingUserId })
      setFollowing(true)
      setFollowerCount(c => c + 1)
    }
  }

  function openMessage() {
    if (!profile) return
    setPendingChatPartnerId(profile.id)
    setView('messages')
  }

  function goBack() {
    setViewingUserId(null)
    setView('feed')
  }

  if (loading) return (
    <div>
      <div className="topbar"><div className="topbar-inner"><button onClick={goBack} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:14, marginRight:8 }}>← Back</button></div></div>
      <div className="section-empty" style={{ paddingTop:60 }}><div style={{ fontSize:24 }}>◌</div></div>
    </div>
  )

  if (!profile) return (
    <div>
      <div className="topbar"><div className="topbar-inner"><button onClick={goBack} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:14, marginRight:8 }}>← Back</button></div></div>
      <div className="section-empty">User not found.</div>
    </div>
  )

  const displayName = profile.display_name || profile.username
  const initials    = displayName.slice(0, 2).toUpperCase()
  const heroStyle: React.CSSProperties = profile.bg_url
    ? { backgroundImage: `url('${profile.bg_url}')`, backgroundSize:'cover', backgroundPosition:'center' }
    : profile.bg_gradient
      ? { backgroundImage: profile.bg_gradient }
      : {}

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <button onClick={goBack} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:14, marginRight:8 }}>← Back</button>
          <div className="topbar-title">{displayName}</div>
        </div>
      </div>

      <div className="profile-hero" style={heroStyle} />

      <div className="profile-info">
        <div className="profile-av-wrap">
          <Avatar size="xl" src={profile.avatar_url} initials={initials} />
        </div>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontWeight:700 }}>{displayName}</div>
            <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'IBM Plex Mono,monospace' }}>
              @{profile.username}{profile.role ? ' · ' + profile.role : ''}
            </div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
              {followerCount} follower{followerCount !== 1 ? 's' : ''}
            </div>
          </div>
          {user && user.id !== profile.id && (
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-outline btn-sm" onClick={openMessage}>Message</button>
              <button
                className={`btn btn-sm ${following ? 'btn-outline' : 'btn-primary'}`}
                onClick={toggleFollow}>
                {following ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          )}
        </div>
        <div style={{ fontSize:13, color: profile.bio ? 'var(--text2)' : 'var(--text3)', lineHeight:1.6, marginBottom:12, fontStyle: profile.bio ? 'normal' : 'italic' }}>
          {profile.bio || 'No bio yet.'}
        </div>
      </div>

      <div style={{ borderTop:'1px solid var(--border)', padding:'8px 16px 4px', fontSize:11, color:'var(--text3)', fontFamily:'IBM Plex Mono,monospace', letterSpacing:1 }}>POSTS</div>
      {posts.length === 0
        ? <div className="section-empty">No posts yet.</div>
        : posts.map((p, i) => <PostCard key={p.id} post={p} delay={i * 0.055} />)
      }
    </div>
  )
}
