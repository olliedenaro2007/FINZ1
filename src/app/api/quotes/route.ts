import { NextResponse } from 'next/server'

const SYMBOLS = ['^GSPC','^NDX','NVDA','AAPL','TSLA','^TNX','BTC-USD','DX-Y.NYB','GLD','CL=F','^VIX']

let cachedCookie = ''
let cachedCrumb = ''

async function getCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const cookieRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      redirect: 'follow',
    })
    const cookie = cookieRes.headers.get('set-cookie') ?? ''

    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/finance/crumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': cookie,
      },
    })
    const crumb = await crumbRes.text()
    if (!crumb || crumb.includes('<')) return null
    return { cookie, crumb }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    if (!cachedCrumb) {
      const result = await getCrumb()
      if (result) {
        cachedCookie = result.cookie
        cachedCrumb = result.crumb
      }
    }

    const syms = SYMBOLS.join(',')
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms)}&fields=regularMarketPrice,regularMarketChangePercent&crumb=${encodeURIComponent(cachedCrumb)}`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': cachedCookie,
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      cachedCrumb = ''
      return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
