'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import PostFeed from '@/components/post/PostFeed'
import { useApp } from '@/contexts/AppContext'
import type { Post, Profile } from '@/lib/types'

type Tab = 'posts' | 'liked' | 'saved'
type ListModal = 'followers' | 'following' | null

export default function ProfileView() {
  const { user, profile, openModal, setView, setViewingUserId } = useApp()
  const supabase = createClient()
  const [tab, setTab]                 = useState<Tab>('posts')
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [listModal, setListModal]     = useState<ListModal>(null)
  const [listUsers, setListUsers]     = useState<Profile[]>([])
  const [listLoading, setListLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id)
      .then(({ count }) => setFollowerCount(count ?? 0))
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id)
      .then(({ count }) => setFollowingCount(count ?? 0))
  }, [user, supabase])

  async function openList(type: 'followers' | 'following') {
    if (!user) return
    setListModal(type)
    setListLoading(true)
    setListUsers([])
    if (type === 'followers') {
      const { data } = await supabase
        .from('follows')
        .select('profiles!follower_id(*)')
        .eq('following_id', user.id)
      setListUsers((data ?? []).map((r: any) => r.profiles).filter(Boolean) as Profile[])
    } else {
      const { data } = await supabase
        .from('follows')
        .select('profiles!following_id(*)')
        .eq('follower_id', user.id)
      setListUsers((data ?? []).map((r: any) => r.profiles).filter(Boolean) as Profile[])
    }
    setListLoading(false)
  }

  function goToUser(p: Profile) {
    setListModal(null)
    setViewingUserId(p.id)
    setView('userProfile')
  }

  if (!user || !profile) return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Profile</div></div></div>
      <div className="auth-gate">
        <div className="auth-gate-icon">◉</div>
        <div className="auth-gate-msg">Sign in to view your profile.</div>
        <button className="btn btn-primary" onClick={() => openModal('signInModal')}>Sign In</button>
      </div>
    </div>
  )

  const displayName = profile.display_name || profile.username
  const initials    = displayName.slice(0, 2).toUpperCase()

  const heroStyle: React.CSSProperties = profile.bg_url
    ? { backgroundImage: `url('${profile.bg_url}')`, backgroundSize:'cover', backgroundPosition:'center' }
    : profile.bg_gradient
      ? { backgroundImage: profile.bg_gradient }
      : {}

  function postFilter(p: Post) {
    if (tab === 'posts')  return p.profiles?.id === user?.id
    if (tab === 'liked')  return p.liked === true
    if (tab === 'saved')  return p.saved === true
    return false
  }

  return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">{displayName}</div></div></div>
      <div className="profile-hero" style={heroStyle} />
      <div className="profile-info">
        <div className="profile-av-wrap">
          <Avatar size="xl" src={profile.avatar_url} initials={initials} />
        </div>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontWeight:700 }}>{displayName}</div>
            <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'IBM Plex Mono,monospace' }}>@{profile.username}{profile.role ? ' · ' + profile.role : ''}</div>
            <div style={{ display:'flex', gap:16, marginTop:6 }}>
              <button onClick={() => openList('followers')} style={{ background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--text1)' }}>{followerCount}</span>
                <span style={{ fontSize:11, color:'var(--text3)', marginLeft:4 }}>Followers</span>
              </button>
              <button onClick={() => openList('following')} style={{ background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--text1)' }}>{followingCount}</span>
                <span style={{ fontSize:11, color:'var(--text3)', marginLeft:4 }}>Following</span>
              </button>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => openModal('editProfileModal')}>Edit Profile</button>
        </div>
        <div style={{ fontSize:13, color: profile.bio ? 'var(--text2)' : 'var(--text3)', lineHeight:1.6, marginBottom:12, fontStyle: profile.bio ? 'normal' : 'italic' }}>
          {profile.bio || 'No bio yet — click Edit Profile to add one.'}
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
        {(['posts','liked','saved'] as Tab[]).map(t => (
          <button key={t} className={`t-tab${tab === t ? ' active' : ''}`} style={{ flex:1, textAlign:'center' }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <PostFeed key={tab} filter={postFilter} emptyMsg={`No ${tab} posts yet.`} realtimeKey={`profile-${tab}`} />

      {listModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setListModal(null)}>
          <div style={{ background:'var(--surface1)', borderRadius:10, width:'min(360px,90vw)', maxHeight:'70vh', display:'flex', flexDirection:'column', overflow:'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontWeight:700, fontSize:14 }}>{listModal === 'followers' ? 'Followers' : 'Following'}</span>
              <button onClick={() => setListModal(null)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {listLoading && <div style={{ padding:20, textAlign:'center', color:'var(--text3)', fontSize:12 }}>Loading…</div>}
              {!listLoading && listUsers.length === 0 && (
                <div style={{ padding:20, textAlign:'center', color:'var(--text3)', fontSize:12 }}>Nobody here yet.</div>
              )}
              {listUsers.map(u => {
                const name = u.display_name || u.username
                return (
                  <div key={u.id} onClick={() => goToUser(u)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', cursor:'pointer', borderBottom:'1px solid var(--border)' }}>
                    <Avatar size="sm" src={u.avatar_url} initials={name.slice(0,2).toUpperCase()} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>@{u.username}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
