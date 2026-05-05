'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import { useApp } from '@/contexts/AppContext'
import type { Profile, Post } from '@/lib/types'

type UserRank = { profile: Profile; avgRating: number; modelCount: number }
type ModelRank = { post: Post; avgRating: number; ratingCount: number }
type MacroRank = { post: Post & { profiles?: Profile }; score: number }
type Tab = 'users' | 'models' | 'macro'

export default function LeaderboardView() {
  const supabase = createClient()
  const { setView, setViewingUserId } = useApp()
  const [tab, setTab]           = useState<Tab>('users')
  const [userRanks, setUserRanks] = useState<UserRank[]>([])
  const [modelRanks, setModelRanks] = useState<ModelRank[]>([])
  const [macroRanks, setMacroRanks] = useState<MacroRank[]>([])
  const [loading, setLoading]   = useState(true)

  async function loadAll() {
    setLoading(true)

    const { data: ratings } = await supabase
      .from('model_ratings')
      .select('stars, post_id, posts(id, title, model_type, user_id, profiles(*))')

    const { data: modelPosts } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .eq('type', 'model')

    const { data: macroPosts } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .in('type', ['macro', 'discussion'])
      .order('likes_count', { ascending: false })
      .limit(20)

    if (ratings && modelPosts) {
      const ratingsByPost = new Map<string, number[]>()
      ratings.forEach((r: any) => {
        if (!ratingsByPost.has(r.post_id)) ratingsByPost.set(r.post_id, [])
        ratingsByPost.get(r.post_id)!.push(r.stars)
      })

      const mRanks: ModelRank[] = modelPosts
        .map(p => {
          const stars = ratingsByPost.get(p.id) ?? []
          const avg = stars.length > 0 ? stars.reduce((a, b) => a + b, 0) / stars.length : 0
          return { post: p as Post, avgRating: avg, ratingCount: stars.length }
        })
        .filter(r => r.ratingCount > 0)
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 10)
      setModelRanks(mRanks)

      const userModelMap = new Map<string, { profile: Profile; ratings: number[]; modelCount: number; ratedModelCount: number }
      modelPosts.forEach(p => {
        if (!p.profiles) return
        const prof = p.profiles as unknown as Profile
        if (!userModelMap.has(p.user_id)) {
          userModelMap.set(p.user_id, { profile: prof, ratings: [], modelCount: 0, ratedModelCount: 0 })
        }
        const entry = userModelMap.get(p.user_id)!
        entry.modelCount++
        const stars = ratingsByPost.get(p.id) ?? []
        entry.ratings.push(...stars)
      })

      const uRanks: UserRank[] = Array.from(userModelMap.values())
        .filter(u => u.modelCount >= 3)
        .map(u => ({
          profile: u.profile,
          avgRating: u.ratings.length > 0 ? u.ratings.reduce((a, b) => a + b, 0) / u.ratings.length : 0,
          modelCount: u.modelCount,
        }))
        .filter(u => u.avgRating > 0)
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 10)
      setUserRanks(uRanks)
    }

    if (macroPosts) {
      const mRanks: MacroRank[] = (macroPosts as (Post & { profiles?: Profile })[])
        .map(p => ({ post: p, score: p.likes_count + p.comments_count * 2 + p.saves_count }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      setMacroRanks(mRanks)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const ch = supabase.channel('leaderboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'model_ratings' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  function goToUser(id: string) {
    setViewingUserId(id)
    setView('userProfile')
  }

  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`

  return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Leaderboards</div></div></div>

      <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
        {([['users','👤 Top Users'],['models','📊 Top Models'],['macro','🌐 Top Discussions']] as [Tab,string][]).map(([id, label]) => (
          <button key={id} className={`t-tab${tab === id ? ' active' : ''}`} style={{ flex:1, textAlign:'center', fontSize:12 }} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="section-empty" style={{ paddingTop:40 }}><div style={{ fontSize:24 }}>◌</div></div>}

      {!loading && tab === 'users' && (
        <div>
          <div style={{ padding:'8px 16px 4px', fontSize:11, color:'var(--text3)', fontFamily:'IBM Plex Mono,monospace' }}>
            RANKED BY AVG MODEL RATING · MIN 3 MODELS
          </div>
          {userRanks.length === 0
            ? <div className="section-empty">No ranked users yet — post at least 3 models to qualify.</div>
            : userRanks.map((u, i) => {
              const name = u.profile.display_name || u.profile.username
              return (
                <div key={u.profile.id} onClick={() => goToUser(u.profile.id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
                  <div style={{ width:28, fontSize: i < 3 ? 20 : 13, textAlign:'center', flexShrink:0 }}>{medal(i)}</div>
                  <Avatar size="sm" src={u.profile.avatar_url} initials={name.slice(0,2).toUpperCase()} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{name}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>@{u.profile.username} · {u.modelCount} models</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#f4c542' }}>★ {u.avgRating.toFixed(1)}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>avg rating</div>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {!loading && tab === 'models' && (
        <div>
          <div style={{ padding:'8px 16px 4px', fontSize:11, color:'var(--text3)', fontFamily:'IBM Plex Mono,monospace' }}>
            RANKED BY AVERAGE STAR RATING
          </div>
          {modelRanks.length === 0
            ? <div className="section-empty">No rated models yet.</div>
            : modelRanks.map((m, i) => {
              const prof = m.post.profiles
              const name = prof?.display_name || prof?.username || 'Unknown'
              return (
                <div key={m.post.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:28, fontSize: i < 3 ? 20 : 13, textAlign:'center', flexShrink:0 }}>{medal(i)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{m.post.title}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>by {name} · {m.ratingCount} rating{m.ratingCount !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#f4c542' }}>★ {m.avgRating.toFixed(1)}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>/ 10</div>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {!loading && tab === 'macro' && (
        <div>
          <div style={{ padding:'8px 16px 4px', fontSize:11, color:'var(--text3)', fontFamily:'IBM Plex Mono,monospace' }}>
            RANKED BY LIKES + COMMENTS + SAVES
          </div>
          {macroRanks.length === 0
            ? <div className="section-empty">No discussions yet.</div>
            : macroRanks.map((m, i) => {
              const prof = m.post.profiles
              const name = prof?.display_name || prof?.username || 'Unknown'
              return (
                <div key={m.post.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:28, fontSize: i < 3 ? 20 : 13, textAlign:'center', flexShrink:0 }}>{medal(i)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{m.post.title || m.post.body}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>by {name} · {m.post.type}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'var(--accent)' }}>{m.score}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>interactions</div>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}
    </div>
  )
}
