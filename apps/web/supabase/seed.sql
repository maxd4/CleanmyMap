-- Local-only E2E fixture. This file is loaded by `supabase db reset` and is
-- never applied to a linked or remote project by the test harness.
-- Marker: E2E_FIXTURE:group-join:v1

insert into public.actions (
  id,
  created_by_clerk_id,
  actor_name,
  action_date,
  location_label,
  latitude,
  longitude,
  waste_kg,
  cigarette_butts,
  volunteers_count,
  duration_minutes,
  status,
  notes,
  type,
  action_phase,
  preparation_data,
  moderation_visibility
)
values (
  '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid,
  'e2e-fixture-owner',
  'Fixture E2E CleanMyMap',
  '2030-01-15'::date,
  'E2E — Place de test locale',
  48.8566,
  2.3522,
  12.5,
  35,
  4,
  90,
  'approved',
 concat('E2E_FIXTURE:group-join:v1', E'\n', '[cmm-meta]{"groupJoinEnabled":true}'),
  'action',
  'pre_action',
  '{}'::jsonb,
  'visible'
)
on conflict (id) do update set
  created_by_clerk_id = excluded.created_by_clerk_id,
  actor_name = excluded.actor_name,
  action_date = excluded.action_date,
  location_label = excluded.location_label,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  waste_kg = excluded.waste_kg,
  cigarette_butts = excluded.cigarette_butts,
  volunteers_count = excluded.volunteers_count,
  duration_minutes = excluded.duration_minutes,
  status = excluded.status,
  notes = excluded.notes,
  type = excluded.type,
  action_phase = excluded.action_phase,
  preparation_data = excluded.preparation_data,
  moderation_visibility = excluded.moderation_visibility;

delete from public.action_participants
where action_id = '6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71'::uuid;
