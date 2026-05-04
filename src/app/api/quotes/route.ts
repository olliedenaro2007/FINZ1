import { NextResponse } from 'next/server'

const SYMBOLS = [
  { sym: 'SPX',  stooq: '^spx'    },
  { sym: 'NDX',  stooq: '^ndq'    },
  { sym: 'NVDA', stooq: 'nvda.us' },
  { sym: 'AAPL', stooq: 'aapl.us' },
  { sym: 'TSLA', stooq: 'tsla.us' },
  { sym: '10Y',  stooq: '10us.b'  },
  { sym: 'BTC',  stooq: 'btc.v'   },
  { sym: 'DXY',  stooq: 'dxy'     },
  { sym: 'GLD',  stooq: 'gld.us'  },
  { sym: 'WTI',  stooq: 'cl.f'    },
  { sym: 'VIX',  stooq: '^vix'    },
]

async function fetchOne(stooq: string) {
  const url = `https://stooq.com/q/l/?s=${stooq}&f=sd2t2ohlc&h&e=csv`
  const res = await fetch(url, { next: { revalidate: 60 } })
  const text = await res.text()
  const lines = text.trim().split('\n')
  if (lines.length < 2) return null
  const cols = lines[1].split(',')
  const open = parseFloat(cols[4])
  const close = parseFloat(cols[7])
  if (isNaN(open) || isNaN(close) || open === 0) return null
  const pct = ((close - open) / open) * 100
  return { regularMarketPrice: close, regularMarketChangePercent: pct }
}

export async function GET() {
  const results = await Promise.all(
    SYMBOLS.map(s => fetchOne(s.stooq).catch(() => null))
  )
  return NextResponse.json({ quoteResponse: { result: results } })
}
