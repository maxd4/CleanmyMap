-- PURPOSE: store one private, declarative action retrospective and publish it
-- atomically with one idempotent community notification per final participant.
-- AUTHORIZATION_BOUNDARY: the HTTP handler checks Clerk AuthN and the
-- creator/action_organizers relation; these service-only RPCs repeat the
-- relation check before any write. ACTIVE_ROLE alone never grants access.
-- PUBLICATION_CONTRACT: only post_action_complete, approved, published,
-- visible, public actions with a compatible review may be published.
-- PRIVACY: drafts and authored_by_clerk_id never enter public projections or
-- notification payloads. Public rows expose only the four editorial fields
-- and publication metadata.
-- ATOMICITY: the publication RPC locks the action and retrospective, inserts
-- notifications, and sets notified_at in one transaction.
-- IDEMPOTENCY: published_at is assigned once; the notification identity is
-- (recipient, action) and ON CONFLICT DO NOTHING makes replays silent.
-- FORWARD_ONLY: this migration is append-only.

create table if not exists public.action_retrospectives (
  action_id uuid primary key references public.actions(id) on delete cascade,
  authored_by_clerk_id text not null,
  thanks_message text null,
  worked_well text null,
  blockers text null,
  improve_next_time text null,
  published_at timestamptz null,
  notified_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint action_retrospectives_thanks_message_length
    check (char_length(coalesce(thanks_message, '')) <= 500),
  constraint action_retrospectives_worked_well_length
    check (char_length(coalesce(worked_well, '')) <= 1000),
  constraint action_retrospectives_blockers_length
    check (char_length(coalesce(blockers, '')) <= 1000),
  constraint action_retrospectives_improve_next_time_length
    check (char_length(coalesce(improve_next_time, '')) <= 1000)
);

create index if not exists action_retrospectives_published_idx
  on public.action_retrospectives (published_at)
  where published_at is not null;

create unique index if not exists app_notifications_action_retrospective_identity_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'eventType'),
    (payload ->> 'actionId')
  )
  where type = 'community'
    and payload ->> 'eventType' = 'action_retrospective_published'
    and nullif(payload ->> 'actionId', '') is not null;

alter table public.action_retrospectives enable row level security;

drop policy if exists action_retrospectives_service_only on public.action_retrospectives;
create policy action_retrospectives_service_only
on public.action_retrospectives
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

revoke all privileges on table public.action_retrospectives
  from public, anon, authenticated;
grant select, insert, update, delete on table public.action_retrospectives
  to service_role;

create or replace function public.update_action_retrospectives_updated_at()
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

drop trigger if exists action_retrospectives_updated_at on public.action_retrospectives;
create trigger action_retrospectives_updated_at
before update on public.action_retrospectives
for each row execute function public.update_action_retrospectives_updated_at();

create or replace function public.save_action_retrospective(
  p_action_id uuid,
  p_actor_user_id text,
  p_thanks_message text default null,
  p_worked_well text default null,
  p_blockers text default null,
  p_improve_next_time text default null
)
returns table (
  action_id uuid,
  thanks_message text,
  worked_well text,
  blockers text,
  improve_next_time text,
  published_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_author text := nullif(btrim(p_actor_user_id), '');
  v_thanks text := nullif(btrim(regexp_replace(coalesce(p_thanks_message, ''), '[[:space:]]+', ' ', 'g')), '');
  v_worked text := nullif(btrim(regexp_replace(coalesce(p_worked_well, ''), '[[:space:]]+', ' ', 'g')), '');
  v_blockers text := nullif(btrim(regexp_replace(coalesce(p_blockers, ''), '[[:space:]]+', ' ', 'g')), '');
  v_improve text := nullif(btrim(regexp_replace(coalesce(p_improve_next_time, ''), '[[:space:]]+', ' ', 'g')), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_action_id is null or v_author is null then
    raise exception 'Invalid retrospective actor or action';
  end if;
  if char_length(v_thanks) > 500
     or char_length(v_worked) > 1000
     or char_length(v_blockers) > 1000
     or char_length(v_improve) > 1000 then
    raise exception 'Retrospective field exceeds its maximum length';
  end if;

  select * into v_action
  from public.actions
  where id = p_action_id
  for update;
  if not found then
    raise exception 'Action not found';
  end if;
  if v_action.action_phase <> 'post_action_complete'
     or v_action.status in ('rejected', 'cancelled') then
    raise exception 'Retrospective requires a finalized action';
  end if;
  if v_action.created_by_clerk_id <> v_author
     and not exists (
       select 1
       from public.action_organizers ao
       where ao.action_id = p_action_id
         and ao.organizer_clerk_id = v_author
     ) then
    raise exception 'Forbidden';
  end if;

  insert into public.action_retrospectives (
    action_id,
    authored_by_clerk_id,
    thanks_message,
    worked_well,
    blockers,
    improve_next_time
  ) values (
    p_action_id,
    v_author,
    v_thanks,
    v_worked,
    v_blockers,
    v_improve
  )
  on conflict (action_id) do update set
    thanks_message = excluded.thanks_message,
    worked_well = excluded.worked_well,
    blockers = excluded.blockers,
    improve_next_time = excluded.improve_next_time;

  return query
  select r.action_id, r.thanks_message, r.worked_well, r.blockers,
    r.improve_next_time, r.published_at, r.updated_at
  from public.action_retrospectives r
  where r.action_id = p_action_id;
end;
$$;

create or replace function public.read_action_retrospective_for_actor(
  p_action_id uuid,
  p_actor_user_id text
)
returns table (
  action_id uuid,
  thanks_message text,
  worked_well text,
  blockers text,
  improve_next_time text,
  published_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_author text := nullif(btrim(p_actor_user_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_action_id is null or v_author is null then
    raise exception 'Invalid retrospective actor or action';
  end if;
  if not exists (
    select 1 from public.actions a
    where a.id = p_action_id
      and a.action_phase = 'post_action_complete'
      and a.status not in ('rejected', 'cancelled')
      and (
        a.created_by_clerk_id = v_author
        or exists (
          select 1 from public.action_organizers ao
          where ao.action_id = p_action_id
            and ao.organizer_clerk_id = v_author
        )
      )
  ) then
    raise exception 'Forbidden';
  end if;

  return query
  select r.action_id, r.thanks_message, r.worked_well, r.blockers,
    r.improve_next_time, r.published_at, r.updated_at
  from public.action_retrospectives r
  where r.action_id = p_action_id;
end;
$$;

create or replace function public.read_public_action_retrospective(
  p_action_id uuid
)
returns table (
  action_id uuid,
  thanks_message text,
  worked_well text,
  blockers text,
  improve_next_time text,
  published_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, pg_catalog
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  return query
  select r.action_id, r.thanks_message, r.worked_well, r.blockers,
    r.improve_next_time, r.published_at, r.updated_at
  from public.action_retrospectives r
  join public.actions a on a.id = r.action_id
  where r.action_id = p_action_id
    and r.published_at is not null
    and a.action_phase = 'post_action_complete'
    and a.status = 'approved'
    and a.published_at is not null
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and coalesce(a.access_mode, 'public') = 'public'
    and coalesce(a.review_state, 'not_required') in ('not_required', 'approved');
end;
$$;

create or replace function public.publish_action_retrospective(
  p_action_id uuid,
  p_actor_user_id text
)
returns table (
  action_id uuid,
  thanks_message text,
  worked_well text,
  blockers text,
  improve_next_time text,
  published_at timestamptz,
  updated_at timestamptz,
  notified_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_retrospective public.action_retrospectives%rowtype;
  v_author text := nullif(btrim(p_actor_user_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_action_id is null or v_author is null then
    raise exception 'Invalid retrospective actor or action';
  end if;

  select * into v_action
  from public.actions
  where id = p_action_id
  for update;
  if not found then
    raise exception 'Action not found';
  end if;
  if v_action.created_by_clerk_id <> v_author
     and not exists (
       select 1 from public.action_organizers ao
       where ao.action_id = p_action_id
         and ao.organizer_clerk_id = v_author
     ) then
    raise exception 'Forbidden';
  end if;

  select * into v_retrospective
  from public.action_retrospectives
  where action_id = p_action_id
  for update;
  if not found then
    raise exception 'Retrospective draft not found';
  end if;
  if v_retrospective.published_at is not null then
    return query
    select v_retrospective.action_id, v_retrospective.thanks_message,
      v_retrospective.worked_well, v_retrospective.blockers,
      v_retrospective.improve_next_time, v_retrospective.published_at,
      v_retrospective.updated_at, v_retrospective.notified_at;
    return;
  end if;
  if v_action.action_phase <> 'post_action_complete'
     or v_action.status <> 'approved'
     or v_action.published_at is null
     or coalesce(v_action.moderation_visibility, 'visible') <> 'visible'
     or coalesce(v_action.access_mode, 'public') <> 'public'
     or coalesce(v_action.review_state, 'not_required') not in ('not_required', 'approved') then
    raise exception 'Action is not eligible for retrospective publication';
  end if;
  if v_retrospective.thanks_message is null
     and v_retrospective.worked_well is null
     and v_retrospective.blockers is null
     and v_retrospective.improve_next_time is null then
    raise exception 'Retrospective requires content';
  end if;

  update public.action_retrospectives
  set published_at = timezone('utc', now())
  where action_id = p_action_id;

  insert into public.app_notifications (user_id, type, title, content, payload)
  select ap.user_id,
    'community',
    'Merci pour votre participation',
    left(coalesce(v_retrospective.thanks_message, 'Le retour d’expérience de cette action est disponible.'), 1000),
    jsonb_build_object(
      'eventType', 'action_retrospective_published',
      'actionId', p_action_id
    )
  from public.action_participants ap
  where ap.action_id = p_action_id
    and ap.participation_status = 'confirmed'
    and ap.user_id <> v_retrospective.authored_by_clerk_id
  on conflict do nothing;

  update public.action_retrospectives
  set notified_at = timezone('utc', now())
  where action_id = p_action_id;

  return query
  select r.action_id, r.thanks_message, r.worked_well, r.blockers,
    r.improve_next_time, r.published_at, r.updated_at, r.notified_at
  from public.action_retrospectives r
  where r.action_id = p_action_id;
end;
$$;

revoke all on function public.update_action_retrospectives_updated_at() from public, anon, authenticated;
revoke all on function public.save_action_retrospective(uuid, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.read_action_retrospective_for_actor(uuid, text)
  from public, anon, authenticated;
revoke all on function public.read_public_action_retrospective(uuid)
  from public, anon, authenticated;
revoke all on function public.publish_action_retrospective(uuid, text)
  from public, anon, authenticated;
grant execute on function public.save_action_retrospective(uuid, text, text, text, text, text)
  to service_role;
grant execute on function public.read_action_retrospective_for_actor(uuid, text)
  to service_role;
grant execute on function public.read_public_action_retrospective(uuid)
  to service_role;
grant execute on function public.publish_action_retrospective(uuid, text)
  to service_role;
