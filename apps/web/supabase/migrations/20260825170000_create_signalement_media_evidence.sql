-- Canonical private evidence media for Trash Spotter observations.
-- The parent remains public.trash_spotter_spots; no media payload is stored on it.

create table if not exists public.signalement_media (
  id uuid primary key default gen_random_uuid(),
  signalement_id uuid not null references public.trash_spotter_spots(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_clerk_id text not null,
  client_upload_id text not null,
  storage_bucket text not null default 'signalement-evidence',
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  sort_order smallint not null default 0,
  upload_state text not null default 'pending',
  failure_reason text,
  constraint signalement_media_storage_bucket_check
    check (storage_bucket = 'signalement-evidence'),
  constraint signalement_media_client_upload_id_check
    check (length(trim(client_upload_id)) between 1 and 128),
  constraint signalement_media_storage_path_check
    check (storage_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}[.](jpg|png|webp)$'),
  constraint signalement_media_original_name_check
    check (length(trim(original_name)) between 1 and 255),
  constraint signalement_media_mime_type_check
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint signalement_media_size_check
    check (size_bytes > 0 and size_bytes <= 5242880),
  constraint signalement_media_dimensions_check
    check (
      (width is null and height is null)
      or (width between 1 and 10000 and height between 1 and 10000)
    ),
  constraint signalement_media_sort_order_check
    check (sort_order between 0 and 2),
  constraint signalement_media_upload_state_check
    check (upload_state in ('pending', 'ready', 'failed'))
);

create unique index if not exists signalement_media_client_upload_uidx
  on public.signalement_media (signalement_id, created_by_clerk_id, client_upload_id);

create index if not exists signalement_media_signalement_created_idx
  on public.signalement_media (signalement_id, created_at desc);

create index if not exists signalement_media_pending_created_idx
  on public.signalement_media (created_at)
  where upload_state = 'pending';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signalement-evidence',
  'signalement-evidence',
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

alter table public.signalement_media enable row level security;

drop policy if exists signalement_media_owner_read on public.signalement_media;
create policy signalement_media_owner_read
on public.signalement_media
for select
to authenticated
using (created_by_clerk_id = coalesce((select auth.jwt() ->> 'sub'), ''));

-- No direct client INSERT/UPDATE/DELETE policy is granted. The server-only
-- service client creates intents, finalizes rows and signs read URLs after its
-- Clerk ownership/admin and parent-status checks.
drop policy if exists "signalement evidence public read" on storage.objects;
drop policy if exists "signalement evidence client insert" on storage.objects;
drop policy if exists "signalement evidence client update" on storage.objects;
drop policy if exists "signalement evidence client delete" on storage.objects;

create or replace function public.enforce_signalement_media_ready_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  ready_count integer;
begin
  if new.upload_state = 'ready' then
    perform pg_advisory_xact_lock(hashtextextended(new.signalement_id::text, 0));

    select count(*)
      into ready_count
      from public.signalement_media
     where signalement_id = new.signalement_id
       and upload_state = 'ready'
       and id <> new.id;

    if ready_count >= 3 then
      raise exception 'A signalement cannot have more than three ready media';
    end if;
  end if;

  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists signalement_media_ready_limit on public.signalement_media;
create trigger signalement_media_ready_limit
before insert or update of upload_state on public.signalement_media
for each row
execute function public.enforce_signalement_media_ready_limit();
