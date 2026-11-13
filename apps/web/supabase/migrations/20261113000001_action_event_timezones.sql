-- Action lifecycle times are local civil fields plus canonical UTC instants.
-- Historical rows keep the former Europe/Paris interpretation.
alter table public.actions
  add column if not exists action_timezone text not null default 'Europe/Paris',
  add column if not exists event_start_at timestamptz,
  add column if not exists event_end_at timestamptz;

update public.actions
set event_start_at = (
  (action_date::timestamp + coalesce(event_start_time, time '00:00'))
  at time zone coalesce(nullif(btrim(action_timezone), ''), 'Europe/Paris')
)
where event_start_at is null;

update public.actions
set event_end_at = (
  (action_date::timestamp + event_end_time)
  at time zone coalesce(nullif(btrim(action_timezone), ''), 'Europe/Paris')
)
where event_end_time is not null
  and event_end_at is null;

alter table public.actions
  add constraint actions_action_timezone_not_blank
    check (length(btrim(action_timezone)) > 0),
  add constraint actions_event_window_ordered
    check (event_end_at is null or event_start_at is null or event_end_at >= event_start_at);

create index if not exists actions_event_start_at_idx
  on public.actions (event_start_at);

create or replace function public.sync_action_event_instants()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.action_timezone := coalesce(nullif(btrim(new.action_timezone), ''), 'Europe/Paris');
  new.event_start_at := (
    (new.action_date::timestamp + coalesce(new.event_start_time, time '00:00'))
    at time zone new.action_timezone
  );
  new.event_end_at := case
    when new.event_end_time is null then null
    else (new.action_date::timestamp + new.event_end_time) at time zone new.action_timezone
  end;
  return new;
end;
$$;

drop trigger if exists trg_sync_action_event_instants on public.actions;
create trigger trg_sync_action_event_instants
before insert or update of action_date, event_start_time, event_end_time, action_timezone
on public.actions
for each row execute function public.sync_action_event_instants();

grant update (action_timezone, event_start_at, event_end_at)
  on table public.actions to service_role;

-- The public creation RPC predates these columns and delegates to a legacy
-- implementation. Patch its wrapper so the selected timezone is not dropped
-- before the trigger derives the UTC instants.
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
  select result.action_id, result.replayed
  into v_action_id, v_replayed
  from public.create_action_with_relations_legacy(
    p_action, p_organizers, p_registrations, p_creator_id,
    p_client_request_id, p_client_request_fingerprint, p_organizer_required
  ) result;

  update public.actions
  set action_timezone = coalesce(nullif(btrim(p_action ->> 'action_timezone'), ''), action_timezone, 'Europe/Paris')
  where id = v_action_id;

  return query select v_action_id, v_replayed;
end;
$$;

revoke all on function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)
  to service_role;

-- Canonical predicate for new callers. The instant is computed at write time,
-- so DST and the action's IANA timezone are no longer reconstructed in SQL.
create or replace function public.is_public_future_pre_action_v2(
  p_action_phase text,
  p_published_at timestamptz,
  p_moderation_visibility text,
  p_status text,
  p_event_start_at timestamptz
)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select p_action_phase = 'pre_action'
    and p_published_at is not null
    and p_moderation_visibility = 'visible'
    and p_status in ('pending', 'approved')
    and p_event_start_at is not null
    and p_event_start_at > now();
$$;

revoke all on function public.is_public_future_pre_action_v2(text, timestamptz, text, text, timestamptz)
  from public;
grant execute on function public.is_public_future_pre_action_v2(text, timestamptz, text, text, timestamptz)
  to public;

drop policy if exists actions_select_public_or_owner on public.actions;
create policy actions_select_public_or_owner on public.actions
for select using (
  (select auth.role()) = 'service_role'
  or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or (
    coalesce(moderation_visibility, 'visible') = 'visible'
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

-- The latest map RPC has a statistical/public projection contract. Drop and
-- recreate it because PostgreSQL cannot change a function's return type with
-- CREATE OR REPLACE; only the pre-action temporal predicate changes here.
drop function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
);

create function public.actions_map_feed(
  p_south double precision default null,
  p_west double precision default null,
  p_north double precision default null,
  p_east double precision default null,
  p_zoom integer default null,
  p_status text default null,
  p_floor_date date default null,
  p_types text[] default null,
  p_impact text default null,
  p_limit integer default 80
)
returns table (
  source text, entity_type text, id uuid, created_at timestamptz,
  updated_at timestamptz, status text, observed_at date,
  location_label text, latitude double precision, longitude double precision,
  waste_kg numeric, cigarette_butts integer, volunteers_count integer,
  duration_minutes integer, notes text, derived_geometry_kind text,
  derived_geometry_geojson text, geometry_confidence numeric,
  geometry_source text, action_context text, action_context_source text,
  school_context_confirmed boolean, observed_coverage jsonb,
  public_preparation_data jsonb
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with effective_limit as (
  select greatest(1, least(coalesce(p_limit, 80), case
    when coalesce(p_zoom, 12) <= 8 then 60
    when coalesce(p_zoom, 12) <= 10 then 120
    when coalesce(p_zoom, 12) <= 12 then 180
    else 300 end)) as value
), action_rows as (
  select 'actions'::text as source, 'action'::text as entity_type, a.id,
    a.created_at, a.updated_at, a.status,
    case when v.action_id is not null then v.action_date else a.action_date end as observed_at,
    case when v.action_id is not null then v.location_label else a.location_label end as location_label,
    a.latitude, a.longitude, v.waste_kg, v.cigarette_butts,
    v.volunteers_count, v.duration_minutes, a.notes,
    a.derived_geometry_kind::text, a.derived_geometry_geojson,
    a.geometry_confidence, a.geometry_source::text,
    case when v.action_id is not null then v.action_context else a.action_context end as action_context,
    a.action_context_source, a.school_context_confirmed,
    case when jsonb_typeof(a.preparation_data -> 'observedCoverage') = 'object'
      and a.preparation_data -> 'observedCoverage' ->> 'type' = 'MultiLineString'
      then a.preparation_data -> 'observedCoverage' else null end as observed_coverage,
    public.public_action_map_preparation(a.preparation_data) as public_preparation_data,
    case
      when coalesce(v.waste_kg, 0) * 5 + coalesce(v.cigarette_butts, 0) * .035
        + coalesce(v.volunteers_count, 0) * 1.6 + coalesce(v.duration_minutes, 0) * .05 >= 80 then 'critique'
      when coalesce(v.waste_kg, 0) * 5 + coalesce(v.cigarette_butts, 0) * .035
        + coalesce(v.volunteers_count, 0) * 1.6 + coalesce(v.duration_minutes, 0) * .05 >= 60 then 'fort'
      when coalesce(v.waste_kg, 0) * 5 + coalesce(v.cigarette_butts, 0) * .035
        + coalesce(v.volunteers_count, 0) * 1.6 + coalesce(v.duration_minutes, 0) * .05 >= 30 then 'moyen'
      else 'faible' end as impact_level
  from public.actions a
  left join public.action_map_statistical_source v on v.action_id = a.id
  where coalesce(a.moderation_visibility, 'visible') = 'visible'
    and coalesce(a.access_mode, 'public') = 'public'
    and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
    and coalesce(a.data_provenance, 'unknown') <> 'test'
    and (a.status = 'approved' or (a.status = 'pending' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'))
    and (coalesce(a.action_phase, 'post_action_complete') <> 'pre_action' or (
      public.is_public_future_pre_action_v2(a.action_phase, a.published_at, a.moderation_visibility, a.status, a.event_start_at)
      and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
    ))
    and not (coalesce(a.action_context, '') = 'school'
      and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'
      and public.is_public_future_pre_action_v2(a.action_phase, a.published_at, a.moderation_visibility, a.status, a.event_start_at)
      and coalesce(a.review_state, 'not_required') in ('not_required', 'approved'))
    and (p_floor_date is null or (case when v.action_id is not null then v.action_date else a.action_date end) >= p_floor_date)
    and (p_types is null or 'action' = any(p_types))
    and a.latitude is not null and a.longitude is not null
    and (p_south is null or p_north is null or a.latitude between p_south and p_north)
    and (p_west is null or p_east is null or a.longitude between p_west and p_east)
), spot_rows as (
  select 'trash_spotter_spots'::text as source,
    case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end::text as entity_type,
    s.id, s.created_at, null::timestamptz as updated_at, s.status,
    s.created_at::date as observed_at, s.label as location_label, s.latitude, s.longitude,
    null::numeric as waste_kg, null::integer as cigarette_butts, null::integer as volunteers_count,
    null::integer as duration_minutes, s.notes, null::text as derived_geometry_kind,
    null::text as derived_geometry_geojson, null::numeric as geometry_confidence,
    null::text as geometry_source, null::text as action_context, null::text as action_context_source,
    null::boolean as school_context_confirmed, null::jsonb as observed_coverage,
    null::jsonb as public_preparation_data, 'faible'::text as impact_level
  from public.trash_spotter_spots s
  where s.status in ('validated', 'cleaned')
    and (p_floor_date is null or s.created_at::date >= p_floor_date)
    and (p_types is null or case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end = any(p_types))
    and s.latitude is not null and s.longitude is not null
    and (p_south is null or p_north is null or s.latitude between p_south and p_north)
    and (p_west is null or p_east is null or s.longitude between p_west and p_east)
)
select source, entity_type, id, created_at, updated_at, status, observed_at,
  location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count,
  duration_minutes, notes, derived_geometry_kind, derived_geometry_geojson,
  geometry_confidence, geometry_source, action_context, action_context_source,
  school_context_confirmed, observed_coverage, public_preparation_data
from (select * from action_rows union all select * from spot_rows) map_rows
where p_impact is null or map_rows.impact_level = p_impact
order by observed_at desc, created_at desc
limit (select value from effective_limit);
$$;

revoke all on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public;
grant execute on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) to anon, authenticated, service_role;

create or replace function public.can_insert_action_message_reference(p_action_id uuid)
returns boolean
language sql security definer stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.actions a
    where a.id = p_action_id
      and public.is_public_future_pre_action_v2(
        a.action_phase, a.published_at, a.moderation_visibility, a.status, a.event_start_at
      )
  );
$$;

-- Reminder eligibility is per action timezone, not one Paris calendar date.
create or replace function public.emit_action_j1_reminders(
  p_now timestamptz default timezone('utc', now())
)
returns integer
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_inserted_count integer := 0;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then raise exception 'Forbidden'; end if;

  insert into public.app_notifications (user_id, type, title, content, payload)
  select ar.user_id, 'action_event', 'Rappel — action demain',
    'Votre inscription est confirmée pour demain : ' || to_char(a.action_date, 'DD/MM/YYYY')
      || case when a.event_start_time is not null then ' à ' || to_char(a.event_start_time, 'HH24:MI') else '' end
      || ' · rendez-vous : ' || a.location_label
      || '. Ouvrez l’action pour consulter les horaires et le rendez-vous.',
    jsonb_strip_nulls(jsonb_build_object(
      'eventType', 'action_event', 'subtype', 'action_reminder', 'actionId', a.id,
      'registrationId', ar.id, 'actionDate', a.action_date,
      'eventStartTime', a.event_start_time, 'eventEndTime', a.event_end_time,
      'timezone', a.action_timezone, 'reminderKind', 'j-1', 'decisionState', 'informational',
      'optional', false, 'eventKey', 'action_reminder:j-1:' || a.id::text,
      'href', '/sections/rejoindre-une-action?actionId=' || a.id::text
    ))
  from public.actions a
  join public.action_registrations ar on ar.action_id = a.id
  left join public.notification_preferences np on np.user_id = ar.user_id
  where a.action_phase = 'pre_action' and a.published_at is not null
    and a.status in ('pending', 'approved')
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and a.event_start_at is not null
    and (a.event_start_at at time zone a.action_timezone)::date = (p_now at time zone a.action_timezone)::date + 1
    and ar.registration_status = 'confirmed' and coalesce(np.action_reminders_enabled, true)
  on conflict do nothing;
  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$$;
