-- Remove the broad Storage read policy while keeping the avatars bucket public.
-- Public object URLs continue to be served from the bucket's public flag; no
-- listing policy is required by the application avatar flow.
drop policy if exists "avatars public read" on storage.objects;

-- Keep pg_trgm installed and relocate its objects out of public. Existing
-- dependent indexes are preserved by ALTER EXTENSION ... SET SCHEMA.
create schema if not exists extensions;

do $$
declare
  extension_schema text;
begin
  select n.nspname
    into extension_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if extension_schema is null then
    raise exception 'pg_trgm must exist before relocation';
  end if;

  if extension_schema <> 'extensions' then
    alter extension pg_trgm set schema extensions;
  end if;
end
$$;
