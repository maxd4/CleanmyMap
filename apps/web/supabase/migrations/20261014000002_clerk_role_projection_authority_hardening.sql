-- SECURITY-02: role projections are operational data, never a privileged
-- authorization source. PostgreSQL cannot verify Clerk revocations itself;
-- privileged role capabilities therefore stop at the server boundary.

-- These helpers remain available to server-side audit/projection consumers, but
-- a Data API caller must not be able to turn a stale projection into a role
-- decision by invoking them from SQL.
revoke all on function public.current_profile_role_label()
  from public, anon, authenticated, service_role;
grant execute on function public.current_profile_role_label() to service_role;

revoke all on function public.current_profile_active_role()
  from public, anon, authenticated, service_role;
grant execute on function public.current_profile_active_role() to service_role;

-- Action discussions retain relationship-based access. A Clerk role projection
-- is deliberately absent: owner, organizer, persistent member, registration
-- and participation are explicit business relationships and do not grant a
-- global administrative capability.
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
      and (
        a.created_by_clerk_id = (select auth.jwt()) ->> 'sub'
        or exists (
          select 1
          from public.action_organizers ao
          where ao.action_id = a.id
            and ao.organizer_clerk_id = (select auth.jwt()) ->> 'sub'
        )
        or exists (
          select 1
          from public.action_conversation_members m
          where m.conversation_id = c.id
            and m.user_id = (select auth.jwt()) ->> 'sub'
        )
        or exists (
          select 1
          from public.action_registrations ar
          where ar.action_id = a.id
            and ar.user_id = (select auth.jwt()) ->> 'sub'
            and ar.registration_status in ('pending', 'confirmed')
        )
        or exists (
          select 1
          from public.action_participants ap
          where ap.action_id = a.id
            and ap.user_id = (select auth.jwt()) ->> 'sub'
            and ap.participation_status in ('pending', 'confirmed')
        )
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

revoke all on function private.can_view_action_conversation(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_post_action_conversation(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_view_action_conversation(uuid) to authenticated;
grant execute on function private.can_post_action_conversation(uuid) to authenticated;

-- The existing authenticated poll RPC derives its actor from the Clerk RLS
-- JWT. The authorized server path needs the same actor identity while using
-- service_role for the now-closed admin_elu table branch, so keep that path
-- atomic in a separate server-only RPC with an explicit actor parameter.
create or replace function public.create_chat_poll_with_options_for_server(
  p_actor_user_id text,
  p_content text,
  p_topic_id text,
  p_option_labels jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_message_id uuid;
  v_option jsonb;
  v_position smallint := 0;
  v_label text;
begin
  if (select auth.role()) <> 'service_role'
    or nullif(btrim(p_actor_user_id), '') is null
  then
    raise exception 'server authorization required';
  end if;
  if p_content is null or char_length(btrim(p_content)) = 0 or char_length(p_content) > 2000 then
    raise exception 'poll question is invalid';
  end if;
  if p_option_labels is null or jsonb_typeof(p_option_labels) <> 'array'
    or jsonb_array_length(p_option_labels) < 2
    or jsonb_array_length(p_option_labels) > 6
  then
    raise exception 'poll requires between 2 and 6 options';
  end if;

  insert into public.app_messages (
    sender_id, recipient_id, channel_type, topic_id, message_kind,
    related_event_id, arrondissement_id, zone_name, content,
    attachment_url, attachment_type, attachment_expires_at
  ) values (
    p_actor_user_id, null, 'admin_elu', p_topic_id, 'poll',
    null, null, null, btrim(p_content), null, null, null
  ) returning id into v_message_id;

  for v_option in select value from jsonb_array_elements(p_option_labels)
  loop
    v_position := v_position + 1;
    if jsonb_typeof(v_option) <> 'string' then
      raise exception 'poll option label is invalid';
    end if;
    v_label := btrim(v_option #>> '{}');
    if char_length(v_label) not between 1 and 200 then
      raise exception 'poll option label is invalid';
    end if;
    insert into public.chat_poll_options (message_id, position, label)
    values (v_message_id, v_position, v_label);
  end loop;

  return v_message_id;
end;
$$;

revoke all on function public.create_chat_poll_with_options_for_server(text, text, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.create_chat_poll_with_options_for_server(text, text, text, jsonb)
  to service_role;

-- Direct authenticated Supabase sessions cannot prove current Clerk role
-- freshness. They must not read or write the global admin_elu channel. The
-- Next.js server route performs the canonical Clerk capability check and then
-- uses an explicitly scoped service client for that operation.
drop policy if exists action_conversation_members_select_authorized
  on public.action_conversation_members;
create policy action_conversation_members_select_authorized
on public.action_conversation_members
for select
to authenticated
using (private.can_view_action_conversation(conversation_id));

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
      channel_type = 'territory'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and arrondissement_id is not null
      and recipient_id is null
    )
    or (
      channel_type = 'bug_report'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and recipient_id is not null
      and private.is_profile_admin(recipient_id)
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

-- Poll child rows are reachable only through a visible parent message. The
-- parent RLS above consequently makes admin_elu polls unavailable to direct
-- sessions; the authorized server route uses service_role after Clerk checks.
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
      and m.channel_type in ('community', 'territory', 'action', 'dm')
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
      and m.sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'territory', 'action', 'dm')
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
      and m.channel_type in ('community', 'territory', 'action', 'dm')
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
      and m.channel_type in ('community', 'territory', 'action', 'dm')
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
      and m.channel_type in ('community', 'territory', 'action', 'dm')
  )
)
with check (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'territory', 'action', 'dm')
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
      and m.channel_type in ('community', 'territory', 'action', 'dm')
  )
);

-- No browser/API consumer needs a projection-based newsletter read. The
-- administrative server service remains the only reader after its Clerk
-- authorization boundary.
drop policy if exists "Allow admin view subscriptions"
  on public.newsletter_subscriptions;
revoke select on table public.newsletter_subscriptions from authenticated;

comment on function public.current_profile_role_label() is
  'Server-only projection for audit/operational consumers; never a Clerk authorization authority.';
comment on function public.current_profile_active_role() is
  'Server-only projection for audit/operational consumers; never a Clerk authorization authority.';
comment on function public.create_chat_poll_with_options_for_server(text, text, text, jsonb) is
  'Server-only atomic admin_elu poll write; caller must establish Clerk capability before using service_role.';
