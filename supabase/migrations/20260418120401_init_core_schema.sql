create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  taste_tags text[] not null default '{}'::text[],
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  accent text not null default '#5f748d',
  emoji text not null default 'DISC',
  layout_size text not null default 'standard',
  mood text not null default '',
  aesthetic text not null default '',
  vibe_summary text not null default '',
  genre_focus text[] not null default '{}'::text[],
  is_default boolean not null default false,
  default_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watchlists_name_not_empty check (char_length(trim(name)) > 0),
  constraint watchlists_slug_not_empty check (char_length(trim(slug)) > 0),
  constraint watchlists_layout_size_check check (layout_size in ('compact', 'standard', 'tall')),
  constraint watchlists_mood_trimmed check (mood = trim(mood)),
  constraint watchlists_aesthetic_trimmed check (aesthetic = trim(aesthetic)),
  constraint watchlists_vibe_summary_trimmed check (vibe_summary = trim(vibe_summary)),
  constraint watchlists_default_type_check check (default_type in ('discover') or default_type is null),
  constraint watchlists_default_consistency_check check (
    (is_default = true and default_type is not null)
    or (is_default = false and default_type is null)
  ),
  constraint watchlists_user_slug_key unique (user_id, slug),
  constraint watchlists_id_user_unique unique (id, user_id)
);

create unique index if not exists watchlists_user_default_type_unique
  on public.watchlists (user_id, default_type)
  where default_type is not null;

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  added_from text not null default 'manual',
  note text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now(),
  constraint watchlist_items_tmdb_id_check check (tmdb_id > 0),
  constraint watchlist_items_media_type_check check (media_type in ('movie', 'tv')),
  constraint watchlist_items_added_from_check check (
    added_from in ('discover', 'search', 'hidden_iceberg', 'recommendation', 'manual')
  ),
  constraint watchlist_items_watchlist_user_fkey
    foreign key (watchlist_id, user_id)
    references public.watchlists (id, user_id)
    on delete cascade,
  constraint watchlist_items_unique_title_in_watchlist
    unique (watchlist_id, tmdb_id, media_type)
);

create table if not exists public.interaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  action text not null,
  source text not null default 'discover',
  source_watchlist_id uuid,
  session_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint interaction_events_tmdb_id_check check (tmdb_id > 0),
  constraint interaction_events_media_type_check check (media_type in ('movie', 'tv')),
  constraint interaction_events_action_check check (action in ('like', 'pass', 'add')),
  constraint interaction_events_source_check check (
    source in ('discover', 'search', 'hidden_iceberg', 'watchlist_recommendation', 'movie_detail')
  ),
  constraint interaction_events_source_watchlist_fk
    foreign key (source_watchlist_id)
    references public.watchlists (id)
    on delete set null
);

create table if not exists public.recommendation_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  watchlist_id uuid,
  source text not null default 'watchlist_detail',
  algorithm_version text not null default 'v1',
  seed integer,
  created_at timestamptz not null default now(),
  constraint recommendation_batches_source_check check (
    source in ('watchlist_detail', 'hidden_iceberg', 'home', 'discover')
  ),
  constraint recommendation_batches_id_user_unique unique (id, user_id),
  constraint recommendation_batches_watchlist_fk
    foreign key (watchlist_id)
    references public.watchlists (id)
    on delete set null
);

create table if not exists public.recommendation_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  watchlist_id uuid,
  tmdb_id integer not null,
  media_type text not null,
  score numeric(5, 2),
  reason text not null,
  position integer not null default 0,
  status text not null default 'pending',
  feedback text,
  added_to_watchlist_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint recommendation_items_tmdb_id_check check (tmdb_id > 0),
  constraint recommendation_items_media_type_check check (media_type in ('movie', 'tv')),
  constraint recommendation_items_status_check check (status in ('pending', 'added', 'dismissed')),
  constraint recommendation_items_feedback_check check (feedback in ('more', 'less') or feedback is null),
  constraint recommendation_items_batch_user_fk
    foreign key (batch_id, user_id)
    references public.recommendation_batches (id, user_id)
    on delete cascade,
  constraint recommendation_items_watchlist_fk
    foreign key (watchlist_id)
    references public.watchlists (id)
    on delete set null,
  constraint recommendation_items_added_to_watchlist_fk
    foreign key (added_to_watchlist_id)
    references public.watchlists (id)
    on delete set null,
  constraint recommendation_items_unique_batch_title
    unique (batch_id, tmdb_id, media_type)
);

create index if not exists watchlists_user_updated_at_idx
  on public.watchlists (user_id, updated_at desc);
create index if not exists watchlists_user_defaults_idx
  on public.watchlists (user_id, is_default, default_type);

create index if not exists watchlist_items_user_added_at_idx
  on public.watchlist_items (user_id, added_at desc);
create index if not exists watchlist_items_watchlist_added_at_idx
  on public.watchlist_items (watchlist_id, added_at desc);
create index if not exists watchlist_items_user_tmdb_lookup_idx
  on public.watchlist_items (user_id, tmdb_id, media_type);

create index if not exists interaction_events_user_created_at_idx
  on public.interaction_events (user_id, created_at desc);
create index if not exists interaction_events_user_action_created_at_idx
  on public.interaction_events (user_id, action, created_at desc);
create index if not exists interaction_events_user_source_created_at_idx
  on public.interaction_events (user_id, source, created_at desc);

create index if not exists recommendation_batches_user_created_at_idx
  on public.recommendation_batches (user_id, created_at desc);
create index if not exists recommendation_batches_watchlist_created_at_idx
  on public.recommendation_batches (watchlist_id, created_at desc);

create index if not exists recommendation_items_user_created_at_idx
  on public.recommendation_items (user_id, created_at desc);
create index if not exists recommendation_items_batch_position_idx
  on public.recommendation_items (batch_id, position);
create index if not exists recommendation_items_user_status_idx
  on public.recommendation_items (user_id, status);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_watchlists_updated_at on public.watchlists;
create trigger set_watchlists_updated_at
before update on public.watchlists
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_display_name text;
begin
  derived_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    derived_display_name,
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (user_id) do nothing;

  if not exists (
    select 1
    from public.watchlists w
    where w.user_id = new.id
      and w.default_type = 'discover'
  ) then
    insert into public.watchlists (
      user_id,
      slug,
      name,
      description,
      accent,
      emoji,
      layout_size,
      is_default,
      default_type
    ) values (
      new.id,
      'discover',
      'Discover',
      'Liked from swipe mode.',
      '#5f748d',
      'DISC',
      'standard',
      true,
      'discover'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (user_id, display_name, avatar_url)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(u.email, '@', 1)
  ) as display_name,
  nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '') as avatar_url
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.user_id = u.id
);

insert into public.watchlists (
  user_id,
  slug,
  name,
  description,
  accent,
  emoji,
  layout_size,
  is_default,
  default_type
)
select
  u.id,
  'discover',
  'Discover',
  'Liked from swipe mode.',
  '#5f748d',
  'DISC',
  'standard',
  true,
  'discover'
from auth.users u
where not exists (
  select 1
  from public.watchlists w
  where w.user_id = u.id
    and w.default_type = 'discover'
);

alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.interaction_events enable row level security;
alter table public.recommendation_batches enable row level security;
alter table public.recommendation_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
using (auth.uid() = user_id);

drop policy if exists "watchlists_select_own" on public.watchlists;
create policy "watchlists_select_own"
on public.watchlists
for select
using (auth.uid() = user_id);

drop policy if exists "watchlists_insert_own" on public.watchlists;
create policy "watchlists_insert_own"
on public.watchlists
for insert
with check (auth.uid() = user_id);

drop policy if exists "watchlists_update_own" on public.watchlists;
create policy "watchlists_update_own"
on public.watchlists
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "watchlists_delete_own" on public.watchlists;
create policy "watchlists_delete_own"
on public.watchlists
for delete
using (auth.uid() = user_id);

drop policy if exists "watchlist_items_select_own" on public.watchlist_items;
create policy "watchlist_items_select_own"
on public.watchlist_items
for select
using (auth.uid() = user_id);

drop policy if exists "watchlist_items_insert_own" on public.watchlist_items;
create policy "watchlist_items_insert_own"
on public.watchlist_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "watchlist_items_update_own" on public.watchlist_items;
create policy "watchlist_items_update_own"
on public.watchlist_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "watchlist_items_delete_own" on public.watchlist_items;
create policy "watchlist_items_delete_own"
on public.watchlist_items
for delete
using (auth.uid() = user_id);

drop policy if exists "interaction_events_select_own" on public.interaction_events;
create policy "interaction_events_select_own"
on public.interaction_events
for select
using (auth.uid() = user_id);

drop policy if exists "interaction_events_insert_own" on public.interaction_events;
create policy "interaction_events_insert_own"
on public.interaction_events
for insert
with check (auth.uid() = user_id);

drop policy if exists "interaction_events_update_own" on public.interaction_events;
create policy "interaction_events_update_own"
on public.interaction_events
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "interaction_events_delete_own" on public.interaction_events;
create policy "interaction_events_delete_own"
on public.interaction_events
for delete
using (auth.uid() = user_id);

drop policy if exists "recommendation_batches_select_own" on public.recommendation_batches;
create policy "recommendation_batches_select_own"
on public.recommendation_batches
for select
using (auth.uid() = user_id);

drop policy if exists "recommendation_batches_insert_own" on public.recommendation_batches;
create policy "recommendation_batches_insert_own"
on public.recommendation_batches
for insert
with check (auth.uid() = user_id);

drop policy if exists "recommendation_batches_update_own" on public.recommendation_batches;
create policy "recommendation_batches_update_own"
on public.recommendation_batches
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "recommendation_batches_delete_own" on public.recommendation_batches;
create policy "recommendation_batches_delete_own"
on public.recommendation_batches
for delete
using (auth.uid() = user_id);

drop policy if exists "recommendation_items_select_own" on public.recommendation_items;
create policy "recommendation_items_select_own"
on public.recommendation_items
for select
using (auth.uid() = user_id);

drop policy if exists "recommendation_items_insert_own" on public.recommendation_items;
create policy "recommendation_items_insert_own"
on public.recommendation_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "recommendation_items_update_own" on public.recommendation_items;
create policy "recommendation_items_update_own"
on public.recommendation_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "recommendation_items_delete_own" on public.recommendation_items;
create policy "recommendation_items_delete_own"
on public.recommendation_items
for delete
using (auth.uid() = user_id);
