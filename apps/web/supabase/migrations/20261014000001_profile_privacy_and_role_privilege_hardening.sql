-- SECURITY-01: expose only the public profile identity and remove unused
-- application-role table privileges. Clerk remains the authority for roles.

-- The row policy keeps public identity rows discoverable. Column privileges and
-- the projection below are the confidentiality boundary for profiles.
drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_public_identity_select on public.profiles;
create policy profiles_public_identity_select
  on public.profiles for select
  using (true);

create or replace view public.public_profiles
with (security_barrier = true)
as
select
  id,
  display_name,
  handle,
  avatar_url
from public.profiles;

comment on view public.public_profiles is
  'Public profile identity only. Private profile metadata, roles, referrals, consent and synchronization fields remain on public.profiles.';

-- No application role receives broad table access. Public profile consumers use
-- this view or the same four explicitly granted identity columns on profiles;
-- the latter preserves PostgREST foreign-key joins such as chat senders.
revoke all on table public.profiles from public, anon, authenticated;
grant select (id, display_name, handle, avatar_url)
  on table public.profiles to anon, authenticated;
grant insert (
  id,
  display_name,
  display_name_mode,
  avatar_url,
  handle,
  paris_arrondissement,
  metadata,
  updated_at
)
  on table public.profiles to authenticated;
grant update (
  display_name,
  display_name_mode,
  avatar_url,
  handle,
  paris_arrondissement,
  metadata,
  updated_at,
  leaderboard_public_opt_in
)
  on table public.profiles to authenticated;
revoke all on table public.profiles from service_role;
grant select, insert, update on table public.profiles to service_role;

revoke all on table public.public_profiles from public, anon, authenticated, service_role;
grant select on table public.public_profiles to anon, authenticated, service_role;

-- These helpers are called by authenticated RLS policies. They return only the
-- current caller's authorization context and run with a fixed search_path; they
-- are not public data access functions.
create or replace function public.current_profile_role_label()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role_label
  from public.profiles
  where id = coalesce((select auth.jwt()) ->> 'sub', '')
  limit 1
$$;

revoke all on function public.current_profile_role_label() from public, anon, authenticated, service_role;
grant execute on function public.current_profile_role_label() to authenticated, service_role;

create or replace function public.current_profile_arrondissement()
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    paris_arrondissement,
    public.extract_arrondissement_from_label(metadata ->> 'parisArrondissement'),
    public.extract_arrondissement_from_label(metadata ->> 'zoneName')
  )
  from public.profiles
  where id = coalesce((select auth.jwt()) ->> 'sub', '')
  limit 1
$$;

revoke all on function public.current_profile_arrondissement() from public, anon, authenticated, service_role;
grant execute on function public.current_profile_arrondissement() to authenticated, service_role;

create or replace function public.current_profile_active_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select active_role_label
  from public.profiles
  where id = coalesce((select auth.jwt()) ->> 'sub', '')
  limit 1
$$;

revoke all on function public.current_profile_active_role() from public, anon, authenticated, service_role;
grant execute on function public.current_profile_active_role() to authenticated, service_role;

-- RLS policies must not fall back to direct reads of private profile columns
-- after authenticated loses column SELECT on profiles. These predicates keep
-- the authorization decision server-owned without exposing role values.
create or replace function private.is_profile_admin(p_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_profile_id
      and role_label = 'admin'
  )
$$;

revoke all on function private.is_profile_admin(text)
  from public, anon, authenticated, service_role;
grant execute on function private.is_profile_admin(text)
  to authenticated, service_role;

drop policy if exists action_conversation_members_select_authorized
  on public.action_conversation_members;
create policy action_conversation_members_select_authorized
on public.action_conversation_members
for select
to authenticated
using (
  user_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or public.current_profile_role_label() in ('admin', 'max', 'elu')
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

-- Preserve the existing administrator-only newsletter projection without a
-- policy-time read of profiles.role_label by authenticated.
alter policy "Allow admin view subscriptions"
  on public.newsletter_subscriptions
  using (public.current_profile_role_label() in ('admin', 'super-admin'));

-- Referral lineage contains private relationship and timestamp data. The
-- server-only profile page uses the service role after its Clerk authorization.
revoke all on function public.load_referral_lineage_profiles(text)
  from public, anon, authenticated, service_role;
grant execute on function public.load_referral_lineage_profiles(text) to service_role;

-- Preserve newsletter subscription and owner preference capabilities while
-- removing implicit DELETE/TRUNCATE/TRIGGER/REFERENCES and broad access.
revoke all on table public.newsletter_subscriptions from public, anon, authenticated, service_role;
grant insert on table public.newsletter_subscriptions to anon;
grant select on table public.newsletter_subscriptions to authenticated, service_role;
grant insert on table public.newsletter_subscriptions to service_role;

revoke all on table public.notification_preferences from public, anon, authenticated, service_role;
grant select, insert, update on table public.notification_preferences to authenticated, service_role;

revoke all on table public.notification_information_mutes from public, anon, authenticated, service_role;
grant select, insert, delete on table public.notification_information_mutes to authenticated, service_role;
