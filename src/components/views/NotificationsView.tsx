'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import type { Notification } from '@/lib/types'

export default function NotificationsView() {
  const { user, setUnreadNotifs } = useApp()
  const supabase = createClient()
  const [notifs, setNotifs] = useState<Notification[]>([])

  async function load() {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*, from_profile:from_user_id(username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs((data ?? []) as Notification[])
    // mark all read
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setUnreadNotifs(0)
  }

  useEffect(() => { load() }, [user])

  // realtime
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('notifs-view')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user])

  const TYPE_ICON: Record<string, string> = { like:'♥', comment:'💬', follow:'◉', message:'✉' }

  if (!user) return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Notifications</div></div></div>
      <div className="auth-gate"><div className="auth-gate-icon">🔔</div><div className="auth-gate-msg">Sign in to see your notifications.</div></div>
    </div>
  )

  return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Notifications</div></div></div>
      {!notifs.length
        ? <div className="section-empty"><div className="section-empty-icon">🔔</div>No notifications yet.</div>
        : notifs.map(n => (
          <div key={n.id} className={`notif-row${!n.read ? ' unread' : ''}`}>
            <div className="notif-icon-wrap">{TYPE_ICON[n.type] ?? '◎'}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="notif-text">{n.message}</div>
              <div className="notif-time">{new Date(n.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
            </div>
            {!n.read && <div className="unread-dot" />}
          </div>
        ))
      }
    </div>
  )
}
