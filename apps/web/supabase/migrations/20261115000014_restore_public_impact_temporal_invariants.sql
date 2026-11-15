-- PURPOSE: restore temporal membership and idempotence lost when the counter
--          zero-transition implementation replaced the temporal wrapper.
-- CALLER: public action projection triggers, maintenance advancement and
--         reconstruction RPCs through public.public_impact_adjust_contribution.
-- AUTHORIZATION_BOUNDARY: service_role-only projection maintenance is preserved.
-- IDEMPOTENCY: a transition already represented by eligible_temporal is a no-op.
-- ATOMICITY: the aggregate row lock and caller transaction cover the counter
--            transition and the persisted temporal marker.
-- FAILURE_BEHAVIOR: invalid signs and negative counter transitions still fail
--                   closed; future contributions remain stored but inactive.
-- SEARCH_PATH: the definer function pins pg_catalog, public.
-- GRANTS: service_role remains the only executor.

create or replace function public.public_impact_adjust_contribution(
  p_contribution public.public_impact_action_contributions,
  p_sign integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
  v_location_count bigint;
  v_distribution_count bigint;
  v_warning_count bigint;
  v_location_delta bigint := 0;
  v_condition record;
  v_condition_count bigint;
begin
  if p_sign not in (-1, 1) then
    raise exception 'Invalid public Impact contribution delta sign: %', p_sign;
  end if;

  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true
  for update;

  if not found or v_state.initialized_at is null then return; end if;
  if not p_contribution.eligible_non_temporal
     or p_contribution.action_date < v_state.floor_date
     or p_contribution.action_date > current_date then return; end if;

  if p_sign = 1 and p_contribution.eligible_temporal then return; end if;
  if p_sign = -1 and not p_contribution.eligible_temporal then return; end if;

  if v_state.visible_actions + p_sign < 0
     or v_state.waste_kg + (p_sign * p_contribution.waste_kg) < 0
     or v_state.cigarette_butts + (p_sign * p_contribution.cigarette_butts) < 0
     or v_state.participants_total + (p_sign * p_contribution.participants_total) < 0
     or v_state.total_duration_minutes + (p_sign * p_contribution.duration_minutes) < 0 then
    raise exception 'Public Impact aggregate would become negative for action %', p_contribution.action_id;
  end if;

  if p_contribution.location_label is not null then
    select action_count into v_location_count
    from public.public_impact_action_location_counts
    where location_label = p_contribution.location_label for update;
    if p_sign = 1 then
      if v_location_count is null then
        insert into public.public_impact_action_location_counts(location_label, action_count)
        values (p_contribution.location_label, 1);
        v_location_delta := 1;
      else
        update public.public_impact_action_location_counts
        set action_count = action_count + 1 where location_label = p_contribution.location_label;
      end if;
    elsif v_location_count is null or v_location_count <= 0 then
      raise exception 'Missing public Impact location counter for %', p_contribution.location_label;
    elsif v_location_count = 1 then
      delete from public.public_impact_action_location_counts where location_label = p_contribution.location_label;
      v_location_delta := -1;
    else
      update public.public_impact_action_location_counts
      set action_count = action_count - 1 where location_label = p_contribution.location_label;
    end if;
  end if;

  if v_state.distinct_locations + v_location_delta < 0 then
    raise exception 'Public Impact distinct location counter would become negative';
  end if;

  update public.public_impact_action_aggregate_state
  set visible_actions = visible_actions + p_sign,
      distinct_locations = distinct_locations + v_location_delta,
      waste_kg = waste_kg + (p_sign * p_contribution.waste_kg),
      cigarette_butts = cigarette_butts + (p_sign * p_contribution.cigarette_butts),
      participants_total = participants_total + (p_sign * p_contribution.participants_total),
      total_duration_minutes = total_duration_minutes + (p_sign * p_contribution.duration_minutes),
      updated_at = now()
  where state_id = true;

  if p_sign = 1 then
    insert into public.public_impact_action_distribution_counts(category_key, category_label, action_count)
    values (p_contribution.category_key, p_contribution.category_label, 1)
    on conflict (category_key) do update set category_label = excluded.category_label,
      action_count = public.public_impact_action_distribution_counts.action_count + 1;
  else
    select action_count into v_distribution_count
    from public.public_impact_action_distribution_counts
    where category_key = p_contribution.category_key for update;
    if v_distribution_count is null or v_distribution_count <= 0 then
      raise exception 'Missing public Impact distribution counter for %', p_contribution.category_key;
    elsif v_distribution_count = 1 then
      delete from public.public_impact_action_distribution_counts
      where category_key = p_contribution.category_key;
    else
      update public.public_impact_action_distribution_counts
      set action_count = action_count - 1
      where category_key = p_contribution.category_key;
    end if;
  end if;

  if p_contribution.warning_code is not null then
    if p_sign = 1 then
      insert into public.public_impact_action_warning_counts(warning_code, warning_count)
      values (p_contribution.warning_code, 1)
      on conflict (warning_code) do update set warning_count = public.public_impact_action_warning_counts.warning_count + 1;
    else
      select warning_count into v_warning_count
      from public.public_impact_action_warning_counts
      where warning_code = p_contribution.warning_code for update;
      if v_warning_count is null or v_warning_count <= 0 then
        raise exception 'Missing public Impact warning counter for %', p_contribution.warning_code;
      elsif v_warning_count = 1 then
        delete from public.public_impact_action_warning_counts
        where warning_code = p_contribution.warning_code;
      else
        update public.public_impact_action_warning_counts
        set warning_count = warning_count - 1
        where warning_code = p_contribution.warning_code;
      end if;
    end if;
  end if;

  for v_condition in select * from public.public_impact_butt_condition_projections(p_contribution) loop
    if p_sign = 1 then
      insert into public.public_impact_action_butt_condition_counts(condition, cigarette_butts, mass_contributions)
      values (v_condition.condition, v_condition.cigarette_butts, v_condition.mass_contributions)
      on conflict (condition) do update set
        cigarette_butts = public.public_impact_action_butt_condition_counts.cigarette_butts + excluded.cigarette_butts,
        mass_contributions = public.public_impact_action_butt_condition_counts.mass_contributions || excluded.mass_contributions;
    else
      select cigarette_butts into v_condition_count
      from public.public_impact_action_butt_condition_counts
      where condition = v_condition.condition for update;
      if v_condition_count is null or v_condition_count < v_condition.cigarette_butts
         or not exists (
           select 1
           from jsonb_array_elements((select mass_contributions from public.public_impact_action_butt_condition_counts where condition = v_condition.condition)) as item(value)
           where item.value->>'actionId' = p_contribution.action_id::text
         ) then
        raise exception 'Missing public Impact butt condition counter for %', v_condition.condition;
      elsif v_condition_count = v_condition.cigarette_butts then
        delete from public.public_impact_action_butt_condition_counts
        where condition = v_condition.condition;
      else
        update public.public_impact_action_butt_condition_counts
        set cigarette_butts = cigarette_butts - v_condition.cigarette_butts,
            mass_contributions = coalesce((
              select jsonb_agg(item.value order by item.value->>'actionId', item.value->>'count')
              from jsonb_array_elements(mass_contributions) as item(value)
              where item.value->>'actionId' is distinct from p_contribution.action_id::text
            ), '[]'::jsonb)
        where condition = v_condition.condition;
      end if;
    end if;
  end loop;

  update public.public_impact_action_contributions
  set eligible_temporal = (p_sign = 1)
  where action_id = p_contribution.action_id;
end;
$$;

revoke all on function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) from public, anon, authenticated;
grant execute on function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) to service_role;
