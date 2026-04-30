-- 20260428000020_chat_channels_profiles.sql

-- Ensure the updated_at helper exists for profile sync triggers.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Profile table used by Clerk sync and chat access.
create table if not exists public.profiles (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text not null default 'Membre',
  role_label text not null default 'benevole',
  avatar_url text,
  handle text unique,
  paris_arrondissement integer check (paris_arrondissement between 1 and 20)
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
on public.profiles
for select
using (true);

drop policy if exists profiles_all_owner on public.profiles;
create policy profiles_all_owner
on public.profiles
for all
using (
  auth.role() = 'service_role'
  or id = coalesce(auth.jwt() ->> 'sub', '')
)
with check (
  auth.role() = 'service_role'
  or id = coalesce(auth.jwt() ->> 'sub', '')
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create index if not exists idx_profiles_handle on public.profiles(handle);
create index if not exists idx_profiles_arrondissement on public.profiles(paris_arrondissement);
create index if not exists idx_profiles_role_label on public.profiles(role_label);

-- 2. Chat messages aligned with Clerk IDs and the new channel model.
insert into public.profiles (id, display_name, role_label, avatar_url, handle, paris_arrondissement)
select distinct
  sender_id::text,
  'Membre historique',
  'benevole',
  null::text,
  null::text,
  null::integer
from public.app_messages
where sender_id is not null
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role_label, avatar_url, handle, paris_arrondissement)
select distinct
  recipient_id::text,
  'Membre historique',
  'benevole',
  null::text,
  null::text,
  null::integer
from public.app_messages
where recipient_id is not null
on conflict (id) do nothing;

alter table public.app_messages
  drop constraint if exists app_messages_sender_id_fkey,
  drop constraint if exists app_messages_recipient_id_fkey,
  drop constraint if exists app_messages_channel_type_check;

drop policy if exists "Allow authenticated insert messages" on public.app_messages;
drop policy if exists "Allow authenticated select messages" on public.app_messages;

update public.app_messages
set channel_type = case channel_type
  when 'neighborhood' then 'territory'
  when 'governance' then 'admin_elu'
  when 'executive' then 'admin_elu'
  else channel_type
end
where channel_type in ('neighborhood', 'governance', 'executive');

alter table public.app_messages
  alter column sender_id type text using sender_id::text,
  alter column recipient_id type text using recipient_id::text;

alter table public.app_messages
  alter column sender_id set not null;

alter table public.app_messages
  add constraint app_messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete cascade;

alter table public.app_messages
  add constraint app_messages_recipient_id_fkey
  foreign key (recipient_id) references public.profiles(id) on delete set null;

alter table public.app_messages
  add constraint app_messages_channel_type_check
  check (channel_type in ('community', 'dm', 'admin_elu', 'territory', 'bug_report'));

alter table public.app_messages enable row level security;

drop function if exists public.current_profile_role_label();
create or replace function public.current_profile_role_label()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_label
  from public.profiles
  where id = coalesce(auth.jwt() ->> 'sub', '')
  limit 1
$$;

drop function if exists public.current_profile_arrondissement();
create or replace function public.current_profile_arrondissement()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select paris_arrondissement
  from public.profiles
  where id = coalesce(auth.jwt() ->> 'sub', '')
  limit 1
$$;

create or replace function public.can_view_territory_message(p_msg_arrondissement integer)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_arrondissement integer;
begin
  v_user_arrondissement := public.current_profile_arrondissement();

  if v_user_arrondissement is null or p_msg_arrondissement is null then
    return false;
  end if;

  return p_msg_arrondissement = any (
    case v_user_arrondissement
      when 1 then array[1,2,3,4,5,6,7,8,9]
      when 2 then array[1,2,3,4,9,10]
      when 3 then array[1,2,3,4,10,11]
      when 4 then array[1,2,3,4,5,6,11,12]
      when 5 then array[1,4,5,6,13,14]
      when 6 then array[1,4,5,6,7,14,15]
      when 7 then array[1,6,7,8,15,16]
      when 8 then array[1,7,8,9,16,17]
      when 9 then array[1,2,8,9,10,17,18]
      when 10 then array[2,3,9,10,11,18,19]
      when 11 then array[3,4,10,11,12,19,20]
      when 12 then array[4,11,12,13,20]
      when 13 then array[5,12,13,14]
      when 14 then array[5,6,13,14,15]
      when 15 then array[6,7,14,15,16]
      when 16 then array[7,8,15,16,17]
      when 17 then array[8,9,16,17,18]
      when 18 then array[9,10,17,18,19]
      when 19 then array[10,11,18,19,20]
      when 20 then array[11,12,19,20]
      else array[]::integer[]
    end
  );
end;
$$;

drop policy if exists "Allow community visibility" on public.app_messages;
create policy "Allow community visibility"
on public.app_messages
for select
using (
  channel_type = 'community'
  and auth.role() in ('authenticated', 'service_role')
);

drop policy if exists "Allow private messages" on public.app_messages;
create policy "Allow private messages"
on public.app_messages
for select
using (
  channel_type = 'dm'
  and (
    sender_id = coalesce(auth.jwt() ->> 'sub', '')
    or recipient_id = coalesce(auth.jwt() ->> 'sub', '')
  )
);

drop policy if exists "Allow admin and elected visibility" on public.app_messages;
create policy "Allow admin and elected visibility"
on public.app_messages
for select
using (
  channel_type = 'admin_elu'
  and public.current_profile_role_label() in ('admin', 'elu')
);

drop policy if exists "Allow territory visibility" on public.app_messages;
create policy "Allow territory visibility"
on public.app_messages
for select
using (
  channel_type = 'territory'
  and public.can_view_territory_message(arrondissement_id)
);

drop policy if exists "Allow bug report inbox" on public.app_messages;
create policy "Allow bug report inbox"
on public.app_messages
for select
using (
  channel_type = 'bug_report'
  and (
    sender_id = coalesce(auth.jwt() ->> 'sub', '')
    or recipient_id = coalesce(auth.jwt() ->> 'sub', '')
  )
);

drop policy if exists "Allow community insert" on public.app_messages;
create policy "Allow community insert"
on public.app_messages
for insert
with check (
  channel_type = 'community'
  and sender_id = coalesce(auth.jwt() ->> 'sub', '')
  and recipient_id is null
  and arrondissement_id is null
);

drop policy if exists "Allow DM insert" on public.app_messages;
create policy "Allow DM insert"
on public.app_messages
for insert
with check (
  channel_type = 'dm'
  and sender_id = coalesce(auth.jwt() ->> 'sub', '')
  and recipient_id is not null
  and arrondissement_id is null
);

drop policy if exists "Allow admin and elected insert" on public.app_messages;
create policy "Allow admin and elected insert"
on public.app_messages
for insert
with check (
  channel_type = 'admin_elu'
  and sender_id = coalesce(auth.jwt() ->> 'sub', '')
  and recipient_id is null
  and arrondissement_id is null
);

drop policy if exists "Allow territory insert" on public.app_messages;
create policy "Allow territory insert"
on public.app_messages
for insert
with check (
  channel_type = 'territory'
  and sender_id = coalesce(auth.jwt() ->> 'sub', '')
  and arrondissement_id is not null
  and recipient_id is null
);

drop policy if exists "Allow bug report insert" on public.app_messages;
create policy "Allow bug report insert"
on public.app_messages
for insert
with check (
  channel_type = 'bug_report'
  and sender_id = coalesce(auth.jwt() ->> 'sub', '')
  and recipient_id is not null
  and recipient_id in (
    select id
    from public.profiles
    where role_label = 'admin'
  )
  and arrondissement_id is null
);

create index if not exists idx_app_messages_created_at
  on public.app_messages(created_at desc);

create index if not exists idx_app_messages_channel_created
  on public.app_messages(channel_type, created_at desc);

create index if not exists idx_app_messages_dm_participants
  on public.app_messages(sender_id, recipient_id, created_at desc)
  where channel_type = 'dm';

create index if not exists idx_app_messages_territory_arrondissement
  on public.app_messages(arrondissement_id, created_at desc)
  where channel_type = 'territory';

create index if not exists idx_app_messages_bug_report_inbox
  on public.app_messages(recipient_id, created_at desc)
  where channel_type = 'bug_report';
