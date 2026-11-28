-- Align typed participant persistence with the application contract: each
-- category is independently nullable, while known values remain bounded and
-- coherent with the declared total.
alter table public.actions
  drop constraint if exists actions_volunteer_composition_pair_check;

alter table public.actions
  add constraint actions_volunteer_composition_pair_check
  check (
    (children_count is null or children_count between 0 and 500)
    and (adult_count is null or adult_count between 0 and 500)
    and (retired_count is null or retired_count between 0 and 500)
    and (children_count is null or volunteers_count is null or children_count <= volunteers_count)
    and (adult_count is null or volunteers_count is null or adult_count <= volunteers_count)
    and (retired_count is null or volunteers_count is null or retired_count <= volunteers_count)
    and (
      (children_count is null and adult_count is null and retired_count is null)
      or volunteers_count is not null
    )
    and coalesce(children_count, 0) + coalesce(adult_count, 0) + coalesce(retired_count, 0)
      <= volunteers_count
    and (
      children_count is null or adult_count is null or retired_count is null
      or children_count + adult_count + retired_count = volunteers_count
    )
  );

do $migration$
declare
  function_definition text;
  old_guard text := $old$
  if (p_action->>'children_count' is null)
     is distinct from (p_action->>'adult_count' is null)
     or (p_action->>'adult_count' is null)
     is distinct from (p_action->>'retired_count' is null) then
    raise exception 'action_creation_volunteer_composition_incomplete' using errcode = '22023';
  end if;
  if p_action->>'children_count' is not null and (
    p_action->>'children_count' !~ '^[0-9]+$'
    or p_action->>'adult_count' !~ '^[0-9]+$'
    or p_action->>'retired_count' !~ '^[0-9]+$'
    or (p_action->>'children_count')::integer not between 0 and 500
    or (p_action->>'adult_count')::integer not between 0 and 500
    or (p_action->>'retired_count')::integer not between 0 and 500
    or p_action->>'volunteers_count' is null
    or (p_action->>'children_count')::integer
       + (p_action->>'adult_count')::integer
       + (p_action->>'retired_count')::integer
       <> (p_action->>'volunteers_count')::integer
  ) then
    raise exception 'action_creation_volunteer_composition_invalid' using errcode = '22023';
  end if;
$old$;
  new_guard text := $new$
  if p_action->>'volunteers_count' is null
     or p_action->>'volunteers_count' !~ '^[0-9]+$'
     or (p_action->>'volunteers_count')::integer not between 1 and 500 then
    raise exception 'action_creation_volunteer_total_invalid' using errcode = '22023';
  end if;
  if (p_action->>'children_count' is not null and p_action->>'children_count' !~ '^[0-9]+$')
     or (p_action->>'adult_count' is not null and p_action->>'adult_count' !~ '^[0-9]+$')
     or (p_action->>'retired_count' is not null and p_action->>'retired_count' !~ '^[0-9]+$') then
    raise exception 'action_creation_volunteer_composition_invalid' using errcode = '22023';
  end if;
  if coalesce((p_action->>'children_count')::integer, 0)
     + coalesce((p_action->>'adult_count')::integer, 0)
     + coalesce((p_action->>'retired_count')::integer, 0)
     > (p_action->>'volunteers_count')::integer then
    raise exception 'action_creation_volunteer_composition_invalid' using errcode = '22023';
  end if;
  if (p_action->>'children_count' is not null and (p_action->>'children_count')::integer not between 0 and 500)
     or (p_action->>'adult_count' is not null and (p_action->>'adult_count')::integer not between 0 and 500)
     or (p_action->>'retired_count' is not null and (p_action->>'retired_count')::integer not between 0 and 500) then
    raise exception 'action_creation_volunteer_composition_invalid' using errcode = '22023';
  end if;
$new$;
begin
  select pg_get_functiondef('public.create_action_with_relations_legacy(jsonb,jsonb,jsonb,text,text,text,boolean)'::regprocedure)
  into function_definition;
  if position(old_guard in function_definition) = 0 then
    raise exception 'expected volunteer composition guard not found in create_action_with_relations_legacy';
  end if;
  function_definition := replace(function_definition, old_guard, new_guard);
  execute function_definition;
end;
$migration$;
