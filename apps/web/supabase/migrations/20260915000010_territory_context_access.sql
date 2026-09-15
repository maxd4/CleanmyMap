-- Territory chat access is scoped by the explicit application context.
-- The persisted profile territory remains a preference for defaults and
-- notification fan-out, not an authorization boundary.
-- This migration is append-only; previously applied migrations are unchanged.

alter table public.app_messages enable row level security;

create or replace function public.can_view_territory_message(p_msg_arrondissement integer)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select (select auth.role()) in ('authenticated', 'service_role');
$$;

revoke all on function public.can_view_territory_message(integer) from public;
grant execute on function public.can_view_territory_message(integer) to authenticated, service_role;

drop policy if exists app_messages_select_channels on public.app_messages;
create policy app_messages_select_channels
on public.app_messages
for select
using (
  (
    channel_type = 'community'
    and (select auth.role()) in ('authenticated', 'service_role')
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
    and public.current_profile_role_label() in ('admin', 'elu')
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
  or (channel_type = 'action' and public.can_view_action_conversation(conversation_id))
);

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
    and recipient_id is null
    and (
      arrondissement_id between 1 and 20
      or nullif(btrim(zone_name), '') is not null
    )
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
    and public.can_view_action_conversation(conversation_id)
  )
);
