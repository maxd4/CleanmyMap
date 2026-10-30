-- Community subscriptions are explicit, private preferences owned by one Clerk user.
create table if not exists public.community_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null check (btrim(user_id) <> ''),
  kind text not null check (kind in ('territory', 'topic')),
  territory_zone_name text,
  topic_id text,
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly')),
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint community_subscriptions_target_check check (
    (
      kind = 'territory'
      and nullif(btrim(territory_zone_name), '') is not null
      and topic_id is null
    )
    or (
      kind = 'topic'
      and territory_zone_name is null
      and topic_id in ('future_actions', 'needs', 'results')
    )
  )
);

create unique index if not exists community_subscriptions_user_territory_unique_idx
  on public.community_subscriptions (user_id, kind, territory_zone_name)
  where kind = 'territory';

create unique index if not exists community_subscriptions_user_topic_unique_idx
  on public.community_subscriptions (user_id, kind, topic_id)
  where kind = 'topic';

create index if not exists community_subscriptions_user_enabled_idx
  on public.community_subscriptions (user_id, enabled, updated_at desc);

drop trigger if exists community_subscriptions_set_updated_at on public.community_subscriptions;
create trigger community_subscriptions_set_updated_at
before update on public.community_subscriptions
for each row execute function public.set_updated_at();

alter table public.community_subscriptions enable row level security;

drop policy if exists community_subscriptions_select_own on public.community_subscriptions;
create policy community_subscriptions_select_own
on public.community_subscriptions for select
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists community_subscriptions_insert_own on public.community_subscriptions;
create policy community_subscriptions_insert_own
on public.community_subscriptions for insert
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists community_subscriptions_update_own on public.community_subscriptions;
create policy community_subscriptions_update_own
on public.community_subscriptions for update
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists community_subscriptions_delete_own on public.community_subscriptions;
create policy community_subscriptions_delete_own
on public.community_subscriptions for delete
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

revoke all on table public.community_subscriptions from public, anon;
grant select, insert, update, delete on table public.community_subscriptions to authenticated, service_role;
