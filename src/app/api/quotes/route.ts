import { NextResponse } from 'next/server'

const SYMBOLS = [
  { sym: 'SPX',  td: 'SPX'     },
  { sym: 'NDX',  td: 'NDX'     },
  { sym: 'NVDA', td: 'NVDA'    },
  { sym: 'AAPL', td: 'AAPL'    },
  { sym: 'TSLA', td: 'TSLA'    },
  { sym: 'BTC',  td: 'BTC/USD' },
  { sym: 'GLD',  td: 'GLD'     },
  { sym: 'VIX',  td: 'VXX'     },
]

export async function GET() {
  const apiKey = process.env.TWELVEDATA_API_KEY
  const syms = SYMBOLS.map(s => s.td).join(',')
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms)}&apikey=${apiKey}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()

    const results = SYMBOLS.map(s => {
      const q = data[s.td] ?? data
      if (!q || q.status === 'error' || !q.close) return null
      const price = parseFloat(q.close)
      const pct = parseFloat(q.percent_change)
      if (isNaN(price)) return null
      return { regularMarketPrice: price, regularMarketChangePercent: pct }
    })

    return NextResponse.json({ quoteResponse: { result: results }, _raw: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
