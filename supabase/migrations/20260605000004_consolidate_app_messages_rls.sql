-- Consolidate app_messages RLS into one permissive policy per action.
-- This preserves the current channel-specific behavior while avoiding
-- multiple permissive policies on the same table/action.

drop policy if exists "Allow community visibility" on public.app_messages;
drop policy if exists "Allow private messages" on public.app_messages;
drop policy if exists "Allow admin and elected visibility" on public.app_messages;
drop policy if exists "Allow territory visibility" on public.app_messages;
drop policy if exists "Allow bug report inbox" on public.app_messages;
drop policy if exists "Allow community insert" on public.app_messages;
drop policy if exists "Allow DM insert" on public.app_messages;
drop policy if exists "Allow admin and elected insert" on public.app_messages;
drop policy if exists "Allow territory insert" on public.app_messages;
drop policy if exists "Allow bug report insert" on public.app_messages;
drop policy if exists "Allow authenticated insert messages" on public.app_messages;
drop policy if exists "Allow authenticated select messages" on public.app_messages;
drop policy if exists "Allow individual DMs" on public.app_messages;
drop policy if exists "Allow neighborhood visibility" on public.app_messages;
drop policy if exists "Allow Governance visibility" on public.app_messages;
drop policy if exists "Allow Executive visibility" on public.app_messages;
drop policy if exists "Allow authenticated insert" on public.app_messages;

create policy app_messages_select_channels
on public.app_messages
for select
using (
  (
    channel_type = 'community'
    and auth.role() in ('authenticated', 'service_role')
  )
  or (
    channel_type = 'dm'
    and (
      sender_id = coalesce(auth.jwt() ->> 'sub', '')
      or recipient_id = coalesce(auth.jwt() ->> 'sub', '')
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
      sender_id = coalesce(auth.jwt() ->> 'sub', '')
      or recipient_id = coalesce(auth.jwt() ->> 'sub', '')
    )
  )
);

create policy app_messages_insert_channels
on public.app_messages
for insert
with check (
  (
    channel_type = 'community'
    and sender_id = coalesce(auth.jwt() ->> 'sub', '')
    and recipient_id is null
    and arrondissement_id is null
  )
  or (
    channel_type = 'dm'
    and sender_id = coalesce(auth.jwt() ->> 'sub', '')
    and recipient_id is not null
    and arrondissement_id is null
  )
  or (
    channel_type = 'admin_elu'
    and sender_id = coalesce(auth.jwt() ->> 'sub', '')
    and recipient_id is null
    and arrondissement_id is null
  )
  or (
    channel_type = 'territory'
    and sender_id = coalesce(auth.jwt() ->> 'sub', '')
    and arrondissement_id is not null
    and recipient_id is null
  )
  or (
    channel_type = 'bug_report'
    and sender_id = coalesce(auth.jwt() ->> 'sub', '')
    and recipient_id is not null
    and recipient_id in (
      select id
      from public.profiles
      where role_label = 'admin'
    )
    and arrondissement_id is null
  )
);
