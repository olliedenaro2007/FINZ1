'use client'
import PostFeed from '@/components/post/PostFeed'

export default function FeedView() {
  return (
    <div>
      <div className="topbar">
        <div className="topbar-tabs">
          <button className="t-tab active">For You</button>
          <button className="t-tab">Trending</button>
        </div>
      </div>
      <PostFeed realtimeKey="feed" />
    </div>
  )
}
