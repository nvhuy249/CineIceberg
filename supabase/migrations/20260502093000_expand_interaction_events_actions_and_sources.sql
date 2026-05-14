alter table public.interaction_events
drop constraint if exists interaction_events_action_check;

alter table public.interaction_events
add constraint interaction_events_action_check
check (action in ('like', 'pass', 'add', 'remove', 'open'));

alter table public.interaction_events
drop constraint if exists interaction_events_source_check;

alter table public.interaction_events
add constraint interaction_events_source_check
check (
  source in (
    'discover',
    'search',
    'hidden_iceberg',
    'watchlist_recommendation',
    'watchlist_detail',
    'movie_detail',
    'home',
    'manual'
  )
);
