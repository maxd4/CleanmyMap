-- SECURITY-03 real PostgreSQL contract.
-- The caller is the ephemeral Supabase postgres role. Clerk confirmation is
-- proved by the API contract; this SQL contract proves the RLS boundary and
-- the server-role persistence path without widening authenticated INSERT.

begin;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where id in (
      'security-03-bug-sender',
      'security-03-clerk-owner',
      'security-03-other'
    )
  ) then
    raise exception 'SECURITY-03 fixture id already exists';
  end if;
end
$$;

set local role service_role;
insert into public.profiles (id, display_name, role_label, active_role_label, metadata)
values
  ('security-03-bug-sender', 'Security 03 sender', 'benevole', 'benevole', '{}'::jsonb),
  ('security-03-clerk-owner', 'Security 03 Clerk owner', 'max', 'max', '{}'::jsonb),
  ('security-03-other', 'Security 03 other account', 'benevole', 'benevole', '{}'::jsonb);

do $$
begin
  if not has_table_privilege('authenticated', 'public.app_messages', 'INSERT') then
    raise exception 'SECURITY-03 authenticated app_messages INSERT grant is missing';
  end if;
  if not has_table_privilege('service_role', 'public.app_messages', 'INSERT') then
    raise exception 'SECURITY-03 service_role app_messages INSERT grant is missing';
  end if;
end
$$;

-- This is the server-owned persistence path after Clerk has confirmed the
-- configured owner. The recipient is fixed to that owner fixture, not a
-- client-provided value.
insert into public.app_messages (sender_id, recipient_id, channel_type, content)
values (
  'security-03-bug-sender',
  'security-03-clerk-owner',
  'bug_report',
  'SECURITY-03 server-authorized bug report'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"security-03-bug-sender"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'security-03-bug-sender', true);

-- A direct Supabase authenticated session cannot create a bug_report, even
-- when it supplies the canonical owner as recipient.
do $$
begin
  begin
    insert into public.app_messages (sender_id, recipient_id, channel_type, content)
    values (
      'security-03-bug-sender',
      'security-03-clerk-owner',
      'bug_report',
      'SECURITY-03 direct authenticated attempt'
    );
    raise exception 'SECURITY-03 authenticated bug_report insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

-- The ordinary community channel remains writable under its existing scope.
insert into public.app_messages (sender_id, recipient_id, channel_type, content)
values (
  'security-03-bug-sender',
  null,
  'community',
  'SECURITY-03 community regression check'
);

do $$
declare
  v_visible_count bigint;
begin
  select count(*)
    into v_visible_count
    from public.app_messages
   where channel_type = 'bug_report'
     and sender_id = 'security-03-bug-sender'
     and recipient_id = 'security-03-clerk-owner';
  if v_visible_count <> 1 then
    raise exception 'SECURITY-03 sender cannot read its own bug_report';
  end if;
end
$$;

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"security-03-clerk-owner"}', true);
select set_config('request.jwt.claim.sub', 'security-03-clerk-owner', true);

do $$
begin
  if not exists (
    select 1
      from public.app_messages
     where channel_type = 'bug_report'
       and sender_id = 'security-03-bug-sender'
       and recipient_id = 'security-03-clerk-owner'
  ) then
    raise exception 'SECURITY-03 canonical owner cannot read its bug_report';
  end if;
end
$$;

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"security-03-other"}', true);
select set_config('request.jwt.claim.sub', 'security-03-other', true);

do $$
begin
  if exists (
    select 1
      from public.app_messages
     where channel_type = 'bug_report'
       and sender_id = 'security-03-bug-sender'
       and recipient_id = 'security-03-clerk-owner'
  ) then
    raise exception 'SECURITY-03 unrelated authenticated account read a private bug_report';
  end if;
end
$$;

rollback;
