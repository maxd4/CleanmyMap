-- Keep action-author edits column-scoped; action state and moderation remain server-owned.
revoke update on table public.actions from anon, authenticated;

grant update (
  action_phase,
  preparation_data,
  actor_name,
  action_date,
  location_label,
  latitude,
  longitude,
  waste_kg,
  cigarette_butts,
  volunteers_count,
  duration_minutes,
  notes
) on table public.actions to authenticated;

-- The server/moderation paths continue to retain full UPDATE access.
grant update on table public.actions to service_role;
