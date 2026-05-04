-- ============================================================
-- FINZ  —  initial schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Profiles (extends auth.users automatically via trigger below)
create table profiles (
  id           uuid references auth.users on delete cascade primary key,
  username     text unique not null,
  email        text,
  display_name text,
  role         text    default '',
  bio          text    default '',
  avatar_url   text,
  bg_url       text,
  bg_gradient  text,
  created_at   timestamptz default now()
);

-- Posts
create table posts (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references profiles on delete cascade not null,
  type           text not null default 'discussion',  -- 'model' | 'script' | 'macro' | 'discussion'
  model_type     text,                                -- 'dcf' | 'lbo' | 'ma' | 'custom' | '3stmt' | 'comps'
  title          text,
  body           text,
  file_url       text,
  file_name      text,
  file_size      text,
  media_url      text,
  likes_count    int default 0,
  comments_count int default 0,
  saves_count    int default 0,
  created_at     timestamptz default now()
);

-- Likes
create table likes (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts on delete cascade not null,
  user_id    uuid references profiles on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

-- Bookmarks
create table bookmarks (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts on delete cascade not null,
  user_id    uuid references profiles on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

-- Comments
create table comments (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts on delete cascade not null,
  user_id    uuid references profiles on delete cascade not null,
  body       text not null,
  created_at timestamptz default now()
);

-- Follows
create table follows (
  id           uuid default gen_random_uuid() primary key,
  follower_id  uuid references profiles on delete cascade not null,
  following_id uuid references profiles on delete cascade not null,
  created_at   timestamptz default now(),
  unique(follower_id, following_id)
);

-- Notifications
create table notifications (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references profiles on delete cascade not null,
  from_user_id uuid references profiles on delete set null,
  type         text not null,  -- 'like' | 'comment' | 'follow' | 'message'
  post_id      uuid references posts on delete cascade,
  message      text,
  read         boolean default false,
  created_at   timestamptz default now()
);

-- Direct messages
create table messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id text not null,  -- sorted uuid pair: "uuid1_uuid2"
  sender_id       uuid references profiles on delete cascade not null,
  recipient_id    uuid references profiles on delete cascade not null,
  body            text not null,
  read            boolean default false,
  created_at      timestamptz default now()
);

-- Community ratings
create table ratings (
  id             uuid default gen_random_uuid() primary key,
  rater_id       uuid references profiles on delete cascade not null,
  rated_id       uuid references profiles on delete cascade not null,
  ability        int check (ability between 1 and 10),
  reasoning      int check (reasoning between 1 and 10),
  creativity     int check (creativity between 1 and 10),
  design         int check (design between 1 and 10),
  responsiveness int check (responsiveness between 1 and 10),
  review         text,
  created_at     timestamptz default now(),
  unique(rater_id, rated_id)
);

-- Macro discussion boards
create table macro_boards (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references profiles on delete cascade not null,
  title        text not null,
  body         text,
  category     text,
  media_url    text,
  file_name    text,
  replies_count int default 0,
  views_count   int default 0,
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles    enable row level security;
alter table posts       enable row level security;
alter table likes       enable row level security;
alter table bookmarks   enable row level security;
alter table comments    enable row level security;
alter table follows     enable row level security;
alter table notifications enable row level security;
alter table messages    enable row level security;
alter table ratings     enable row level security;
alter table macro_boards enable row level security;

-- profiles
create policy "profiles_select"  on profiles for select using (true);
create policy "profiles_insert"  on profiles for insert with check (auth.uid() = id);
create policy "profiles_update"  on profiles for update using (auth.uid() = id);

-- posts
create policy "posts_select"  on posts for select using (true);
create policy "posts_insert"  on posts for insert with check (auth.uid() = user_id);
create policy "posts_update"  on posts for update using (auth.uid() = user_id);
create policy "posts_delete"  on posts for delete using (auth.uid() = user_id);

-- likes
create policy "likes_select"  on likes for select using (true);
create policy "likes_insert"  on likes for insert with check (auth.uid() = user_id);
create policy "likes_delete"  on likes for delete using (auth.uid() = user_id);

-- bookmarks
create policy "bm_select"  on bookmarks for select using (auth.uid() = user_id);
create policy "bm_insert"  on bookmarks for insert with check (auth.uid() = user_id);
create policy "bm_delete"  on bookmarks for delete using (auth.uid() = user_id);

-- comments
create policy "comments_select"  on comments for select using (true);
create policy "comments_insert"  on comments for insert with check (auth.uid() = user_id);
create policy "comments_delete"  on comments for delete using (auth.uid() = user_id);

-- follows
create policy "follows_select"  on follows for select using (true);
create policy "follows_insert"  on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete"  on follows for delete using (auth.uid() = follower_id);

-- notifications
create policy "notifs_select"  on notifications for select using (auth.uid() = user_id);
create policy "notifs_insert"  on notifications for insert with check (true);
create policy "notifs_update"  on notifications for update using (auth.uid() = user_id);

-- messages
create policy "msgs_select"  on messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "msgs_insert"  on messages for insert with check (auth.uid() = sender_id);
create policy "msgs_update"  on messages for update using (auth.uid() = recipient_id);

-- ratings
create policy "ratings_select"  on ratings for select using (true);
create policy "ratings_insert"  on ratings for insert with check (auth.uid() = rater_id);
create policy "ratings_update"  on ratings for update using (auth.uid() = rater_id);

-- macro_boards
create policy "macro_select"  on macro_boards for select using (true);
create policy "macro_insert"  on macro_boards for insert with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS  —  keep counters in sync
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- likes counter
create or replace function update_likes_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = NEW.post_id;
  else
    update posts set likes_count = greatest(likes_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;
create trigger trg_likes after insert or delete on likes
  for each row execute procedure update_likes_count();

-- saves counter
create or replace function update_saves_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update posts set saves_count = saves_count + 1 where id = NEW.post_id;
  else
    update posts set saves_count = greatest(saves_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;
create trigger trg_saves after insert or delete on bookmarks
  for each row execute procedure update_saves_count();

-- comments counter
create or replace function update_comments_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = NEW.post_id;
  else
    update posts set comments_count = greatest(comments_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;
create trigger trg_comments after insert or delete on comments
  for each row execute procedure update_comments_count();

-- ============================================================
-- ENABLE REALTIME  (run after schema is created)
-- ============================================================
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table likes;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table macro_boards;

-- ============================================================
-- STORAGE BUCKETS
-- (you can also create these in the Supabase dashboard)
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars',    'avatars',    true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('backgrounds','backgrounds',true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('post-files', 'post-files', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('post-media', 'post-media', true) on conflict do nothing;

-- storage policies
create policy "Public avatars"   on storage.objects for select using (bucket_id = 'avatars');
create policy "Auth upload avatar" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'avatars');
create policy "Public backgrounds" on storage.objects for select using (bucket_id = 'backgrounds');
create policy "Auth upload bg"   on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'backgrounds');
create policy "Public media"     on storage.objects for select using (bucket_id = 'post-media');
create policy "Auth upload media" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'post-media');
create policy "Auth read files"  on storage.objects for select using (auth.role() = 'authenticated' and bucket_id = 'post-files');
create policy "Auth upload files" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'post-files');
