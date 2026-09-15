-- Restore the discussion lifecycle contract independently from public action
-- reference eligibility. This migration is append-only because 00009 is
-- already applied.

create or replace function public.is_action_discussion_available(
  p_action_phase text,
  p_published_at timestamptz,
  p_moderation_visibility text,
  p_status text,
  p_action_date date,
  p_event_start_time time
)
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select p_published_at is not null
    and coalesce(p_moderation_visibility, 'visible') <> 'hidden'
    and (
      public.is_public_future_pre_action(
        p_action_phase,
        p_published_at,
        p_moderation_visibility,
        p_status,
        p_action_date,
        p_event_start_time
      )
      or (
        p_status = 'approved'
        and coalesce(p_action_phase, 'post_action_complete') <> 'pre_action'
      )
    );
$$;

revoke all on function public.is_action_discussion_available(
  text, timestamptz, text, text, date, time
) from public, anon, authenticated;
grant execute on function public.is_action_discussion_available(
  text, timestamptz, text, text, date, time
) to service_role;

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
      and public.is_action_discussion_available(
        a.action_phase,
        a.published_at,
        a.moderation_visibility,
        a.status,
        a.action_date,
        a.event_start_time
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
