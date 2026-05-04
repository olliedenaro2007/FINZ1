import { NextResponse } from 'next/server'

const SYMBOLS = ['^GSPC','^NDX','NVDA','AAPL','TSLA','^TNX','BTC-USD','DX-Y.NYB','GLD','CL=F','^VIX']

export async function GET() {
  try {
    const syms = SYMBOLS.join(',')
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms)}&fields=regularMarketPrice,regularMarketChangePercent`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
