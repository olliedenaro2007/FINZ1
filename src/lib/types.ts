export type Profile = {
  id: string
  username: string
  email: string | null
  display_name: string | null
  role: string | null
  bio: string | null
  avatar_url: string | null
  bg_url: string | null
  bg_gradient: string | null
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  type: 'model' | 'script' | 'macro' | 'discussion'
  model_type: string | null
  title: string | null
  body: string | null
  file_url: string | null
  file_name: string | null
  file_size: string | null
  media_url: string | null
  likes_count: number
  comments_count: number
  saves_count: number
  created_at: string
  profiles?: Profile
  liked?: boolean
  saved?: boolean
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
  profiles?: Profile
}

export type Notification = {
  id: string
  user_id: string
  from_user_id: string | null
  type: string
  post_id: string | null
  message: string | null
  read: boolean
  created_at: string
  from_profile?: Profile
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  recipient_id: string
  body: string
  read: boolean
  created_at: string
  sender?: Profile
}

export type MacroBoard = {
  id: string
  user_id: string
  title: string
  body: string | null
  category: string | null
  media_url: string | null
  file_name: string | null
  replies_count: number
  views_count: number
  created_at: string
  profiles?: Profile
}

export type Rating = {
  id: string
  rater_id: string
  rated_id: string
  ability: number | null
  reasoning: number | null
  creativity: number | null
  design: number | null
  responsiveness: number | null
  review: string | null
  created_at: string
}

export type View =
  | 'feed' | 'explore' | 'models' | 'scripts'
  | 'macro' | 'leaderboard' | 'notifs' | 'profile'
  | 'bookmarks' | 'messages' | 'userProfile'
