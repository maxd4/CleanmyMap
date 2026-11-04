-- PURPOSE: persist the server-verified COG territorial projection consumed by
-- territorial legend reads, without making browser DML able to forge it.
-- CALLER: service_role through the existing action lifecycle and controlled
-- territorial reconciliation.
-- AUTHORIZATION_BOUNDARY: anon/authenticated can read actions under existing
-- RLS but cannot insert, update or delete this projection.
-- IDEMPOTENCY: IF NOT EXISTS and explicit grants are safe on replay.
-- ATOMICITY: the projection is written in the same service-side action update
-- as the lifecycle event that changes its geographic evidence.
-- FAILURE_BEHAVIOR: NULL means not currently verifiable and is excluded from
-- territorial competition; no ambiguous label is promoted to a territory.
-- SEARCH_PATH: no function is introduced.
-- GRANTS: service_role retains the existing action write boundary only.

alter table public.actions
  add column if not exists territorial_legend_attribution jsonb;

comment on column public.actions.territorial_legend_attribution is
  'Server-owned, COG-versioned territorial legend attribution; NULL when the action cannot be verified.';

revoke insert, update (territorial_legend_attribution), delete
  on public.actions from public, anon, authenticated;

grant update (territorial_legend_attribution) on public.actions to service_role;

create or replace function public.invalidate_territorial_legend_attribution_on_action_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.action_date is distinct from new.action_date
     or old.latitude is distinct from new.latitude
     or old.longitude is distinct from new.longitude
     or old.derived_geometry_kind is distinct from new.derived_geometry_kind
     or old.derived_geometry_geojson is distinct from new.derived_geometry_geojson
     or old.geometry_source is distinct from new.geometry_source
     or old.department_code is distinct from new.department_code
     or old.department_name is distinct from new.department_name then
    new.territorial_legend_attribution := null;
  end if;
  return new;
end;
$$;

revoke all on function public.invalidate_territorial_legend_attribution_on_action_change()
  from public, anon, authenticated;
grant execute on function public.invalidate_territorial_legend_attribution_on_action_change()
  to service_role;

drop trigger if exists trg_invalidate_territorial_legend_attribution on public.actions;
create trigger trg_invalidate_territorial_legend_attribution
before update of action_date, latitude, longitude, derived_geometry_kind,
  derived_geometry_geojson, geometry_source, department_code, department_name
on public.actions
for each row execute function public.invalidate_territorial_legend_attribution_on_action_change();
