-- Keep the action-chat helper private and make its reference predicate review-aware.
-- The preceding lot accidentally recreated a legacy public wrapper while replacing
-- its predicate; retain the function for historical compatibility but remove its
-- Data API execution surface.
revoke all on function public.can_insert_action_message_reference(uuid) from public, anon, authenticated;
grant execute on function public.can_insert_action_message_reference(uuid) to service_role;

create or replace function private.can_insert_action_message_reference(
  p_action_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select (select auth.role()) = 'authenticated'
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
        and (
          coalesce(a.action_phase, 'post_action_complete') <> 'pre_action'
          or public.is_public_future_pre_action_reviewed(
            a.action_phase,
            a.published_at,
            a.moderation_visibility,
            a.status,
            a.review_state,
            a.action_date,
            a.event_start_time
          )
        )
    );
$$;
