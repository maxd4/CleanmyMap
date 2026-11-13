-- Correct the published timezone migration without rewriting it.
--
-- PURPOSE: restore the public map, review-state, provenance and idempotency
-- contracts while moving active future-action decisions to persisted UTC.
-- CALLERS: browser map RPC, server action creation, chat/RLS, rides and jobs.
-- AUTHORIZATION_BOUNDARY: map access is an explicit filtered SECURITY DEFINER
-- RPC; the underlying statistical view remains service-only.
-- IDEMPOTENCY: a replayed creation never updates public.actions.
-- ATOMICITY: all replacements are transactional DDL/function definitions.
-- FAILURE_BEHAVIOR: missing or incoherent UTC instants fail closed.
-- SEARCH_PATH: every privileged function pins its path explicitly.

-- The view deliberately remains inaccessible to browser roles. The RPC is the
-- narrow, filtered public surface and must therefore execute with its owner.
alter function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) security definer;
alter function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) set search_path = public, pg_catalog;

-- Public reads retain the association review gate. Owners and service_role can
-- still inspect their own/internally managed rows as before.
drop policy if exists actions_select_public_or_owner on public.actions;
create policy actions_select_public_or_owner on public.actions
for select using (
  (select auth.role()) = 'service_role'
  or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or (
    coalesce(moderation_visibility, 'visible') = 'visible'
    and coalesce(review_state, 'not_required') in ('not_required', 'approved')
    and (
      (
        status = 'approved'
        and coalesce(action_phase, 'post_action_complete') <> 'pre_action'
      )
      or public.is_public_future_pre_action_v2(
        action_phase, published_at, moderation_visibility, status, event_start_at
      )
    )
  )
);

-- The service wrapper owns the provenance marker. It is set before the legacy
-- insert so the BEFORE INSERT provenance trigger can attest the new row.
-- A strict idempotency replay returns the existing result and performs no
-- UPDATE, timestamp change, trigger execution or invalidation.
create or replace function public.create_action_with_relations(
  p_action jsonb,
  p_organizers jsonb,
  p_registrations jsonb,
  p_creator_id text,
  p_client_request_id text default null,
  p_client_request_fingerprint text default null,
  p_organizer_required boolean default true
)
returns table (action_id uuid, replayed boolean)
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_action_id uuid;
  v_replayed boolean;
begin
  perform set_config('cleanmymap.action_creation_provenance', 'real', true);

  select result.action_id, result.replayed
  into v_action_id, v_replayed
  from public.create_action_with_relations_legacy(
    p_action, p_organizers, p_registrations, p_creator_id,
    p_client_request_id, p_client_request_fingerprint, p_organizer_required
  ) result;

  if not coalesce(v_replayed, false) then
    update public.actions
    set action_timezone = coalesce(
      nullif(btrim(p_action ->> 'action_timezone'), ''),
      action_timezone,
      'Europe/Paris'
    )
    where id = v_action_id;
  end if;

  return query select v_action_id, v_replayed;
end;
$$;

revoke all on function public.create_action_with_relations(
  jsonb, jsonb, jsonb, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.create_action_with_relations(
  jsonb, jsonb, jsonb, text, text, text, boolean
) to service_role;

-- Canonical UTC predicate for action-linked SQL consumers. The six-argument
-- historical function remains available for old service callers, but active
-- international decisions below use this persisted-instant contract.
create or replace function public.is_action_discussion_available_utc(
  p_action_phase text,
  p_published_at timestamptz,
  p_moderation_visibility text,
  p_status text,
  p_review_state text,
  p_event_start_at timestamptz
)
returns boolean
language sql stable
set search_path = public, pg_catalog
as $$
  select p_published_at is not null
    and coalesce(p_moderation_visibility, 'visible') <> 'hidden'
    and coalesce(p_review_state, 'not_required') in ('not_required', 'approved')
    and (
      p_status = 'cancelled'
      or (
        p_action_phase = 'pre_action'
        and p_status in ('pending', 'approved')
        and p_event_start_at is not null
        and p_event_start_at > now()
      )
      or (
        p_status = 'approved'
        and coalesce(p_action_phase, 'post_action_complete') <> 'pre_action'
      )
    );
$$;

revoke all on function public.is_action_discussion_available_utc(
  text, timestamptz, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.is_action_discussion_available_utc(
  text, timestamptz, text, text, text, timestamptz
) to service_role;

-- Preserve the legacy signature, but do not let it make a Paris-based future
-- decision for an action that has no persisted instant. Active consumers use
-- is_action_discussion_available_utc above.
create or replace function public.is_action_discussion_available(
  p_action_phase text,
  p_published_at timestamptz,
  p_moderation_visibility text,
  p_status text,
  p_action_date date,
  p_event_start_time time
)
returns boolean
language sql stable
set search_path = public, pg_catalog
as $$
  select p_published_at is not null
    and coalesce(p_moderation_visibility, 'visible') <> 'hidden'
    and p_status = 'approved'
    and coalesce(p_action_phase, 'post_action_complete') <> 'pre_action';
$$;

-- The private conversation gate has the action row and therefore uses the
-- canonical UTC/review predicate directly.
create or replace function private.can_view_action_conversation(p_conversation_id uuid)
returns boolean
language sql security definer stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.action_conversations c
    join public.actions a on a.id = c.action_id
    where c.id = p_conversation_id
      and public.is_action_discussion_available_utc(
        a.action_phase, a.published_at, a.moderation_visibility,
        a.status, a.review_state, a.event_start_at
      )
      and (select auth.role()) = 'authenticated'
      and (select auth.jwt()) ->> 'sub' is not null
      and not exists (
        select 1 from public.action_conversation_exclusions e
        where e.conversation_id = c.id
          and e.user_id = (select auth.jwt()) ->> 'sub'
          and e.active
      )
      and (
        a.created_by_clerk_id = (select auth.jwt()) ->> 'sub'
        or exists (select 1 from public.action_organizers ao
          where ao.action_id = a.id
            and ao.organizer_clerk_id = (select auth.jwt()) ->> 'sub')
        or exists (select 1 from public.action_conversation_members m
          where m.conversation_id = c.id
            and m.user_id = (select auth.jwt()) ->> 'sub')
        or exists (select 1 from public.action_registrations ar
          where ar.action_id = a.id
            and ar.user_id = (select auth.jwt()) ->> 'sub'
            and ar.registration_status in ('pending', 'confirmed'))
        or exists (select 1 from public.action_participants ap
          where ap.action_id = a.id
            and ap.user_id = (select auth.jwt()) ->> 'sub'
            and ap.participation_status in ('pending', 'confirmed'))
      )
  );
$$;

create or replace function private.can_post_action_conversation(p_conversation_id uuid)
returns boolean
language sql security definer stable
set search_path = pg_catalog
as $$
  select private.can_view_action_conversation(p_conversation_id)
    and not exists (
      select 1 from public.action_conversations c
      join public.actions a on a.id = c.action_id
      where c.id = p_conversation_id and a.status = 'cancelled'
    );
$$;

-- The notification audience is a service projection, so only its temporal
-- eligibility predicate changes; its audience and deduplication contract stays.
create or replace function public.get_action_notification_audience(p_action_id uuid)
returns table (user_id text, audience_source text)
language sql security definer stable
set search_path = public, pg_catalog
as $$
with action_context as (
  select a.* from public.actions a
  where a.id = p_action_id
    and public.is_action_discussion_available_utc(
      a.action_phase, a.published_at, a.moderation_visibility,
      a.status, a.review_state, a.event_start_at
    )
), candidate_audience as (
  select a.created_by_clerk_id as user_id, 'owner'::text as audience_source, 10 as source_priority
  from action_context a
  union all
  select ao.organizer_clerk_id, 'organizer'::text, 20
  from action_context a join public.action_organizers ao on ao.action_id = a.id
  union all
  select ar.user_id, 'future_registration'::text, 30
  from action_context a join public.action_registrations ar on ar.action_id = a.id
  where coalesce(a.action_phase, 'post_action_complete') <> 'post_action_complete'
    and ar.registration_status = 'confirmed'
  union all
  select ap.user_id, 'final_participant'::text, 40
  from action_context a join public.action_participants ap on ap.action_id = a.id
  where coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
    and ap.participation_status = 'confirmed'
), deduplicated_audience as (
  select distinct on (ca.user_id) ca.user_id, ca.audience_source, ca.source_priority
  from candidate_audience ca
  where nullif(btrim(ca.user_id), '') is not null
  order by ca.user_id, ca.source_priority
)
select user_id, audience_source from deduplicated_audience;
$$;

revoke all on function public.get_action_notification_audience(uuid)
  from public, anon, authenticated;
grant execute on function public.get_action_notification_audience(uuid)
  to service_role;

-- Action message references use the same UTC and review-state boundary as the
-- map and action RLS contracts.
create or replace function public.can_insert_action_message_reference(p_action_id uuid)
returns boolean
language sql security definer stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.actions a
    where a.id = p_action_id
      and public.is_public_future_pre_action_v2(
        a.action_phase, a.published_at, a.moderation_visibility,
        a.status, a.event_start_at
      )
      and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
  );
$$;

revoke all on function public.can_insert_action_message_reference(uuid)
  from public, anon;
grant execute on function public.can_insert_action_message_reference(uuid)
  to authenticated, service_role;

-- Ride eligibility must compare instants, never reconstruct the action in
-- Europe/Paris. The function signatures remain unchanged for existing triggers.
create or replace function public.is_action_ride_eligible_member(
  p_action_id uuid, p_user_id text
)
returns boolean
language sql stable security invoker
set search_path = public, pg_catalog
as $$
  select coalesce(auth.role(), '') = 'service_role'
    and nullif(btrim(p_user_id), '') is not null
    and exists (
      select 1
      from public.actions a
      join public.action_registrations ar on ar.action_id = a.id
      where a.id = p_action_id
        and ar.user_id = btrim(p_user_id)
        and ar.registration_status = 'confirmed'
        and public.is_public_future_pre_action_v2(
          a.action_phase, a.published_at, a.moderation_visibility,
          a.status, a.event_start_at
        )
        and coalesce(a.access_mode, 'public') = 'public'
        and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
    );
$$;

create or replace function public.is_action_ride_departure_eligible(
  p_action_id uuid, p_departure_at timestamptz
)
returns boolean
language sql stable security invoker
set search_path = public, pg_catalog
as $$
  select coalesce(auth.role(), '') = 'service_role'
    and p_departure_at > now()
    and exists (
      select 1 from public.actions a
      where a.id = p_action_id
        and a.event_start_at is not null
        and p_departure_at < a.event_start_at
        and public.is_public_future_pre_action_v2(
          a.action_phase, a.published_at, a.moderation_visibility,
          a.status, a.event_start_at
        )
        and coalesce(a.access_mode, 'public') = 'public'
        and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
    );
$$;
