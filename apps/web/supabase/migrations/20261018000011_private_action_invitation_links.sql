-- PURPOSE: persist business-private pre-actions and hash-only invitation links.
-- CALLER: Clerk-authenticated server routes and the atomic action creation RPC.
-- AUTHORIZATION_BOUNDARY: HTTP routes enforce Clerk AuthN/AuthZ; all RPCs below
-- are service_role-only and re-check the action lifecycle where relevant.
-- IDEMPOTENCY: one active link row per action; rotation replaces the hash and
-- invalidates every previous bearer token. Registration uses action/user unique.
-- ATOMICITY: link rotation/revocation and private registration are transactional;
-- registration serializes the action/user row before deciding its status.
-- FAILURE_BEHAVIOR: invalid lifecycle, token, or actor inputs abort without a
-- partial registration or raw-token persistence.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: browser roles cannot read invitation hashes or mutate registrations.

alter table public.actions
  add column if not exists access_mode text not null default 'public';

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'actions'
      and constraint_name = 'actions_access_mode_check'
  ) then
    alter table public.actions drop constraint actions_access_mode_check;
  end if;
end $$;

alter table public.actions
  add constraint actions_access_mode_check
  check (access_mode in ('public', 'invite_link'));

create index if not exists actions_access_mode_public_idx
  on public.actions (action_date, event_start_time)
  where access_mode = 'public';

create table if not exists public.action_invitation_links (
  action_id uuid primary key references public.actions(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  rotated_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_by_clerk_id text not null
);

create unique index if not exists action_invitation_links_token_hash_idx
  on public.action_invitation_links (token_hash);

alter table public.action_invitation_links enable row level security;
revoke all on table public.action_invitation_links from public, anon, authenticated;
grant select, insert, update, delete on table public.action_invitation_links to service_role;

create or replace function public.create_action_invitation_link(
  p_action_id uuid,
  p_token_hash text,
  p_actor_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if nullif(trim(p_token_hash), '') is null or length(p_token_hash) <> 64 then
    raise exception 'action_invitation_token_hash_invalid' using errcode = '22023';
  end if;
  if nullif(trim(p_actor_id), '') is null then
    raise exception 'action_invitation_actor_required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.actions
    where id = p_action_id
      and access_mode = 'invite_link'
      and action_phase = 'pre_action'
      and status in ('pending', 'approved')
  ) then
    raise exception 'action_invitation_lifecycle_closed' using errcode = 'P0001';
  end if;

  insert into public.action_invitation_links (
    action_id, token_hash, created_at, rotated_at, revoked_at, created_by_clerk_id
  ) values (
    p_action_id, p_token_hash, timezone('utc', now()), timezone('utc', now()), null, p_actor_id
  )
  on conflict (action_id) do update
    set token_hash = excluded.token_hash,
        rotated_at = excluded.rotated_at,
        revoked_at = null,
        created_by_clerk_id = excluded.created_by_clerk_id;
end;
$$;

create or replace function public.revoke_action_invitation_link(
  p_action_id uuid,
  p_actor_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if nullif(trim(p_actor_id), '') is null then
    raise exception 'action_invitation_actor_required' using errcode = '22023';
  end if;
  update public.action_invitation_links
     set revoked_at = coalesce(revoked_at, timezone('utc', now()))
   where action_id = p_action_id;
end;
$$;

create or replace function public.request_private_action_registration(
  p_action_id uuid,
  p_user_id text,
  p_token_hash text
)
returns table (registration_id uuid, registration_status text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_registration public.action_registrations;
  v_invitation public.action_invitation_links;
begin
  if nullif(trim(p_user_id), '') is null then
    raise exception 'private_registration_user_required' using errcode = '22023';
  end if;
  select * into v_invitation
    from public.action_invitation_links
   where action_id = p_action_id
     and token_hash = p_token_hash
   for update;
  if not found or v_invitation.revoked_at is not null then
    raise exception 'private_registration_invitation_invalid' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.actions
    where id = p_action_id
      and access_mode = 'invite_link'
      and action_phase = 'pre_action'
      and status in ('pending', 'approved')
  ) then
    raise exception 'private_registration_action_unavailable' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_action_id::text || ':' || p_user_id, 0));

  select * into v_registration
    from public.action_registrations
   where action_id = p_action_id and user_id = p_user_id
   for update;

  if v_registration.id is null then
    insert into public.action_registrations (
      action_id, user_id, registered_at, registration_status, registration_source
    ) values (
      p_action_id, p_user_id, timezone('utc', now()), 'pending', 'group_form'
    ) returning * into v_registration;
  elsif v_registration.registration_status = 'cancelled' then
    update public.action_registrations
       set registered_at = timezone('utc', now()),
           registration_status = 'pending',
           registration_source = 'group_form',
           registration_cancellation_reason = null
     where id = v_registration.id
     returning * into v_registration;
  end if;

  return query select v_registration.id, v_registration.registration_status;
end;
$$;

revoke all on function public.create_action_invitation_link(uuid, text, text) from public, anon, authenticated;
revoke all on function public.revoke_action_invitation_link(uuid, text) from public, anon, authenticated;
revoke all on function public.request_private_action_registration(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_action_invitation_link(uuid, text, text) to service_role;
grant execute on function public.revoke_action_invitation_link(uuid, text) to service_role;
grant execute on function public.request_private_action_registration(uuid, text, text) to service_role;

-- Public table reads remain distinct from owner/service reads. Historical rows
-- are public through the default; private rows never become public merely by
-- being moderated, published, or finalized.
drop policy if exists actions_select_public_or_owner on public.actions;
create policy actions_select_public_or_owner on public.actions
for select using (
  (select auth.role()) = 'service_role'
  or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or (
    coalesce(access_mode, 'public') = 'public'
    and coalesce(moderation_visibility, 'visible') = 'visible'
    and (
      (status = 'approved' and coalesce(action_phase, 'post_action_complete') <> 'pre_action')
      or (
        status in ('pending', 'approved')
        and coalesce(action_phase, 'post_action_complete') = 'pre_action'
        and published_at is not null
        and (
          action_date > current_date
          or (action_date = current_date and event_start_time is not null
              and event_start_time > (current_time at time zone 'Europe/Paris')::time)
        )
      )
    )
  )
);

-- Extend the current atomic creation function so the form's access_mode is not
-- silently discarded by the server-side relation transaction.
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
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action_id uuid;
  v_replayed boolean := false;
  v_existing_fingerprint text;
begin
  if nullif(trim(p_creator_id), '') is null then raise exception 'action_creation_creator_required' using errcode = '22023'; end if;
  if p_action->>'created_by_clerk_id' is distinct from p_creator_id then raise exception 'action_creation_creator_mismatch' using errcode = '42501'; end if;
  if p_action->>'client_request_id' is distinct from p_client_request_id then raise exception 'action_creation_request_key_mismatch' using errcode = '22023'; end if;
  if coalesce(jsonb_typeof(p_organizers), 'null') <> 'array' or coalesce(jsonb_typeof(p_registrations), 'null') <> 'array' then raise exception 'action_creation_relations_must_be_arrays' using errcode = '22023'; end if;
  if p_organizer_required and jsonb_array_length(p_organizers) = 0 then raise exception 'action_creation_organizer_required' using errcode = '23514'; end if;
  if exists (select 1 from jsonb_array_elements(p_organizers) item where nullif(trim(item->>'organizer_clerk_id'), '') is null or nullif(trim(item->>'organizer_label'), '') is null) then raise exception 'action_creation_organizer_invalid' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_registrations) item where nullif(trim(item->>'user_id'), '') is null) then raise exception 'action_creation_registration_invalid' using errcode = '22023'; end if;
  if coalesce(p_action->>'access_mode', 'public') = 'invite_link'
     and (coalesce(p_action->>'action_phase', 'post_action_complete') <> 'pre_action' or coalesce(p_action->>'record_type', 'action') <> 'action') then
    raise exception 'action_creation_private_mode_requires_pre_action' using errcode = '22023';
  end if;

  insert into public.actions (
    created_by_clerk_id, actor_name, organizer_type, organizer_id, organizer_name,
    action_date, location_label, department_code, department_name, latitude, longitude,
    derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source,
    waste_kg, cigarette_butts, volunteers_count, duration_minutes, event_start_time,
    event_end_time, published_at, preparation_data, notes, status, action_phase,
    access_mode, client_request_id, client_request_fingerprint
  ) values (
    p_action->>'created_by_clerk_id', p_action->>'actor_name', p_action->>'organizer_type',
    p_action->>'organizer_id', p_action->>'organizer_name', (p_action->>'action_date')::date,
    p_action->>'location_label', p_action->>'department_code', p_action->>'department_name',
    nullif(p_action->>'latitude', '')::double precision, nullif(p_action->>'longitude', '')::double precision,
    p_action->>'derived_geometry_kind', p_action->>'derived_geometry_geojson', nullif(p_action->>'geometry_confidence', '')::double precision,
    p_action->>'geometry_source', nullif(p_action->>'waste_kg', '')::numeric, nullif(p_action->>'cigarette_butts', '')::integer,
    nullif(p_action->>'volunteers_count', '')::integer, nullif(p_action->>'duration_minutes', '')::integer,
    nullif(p_action->>'event_start_time', '')::time, nullif(p_action->>'event_end_time', '')::time,
    nullif(p_action->>'published_at', '')::timestamptz, coalesce(p_action->'preparation_data', '{}'::jsonb),
    p_action->>'notes', coalesce(p_action->>'status', 'pending'), coalesce(p_action->>'action_phase', 'post_action_complete'),
    coalesce(p_action->>'access_mode', 'public'), p_client_request_id, p_client_request_fingerprint
  ) on conflict (created_by_clerk_id, client_request_id) where client_request_id is not null do nothing
  returning id into v_action_id;

  if v_action_id is null then
    select a.id, a.client_request_fingerprint into v_action_id, v_existing_fingerprint from public.actions a where a.created_by_clerk_id = p_creator_id and a.client_request_id = p_client_request_id for update;
    if v_action_id is null then raise exception 'action_creation_retry_target_missing' using errcode = '40001'; end if;
    if v_existing_fingerprint is not null and v_existing_fingerprint is distinct from p_client_request_fingerprint then raise exception 'action_creation_idempotency_conflict' using errcode = '23505'; end if;
    if v_existing_fingerprint is null then update public.actions set client_request_fingerprint = p_client_request_fingerprint where id = v_action_id; end if;
    v_replayed := true;
  end if;

  insert into public.action_organizers (action_id, organizer_clerk_id, organizer_label, organizer_handle, is_primary)
  select v_action_id, item->>'organizer_clerk_id', item->>'organizer_label', item->>'organizer_handle', coalesce((item->>'is_primary')::boolean, false)
  from jsonb_array_elements(p_organizers) item on conflict (action_id, organizer_clerk_id) do nothing;
  insert into public.action_registrations (action_id, user_id, registered_at, registration_status, registration_source)
  select v_action_id, item->>'user_id', coalesce(nullif(item->>'registered_at', '')::timestamptz, timezone('utc', now())), coalesce(item->>'registration_status', 'pending'), coalesce(item->>'registration_source', 'group_form')
  from jsonb_array_elements(p_registrations) item on conflict (action_id, user_id) do nothing;
  if p_organizer_required and (select count(*) from public.action_organizers where action_id = v_action_id) < jsonb_array_length(p_organizers) then raise exception 'action_creation_organizers_incomplete' using errcode = '40001'; end if;
  if exists (select 1 from jsonb_array_elements(p_registrations) item where not exists (select 1 from public.action_registrations r where r.action_id = v_action_id and r.user_id = item->>'user_id')) then raise exception 'action_creation_registrations_incomplete' using errcode = '40001'; end if;
  return query select v_action_id, v_replayed;
end;
$$;

revoke all on function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean) to service_role;

-- The map RPC is service-role callable by the server, so repeat the business
-- predicate inside the projection in addition to the RLS policy.
create or replace function public.actions_map_feed(
  p_south double precision default null, p_west double precision default null,
  p_north double precision default null, p_east double precision default null,
  p_zoom integer default null, p_status text default null, p_floor_date date default null,
  p_types text[] default null, p_impact text default null, p_limit integer default 80
)
returns table (source text, entity_type text, id uuid, created_at timestamptz, updated_at timestamptz, status text, observed_at date, location_label text, latitude double precision, longitude double precision, waste_kg numeric, cigarette_butts integer, volunteers_count integer, duration_minutes integer, notes text, derived_geometry_kind text, derived_geometry_geojson text, geometry_confidence numeric, geometry_source text, observed_coverage jsonb, public_preparation_data jsonb)
language sql stable security invoker
set search_path = public, pg_catalog
as $$
with effective_limit as (
  select greatest(1, least(coalesce(p_limit, 80), case when coalesce(p_zoom, 12) <= 8 then 60 when coalesce(p_zoom, 12) <= 10 then 120 when coalesce(p_zoom, 12) <= 12 then 180 else 300 end)) as value
), action_rows as (
  select 'actions'::text source, 'action'::text entity_type, a.id, a.created_at, a.updated_at, 'approved'::text status, a.action_date observed_at, a.location_label, a.latitude, a.longitude, a.waste_kg, a.cigarette_butts, a.volunteers_count, a.duration_minutes, a.notes, a.derived_geometry_kind::text, a.derived_geometry_geojson, a.geometry_confidence, a.geometry_source::text,
    case when jsonb_typeof(a.preparation_data -> 'observedCoverage') = 'object' and a.preparation_data -> 'observedCoverage' ->> 'type' = 'MultiLineString' then a.preparation_data -> 'observedCoverage' else null end as observed_coverage,
    public.public_action_map_preparation(a.preparation_data) as public_preparation_data,
    case when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035 + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 80 then 'critique' when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035 + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 60 then 'fort' when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035 + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 30 then 'moyen' else 'faible' end as impact_level
  from public.actions a
  where coalesce(a.access_mode, 'public') = 'public'
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and (a.status = 'approved' or (a.status = 'pending' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'))
    and (coalesce(a.action_phase, 'post_action_complete') <> 'pre_action' or public.is_public_future_pre_action(a.action_phase, a.published_at, a.moderation_visibility, a.status, a.action_date, a.event_start_time))
    and (p_floor_date is null or a.action_date >= p_floor_date) and (p_types is null or 'action' = any(p_types))
    and a.latitude is not null and a.longitude is not null
    and (p_south is null or p_north is null or a.latitude between p_south and p_north) and (p_west is null or p_east is null or a.longitude between p_west and p_east)
), spot_rows as (
  select 'trash_spotter_spots'::text source, case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end::text entity_type, s.id, s.created_at, null::timestamptz updated_at, s.status, s.created_at::date observed_at, s.label location_label, s.latitude, s.longitude, null::numeric waste_kg, null::integer cigarette_butts, null::integer volunteers_count, null::integer duration_minutes, s.notes, null::text derived_geometry_kind, null::text derived_geometry_geojson, null::numeric geometry_confidence, null::text geometry_source, null::jsonb observed_coverage, null::jsonb public_preparation_data, 'faible'::text impact_level
  from public.trash_spotter_spots s where s.status in ('validated', 'cleaned') and (p_floor_date is null or s.created_at::date >= p_floor_date) and (p_types is null or (case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end) = any(p_types)) and s.latitude is not null and s.longitude is not null and (p_south is null or p_north is null or s.latitude between p_south and p_north) and (p_west is null or p_east is null or s.longitude between p_west and p_east)
)
select source, entity_type, id, created_at, updated_at, status, observed_at, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, observed_coverage, public_preparation_data
from (select * from action_rows union all select * from spot_rows) map_rows
where p_impact is null or impact_level = p_impact order by observed_at desc, created_at desc limit (select value from effective_limit);
$$;

revoke all privileges on function public.actions_map_feed(double precision, double precision, double precision, double precision, integer, text, date, text[], text, integer) from public;
grant execute on function public.actions_map_feed(double precision, double precision, double precision, double precision, integer, text, date, text[], text, integer) to anon, authenticated, service_role;

-- The incremental public KPI trigger predates access_mode and runs for the
-- service-role creation/update path. This later-named guard runs after it and
-- removes any contribution for a private action, including on later edits.
create or replace function public.remove_private_public_impact_action_contribution()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous public.public_impact_action_contributions%rowtype;
begin
  if coalesce(new.access_mode, 'public') <> 'invite_link' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));
  select * into v_previous
    from public.public_impact_action_contributions
   where action_id = new.id
   for update;
  if found then
    perform public.public_impact_adjust_contribution(v_previous, -1);
    delete from public.public_impact_action_contributions where action_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.remove_private_public_impact_action_contribution() from public, anon, authenticated;
grant execute on function public.remove_private_public_impact_action_contribution() to service_role;
drop trigger if exists zz_private_action_public_impact_guard on public.actions;
create trigger zz_private_action_public_impact_guard
after insert or update on public.actions
for each row execute function public.remove_private_public_impact_action_contribution();
