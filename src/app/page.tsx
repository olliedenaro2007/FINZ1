'use client'
import { useApp } from '@/contexts/AppContext'
import Sidebar from '@/components/Sidebar'
import Ticker from '@/components/Ticker'
import RightColumn from '@/components/RightColumn'
import Toast from '@/components/ui/Toast'
import AuthModals from '@/components/auth/AuthModals'
import NewPostModal from '@/components/post/NewPostModal'
import EditProfileModal from '@/components/profile/EditProfileModal'
import PostFeed from '@/components/post/PostFeed'
import FeedView from '@/components/views/FeedView'
import ExploreView from '@/components/views/ExploreView'
import MacroView from '@/components/views/MacroView'
import NotificationsView from '@/components/views/NotificationsView'
import ProfileView from '@/components/views/ProfileView'
import BookmarksView from '@/components/views/BookmarksView'
import MessagesView from '@/components/views/MessagesView'
import UserProfileView from '@/components/views/UserProfileView'
import type { Post } from '@/lib/types'

function ModelsView() {
  return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Models</div></div></div>
      <PostFeed filter={(p: Post) => p.type === 'model'} emptyMsg="No models uploaded yet." realtimeKey="models" />
    </div>
  )
}
function ScriptsView() {
  return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Trading Scripts</div></div></div>
      <PostFeed filter={(p: Post) => p.type === 'script'} emptyMsg="No scripts uploaded yet." realtimeKey="scripts" />
    </div>
  )
}
function LeaderboardView() {
  return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Leaderboards</div></div></div>
      <div className="section-empty"><div className="section-empty-icon">🏆</div>Rankings coming soon — be the first to publish a model!</div>
    </div>
  )
}

export default function Home() {
  const { view, dark, toggleTheme } = useApp()

  const views: Record<string, React.ReactNode> = {
    feed:        <FeedView />,
    explore:     <ExploreView />,
    models:      <ModelsView />,
    scripts:     <ScriptsView />,
    macro:       <MacroView />,
    leaderboard: <LeaderboardView />,
    notifs:      <NotificationsView />,
    profile:     <ProfileView />,
    bookmarks:   <BookmarksView />,
    messages:    <MessagesView />,
    userProfile: <UserProfileView />,
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="feed-col">
          <Ticker />
          {views[view]}
        </div>
        <RightColumn />
      </div>
      <AuthModals />
      <NewPostModal />
      <EditProfileModal />
      <button className="theme-toggle" onClick={toggleTheme} title="Switch theme">
        {dark ? '🌙' : '☀️'}
      </button>
      <Toast />
    </div>
  )
}
