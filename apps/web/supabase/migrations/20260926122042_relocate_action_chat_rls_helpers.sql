-- Move action-chat RLS helpers out of the exposed public schema.
-- This migration is append-only: historical public functions and policies are
-- left unchanged and the final contracts are recreated here.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

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
    );
$$;

create or replace function private.can_view_action_conversation(
  p_conversation_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
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
      and (select auth.role()) = 'authenticated'
      and (select auth.jwt()) ->> 'sub' is not null
      and not exists (
        select 1
        from public.action_conversation_exclusions e
        where e.conversation_id = c.id
          and e.user_id = (select auth.jwt()) ->> 'sub'
          and e.active
      )
  );
$$;

create or replace function private.can_post_action_conversation(
  p_conversation_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select private.can_view_action_conversation(p_conversation_id)
    and not exists (
      select 1
      from public.action_conversations c
      join public.actions a on a.id = c.action_id
      where c.id = p_conversation_id
        and a.status = 'cancelled'
    );
$$;

revoke all on function private.can_insert_action_message_reference(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_view_action_conversation(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_post_action_conversation(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_insert_action_message_reference(uuid)
  to authenticated;
grant execute on function private.can_view_action_conversation(uuid)
  to authenticated;
grant execute on function private.can_post_action_conversation(uuid)
  to authenticated;

-- The browser chat routes only select and insert through Clerk-RLS. No anon
-- path is required; service_role retains the server-side operational surface.
revoke all privileges on table public.app_messages
  from public, anon, authenticated, service_role;
grant select, insert on table public.app_messages to authenticated;
grant all privileges on table public.app_messages to service_role;

drop policy if exists action_conversations_select_authorized
  on public.action_conversations;
create policy action_conversations_select_authorized
on public.action_conversations
for select
to authenticated
using (private.can_view_action_conversation(id));

drop policy if exists action_conversation_members_select_authorized
  on public.action_conversation_members;
create policy action_conversation_members_select_authorized
on public.action_conversation_members
for select
to authenticated
using (
  user_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or exists (
    select 1
    from public.profiles p
    where p.id = coalesce((select auth.jwt()) ->> 'sub', '')
      and p.role_label in ('admin', 'max', 'elu')
  )
);

drop policy if exists app_messages_select_channels on public.app_messages;
create policy app_messages_select_channels
on public.app_messages
for select
to authenticated
using (
  (
    channel_type = 'community'
    and (select auth.role()) = 'authenticated'
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
    and public.current_profile_role_label() in ('admin', 'max', 'elu')
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
  or (
    channel_type = 'action'
    and private.can_view_action_conversation(conversation_id)
  )
);

drop policy if exists app_messages_insert_channels on public.app_messages;
create policy app_messages_insert_channels
on public.app_messages
for insert
to authenticated
with check (
  (action_id is null or private.can_insert_action_message_reference(action_id))
  and (
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
      and public.current_profile_role_label() in ('admin', 'max', 'elu')
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
        select id from public.profiles where role_label = 'admin'
      )
      and arrondissement_id is null
    )
    or (
      channel_type = 'action'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and conversation_id is not null
      and private.can_post_action_conversation(conversation_id)
    )
  )
);

-- Poll child rows remain authenticated-only and retain every channel enabled
-- by the current poll contract.
drop policy if exists chat_poll_options_select_visible on public.chat_poll_options;
create policy chat_poll_options_select_visible
on public.chat_poll_options
for select
to authenticated
using (
  exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_options.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')
  )
);

drop policy if exists chat_poll_options_insert_own_poll on public.chat_poll_options;
create policy chat_poll_options_insert_own_poll
on public.chat_poll_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_options.message_id
      and m.sender_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')
  )
);

drop policy if exists chat_poll_votes_select_own on public.chat_poll_votes;
create policy chat_poll_votes_select_own
on public.chat_poll_votes
for select
to authenticated
using (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')
  )
);

drop policy if exists chat_poll_votes_insert_own on public.chat_poll_votes;
create policy chat_poll_votes_insert_own
on public.chat_poll_votes
for insert
to authenticated
with check (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')
  )
);

drop policy if exists chat_poll_votes_update_own on public.chat_poll_votes;
create policy chat_poll_votes_update_own
on public.chat_poll_votes
for update
to authenticated
using (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')
  )
with check (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')
  )
);

drop policy if exists chat_poll_votes_delete_own on public.chat_poll_votes;
create policy chat_poll_votes_delete_own
on public.chat_poll_votes
for delete
to authenticated
using (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')
  )
);

-- The exposed helpers are no longer policy dependencies and must disappear
-- from the Data API RPC surface.
drop function if exists public.can_post_action_conversation(uuid);
drop function if exists public.can_view_action_conversation(uuid);
drop function if exists public.can_insert_action_message_reference(uuid);
