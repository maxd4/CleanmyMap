-- PURPOSE: close direct Data API writes to actions and action_organizers.
-- CALLER: /api/actions and existing server-side action RPCs only.
-- AUTHORIZATION_BOUNDARY: Clerk AuthN/AuthZ remains in the server routes;
--   anon/authenticated receive read-only table grants and no direct DML.
-- IDEMPOTENCY: no action creation RPC or retry key is changed.
-- ATOMICITY: no new multi-table mutation is introduced.
-- FAILURE_BEHAVIOR: unauthorized direct DML fails at PostgreSQL privileges;
--   organizer reads inherit the canonical actions visibility predicate.
-- SEARCH_PATH: policy correlation uses schema-qualified public tables.
-- GRANTS: anon/authenticated SELECT only; service_role retains server DML.

-- Remove both table-level and column-level browser grants. The explicit
-- SELECT grant below preserves the existing public/owner action read surface.
revoke all privileges on table public.actions
  from public, anon, authenticated;
revoke all privileges on table public.action_organizers
  from public, anon, authenticated;
revoke update (
  action_phase,
  preparation_data,
  actor_name,
  organizer_type,
  action_date,
  location_label,
  latitude,
  longitude,
  waste_kg,
  cigarette_butts,
  volunteers_count,
  duration_minutes,
  notes,
  event_start_time,
  event_end_time
) on table public.actions from public, anon, authenticated;

grant select on table public.actions to anon, authenticated;
grant select on table public.action_organizers to anon, authenticated;

-- Existing server routes and service-only RPCs keep their required DML path.
grant select, insert, update, delete on table public.actions to service_role;
grant select, insert, update, delete on table public.action_organizers to service_role;

-- Table privileges are the primary boundary. Remove the obsolete client-side
-- policies as well, so a later accidental grant cannot reopen these paths.
drop policy if exists actions_insert_authenticated on public.actions;
drop policy if exists actions_update_owner_or_service on public.actions;
drop policy if exists actions_delete_owner on public.actions;

drop policy if exists actions_insert_service_role on public.actions;
create policy actions_insert_service_role on public.actions
for insert
to service_role
with check (true);

drop policy if exists actions_update_service_role on public.actions;
create policy actions_update_service_role on public.actions
for update
to service_role
using (true)
with check (true);

drop policy if exists actions_delete_service_role on public.actions;
create policy actions_delete_service_role on public.actions
for delete
to service_role
using (true);

-- An organizer relation is readable only when the related action is readable
-- through the canonical actions_select_public_or_owner policy. This preserves
-- public organizers while hiding private relations from anon and other users.
drop policy if exists action_organizers_select_all on public.action_organizers;
drop policy if exists action_organizers_select_visible_action
  on public.action_organizers;
create policy action_organizers_select_visible_action
on public.action_organizers
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.actions a
    where a.id = action_organizers.action_id
  )
);
