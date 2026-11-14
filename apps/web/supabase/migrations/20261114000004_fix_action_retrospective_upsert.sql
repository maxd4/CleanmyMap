-- PURPOSE: disambiguate the retrospective draft upsert in PL/pgSQL.
-- CALLER: the existing service-role retrospective save RPC.
-- AUTHORIZATION_BOUNDARY: preserve the existing service_role-only execution
--   contract and actor/action-organizer checks.
-- ATOMICITY: preserve the single-row upsert and returned draft state.
-- FORWARD_ONLY: replace the already-published function without rewriting its
--   historical migration.

create or replace function public.save_action_retrospective(
  p_action_id uuid,
  p_actor_user_id text,
  p_thanks_message text default null,
  p_worked_well text default null,
  p_blockers text default null,
  p_improve_next_time text default null
)
returns table (
  action_id uuid,
  thanks_message text,
  worked_well text,
  blockers text,
  improve_next_time text,
  published_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_author text := nullif(btrim(p_actor_user_id), '');
  v_thanks text := nullif(btrim(regexp_replace(coalesce(p_thanks_message, ''), '[[:space:]]+', ' ', 'g')), '');
  v_worked text := nullif(btrim(regexp_replace(coalesce(p_worked_well, ''), '[[:space:]]+', ' ', 'g')), '');
  v_blockers text := nullif(btrim(regexp_replace(coalesce(p_blockers, ''), '[[:space:]]+', ' ', 'g')), '');
  v_improve text := nullif(btrim(regexp_replace(coalesce(p_improve_next_time, ''), '[[:space:]]+', ' ', 'g')), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_action_id is null or v_author is null then
    raise exception 'Invalid retrospective actor or action';
  end if;
  if char_length(v_thanks) > 500
     or char_length(v_worked) > 1000
     or char_length(v_blockers) > 1000
     or char_length(v_improve) > 1000 then
    raise exception 'Retrospective field exceeds its maximum length';
  end if;

  select * into v_action
  from public.actions
  where id = p_action_id
  for update;
  if not found then
    raise exception 'Action not found';
  end if;
  if v_action.action_phase <> 'post_action_complete'
     or v_action.status in ('rejected', 'cancelled') then
    raise exception 'Retrospective requires a finalized action';
  end if;
  if v_action.created_by_clerk_id <> v_author
     and not exists (
       select 1
       from public.action_organizers ao
       where ao.action_id = p_action_id
         and ao.organizer_clerk_id = v_author
     ) then
    raise exception 'Forbidden';
  end if;

  insert into public.action_retrospectives (
    action_id,
    authored_by_clerk_id,
    thanks_message,
    worked_well,
    blockers,
    improve_next_time
  ) values (
    p_action_id,
    v_author,
    v_thanks,
    v_worked,
    v_blockers,
    v_improve
  )
  on conflict on constraint action_retrospectives_pkey do update set
    thanks_message = excluded.thanks_message,
    worked_well = excluded.worked_well,
    blockers = excluded.blockers,
    improve_next_time = excluded.improve_next_time;

  return query
  select r.action_id, r.thanks_message, r.worked_well, r.blockers,
    r.improve_next_time, r.published_at, r.updated_at
  from public.action_retrospectives r
  where r.action_id = p_action_id;
end;
$$;
