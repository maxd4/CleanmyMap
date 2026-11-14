-- PURPOSE: prevent nested action-maintenance triggers from applying the same
--          public Impact contribution twice.
-- CALLER: the existing public.actions contribution trigger.
-- AUTHORIZATION_BOUNDARY: service-role-only projection maintenance remains
--                         unchanged; no browser privilege is added.
-- IDEMPOTENCY: an action update caused by another action trigger must not
--              replay the public Impact contribution in the same call stack.
-- ATOMICITY: the existing action transaction and advisory lock remain the
--            owners of contribution replacement and aggregate adjustment.
-- FAILURE_BEHAVIOR: nested maintenance returns without changing the derived
--                   contribution; the outer action mutation remains canonical.
-- SEARCH_PATH: the function pins pg_catalog and public explicitly.
-- GRANTS: service_role remains the only executor.

create or replace function public.sync_public_impact_action_contribution()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous public.public_impact_action_contributions%rowtype;
  v_next public.public_impact_action_contributions%rowtype;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));
  if tg_op = 'UPDATE' then
    select * into v_previous from public.public_impact_action_contributions
    where action_id = old.id for update;
    if found then
      perform public.public_impact_adjust_contribution(v_previous, -1);
      delete from public.public_impact_action_contributions where action_id = old.id;
    end if;
  end if;
  select (public.build_public_impact_action_contribution(new)).* into v_next;
  insert into public.public_impact_action_contributions select v_next.*
  on conflict (action_id) do update set
    source_updated_at = excluded.source_updated_at, action_date = excluded.action_date,
    eligible_non_temporal = excluded.eligible_non_temporal, location_label = excluded.location_label,
    waste_kg = excluded.waste_kg, cigarette_butts = excluded.cigarette_butts,
    participants_total = excluded.participants_total, duration_minutes = excluded.duration_minutes,
    category_key = excluded.category_key, category_label = excluded.category_label,
    warning_code = excluded.warning_code, butts_condition = excluded.butts_condition,
    butts_condition_count = excluded.butts_condition_count,
    methodology_version = excluded.methodology_version, projected_at = excluded.projected_at,
    butts_propre_count = excluded.butts_propre_count,
    butts_humide_count = excluded.butts_humide_count,
    butts_mouille_count = excluded.butts_mouille_count,
    butts_mass_by_condition = excluded.butts_mass_by_condition;
  perform public.public_impact_adjust_contribution(v_next, 1);
  return new;
end;
$$;

revoke all on function public.sync_public_impact_action_contribution()
  from public, anon, authenticated;
grant execute on function public.sync_public_impact_action_contribution()
  to service_role;
