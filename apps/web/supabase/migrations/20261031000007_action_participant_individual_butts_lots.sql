-- LOT 2: canonical individual cigarette-butt lots remain an attribution of
-- action_participants. The historical scalar columns stay as compatibility
-- projections; actions.cigarette_butts remains the collective source.
alter table public.action_participants
  add column if not exists individual_cigarette_butts_lots jsonb;

alter table public.action_participants
  drop constraint if exists action_participants_individual_butts_count_check,
  drop constraint if exists action_participants_individual_butts_completeness_check;

alter table public.action_participants
  add constraint action_participants_individual_butts_lots_shape_check
  check (
    individual_cigarette_butts_lots is null
    or (
      jsonb_typeof(individual_cigarette_butts_lots) = 'object'
      and jsonb_typeof(individual_cigarette_butts_lots -> 'lots') = 'array'
      and jsonb_typeof(individual_cigarette_butts_lots -> 'results') = 'array'
      and jsonb_typeof(individual_cigarette_butts_lots -> 'summary') = 'object'
    )
  ),
  add constraint action_participants_individual_butts_count_check
  check (
    individual_cigarette_butts_count is null
    or individual_cigarette_butts_count between 0 and 5000000
    or (
      individual_cigarette_butts_lots is not null
      and individual_cigarette_butts_count between 0 and 500000000
    )
  ),
  add constraint action_participants_individual_butts_completeness_check
  check (
    individual_cigarette_butts_lots is not null
    or (
      individual_cigarette_butts_count is null
      and individual_cigarette_butts_mass_kg is null
    )
    or (
      individual_cigarette_butts_condition is not null
      and individual_cigarette_butts_provenance is not null
      and (
        individual_cigarette_butts_count is not null
        or individual_cigarette_butts_conversion_version is not null
      )
    )
  );

comment on column public.action_participants.individual_cigarette_butts_lots is
  'Canonical server-calculated individual attribution: raw lots, per-lot results, and aggregate summary. Historical scalar columns are compatibility projections.';

-- The published restore function predates the additive JSONB column and must
-- remain reusable for old backups. This wrapper preserves its transaction and
-- restores the new field only when it is present in the backup payload.
create or replace function public.restore_action_backup_with_individual_butts_lots(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_base jsonb;
  v_restore_payload jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if jsonb_typeof(p_backup->'tables'->'action_participants') <> 'array' then
    raise exception 'Incomplete action participant backup table';
  end if;

  v_restore_payload := jsonb_set(
    p_backup,
    '{tables,action_participants}',
    coalesce(
      (
        select jsonb_agg(
          case
            when jsonb_typeof(row_value->'individual_cigarette_butts_lots') = 'object' then
              row_value || jsonb_build_object(
                'individual_cigarette_butts_count', null,
                'individual_cigarette_butts_mass_kg', null,
                'individual_cigarette_butts_condition', null,
                'individual_cigarette_butts_provenance', null,
                'individual_cigarette_butts_conversion_version', null
              )
            else row_value
          end
        )
        from jsonb_array_elements(p_backup->'tables'->'action_participants') as rows(row_value)
      ),
      '[]'::jsonb
    ),
    true
  );

  if jsonb_typeof(v_restore_payload->'fieldRoleTables') = 'object'
     and (
       jsonb_typeof(v_restore_payload->'fieldRoleTables'->'action_field_role_assignments') = 'array'
       or jsonb_typeof(v_restore_payload->'fieldRoleTables'->'action_field_role_transfer_proposals') = 'array'
       or jsonb_typeof(v_restore_payload->'fieldRoleTables'->'action_field_role_transfer_audit') = 'array'
     ) then
    v_base := public.restore_action_backup_with_field_roles(v_restore_payload);
  else
    v_base := public.restore_action_backup(v_restore_payload);
  end if;

  update public.action_participants ap
  set individual_cigarette_butts_count = r.individual_cigarette_butts_count,
      individual_cigarette_butts_mass_kg = r.individual_cigarette_butts_mass_kg,
      individual_cigarette_butts_condition = r.individual_cigarette_butts_condition,
      individual_cigarette_butts_provenance = r.individual_cigarette_butts_provenance,
      individual_cigarette_butts_conversion_version = r.individual_cigarette_butts_conversion_version,
      individual_cigarette_butts_lots = r.individual_cigarette_butts_lots
  from jsonb_to_recordset(p_backup->'tables'->'action_participants') as r(
    id uuid,
    individual_cigarette_butts_count integer,
    individual_cigarette_butts_mass_kg numeric,
    individual_cigarette_butts_condition text,
    individual_cigarette_butts_provenance text,
    individual_cigarette_butts_conversion_version text,
    individual_cigarette_butts_lots jsonb
  )
  where ap.id = r.id;

  return v_base;
end;
$$;

revoke all on function public.restore_action_backup_with_individual_butts_lots(jsonb) from public, anon, authenticated;
grant execute on function public.restore_action_backup_with_individual_butts_lots(jsonb) to service_role;
