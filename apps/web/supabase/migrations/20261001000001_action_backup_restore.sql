-- Versioned disaster-recovery restore for action-owned state.
-- This path intentionally bypasses createAction: identities, timestamps,
-- historical status and dependent rows are restored as captured, atomically.

create or replace function public.ensure_action_conversation_on_publish()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_conversation_id uuid;
begin
  if current_setting('cleanmymap.action_restore', true) = 'on' then
    return new;
  end if;
  if new.published_at is null then
    return new;
  end if;

  insert into public.action_conversations (action_id)
  values (new.id)
  on conflict (action_id) do update set updated_at = timezone('utc', now())
  returning id into v_conversation_id;

  insert into public.action_conversation_members (conversation_id, user_id, access_source)
  values (v_conversation_id, new.created_by_clerk_id, 'owner')
  on conflict (conversation_id, user_id) do nothing;

  return new;
end;
$$;

create or replace function public.initialize_action_final_participants_on_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if current_setting('cleanmymap.action_restore', true) = 'on' then
    return new;
  end if;
  if new.action_phase = 'post_action_complete' then
    if tg_op = 'INSERT' or old.action_phase is distinct from new.action_phase then
      perform public.initialize_action_final_participants(new.id);
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.initialize_action_final_participants_on_organizer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if current_setting('cleanmymap.action_restore', true) <> 'on' then
    perform public.initialize_action_final_participants(new.action_id);
  end if;
  return new;
end;
$$;

create or replace function public.sync_action_conversation_notification_audience_on_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if current_setting('cleanmymap.action_restore', true) <> 'on' then
    perform public.sync_action_conversation_notification_audience(new.id);
  end if;
  return new;
end;
$$;

create or replace function public.sync_action_conversation_notification_audience_on_action_source()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if current_setting('cleanmymap.action_restore', true) <> 'on' then
    perform public.sync_action_conversation_notification_audience(
      case when tg_op = 'DELETE' then old.action_id else new.action_id end
    );
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.restore_action_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action_count integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if p_backup->>'format' <> 'cleanmymap.action-backup'
    or (p_backup->>'version')::integer <> 2
  then
    raise exception 'Unsupported action backup format or version';
  end if;

  if jsonb_typeof(p_backup->'tables'->'actions') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_organizers') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_registrations') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_participants') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'training_examples') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'forms') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_conversations') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_conversation_members') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_conversation_exclusions') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_share_contact_requests') <> 'array'
  then
    raise exception 'Incomplete action backup tables';
  end if;

  if exists (
    select 1
    from public.actions a
    join jsonb_to_recordset(p_backup->'tables'->'actions') as r(id uuid)
      on r.id = a.id
  ) then
    raise exception 'Action backup overlaps existing action identities';
  end if;

  perform set_config('cleanmymap.action_restore', 'on', true);

  insert into public.actions (
    id, created_at, updated_at, created_by_clerk_id, actor_name,
    organizer_type, organizer_id, organizer_name, action_date, location_label,
    department_code, department_name, latitude, longitude,
    derived_geometry_kind, derived_geometry_geojson, geometry_confidence,
    geometry_source, waste_kg, cigarette_butts, volunteers_count,
    duration_minutes, event_start_time, event_end_time, notes, status,
    cancelled_at, cancelled_by_clerk_id, cancellation_reason,
    cancelled_from_status, published_at, moderation_visibility, hidden_at,
    hidden_by_clerk_id, hidden_reason, type, action_phase, preparation_data
  )
  select
    r.id, r.created_at, r.updated_at, r.created_by_clerk_id, r.actor_name,
    r.organizer_type, r.organizer_id, r.organizer_name, r.action_date, r.location_label,
    r.department_code, r.department_name, r.latitude, r.longitude,
    r.derived_geometry_kind, r.derived_geometry_geojson, r.geometry_confidence,
    r.geometry_source, r.waste_kg, r.cigarette_butts, r.volunteers_count,
    r.duration_minutes, r.event_start_time, r.event_end_time, r.notes, r.status,
    r.cancelled_at, r.cancelled_by_clerk_id, r.cancellation_reason,
    r.cancelled_from_status, r.published_at, r.moderation_visibility, r.hidden_at,
    r.hidden_by_clerk_id, r.hidden_reason, r.type, r.action_phase, r.preparation_data
  from jsonb_to_recordset(p_backup->'tables'->'actions') as r(
    id uuid,
    created_at timestamptz,
    updated_at timestamptz,
    created_by_clerk_id text,
    actor_name text,
    organizer_type text,
    organizer_id text,
    organizer_name text,
    action_date date,
    location_label text,
    department_code text,
    department_name text,
    latitude double precision,
    longitude double precision,
    derived_geometry_kind text,
    derived_geometry_geojson text,
    geometry_confidence double precision,
    geometry_source text,
    waste_kg numeric,
    cigarette_butts integer,
    volunteers_count integer,
    duration_minutes integer,
    event_start_time time,
    event_end_time time,
    notes text,
    status text,
    cancelled_at timestamptz,
    cancelled_by_clerk_id text,
    cancellation_reason text,
    cancelled_from_status text,
    published_at timestamptz,
    moderation_visibility text,
    hidden_at timestamptz,
    hidden_by_clerk_id text,
    hidden_reason text,
    type text,
    action_phase text,
    preparation_data jsonb
  );

  insert into public.action_organizers (
    id, created_at, action_id, organizer_clerk_id, organizer_label,
    organizer_handle, is_primary
  )
  select r.id, r.created_at, r.action_id, r.organizer_clerk_id,
    r.organizer_label, r.organizer_handle, r.is_primary
  from jsonb_to_recordset(p_backup->'tables'->'action_organizers') as r(
    id uuid, created_at timestamptz, action_id uuid, organizer_clerk_id text,
    organizer_label text, organizer_handle text, is_primary boolean
  );

  insert into public.action_registrations (
    id, created_at, updated_at, action_id, user_id, registered_at,
    registration_status, registration_source
  )
  select r.id, r.created_at, r.updated_at, r.action_id, r.user_id,
    r.registered_at, r.registration_status, r.registration_source
  from jsonb_to_recordset(p_backup->'tables'->'action_registrations') as r(
    id uuid, created_at timestamptz, updated_at timestamptz, action_id uuid,
    user_id text, registered_at timestamptz, registration_status text,
    registration_source text
  );

  insert into public.action_participants (
    id, created_at, updated_at, action_id, user_id, joined_at,
    participation_status, participation_source, individual_waste_kg,
    individual_waste_condition, individual_waste_measurement_method,
    individual_waste_normalization_version, individual_cigarette_butts_count,
    individual_cigarette_butts_mass_kg, individual_cigarette_butts_condition,
    individual_cigarette_butts_provenance, individual_cigarette_butts_conversion_version,
    individual_impact_measured_by, individual_impact_measured_at
  )
  select r.id, r.created_at, r.updated_at, r.action_id, r.user_id, r.joined_at,
    r.participation_status, r.participation_source, r.individual_waste_kg,
    r.individual_waste_condition, r.individual_waste_measurement_method,
    r.individual_waste_normalization_version, r.individual_cigarette_butts_count,
    r.individual_cigarette_butts_mass_kg, r.individual_cigarette_butts_condition,
    r.individual_cigarette_butts_provenance, r.individual_cigarette_butts_conversion_version,
    r.individual_impact_measured_by, r.individual_impact_measured_at
  from jsonb_to_recordset(p_backup->'tables'->'action_participants') as r(
    id uuid, created_at timestamptz, updated_at timestamptz, action_id uuid,
    user_id text, joined_at timestamptz, participation_status text,
    participation_source text, individual_waste_kg numeric,
    individual_waste_condition text, individual_waste_measurement_method text,
    individual_waste_normalization_version text, individual_cigarette_butts_count integer,
    individual_cigarette_butts_mass_kg numeric, individual_cigarette_butts_condition text,
    individual_cigarette_butts_provenance text, individual_cigarette_butts_conversion_version text,
    individual_impact_measured_by text, individual_impact_measured_at timestamptz
  );

  insert into public.training_examples (
    action_id, created_at, photos, poids_reel, poids_estime, intervalle,
    confiance, metadata, model_version, status
  )
  select r.action_id, r.created_at, r.photos, r.poids_reel, r.poids_estime,
    r.intervalle, r.confiance, r.metadata, r.model_version, r.status
  from jsonb_to_recordset(p_backup->'tables'->'training_examples') as r(
    action_id uuid, created_at timestamptz, photos jsonb, poids_reel numeric,
    poids_estime numeric, intervalle jsonb, confiance numeric, metadata jsonb,
    model_version text, status text
  );

  insert into public.forms (
    id, created_at, updated_at, action_id, group_id, status,
    validated_by_admin, is_duplicate, is_deleted, is_test
  )
  select r.id, r.created_at, r.updated_at, r.action_id, r.group_id, r.status,
    r.validated_by_admin, r.is_duplicate, r.is_deleted, r.is_test
  from jsonb_to_recordset(p_backup->'tables'->'forms') as r(
    id uuid, created_at timestamptz, updated_at timestamptz, action_id uuid,
    group_id text, status text, validated_by_admin boolean, is_duplicate boolean,
    is_deleted boolean, is_test boolean
  );

  insert into public.action_conversations (id, action_id, created_at, updated_at)
  select r.id, r.action_id, r.created_at, r.updated_at
  from jsonb_to_recordset(p_backup->'tables'->'action_conversations') as r(
    id uuid, action_id uuid, created_at timestamptz, updated_at timestamptz
  );

  insert into public.action_conversation_members (
    conversation_id, user_id, granted_at, access_source
  )
  select r.conversation_id, r.user_id, r.granted_at, r.access_source
  from jsonb_to_recordset(p_backup->'tables'->'action_conversation_members') as r(
    conversation_id uuid, user_id text, granted_at timestamptz, access_source text
  );

  insert into public.action_conversation_exclusions (
    conversation_id, user_id, excluded_by_user_id, excluded_at, reason,
    active, reinstated_at, reinstated_by_user_id
  )
  select r.conversation_id, r.user_id, r.excluded_by_user_id, r.excluded_at,
    r.reason, r.active, r.reinstated_at, r.reinstated_by_user_id
  from jsonb_to_recordset(p_backup->'tables'->'action_conversation_exclusions') as r(
    conversation_id uuid, user_id text, excluded_by_user_id text,
    excluded_at timestamptz, reason text, active boolean,
    reinstated_at timestamptz, reinstated_by_user_id text
  );

  insert into public.action_share_contact_requests (
    id, created_at, sender_id, recipient_id, action_id, content, status,
    responded_at
  )
  select r.id, r.created_at, r.sender_id, r.recipient_id, r.action_id,
    r.content, r.status, r.responded_at
  from jsonb_to_recordset(p_backup->'tables'->'action_share_contact_requests') as r(
    id uuid, created_at timestamptz, sender_id text, recipient_id text,
    action_id uuid, content text, status text, responded_at timestamptz
  );

  select count(*) into v_action_count
  from jsonb_to_recordset(p_backup->'tables'->'actions') as r(id uuid);

  return jsonb_build_object('restored', v_action_count);
end;
$$;

revoke all on function public.restore_action_backup(jsonb) from public, anon, authenticated;
grant execute on function public.restore_action_backup(jsonb) to service_role;
