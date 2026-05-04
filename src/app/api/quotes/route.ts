import { NextResponse } from 'next/server'

const SYMBOLS = [
  { sym: 'SPX',  td: 'SPX'     },
  { sym: 'NDX',  td: 'NDX'     },
  { sym: 'NVDA', td: 'NVDA'    },
  { sym: 'AAPL', td: 'AAPL'    },
  { sym: 'TSLA', td: 'TSLA'    },
  { sym: '10Y',  td: 'TLT'     },
  { sym: 'BTC',  td: 'BTC/USD' },
  { sym: 'DXY',  td: 'UUP'     },
  { sym: 'GLD',  td: 'GLD'     },
  { sym: 'WTI',  td: 'USO'     },
  { sym: 'VIX',  td: 'VXX'     },
]

export async function GET() {
  const apiKey = process.env.TWELVEDATA_API_KEY
  const syms = SYMBOLS.map(s => s.td).join(',')
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms)}&apikey=${apiKey}`

  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    const data = await res.json()

    const results = SYMBOLS.map(s => {
      const q = data[s.td] ?? data
      if (!q || q.status === 'error' || !q.close) return null
      const price = parseFloat(q.close)
      const pct = parseFloat(q.percent_change)
      if (isNaN(price)) return null
      return { regularMarketPrice: price, regularMarketChangePercent: pct }
    })

    return NextResponse.json({ quoteResponse: { result: results } })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
