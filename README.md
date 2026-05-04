# FINZ — Next.js + Supabase

## Setup

### 1. Install Node.js
Download from https://nodejs.org (LTS version) and install it.

### 2. Create a Supabase project
1. Go to https://supabase.com and sign up (free)
2. Click **New project**, choose a name and password, click Create
3. Wait ~2 min for the project to spin up

### 3. Run the database schema
1. In your Supabase dashboard → **SQL Editor**
2. Open `supabase/migrations/001_initial.sql` from this project
3. Paste the entire contents and click **Run**

### 4. Configure environment variables
```bash
cp .env.local.example .env.local
```
Then open `.env.local` and fill in your Supabase URL and anon key.
Find them in Supabase → **Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Install dependencies and run
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel (free)
1. Push this folder to a new GitHub repo
2. Go to https://vercel.com → New Project → import that repo
3. Add the two environment variables in Vercel's dashboard
4. Click Deploy — done

## What's powered by Supabase
| Feature | Supabase service |
|---|---|
| Sign up / Sign in / Sign out | Auth |
| Posts, comments, likes, bookmarks | Database (Postgres + RLS) |
| Profile pictures, post files, backgrounds | Storage |
| New post → appears instantly for all users | Realtime |
| New comment → appears instantly | Realtime |
| New like/save → updates counter | Realtime (DB triggers) |
| DM message → delivered in real time | Realtime |
| Notification badge → live count | Realtime |
