-- Restore target contract. This is deliberately not a migration: it prepares
-- only dependencies required by a public-schema dump before schema.sql runs.
create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists postgis with schema extensions;

do $$
declare
  required record;
  installed_schema text;
  installed_version text;
begin
  for required in
    select *
    from (values
      ('pgcrypto', '1'),
      ('pg_trgm', '1'),
      ('uuid-ossp', '1'),
      ('postgis', '3')
    ) as expected(extension_name, expected_major)
  loop
    select n.nspname, e.extversion
      into installed_schema, installed_version
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = required.extension_name;

    if installed_schema is null then
      raise exception using
        errcode = '42704',
        message = format('restore prerequisite extension %s is unavailable', required.extension_name);
    end if;

    if installed_schema <> 'extensions' then
      raise exception using
        errcode = '3F000',
        message = format('restore prerequisite extension %s is in schema %s, expected extensions', required.extension_name, installed_schema);
    end if;

    if split_part(installed_version, '.', 1) <> required.expected_major then
      raise exception using
        errcode = '22023',
        message = format('restore prerequisite extension %s has incompatible version %s', required.extension_name, installed_version);
    end if;
  end loop;

  if to_regtype('extensions.geometry') is null then
    raise exception using
      errcode = '42704',
      message = 'restore prerequisite PostGIS geometry type is unavailable';
  end if;

  if not exists (
    select 1
    from pg_opclass opclass
    join pg_am access_method on access_method.oid = opclass.opcmethod
    join pg_namespace namespace on namespace.oid = opclass.opcnamespace
    where namespace.nspname = 'extensions'
      and access_method.amname = 'gist'
      and opclass.opcname = 'gist_geometry_ops_2d'
  ) then
    raise exception using
      errcode = '42704',
      message = 'restore prerequisite PostGIS GiST operator class is unavailable';
  end if;

  if not exists (
    select 1
    from pg_opclass opclass
    join pg_am access_method on access_method.oid = opclass.opcmethod
    join pg_namespace namespace on namespace.oid = opclass.opcnamespace
    where namespace.nspname = 'extensions'
      and access_method.amname = 'gin'
      and opclass.opcname = 'gin_trgm_ops'
  ) then
    raise exception using
      errcode = '42704',
      message = 'restore prerequisite pg_trgm GIN operator class is unavailable';
  end if;
end
$$;

select 'RESTORE_EXTENSION_PREFLIGHT: PASS' as restore_extension_preflight;
