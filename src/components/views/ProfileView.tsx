'use client'
import { useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import PostFeed from '@/components/post/PostFeed'
import { useApp } from '@/contexts/AppContext'
import type { Post } from '@/lib/types'

type Tab = 'posts' | 'liked' | 'saved'

export default function ProfileView() {
  const { user, profile, openModal } = useApp()
  const [tab, setTab] = useState<Tab>('posts')

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
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => openModal('editProfileModal')}>Edit Profile</button>
        </div>
        <div style={{ fontSize:13, color: profile.bio ? 'var(--text2)' : 'var(--text3)', lineHeight:1.6, marginBottom:12, fontStyle: profile.bio ? 'normal' : 'italic' }}>
          {profile.bio || 'No bio yet — click Edit Profile to add one.'}
        </div>
      </div>

      {/* tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
        {(['posts','liked','saved'] as Tab[]).map(t => (
          <button key={t} className={`t-tab${tab === t ? ' active' : ''}`} style={{ flex:1, textAlign:'center' }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <PostFeed key={tab} filter={postFilter} emptyMsg={`No ${tab} posts yet.`} realtimeKey={`profile-${tab}`} />
    </div>
  )
}
