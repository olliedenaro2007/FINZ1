'use client'
import { useState } from 'react'
import PostFeed from '@/components/post/PostFeed'
import type { Post } from '@/lib/types'

const CHIPS = ['all','model','script','macro','discussion','dcf','lbo','ma']

export default function ExploreView() {
  const [q, setQ]               = useState('')
  const [active, setActive]     = useState<Set<string>>(new Set(['all']))

  function toggleChip(chip: string) {
    if (chip === 'all') { setActive(new Set(['all'])); return }
    const next = new Set(active)
    next.delete('all')
    next.has(chip) ? next.delete(chip) : next.add(chip)
    if (!next.size) next.add('all')
    setActive(next)
  }

  function filter(p: Post) {
    if (q && !JSON.stringify(p).toLowerCase().includes(q.toLowerCase())) return false
    if (active.has('all')) return true
    if (active.has(p.type)) return true
    if (p.model_type && active.has(p.model_type)) return true
    return false
  }

  return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Explore</div></div></div>
      <div className="explore-bar">
        <div className="explore-search">
          <span className="search-icon">🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search models, users, tickers, scripts…" />
        </div>
        <div className="filter-chips">
          {CHIPS.map(c => (
            <button key={c} className={`fchip${active.has(c) ? ' on' : ''}`} onClick={() => toggleChip(c)}>{c.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <PostFeed filter={filter} emptyMsg="No results match your filters." realtimeKey="explore" />
    </div>
  )
}
