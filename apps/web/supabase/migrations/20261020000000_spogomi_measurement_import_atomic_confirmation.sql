-- SPOGOMI measurement imports are confirmed as one transactional unit.
-- The reservation keeps the exact selection that was committed so a replay
-- cannot silently apply a different subset or create another revision.

alter table public.spogomi_measurement_imports
  add column if not exists confirmed_row_numbers integer[];

alter table public.spogomi_measurement_imports
  drop constraint if exists spogomi_measurement_imports_event_id_division_id_content_sha256_key,
  add constraint spogomi_measurement_imports_confirmed_rows_nonempty_check
    check (confirmed_row_numbers is null or cardinality(confirmed_row_numbers) > 0);

-- One workbook can legitimately contain more than one sheet or mapping. The
-- reservation identity is therefore the content plus the selected sheet and
-- mapping, not the raw workbook hash alone.
alter table public.spogomi_measurement_imports
  add constraint spogomi_measurement_imports_content_sheet_mapping_key
  unique (event_id, division_id, content_sha256, sheet_name, column_mapping);

create or replace function public.spogomi_confirm_measurement_import(
  p_event_id uuid,
  p_division_id uuid,
  p_import_id uuid,
  p_selected_row_numbers integer[],
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_import public.spogomi_measurement_imports%rowtype;
  v_row record;
  v_confirmed_rows integer[];
  v_requested_rows integer[];
  v_row_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SPOGOMI measurement import confirmation is server-only';
  end if;
  if length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'SPOGOMI measurement import actor is required';
  end if;
  if p_selected_row_numbers is not null and cardinality(p_selected_row_numbers) = 0 then
    raise exception using errcode = '22023', message = 'SPOGOMI measurement import selection cannot be empty';
  end if;
  if p_selected_row_numbers is not null
     and cardinality(p_selected_row_numbers) <> (
       select count(distinct row_number)::integer
       from unnest(p_selected_row_numbers) as requested(row_number)
     ) then
    raise exception using errcode = '22023', message = 'SPOGOMI measurement import selection contains duplicate rows';
  end if;

  -- This row lock is the serialization boundary for two confirmations of the
  -- same reservation. The second caller observes the committed status.
  select * into v_import
    from public.spogomi_measurement_imports
   where id = p_import_id
     and event_id = p_event_id
     and division_id = p_division_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Import Excel introuvable.';
  end if;

  if v_import.status = 'confirmed' then
    if p_selected_row_numbers is not null then
      select array_agg(row_number order by row_number)
        into v_requested_rows
        from unnest(p_selected_row_numbers) as requested(row_number);
      if v_import.confirmed_row_numbers is null
         or v_requested_rows <> v_import.confirmed_row_numbers then
        raise exception using errcode = '40001', message = 'SPOGOMI confirmed import selection is immutable';
      end if;
    end if;
    return jsonb_build_object('imported', 0, 'alreadyConfirmed', true);
  end if;
  if v_import.status <> 'previewed' then
    raise exception using errcode = '40901', message = 'SPOGOMI measurement import is not confirmable';
  end if;

  select count(*)::integer
    into v_row_count
    from public.spogomi_measurement_import_rows r
   where r.import_id = p_import_id
     and r.event_id = p_event_id
     and r.division_id = p_division_id
     and r.selected
     and (p_selected_row_numbers is null or r.row_number = any(p_selected_row_numbers));
  if v_row_count = 0 then
    raise exception using errcode = '22023', message = 'Aucune ligne admissible sélectionnée.';
  end if;
  if p_selected_row_numbers is not null
     and v_row_count <> cardinality(p_selected_row_numbers) then
    raise exception using errcode = '22023', message = 'La sélection contient une ligne absente ou non admissible';
  end if;

  if exists (
    select 1
      from public.spogomi_measurement_import_rows r
      left join public.spogomi_teams t
        on t.id = r.team_id and t.event_id = r.event_id and t.division_id = r.division_id
      left join public.spogomi_category_rules c
        on c.id = r.category_rule_id and c.event_id = r.event_id and c.division_id = r.division_id
     where r.import_id = p_import_id
       and r.event_id = p_event_id
       and r.division_id = p_division_id
       and r.selected
       and (p_selected_row_numbers is null or r.row_number = any(p_selected_row_numbers))
       and (
         r.team_id is null
         or r.category_rule_id is null
         or r.measurement_kind is null
         or length(btrim(coalesce(r.unit, ''))) = 0
         or length(btrim(coalesce(r.measurement_method, ''))) = 0
         or length(btrim(coalesce(r.provenance, ''))) = 0
         or jsonb_typeof(r.diagnostics) <> 'array'
         or jsonb_array_length(r.diagnostics) <> 0
         or num_nonnulls(r.quantity, r.mass_grams, r.object_count) <> 1
         or (r.measurement_kind = 'mass' and (r.mass_grams is null or r.quantity is not null or r.object_count is not null))
         or (r.measurement_kind = 'count' and (r.object_count is null or r.quantity is not null or r.mass_grams is not null))
         or (r.measurement_kind = 'volume' and (r.quantity is null or r.mass_grams is not null or r.object_count is not null))
         or coalesce(r.quantity, r.mass_grams, r.object_count) < 0
         or (r.measurement_kind = 'count' and r.object_count <> trunc(r.object_count))
         or t.id is null
         or c.id is null
         or c.measurement_kind <> r.measurement_kind
         or c.unit <> r.unit
       )
  ) then
    raise exception using errcode = '23514', message = 'SPOGOMI measurement import contains an invalid selected row';
  end if;

  if exists (
    select 1
      from public.spogomi_measurement_import_rows r
     where r.import_id = p_import_id
       and r.event_id = p_event_id
       and r.division_id = p_division_id
       and r.selected
       and (p_selected_row_numbers is null or r.row_number = any(p_selected_row_numbers))
     group by r.team_id, r.category_rule_id
    having count(*) > 1
  ) then
    raise exception using errcode = '23514', message = 'SPOGOMI measurement import contains conflicting duplicate rows';
  end if;

  select array_agg(r.row_number order by r.row_number)
    into v_confirmed_rows
    from public.spogomi_measurement_import_rows r
   where r.import_id = p_import_id
     and r.event_id = p_event_id
     and r.division_id = p_division_id
     and r.selected
     and (p_selected_row_numbers is null or r.row_number = any(p_selected_row_numbers));

  -- Every call below is part of this function's transaction. A failure in any
  -- row rolls back all revisions, history entries and the confirmation marker.
  for v_row in
    select r.*
      from public.spogomi_measurement_import_rows r
     where r.import_id = p_import_id
       and r.event_id = p_event_id
       and r.division_id = p_division_id
       and r.selected
       and (p_selected_row_numbers is null or r.row_number = any(p_selected_row_numbers))
     order by r.row_number
  loop
    perform public.spogomi_upsert_operational_measurement(
      p_event_id,
      p_division_id,
      v_row.team_id,
      v_row.category_rule_id,
      v_row.measurement_kind,
      v_row.unit,
      v_row.quantity,
      v_row.mass_grams,
      v_row.object_count,
      v_row.measurement_method,
      v_row.provenance,
      'import_excel',
      format('import:%s:row:%s', p_import_id, v_row.row_number),
      p_actor_clerk_id,
      'Import Excel confirmé après aperçu'
    );
  end loop;

  update public.spogomi_measurement_imports
     set status = 'confirmed',
         confirmed_at = now(),
         confirmed_row_numbers = v_confirmed_rows
   where id = p_import_id
     and status = 'previewed';
  if not found then
    raise exception using errcode = '40001', message = 'SPOGOMI measurement import confirmation lost its reservation';
  end if;
  return jsonb_build_object('imported', v_row_count, 'alreadyConfirmed', false);
end;
$$;

revoke all on function public.spogomi_confirm_measurement_import(uuid, uuid, uuid, integer[], text) from public, anon, authenticated;
grant execute on function public.spogomi_confirm_measurement_import(uuid, uuid, uuid, integer[], text) to service_role;
