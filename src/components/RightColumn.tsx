'use client'
import { useEffect, useState } from 'react'

const FALLBACK = ['#DCFModeling','#FedRateDecision','#LBOAnalysis','#NVDA Earnings','#PrivateCreditBoom']

export default function RightColumn() {
  const [topics, setTopics] = useState<{ tag: string; count: number }[]>([])

  useEffect(() => {
    fetch('/api/quotes/trending')
      .then(r => r.json())
      .then(d => { if (d.topics?.length > 0) setTopics(d.topics) })
      .catch(() => {})
  }, [])

  const displayed = topics.length > 0
    ? topics.map(t => t.tag)
    : FALLBACK

  return (
    <div className="right-col">
      <div className="widget">
        <div className="widget-head"><span className="widget-title">Market Snapshot</span><span className="widget-more" style={{ color:'var(--green)' }}>● Live</span></div>
        {[['SPX','S&P 500'],['NDX','Nasdaq 100'],['10Y','Treasury Yield'],['VIX','Volatility'],['BTC','Bitcoin']].map(([sym,name]) => (
          <div key={sym} className="mkt-row">
            <div className="mkt-sym">{sym}</div>
            <div className="mkt-name">{name}</div>
            <div className="mkt-price" id={`mkt-${sym}`} style={{ color:'var(--text3)' }}>—</div>
            <div className="mkt-chg" id={`mkt-chg-${sym}`} style={{ color:'var(--text3)' }}>—</div>
          </div>
        ))}
      </div>
      <div className="widget">
        <div className="widget-head"><span className="widget-title">Trending Topics</span></div>
        {displayed.map((topic) => (
          <div key={topic} className="trend-row">
            <div className="trend-num">Finance · Trending</div>
            <div className="trend-topic">{topic}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
