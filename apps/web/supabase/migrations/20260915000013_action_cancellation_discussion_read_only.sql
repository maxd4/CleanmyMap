-- Keep the existing action discussion as a readable, historical tombstone
-- after cancellation, while making new messages impossible.

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
      p_status = 'cancelled'
      or public.is_public_future_pre_action(
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

create or replace function public.can_post_action_conversation(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select public.can_view_action_conversation(p_conversation_id)
    and not exists (
      select 1
      from public.action_conversations c
      join public.actions a on a.id = c.action_id
      where c.id = p_conversation_id
        and a.status = 'cancelled'
    );
$$;

revoke all on function public.can_post_action_conversation(uuid) from public, anon;
grant execute on function public.can_post_action_conversation(uuid) to authenticated, service_role;

drop policy if exists app_messages_insert_channels on public.app_messages;
create policy app_messages_insert_channels
on public.app_messages
for insert
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
    and recipient_id in (select id from public.profiles where role_label = 'admin')
    and arrondissement_id is null
  )
  or (
    channel_type = 'action'
    and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and conversation_id is not null
    and public.can_post_action_conversation(conversation_id)
  )
);
