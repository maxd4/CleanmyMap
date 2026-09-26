-- Append-only hardening for the action discussion RLS predicates.
-- These helpers are invoked by authenticated RLS policies. service_role
-- bypasses RLS and does not need direct EXECUTE on them.

create or replace function public.can_insert_action_message_reference(p_action_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select (select auth.role()) in ('authenticated', 'service_role')
    and exists (
      select 1
      from public.actions a
      where a.id = p_action_id
        and public.is_public_action_reference_available(
          a.action_phase,
          a.published_at,
          a.moderation_visibility,
          a.status,
          a.action_date,
          a.event_start_time
        )
    );
$$;

revoke all on function public.can_insert_action_message_reference(uuid)
  from public, anon, service_role;
grant execute on function public.can_insert_action_message_reference(uuid)
  to authenticated;

revoke all on function public.can_view_action_conversation(uuid)
  from public, anon, service_role;
grant execute on function public.can_view_action_conversation(uuid)
  to authenticated;

revoke all on function public.can_post_action_conversation(uuid)
  from public, anon, service_role;
grant execute on function public.can_post_action_conversation(uuid)
  to authenticated;
