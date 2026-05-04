import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: posts } = await supabase
    .from('posts')
    .select('body, title, likes_count, created_at')
    .gte('created_at', cutoff)
    .order('likes_count', { ascending: false })
    .limit(100)

  if (!posts || posts.length === 0) {
    return NextResponse.json({ topics: [] })
  }

  const scores: Record<string, number> = {}
  for (const post of posts) {
    const text = `${post.title ?? ''} ${post.body ?? ''}`
    const tags = text.match(/#[\w]+/g) ?? []
    for (const tag of tags) {
      const key = tag.toLowerCase()
      scores[key] = (scores[key] ?? 0) + (post.likes_count ?? 0) + 1
    }
  }

  const topics = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }))

  return NextResponse.json({ topics })
}
