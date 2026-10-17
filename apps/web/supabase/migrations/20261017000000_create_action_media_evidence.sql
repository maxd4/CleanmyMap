-- Canonical private evidence media for completed CleanMyMap actions.
-- Photo metadata remains historical/readable on actions; binary evidence lives
-- only in this table and the private action-photos bucket.

create table if not exists public.action_media (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_clerk_id text not null,
  client_upload_id text not null,
  storage_bucket text not null default 'action-photos',
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  sort_order smallint not null default 0,
  upload_state text not null default 'pending',
  failure_reason text,
  constraint action_media_storage_bucket_check
    check (storage_bucket = 'action-photos'),
  constraint action_media_client_upload_id_check
    check (length(trim(client_upload_id)) between 1 and 128),
  constraint action_media_storage_path_check
    check (storage_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}[.](jpg|png|webp)$'),
  constraint action_media_original_name_check
    check (length(trim(original_name)) between 1 and 255),
  constraint action_media_mime_type_check
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint action_media_size_check
    check (size_bytes > 0 and size_bytes <= 5242880),
  constraint action_media_dimensions_check
    check (
      (width is null and height is null)
      or (width between 1 and 10000 and height between 1 and 10000)
    ),
  constraint action_media_sort_order_check
    check (sort_order between 0 and 2),
  constraint action_media_upload_state_check
    check (upload_state in ('pending', 'ready', 'failed'))
);

create unique index if not exists action_media_client_upload_uidx
  on public.action_media (action_id, created_by_clerk_id, client_upload_id);

create index if not exists action_media_action_created_idx
  on public.action_media (action_id, created_at asc);

create index if not exists action_media_pending_created_idx
  on public.action_media (created_at)
  where upload_state = 'pending';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'action-photos',
  'action-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.action_media enable row level security;

revoke all on table public.action_media from anon, authenticated;
grant select on table public.action_media to authenticated;

drop policy if exists action_media_owner_read on public.action_media;
create policy action_media_owner_read
on public.action_media
for select
to authenticated
using (created_by_clerk_id = coalesce((select auth.jwt() ->> 'sub'), ''));

-- Signed upload URLs are issued by the server after the action-management
-- permission check. No direct client write/delete policy is granted.
drop policy if exists "action photos public read" on storage.objects;
drop policy if exists "action photos client insert" on storage.objects;
drop policy if exists "action photos client update" on storage.objects;
drop policy if exists "action photos client delete" on storage.objects;

create or replace function public.enforce_action_media_active_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  active_count integer;
begin
  if new.upload_state in ('pending', 'ready') then
    -- The lock makes the three-photo quota deterministic when several intents
    -- or finalizations arrive at the same time for one action.
    perform pg_advisory_xact_lock(hashtextextended(new.action_id::text, 0));

    select count(*)
      into active_count
      from public.action_media
     where action_id = new.action_id
       and upload_state in ('pending', 'ready')
       and id <> new.id;

    if active_count >= 3 then
      raise exception 'An action cannot have more than three active media';
    end if;
  end if;

  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists action_media_active_limit on public.action_media;
create trigger action_media_active_limit
before insert or update of upload_state on public.action_media
for each row
execute function public.enforce_action_media_active_limit();
