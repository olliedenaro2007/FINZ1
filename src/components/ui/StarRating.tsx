 'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'

type Props = { postId: string }

export default function StarRating({ postId }: Props) {
  const { user, openModal } = useApp()
  const supabase = createClient()
  const [avg, setAvg]         = useState<number | null>(null)
  const [count, setCount]     = useState(0)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [hover, setHover]     = useState<number | null>(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('model_ratings')
        .select('stars, user_id')
        .eq('post_id', postId)

      if (!data) return
      setCount(data.length)
      if (data.length > 0) {
        setAvg(data.reduce((s, r) => s + r.stars, 0) / data.length)
      }
      if (user) {
        const mine = data.find(r => r.user_id === user.id)
        if (mine) setMyRating(mine.stars)
      }
    }
    load()
  }, [postId, user, supabase])

  async function rate(stars: number) {
    if (!user) { openModal('signInModal'); return }
    setSaving(true)
    if (myRating) {
      await supabase.from('model_ratings').update({ stars }).eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('model_ratings').insert({ post_id: postId, user_id: user.id, stars })
      setCount(c => c + 1)
    }
    setMyRating(stars)
    const { data } = await supabase.from('model_ratings').select('stars').eq('post_id', postId)
    if (data && data.length > 0) setAvg(data.reduce((s, r) => s + r.stars, 0) / data.length)
    setSaving(false)
  }

  const display = hover ?? myRating ?? 0

  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(s => (
            <button
              key={s}
              disabled={saving}
              onClick={() => rate(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '1px 2px',
                fontSize: 14, lineHeight: 1,
                color: s <= display ? '#f4c542' : 'var(--border)',
                transition: 'color 0.1s',
              }}>
              ★
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono,monospace' }}>
          {avg !== null ? (
            <><span style={{ color: 'var(--text1)', fontWeight: 700 }}>{avg.toFixed(1)}</span>/10 · {count} rating{count !== 1 ? 's' : ''}</>
          ) : (
            'No ratings yet'
          )}
          {myRating && <span style={{ marginLeft: 6, color: 'var(--accent)' }}>· Your rating: {myRating}</span>}
        </div>
      </div>
    </div>
  )
}
