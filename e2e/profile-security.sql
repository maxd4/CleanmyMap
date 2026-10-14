-- SECURITY-01 real PostgreSQL contract.
-- The caller is the ephemeral Supabase postgres role. Every application-role
-- assertion below is executed after SET LOCAL ROLE and the fixture is rolled
-- back before the final absence check.

begin;

do $$
begin
  if exists (select 1 from public.profiles where id = 'security-01-owner') then
    raise exception 'SECURITY-01 fixture id already exists';
  end if;
end
$$;

set local role service_role;
insert into public.profiles (
  id,
  display_name,
  handle,
  avatar_url,
  role_label,
  active_role_label,
  metadata,
  referral_code,
  referred_by_profile_id,
  referred_at,
  paris_arrondissement,
  leaderboard_public_opt_in
)
values (
  'security-01-owner',
  'Security 01 owner',
  'security-01-owner',
  'https://example.invalid/security-01.png',
  'admin',
  'admin',
  '{"zoneName":"Paris 11"}'::jsonb,
  'SECURITY01',
  null,
  now(),
  11,
  true
);

reset role;

do $$
begin
  if has_table_privilege('anon', 'public.profiles', 'TRUNCATE')
    or has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
    or has_table_privilege('anon', 'public.profiles', 'TRIGGER')
    or has_table_privilege('authenticated', 'public.profiles', 'TRIGGER')
    or has_table_privilege('anon', 'public.profiles', 'REFERENCES')
    or has_table_privilege('authenticated', 'public.profiles', 'REFERENCES')
    or has_table_privilege('anon', 'public.profiles', 'DELETE')
    or has_table_privilege('authenticated', 'public.profiles', 'DELETE')
  then
    raise exception 'SECURITY-01 profiles table privileges are too broad';
  end if;

  if has_column_privilege('anon', 'public.profiles', 'metadata', 'SELECT')
    or has_column_privilege('authenticated', 'public.profiles', 'metadata', 'SELECT')
    or has_column_privilege('anon', 'public.profiles', 'role_label', 'SELECT')
    or has_column_privilege('authenticated', 'public.profiles', 'role_label', 'SELECT')
    or has_column_privilege('anon', 'public.profiles', 'active_role_label', 'SELECT')
    or has_column_privilege('authenticated', 'public.profiles', 'active_role_label', 'SELECT')
    or has_column_privilege('anon', 'public.profiles', 'referral_code', 'SELECT')
    or has_column_privilege('authenticated', 'public.profiles', 'referral_code', 'SELECT')
    or has_column_privilege('anon', 'public.profiles', 'referred_by_profile_id', 'SELECT')
    or has_column_privilege('authenticated', 'public.profiles', 'referred_by_profile_id', 'SELECT')
  then
    raise exception 'SECURITY-01 private profile columns remain readable';
  end if;

  if not has_column_privilege('anon', 'public.profiles', 'id', 'SELECT')
    or not has_column_privilege('anon', 'public.profiles', 'display_name', 'SELECT')
    or not has_column_privilege('anon', 'public.profiles', 'handle', 'SELECT')
    or not has_column_privilege('anon', 'public.profiles', 'avatar_url', 'SELECT')
    or not has_table_privilege('anon', 'public.public_profiles', 'SELECT')
  then
    raise exception 'SECURITY-01 public profile identity is unavailable';
  end if;

  if not has_table_privilege('anon', 'public.newsletter_subscriptions', 'INSERT')
    or has_table_privilege('anon', 'public.newsletter_subscriptions', 'SELECT')
    or has_table_privilege('anon', 'public.newsletter_subscriptions', 'UPDATE')
    or has_table_privilege('anon', 'public.newsletter_subscriptions', 'TRIGGER')
    or has_table_privilege('authenticated', 'public.newsletter_subscriptions', 'INSERT')
    or has_table_privilege('authenticated', 'public.newsletter_subscriptions', 'SELECT')
    or has_table_privilege('authenticated', 'public.newsletter_subscriptions', 'UPDATE')
    or not has_table_privilege('service_role', 'public.newsletter_subscriptions', 'SELECT')
    or not has_table_privilege('service_role', 'public.newsletter_subscriptions', 'UPDATE')
  then
    raise exception 'SECURITY-01 newsletter privileges do not match the contract';
  end if;

  if not has_table_privilege('authenticated', 'public.notification_preferences', 'SELECT')
    or not has_table_privilege('authenticated', 'public.notification_preferences', 'INSERT')
    or not has_table_privilege('authenticated', 'public.notification_preferences', 'UPDATE')
    or has_table_privilege('authenticated', 'public.notification_preferences', 'DELETE')
    or has_table_privilege('authenticated', 'public.notification_preferences', 'TRUNCATE')
    or has_table_privilege('authenticated', 'public.notification_preferences', 'TRIGGER')
    or has_table_privilege('authenticated', 'public.notification_preferences', 'REFERENCES')
  then
    raise exception 'SECURITY-01 notification preference privileges do not match the contract';
  end if;

  if has_table_privilege('anon', 'public.notification_information_mutes', 'UPDATE')
    or has_table_privilege('authenticated', 'public.notification_information_mutes', 'UPDATE')
    or not has_table_privilege('service_role', 'public.notification_information_mutes', 'UPDATE')
  then
    raise exception 'SECURITY-01 notification mute privileges do not match the contract';
  end if;
end
$$;

set local role anon;
select id, display_name, handle, avatar_url
from public.public_profiles
where id = 'security-01-owner';

do $$
begin
  begin
    execute 'select metadata from public.profiles where id = ''security-01-owner''';
    raise exception 'SECURITY-01 anon metadata read unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'select role_label from public.profiles where id = ''security-01-owner''';
    raise exception 'SECURITY-01 anon role read unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"security-01-owner"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'security-01-owner', true);

select id, display_name, handle, avatar_url
from public.profiles
where id = 'security-01-owner';

select public.current_profile_arrondissement();

do $$
begin
  begin
    perform public.current_profile_role_label();
    raise exception 'SECURITY-01/02 authenticated role projection helper unexpectedly executable';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.current_profile_active_role();
    raise exception 'SECURITY-01/02 authenticated active-role projection helper unexpectedly executable';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

update public.profiles
set display_name = 'Security 01 owner updated'
where id = 'security-01-owner';

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"security-01-other"}', true);
select set_config('request.jwt.claim.sub', 'security-01-other', true);

do $$
begin
  begin
    execute 'select metadata from public.profiles where id = ''security-01-owner''';
    raise exception 'SECURITY-01 other authenticated account read unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"security-01-owner"}', true);
select set_config('request.jwt.claim.sub', 'security-01-owner', true);

do $$
begin
  begin
    execute 'update public.profiles set role_label = ''benevole'' where id = ''security-01-owner''';
    raise exception 'SECURITY-01 authenticated role update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'truncate table public.profiles';
    raise exception 'SECURITY-01 authenticated truncate unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

reset role;
set local role service_role;
select metadata, role_label, active_role_label, referral_code, referred_by_profile_id
from public.profiles
where id = 'security-01-owner';

do $$
declare
  selected_action_id uuid;
  newsletter_status text;
begin
  insert into public.newsletter_subscriptions (email, gdpr_consent, source, status)
  values ('security-01-upsert-fixture', true, 'security-01', 'inactive')
  on conflict (email) do update
    set gdpr_consent = excluded.gdpr_consent,
        source = excluded.source,
        status = excluded.status;

  insert into public.newsletter_subscriptions (email, gdpr_consent, source, status)
  values ('security-01-upsert-fixture', true, 'security-01-retry', 'active')
  on conflict (email) do update
    set gdpr_consent = excluded.gdpr_consent,
        source = excluded.source,
        status = excluded.status;

  select status
    into newsletter_status
    from public.newsletter_subscriptions
   where email = 'security-01-upsert-fixture';
  if newsletter_status <> 'active' then
    raise exception 'SECURITY-01 newsletter upsert did not reactivate the subscription';
  end if;

  select id
    into selected_action_id
    from public.actions
   limit 1;
  if selected_action_id is null then
    raise exception 'SECURITY-01 mute upsert fixture requires an existing action';
  end if;

  insert into public.notification_information_mutes (user_id, action_id)
  values ('security-01-upsert-user', selected_action_id)
  on conflict (user_id, action_id) do update
    set created_at = excluded.created_at;

  insert into public.notification_information_mutes (user_id, action_id)
  values ('security-01-upsert-user', selected_action_id)
  on conflict (user_id, action_id) do update
    set created_at = excluded.created_at;

  delete from public.notification_information_mutes
   where user_id = 'security-01-upsert-user'
     and action_id = selected_action_id;
  if exists (
    select 1
      from public.notification_information_mutes
     where user_id = 'security-01-upsert-user'
       and action_id = selected_action_id
  ) then
    raise exception 'SECURITY-01 notification mute delete did not remove the row';
  end if;
end
$$;

rollback;

do $$
begin
  if exists (select 1 from public.profiles where id = 'security-01-owner') then
    raise exception 'SECURITY-01 fixture was not rolled back';
  end if;
end
$$;
