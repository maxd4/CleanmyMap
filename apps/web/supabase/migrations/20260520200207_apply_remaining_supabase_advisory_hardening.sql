-- Apply the current repository hardening to the linked Supabase project.
-- This migration exists because older migrations may already be marked as applied
-- on the remote project, so edited historical files are not replayed by `db push`.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.reserve_community_message_slot(text, text) security invoker;
alter function public.reserve_community_message_slot(text, text) set search_path = pg_catalog;
revoke all on function public.reserve_community_message_slot(text, text) from public;
grant execute on function public.reserve_community_message_slot(text, text) to service_role;

alter function public.current_profile_role_label() security invoker;
alter function public.current_profile_role_label() set search_path = pg_catalog;
revoke all on function public.current_profile_role_label() from public;
grant execute on function public.current_profile_role_label() to authenticated, service_role;

alter function public.current_profile_arrondissement() security invoker;
alter function public.current_profile_arrondissement() set search_path = pg_catalog;
revoke all on function public.current_profile_arrondissement() from public;
grant execute on function public.current_profile_arrondissement() to authenticated, service_role;

alter function public.can_view_territory_message(integer) security invoker;
alter function public.can_view_territory_message(integer) set search_path = pg_catalog;
revoke all on function public.can_view_territory_message(integer) from public;
grant execute on function public.can_view_territory_message(integer) to authenticated, service_role;

alter function public.can_profile_view_territory_message(text, integer) security invoker;
alter function public.can_profile_view_territory_message(text, integer) set search_path = pg_catalog;
revoke all on function public.can_profile_view_territory_message(text, integer) from public;
grant execute on function public.can_profile_view_territory_message(text, integer) to service_role;

alter function public.create_chat_notifications_for_message(uuid) security invoker;
alter function public.create_chat_notifications_for_message(uuid) set search_path = pg_catalog;
revoke all on function public.create_chat_notifications_for_message(uuid) from public;
grant execute on function public.create_chat_notifications_for_message(uuid) to service_role;

alter function public.compute_mission_distance(uuid) security invoker;
alter function public.compute_mission_distance(uuid) set search_path = pg_catalog;
revoke all on function public.compute_mission_distance(uuid) from public;
grant execute on function public.compute_mission_distance(uuid) to service_role;

alter function public.create_action_with_training(text, text, date, text, double precision, double precision, numeric, integer, integer, integer, text, text, text, double precision, text) security invoker;
alter function public.create_action_with_training(text, text, date, text, double precision, double precision, numeric, integer, integer, integer, text, text, text, double precision, text) set search_path = pg_catalog;
revoke all on function public.create_action_with_training(text, text, date, text, double precision, double precision, numeric, integer, integer, integer, text, text, text, double precision, text) from public;
grant execute on function public.create_action_with_training(text, text, date, text, double precision, double precision, numeric, integer, integer, integer, text, text, text, double precision, text) to service_role;

alter function public.moderate_action_atomically(uuid, text, text) security invoker;
alter function public.moderate_action_atomically(uuid, text, text) set search_path = pg_catalog;
revoke all on function public.moderate_action_atomically(uuid, text, text) from public;
grant execute on function public.moderate_action_atomically(uuid, text, text) to service_role;

alter function public.create_spot_with_progression(text, text, text, double precision, double precision, text) security invoker;
alter function public.create_spot_with_progression(text, text, text, double precision, double precision, text) set search_path = pg_catalog;
revoke all on function public.create_spot_with_progression(text, text, text, double precision, double precision, text) from public;
grant execute on function public.create_spot_with_progression(text, text, text, double precision, double precision, text) to service_role;
