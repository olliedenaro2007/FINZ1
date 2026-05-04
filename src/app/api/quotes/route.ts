import { NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

const SYMBOLS = ['^GSPC','^NDX','NVDA','AAPL','TSLA','^TNX','BTC-USD','DX-Y.NYB','GLD','CL=F','^VIX']

export async function GET() {
  try {
    const results = await Promise.all(
      SYMBOLS.map(sym =>
        yahooFinance.quote(sym, { fields: ['regularMarketPrice', 'regularMarketChangePercent'] })
          .catch(() => null)
      )
    )
    return NextResponse.json({ quoteResponse: { result: results } })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
