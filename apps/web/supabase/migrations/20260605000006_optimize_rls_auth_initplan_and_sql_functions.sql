-- Reduce repeated auth() evaluation in RLS policies and fix flagged SQL functions.

create or replace function public.current_profile_role_label()
returns text
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select role_label
  from public.profiles
  where id = coalesce((select auth.jwt()) ->> 'sub', '')
  limit 1
$$;

create or replace function public.current_profile_arrondissement()
returns integer
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select paris_arrondissement
  from public.profiles
  where id = coalesce((select auth.jwt()) ->> 'sub', '')
  limit 1
$$;

alter policy actions_insert_authenticated on public.actions
  with check ((select auth.role()) = 'authenticated');

alter policy actions_update_owner_or_service on public.actions
  using (
    (select auth.role()) = 'service_role'
    or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy actions_delete_owner on public.actions
  using (
    (select auth.role()) = 'service_role'
    or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy reports_select_owner on public.reports
  using (
    (select auth.role()) = 'service_role'
    or owner_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy admin_operations_audit_service_only on public.admin_operations_audit
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy funnel_events_service_only on public.funnel_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy checklist_progress_service_only on public.checklist_progress
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy runbook_checks_service_only on public.runbook_checks
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy progression_profiles_service_only on public.progression_profiles
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy progression_events_service_only on public.progression_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy community_message_quota_daily_service_only on public.community_message_quota_daily
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy community_message_quota_events_service_only on public.community_message_quota_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spots_insert_authenticated on public.spots
  with check ((select auth.role()) = 'authenticated');

alter policy spots_update_owner on public.spots
  using (
    (select auth.role()) = 'service_role'
    or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy community_events_insert_authenticated on public.community_events
  with check ((select auth.role()) = 'authenticated');

alter policy community_events_update_owner on public.community_events
  using (
    (select auth.role()) = 'service_role'
    or organizer_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or organizer_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy event_rsvps_all_owner on public.event_rsvps
  using (
    (select auth.role()) = 'service_role'
    or participant_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or participant_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy profiles_insert_owner on public.profiles
  with check (
    (select auth.role()) = 'service_role'
    or id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy profiles_update_owner on public.profiles
  using (
    (select auth.role()) = 'service_role'
    or id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy profiles_delete_owner on public.profiles
  using (
    (select auth.role()) = 'service_role'
    or id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy app_messages_select_channels on public.app_messages
  using (
    (
      channel_type = 'community'
      and (select auth.role()) in ('authenticated', 'service_role')
    )
    or (
      channel_type = 'dm'
      and (
        sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
        or recipient_id = coalesce((select auth.jwt()) ->> 'sub', '')
      )
    )
    or (
      channel_type = 'admin_elu'
      and public.current_profile_role_label() in ('admin', 'elu')
    )
    or (
      channel_type = 'territory'
      and public.can_view_territory_message(arrondissement_id)
    )
    or (
      channel_type = 'bug_report'
      and (
        sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
        or recipient_id = coalesce((select auth.jwt()) ->> 'sub', '')
      )
    )
  );

alter policy app_messages_insert_channels on public.app_messages
  with check (
    (
      channel_type = 'community'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and recipient_id is null
      and arrondissement_id is null
    )
    or (
      channel_type = 'dm'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and recipient_id is not null
      and arrondissement_id is null
    )
    or (
      channel_type = 'admin_elu'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and recipient_id is null
      and arrondissement_id is null
    )
    or (
      channel_type = 'territory'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and arrondissement_id is not null
      and recipient_id is null
    )
    or (
      channel_type = 'bug_report'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and recipient_id is not null
      and recipient_id in (
        select id
        from public.profiles
        where role_label = 'admin'
      )
      and arrondissement_id is null
    )
  );

alter policy "Users can read own notifications" on public.app_notifications
  using (user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

alter policy "Users can update own notifications" on public.app_notifications
  using (user_id = coalesce((select auth.jwt()) ->> 'sub', ''))
  with check (user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

alter policy "Service role can insert notifications" on public.app_notifications
  with check ((select auth.role()) = 'service_role');

alter policy "Allow admin view subscriptions" on public.newsletter_subscriptions
  using (
    coalesce((select auth.uid())::text, '') in (
      select id
      from public.profiles
      where role_label in ('admin', 'super-admin')
    )
  );

alter policy quiz_srs_owner_all on public.quiz_srs
  using (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

alter policy user_roles_service_only on public.user_roles
  using ((select auth.role()) = 'service_role');

alter policy action_organizers_insert_service_role on public.action_organizers
  with check ((select auth.role()) = 'service_role');

alter policy action_organizers_update_service_role on public.action_organizers
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy action_organizers_delete_service_role on public.action_organizers
  using ((select auth.role()) = 'service_role');

alter policy community_bug_reports_service_only on public.community_bug_reports
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy promotion_requests_service_only on public.promotion_requests
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy partner_onboarding_requests_service_only on public.partner_onboarding_requests
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy training_examples_service_only on public.training_examples
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy service_email_events_service_only on public.service_email_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy environmental_impact_snapshots_service_only on public.environmental_impact_snapshots
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy supabase_storage_usage_snapshots_service_only on public.supabase_storage_usage_snapshots
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy codex_usage_weekly_snapshots_service_only on public.codex_usage_weekly_snapshots
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy governance_monthly_reports_service_only on public.governance_monthly_reports
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy contact_requests_service_only on public.contact_requests
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy xp_audit_service_only on public.xp_audit
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy progression_profiles_service_only on public.progression_profiles
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy progression_events_service_only on public.progression_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy community_message_quota_daily_service_only on public.community_message_quota_daily
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy community_message_quota_events_service_only on public.community_message_quota_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy admin_operations_audit_service_only on public.admin_operations_audit
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy funnel_events_service_only on public.funnel_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy checklist_progress_service_only on public.checklist_progress
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy runbook_checks_service_only on public.runbook_checks
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy "Allow anonymous subscription" on public.newsletter_subscriptions
  with check (gdpr_consent = true);

alter policy "volunteer_read_missions" on public.missions
  using (coalesce((select auth.uid())::text, '') = volunteer_id);

alter policy "volunteer_update_missions" on public.missions
  using (coalesce((select auth.uid())::text, '') = volunteer_id)
  with check (coalesce((select auth.uid())::text, '') = volunteer_id);

alter policy "volunteer_insert_gps" on public.gps_points
  with check (
    exists (
      select 1
      from public.missions
      where id = mission_id
        and volunteer_id = coalesce((select auth.uid())::text, '')
    )
  );

alter policy "volunteer_read_gps" on public.gps_points
  using (
    exists (
      select 1
      from public.missions
      where id = mission_id
        and volunteer_id = coalesce((select auth.uid())::text, '')
    )
  );

create or replace function public.compute_mission_distance(p_mission_id uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  total_m double precision := 0;
  prev_lat double precision;
  prev_lon double precision;
  curr record;
begin
  for curr in
    select latitude, longitude, recorded_at
    from public.gps_points
    where mission_id = p_mission_id
    order by recorded_at
  loop
    if prev_lat is not null and prev_lon is not null then
      total_m := total_m + (
        6371000 * 2 * asin(sqrt(
          sin(radians(curr.latitude - prev_lat) / 2) ^ 2 +
          cos(radians(prev_lat)) * cos(radians(curr.latitude)) *
          sin(radians(curr.longitude - prev_lon) / 2) ^ 2
        ))
      );
    end if;

    prev_lat := curr.latitude;
    prev_lon := curr.longitude;
  end loop;

  update public.missions
  set distance_m = total_m::integer,
      duration_s = extract(epoch from (ended_at - started_at))::integer
  where id = p_mission_id;

  return total_m::integer;
end;
$$;

revoke all on function public.compute_mission_distance(uuid) from public;
grant execute on function public.compute_mission_distance(uuid) to service_role;

create or replace function public.moderate_action_atomically(
  p_action_id uuid,
  p_new_status text,
  p_moderator_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_user_id text;
  v_location_label text;
begin
  select created_by_clerk_id, location_label
  into v_user_id, v_location_label
  from public.actions
  where id = p_action_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Action not found');
  end if;

  update public.actions
  set status = p_new_status, updated_at = now()
  where id = p_action_id;

  if p_new_status = 'approved' and v_user_id is not null then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload,
      created_at
    ) values (
      v_user_id,
      'validation',
      'Action Validée !',
      format('Votre action à %s a été approuvée par la modération.', v_location_label),
      jsonb_build_object('entityType', 'action', 'id', p_action_id),
      now()
    );
  end if;

  insert into public.admin_operations_audit (
    operation_id,
    at,
    actor_user_id,
    operation_type,
    outcome,
    target_id,
    details
  ) values (
    gen_random_uuid()::text,
    now(),
    p_moderator_id,
    'moderation',
    'success',
    p_action_id,
    jsonb_build_object('status', p_new_status)
  );

  return jsonb_build_object('success', true, 'action_id', p_action_id);
exception
  when others then
    raise warning 'Moderation atomic operation failed: %', sqlerrm;
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.moderate_action_atomically(uuid, text, text) from public;
grant execute on function public.moderate_action_atomically(uuid, text, text) to service_role;
