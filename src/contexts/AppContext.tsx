'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile, View } from '@/lib/types'

type Toast = { msg: string; id: number }

type AppContextType = {
  // auth
  user: User | null
  profile: Profile | null
  authLoading: boolean
  refreshProfile: () => Promise<void>
  // ui
  view: View
  setView: (v: View) => void
  toast: Toast | null
  showToast: (msg: string) => void
  // modals
  openModal: (id: string) => void
  closeModal: (id: string) => void
  // unread counts
  unreadNotifs: number
  unreadDMs: number
  setUnreadNotifs: (n: number) => void
  setUnreadDMs: (n: number) => void
  // theme
  dark: boolean
  toggleTheme: () => void
  // profile navigation
  viewingUserId: string | null
  setViewingUserId: (id: string | null) => void
  // pending DM target
  pendingChatPartnerId: string | null
  setPendingChatPartnerId: (id: string | null) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser]             = useState<User | null>(null)
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView]             = useState<View>('feed')
  const [toast, setToast]           = useState<Toast | null>(null)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [unreadDMs, setUnreadDMs]   = useState(0)
  const [dark, setDark]             = useState(true)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [pendingChatPartnerId, setPendingChatPartnerId] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (data) setProfile(data as Profile)
  }, [supabase])

  // auth listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // load profile when user changes
  useEffect(() => {
    if (user) refreshProfile()
  }, [user, refreshProfile])

  // unread counts when user changes
  useEffect(() => {
    if (!user) { setUnreadNotifs(0); setUnreadDMs(0); return }
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('read', false)
      .then(({ count }) => setUnreadNotifs(count ?? 0))
    supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id).eq('read', false)
      .then(({ count }) => setUnreadDMs(count ?? 0))
  }, [user, supabase])

  // realtime: new notifications & DMs badge
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('badges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setUnreadNotifs(n => n + 1))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        () => setUnreadDMs(n => n + 1))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, supabase])

  // theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  const showToast = useCallback((msg: string) => {
    const id = Date.now()
    setToast({ msg, id })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  const openModal  = (id: string) => document.getElementById(id)?.classList.add('open')
  const closeModal = (id: string) => document.getElementById(id)?.classList.remove('open')
  const toggleTheme = () => setDark(d => !d)

  return (
    <AppContext.Provider value={{
      user, profile, authLoading, refreshProfile,
      view, setView,
      toast, showToast,
      openModal, closeModal,
      unreadNotifs, unreadDMs, setUnreadNotifs, setUnreadDMs,
      dark, toggleTheme,
      viewingUserId, setViewingUserId,
      pendingChatPartnerId, setPendingChatPartnerId,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
