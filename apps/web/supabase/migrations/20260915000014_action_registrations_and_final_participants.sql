-- Separate planned registrations from observed/final participation.
-- This migration is append-only: historical migrations remain unchanged.

create table if not exists public.action_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  action_id uuid not null references public.actions(id) on delete cascade,
  user_id text not null,
  registered_at timestamptz not null default timezone('utc', now()),
  registration_status text not null default 'pending',
  registration_source text not null default 'group_form',
  constraint action_registrations_action_user_unique unique (action_id, user_id),
  constraint action_registrations_status_check
    check (registration_status in ('pending', 'confirmed', 'cancelled')),
  constraint action_registrations_source_check
    check (registration_source in ('group_form', 'manual_add', 'admin', 'admin_override', 'import'))
);

create index if not exists action_registrations_action_id_idx
  on public.action_registrations (action_id);

create index if not exists action_registrations_user_id_idx
  on public.action_registrations (user_id);

alter table public.action_registrations enable row level security;

drop policy if exists action_registrations_service_only on public.action_registrations;
create policy action_registrations_service_only
on public.action_registrations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.update_action_registrations_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists action_registrations_updated_at on public.action_registrations;
create trigger action_registrations_updated_at
before update on public.action_registrations
for each row execute function public.update_action_registrations_updated_at();

-- These are unambiguously planned presences. Keep the original source and
-- timestamps, then remove the duplicate future-presence rows from the final
-- participation table.
insert into public.action_registrations (
  action_id,
  user_id,
  created_at,
  updated_at,
  registered_at,
  registration_status,
  registration_source
)
select
  ap.action_id,
  ap.user_id,
  ap.created_at,
  coalesce(ap.updated_at, ap.joined_at, ap.created_at),
  coalesce(ap.joined_at, ap.created_at),
  ap.participation_status,
  ap.participation_source
from public.action_participants ap
join public.actions a on a.id = ap.action_id
where coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft')
  and (
    ap.participation_source in ('group_form', 'manual_add')
    or ap.participation_source in ('admin', 'admin_override')
  )
on conflict (action_id, user_id) do nothing;

delete from public.action_participants ap
using public.actions a
where a.id = ap.action_id
  and coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft')
  and ap.participation_source in ('group_form', 'manual_add', 'admin', 'admin_override');

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'action_participants'
      and constraint_name = 'action_participants_participation_source_check'
  ) then
    alter table public.action_participants
      drop constraint action_participants_participation_source_check;
  end if;
end $$;

alter table public.action_participants
  add constraint action_participants_participation_source_check
  check (
    participation_source in (
      'admin',
      'admin_override',
      'import',
      'action_creator',
      'action_organizer',
      'post_action_claim',
      -- Compatibility for rows created before this migration is applied.
      'group_form',
      'manual_add'
    )
  );

-- Initialize only real CleanMyMap accounts. Labels, organization names and
-- organizer types never become participant user IDs.
create or replace function public.initialize_action_final_participants(p_action_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.action_participants (
    action_id,
    user_id,
    joined_at,
    participation_status,
    participation_source
  )
  select
    a.id,
    a.created_by_clerk_id,
    a.created_at,
    'confirmed',
    'action_creator'
  from public.actions a
  join public.profiles p on p.id = a.created_by_clerk_id
  where a.id = p_action_id
    and a.action_phase = 'post_action_complete'
  on conflict (action_id, user_id) do nothing;

  insert into public.action_participants (
    action_id,
    user_id,
    joined_at,
    participation_status,
    participation_source
  )
  select
    ao.action_id,
    ao.organizer_clerk_id,
    ao.created_at,
    'confirmed',
    'action_organizer'
  from public.action_organizers ao
  join public.actions a on a.id = ao.action_id
  join public.profiles p on p.id = ao.organizer_clerk_id
  where ao.action_id = p_action_id
    and a.action_phase = 'post_action_complete'
  on conflict (action_id, user_id) do nothing;
end;
$$;

revoke all on function public.initialize_action_final_participants(uuid) from public, anon, authenticated;
grant execute on function public.initialize_action_final_participants(uuid) to service_role;

create or replace function public.initialize_action_final_participants_on_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.action_phase = 'post_action_complete' then
    if tg_op = 'INSERT' or old.action_phase is distinct from new.action_phase then
      perform public.initialize_action_final_participants(new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists action_final_participants_on_action on public.actions;
create trigger action_final_participants_on_action
after insert or update of action_phase on public.actions
for each row execute function public.initialize_action_final_participants_on_action();

create or replace function public.initialize_action_final_participants_on_organizer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.initialize_action_final_participants(new.action_id);
  return new;
end;
$$;

drop trigger if exists action_final_participants_on_organizer on public.action_organizers;
create trigger action_final_participants_on_organizer
after insert or update of organizer_clerk_id on public.action_organizers
for each row execute function public.initialize_action_final_participants_on_organizer();

revoke all on function public.initialize_action_final_participants_on_action() from public, anon, authenticated;
revoke all on function public.initialize_action_final_participants_on_organizer() from public, anon, authenticated;
grant execute on function public.initialize_action_final_participants_on_action() to service_role;
grant execute on function public.initialize_action_final_participants_on_organizer() to service_role;

-- The RPC name is retained for API compatibility. Its source follows the
-- action lifecycle: registrations before the action, final participation
-- after the action. This keeps both records visible without converting one
-- meaning into the other.
create or replace function public.load_action_participant_summaries(
  p_action_ids uuid[],
  p_user_id text default null
)
returns table (
  action_id uuid,
  active_count bigint,
  total_count bigint,
  my_participation_status text,
  my_participation_source text,
  my_joined_at timestamptz,
  my_updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
with requested_actions as (
  select distinct on (action_id)
    action_id,
    ordinality
  from unnest(coalesce(p_action_ids, '{}'::uuid[])) with ordinality as input(action_id, ordinality)
  order by action_id, ordinality
),
action_totals as (
  select
    ar.action_id,
    count(*) filter (where ar.registration_status = 'confirmed')::bigint as active_count,
    count(*)::bigint as total_count
  from public.action_registrations ar
  join public.actions a on a.id = ar.action_id
  join requested_actions ra on ra.action_id = ar.action_id
  where coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft')
  group by ar.action_id
  union all
  select
    ap.action_id,
    count(*) filter (where ap.participation_status = 'confirmed')::bigint as active_count,
    count(*)::bigint as total_count
  from public.action_participants ap
  join public.actions a on a.id = ap.action_id
  join requested_actions ra on ra.action_id = ap.action_id
  where coalesce(a.action_phase, 'post_action_complete') not in ('pre_action', 'post_action_draft')
  group by ap.action_id
),
user_participation as (
  select
    ar.action_id,
    ar.registration_status as my_participation_status,
    ar.registration_source as my_participation_source,
    ar.registered_at as my_joined_at,
    ar.updated_at as my_updated_at
  from public.action_registrations ar
  join public.actions a on a.id = ar.action_id
  where p_user_id is not null
    and ar.user_id = p_user_id
    and ar.action_id = any(coalesce(p_action_ids, '{}'::uuid[]))
    and coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft')
  union all
  select
    ap.action_id,
    ap.participation_status,
    ap.participation_source,
    ap.joined_at,
    ap.updated_at
  from public.action_participants ap
  join public.actions a on a.id = ap.action_id
  where p_user_id is not null
    and ap.user_id = p_user_id
    and ap.action_id = any(coalesce(p_action_ids, '{}'::uuid[]))
    and coalesce(a.action_phase, 'post_action_complete') not in ('pre_action', 'post_action_draft')
)
select
  ra.action_id,
  coalesce(totals.active_count, 0)::bigint,
  coalesce(totals.total_count, 0)::bigint,
  ur.my_participation_status,
  ur.my_participation_source,
  ur.my_joined_at,
  ur.my_updated_at
from requested_actions ra
left join action_totals totals on totals.action_id = ra.action_id
left join user_participation ur on ur.action_id = ra.action_id
order by ra.ordinality;
$$;

revoke all on function public.load_action_participant_summaries(uuid[], text) from public, anon, authenticated, service_role;
grant execute on function public.load_action_participant_summaries(uuid[], text) to service_role;
