-- Align action discussion access with the canonical public action predicate.
-- This migration is append-only: 20260915000006 remains applied as-is.
-- Participation rows are never an authorization source for the discussion.
create or replace function public.can_view_action_conversation(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.action_conversations c
    join public.actions a on a.id = c.action_id
    where c.id = p_conversation_id
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
      and (
        (
          a.status = 'approved'
          and coalesce(a.action_phase, 'post_action_complete') <> 'pre_action'
          and a.published_at is not null
        )
        or public.is_public_future_pre_action(
          a.action_phase,
          a.published_at,
          a.moderation_visibility,
          a.status,
          a.action_date,
          a.event_start_time
        )
      )
      and (
        (select auth.role()) = 'service_role'
        or (
          (select auth.role()) = 'authenticated'
          and (select auth.jwt()) ->> 'sub' is not null
          and not exists (
            select 1
            from public.action_conversation_exclusions e
            where e.conversation_id = c.id
              and e.user_id = (select auth.jwt()) ->> 'sub'
              and e.active
          )
        )
      )
  );
$$;

revoke all on function public.can_view_action_conversation(uuid) from public, anon;
grant execute on function public.can_view_action_conversation(uuid) to authenticated, service_role;
