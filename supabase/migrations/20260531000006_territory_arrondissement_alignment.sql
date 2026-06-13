-- 20260531000006_territory_arrondissement_alignment.sql
-- Keep territory chat RLS aligned with zone-aware Clerk profiles.

create or replace function public.extract_arrondissement_from_label(label text)
returns integer
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select case
    when label is null then null
    else (
      case
        when substring(label from '([0-9]{1,2})') is null then null
        when substring(label from '([0-9]{1,2})')::integer between 1 and 20
          then substring(label from '([0-9]{1,2})')::integer
        else null
      end
    )
  end
$$;

revoke all on function public.extract_arrondissement_from_label(text) from public;
grant execute on function public.extract_arrondissement_from_label(text) to authenticated, service_role;

create or replace function public.current_profile_arrondissement()
returns integer
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select coalesce(
    paris_arrondissement,
    public.extract_arrondissement_from_label(metadata ->> 'parisArrondissement'),
    public.extract_arrondissement_from_label(metadata ->> 'zoneName')
  )
  from public.profiles
  where id = coalesce(auth.jwt() ->> 'sub', '')
  limit 1
$$;

revoke all on function public.current_profile_arrondissement() from public;
grant execute on function public.current_profile_arrondissement() to authenticated, service_role;

update public.profiles
set paris_arrondissement = coalesce(
  paris_arrondissement,
  public.extract_arrondissement_from_label(metadata ->> 'parisArrondissement'),
  public.extract_arrondissement_from_label(metadata ->> 'zoneName')
)
where paris_arrondissement is null
  and coalesce(metadata ->> 'parisArrondissement', metadata ->> 'zoneName') is not null;
