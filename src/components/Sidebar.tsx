'use client'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import { useApp } from '@/contexts/AppContext'
import type { View } from '@/lib/types'

type NavItem = { id: View; icon: string; label: string; badge?: 'notif' | 'dm' }

const NAV_ITEMS: NavItem[] = [
  { id: 'feed',        icon: '⌂',  label: 'Feed' },
  { id: 'explore',     icon: '◎',  label: 'Explore' },
  { id: 'notifs',      icon: '🔔', label: 'Notifications', badge: 'notif' },
]
const NAV_CONTENT: NavItem[] = [
  { id: 'models',      icon: '📊', label: 'Models' },
  { id: 'scripts',     icon: '⌨',  label: 'Trading Scripts' },
  { id: 'macro',       icon: '🌐', label: 'Macro Discussion' },
  { id: 'leaderboard', icon: '🏆', label: 'Leaderboards' },
]
const NAV_ACCOUNT: NavItem[] = [
  { id: 'profile',     icon: '◉',  label: 'My Profile' },
  { id: 'bookmarks',   icon: '🔖', label: 'Bookmarks' },
  { id: 'messages',    icon: '✉',  label: 'Messages', badge: 'dm' },
]

export default function Sidebar() {
  const { view, setView, user, profile, openModal, showToast, unreadNotifs, unreadDMs } = useApp()
  const supabase = createClient()

  function nav(v: View) { setView(v) }

  async function signOut() {
    await supabase.auth.signOut()
    showToast('Signed out')
    setView('feed')
  }

  function NavBtn({ item }: { item: NavItem }) {
    const badge = item.badge === 'notif' ? unreadNotifs : item.badge === 'dm' ? unreadDMs : 0
    return (
      <button className={`nav-item${view === item.id ? ' active' : ''}`} onClick={() => nav(item.id)}>
        <span className="nav-icon">{item.icon}</span>
        <span>{item.label}</span>
        {badge > 0 && <span className="nav-badge">{badge}</span>}
      </button>
    )
  }

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || ''
  const initials    = displayName.slice(0, 2).toUpperCase()

  return (
    <nav className="sidebar">
      <div className="logo-wrap" onClick={() => nav('feed')}>
        <div className="logo-mark">FZ</div>
        <div className="logo-name">FINZ</div>
      </div>

      <button className="sb-post-btn" onClick={() => user ? openModal('newPostModal') : openModal('signInModal')}>
        <span style={{ fontSize:16, lineHeight:1 }}>＋</span>
        <span>New Post</span>
      </button>

      <div className="nav">
        {NAV_ITEMS.map(i => <NavBtn key={i.id} item={i} />)}
        <div className="nav-section-label">Content</div>
        {NAV_CONTENT.map(i => <NavBtn key={i.id} item={i} />)}
        <div className="nav-section-label">Account</div>
        {NAV_ACCOUNT.map(i => <NavBtn key={i.id} item={i} />)}
      </div>

      <div id="sidebarBottom">
        {user ? (
          <>
            <div className="sidebar-user" onClick={() => nav('profile')}>
              <Avatar size="md" src={profile?.avatar_url} initials={initials} />
              <div className="user-info" style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
                <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'IBM Plex Mono,monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>
              </div>
            </div>
            <div style={{ padding:'0 16px 12px' }}>
              <button className="auth-side-btn outline" onClick={signOut}>Sign Out</button>
            </div>
          </>
        ) : (
          <div className="auth-side-btns">
            <button className="auth-side-btn primary" onClick={() => openModal('signInModal')}>Sign In</button>
            <button className="auth-side-btn outline" onClick={() => openModal('signUpModal')}>Create Account</button>
          </div>
        )}
      </div>
    </nav>
  )
}
