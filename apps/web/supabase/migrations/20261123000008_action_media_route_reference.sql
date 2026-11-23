-- PURPOSE: split private route-reference images from retrospective report photos.
-- CALLER: server-side action_media intent/finalize/list services.
-- AUTHORIZATION_BOUNDARY: route_reference uses canEditActionForm; report_photo keeps canManageAction.
-- IDEMPOTENCY: purpose is part of the upload-intent uniqueness key.
-- ATOMICITY: per-action advisory lock serializes purpose-specific capacity checks.
-- FAILURE_BEHAVIOR: constraints reject unknown purposes and excess active media.
-- SEARCH_PATH: trigger uses fixed public path; no SECURITY DEFINER function is added.
-- GRANTS: existing action_media RLS and grants remain unchanged.

alter table public.action_media
  add column if not exists purpose text not null default 'report_photo';

alter table public.action_media
  drop constraint if exists action_media_purpose_check;
alter table public.action_media
  add constraint action_media_purpose_check
  check (purpose in ('report_photo', 'route_reference'));

drop index if exists public.action_media_client_upload_uidx;
create unique index action_media_client_upload_uidx
  on public.action_media (action_id, created_by_clerk_id, purpose, client_upload_id);

create or replace function public.enforce_action_media_active_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  active_count integer;
  purpose_limit integer;
begin
  if new.upload_state in ('pending', 'ready') then
    perform pg_advisory_xact_lock(hashtextextended(new.action_id::text, 0));
    -- Route references allow one current image plus one atomic replacement candidate.
    purpose_limit := case new.purpose when 'route_reference' then 2 else 3 end;
    select count(*)
      into active_count
      from public.action_media
     where action_id = new.action_id
       and purpose = new.purpose
       and upload_state in ('pending', 'ready')
       and id <> new.id;
    if active_count >= purpose_limit then
      raise exception 'An action cannot have more active media for this purpose';
    end if;
  end if;
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
