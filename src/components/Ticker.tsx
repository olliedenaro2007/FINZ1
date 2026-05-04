'use client'
import { useEffect, useRef, useState } from 'react'

const SYMBOLS = [
  { sym: 'SPX',  yf: '^GSPC'  },
  { sym: 'NDX',  yf: '^NDX'   },
  { sym: 'NVDA', yf: 'NVDA'   },
  { sym: 'AAPL', yf: 'AAPL'   },
  { sym: 'TSLA', yf: 'TSLA'   },
  { sym: 'BTC',  yf: 'BTC-USD'},
  { sym: 'GLD',  yf: 'GLD'    },
  { sym: 'VIX',  yf: '^VIX'   },
]

type Quote = { price: string; pct: string; up: boolean }

export default function Ticker() {
  const [quotes, setQuotes] = useState<(Quote | null)[]>(Array(SYMBOLS.length).fill(null))
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchQuotes() {
    try {
      const res = await fetch('/api/quotes')
      if (!res.ok) return
      const data = await res.json()
      const results = (data.quoteResponse?.result ?? []) as {regularMarketPrice:number, regularMarketChangePercent:number}[]
      setQuotes(results.map(q => {
        if (q == null || q.regularMarketPrice == null) return null
        const up = q.regularMarketChangePercent >= 0
        const price = q.regularMarketPrice >= 1000
          ? q.regularMarketPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })
          : q.regularMarketPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        const pct = `${up ? '▲' : '▼'}${Math.abs(q.regularMarketChangePercent).toFixed(2)}%`
        return { price, pct, up }
      }))
    } catch { /* stay stale */ }
  }

  useEffect(() => {
    fetchQuotes()
    timer.current = setInterval(fetchQuotes, 60_000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [])

  const items = SYMBOLS.map((s, i) => {
    const q = quotes[i]
    return (
      <div key={s.sym + i} className="t-item">
        <span className="t-sym">{s.sym}</span>
        {q
          ? <><span className={`t-val ${q.up ? 'up' : 'dn'}`}>{q.price}</span><span className={q.up ? 'up' : 'dn'}>{q.pct}</span></>
          : <span className="t-val" style={{ color: 'var(--text3)' }}>—</span>
        }
      </div>
    )
  })

  return (
    <div className="ticker-banner">
      <div className="ticker-scroll">
        {items}
        {/* duplicate for seamless loop */}
        {items}
      </div>
    </div>
  )
}
