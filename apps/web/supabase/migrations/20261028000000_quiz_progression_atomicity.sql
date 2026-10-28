-- Keep quiz counter advancement and threshold event persistence in one
-- transaction. The application still owns milestone definitions; this RPC
-- only serializes the observed transition and persists supplied candidates.

create or replace function public.record_quiz_progression(
  p_user_id text,
  p_question_type text,
  p_question_types text[],
  p_events jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous_count integer;
  v_correct_count integer;
  v_previous_balanced_count integer;
  v_balanced_count integer;
  v_event record;
  v_inserted_events jsonb := '[]'::jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if nullif(btrim(p_user_id), '') is null
     or nullif(btrim(p_question_type), '') is null
     or coalesce(array_length(p_question_types, 1), 0) = 0
     or not (p_question_type = any(p_question_types)) then
    raise exception 'invalid quiz progression identity';
  end if;

  -- The advisory lock covers the counter and the balanced minimum for every
  -- concurrent answer from this user, including different question types.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

  select greatest(0, q.correct_count)
    into v_previous_count
    from public.quiz_type_progress q
   where q.user_id = p_user_id
     and q.question_type = p_question_type
   for update;

  if not found then
    insert into public.quiz_type_progress (user_id, question_type, correct_count)
    values (p_user_id, p_question_type, 0)
    on conflict (user_id, question_type) do nothing;

    select greatest(0, q.correct_count)
      into v_previous_count
      from public.quiz_type_progress q
     where q.user_id = p_user_id
       and q.question_type = p_question_type
     for update;
  end if;

  select coalesce(min(greatest(0, q.correct_count)), 0)
    into v_previous_balanced_count
    from unnest(p_question_types) as required(question_type)
    left join public.quiz_type_progress q
      on q.user_id = p_user_id
     and q.question_type = required.question_type;

  v_correct_count := v_previous_count + 1;
  update public.quiz_type_progress
     set correct_count = v_correct_count
   where user_id = p_user_id
     and question_type = p_question_type;

  select coalesce(min(greatest(0, q.correct_count)), 0)
    into v_balanced_count
    from unnest(p_question_types) as required(question_type)
    left join public.quiz_type_progress q
      on q.user_id = p_user_id
     and q.question_type = required.question_type;

  for v_event in
    select *
      from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as event(
        metric text,
        threshold integer,
        user_id text,
        event_type text,
        source_table text,
        source_id text,
        status_phase text,
        weight numeric,
        xp_base numeric,
        xp_awarded numeric,
        occurred_on date,
        metadata jsonb
      )
  loop
    if v_event.user_id is distinct from p_user_id
       or v_event.metric not in ('type', 'balance')
       or v_event.threshold is null
       or v_event.threshold < 0
       or v_event.status_phase is distinct from 'validated'
       or (v_event.metric = 'type' and (
         v_event.event_type is distinct from 'quiz_question_type_milestone'
         or v_event.source_table is distinct from 'quiz_type_progress'
       ))
       or (v_event.metric = 'balance' and (
         v_event.event_type is distinct from 'quiz_question_type_balance_milestone'
         or v_event.source_table is distinct from 'quiz_type_balance_progress'
       )) then
      raise exception 'invalid quiz progression event candidate';
    end if;

    if (v_event.metric = 'type' and
        (v_previous_count >= v_event.threshold or v_correct_count < v_event.threshold))
       or (v_event.metric = 'balance' and
        (v_previous_balanced_count >= v_event.threshold or v_balanced_count < v_event.threshold)) then
      continue;
    end if;

    insert into public.progression_events (
      user_id,
      event_type,
      source_table,
      source_id,
      status_phase,
      weight,
      xp_base,
      xp_awarded,
      occurred_on,
      metadata
    ) values (
      p_user_id,
      v_event.event_type,
      v_event.source_table,
      v_event.source_id,
      v_event.status_phase,
      v_event.weight,
      v_event.xp_base,
      v_event.xp_awarded,
      v_event.occurred_on,
      coalesce(v_event.metadata, '{}'::jsonb)
    ) on conflict (user_id, event_type, source_table, source_id, status_phase) do nothing;

    if found then
      v_inserted_events := v_inserted_events || jsonb_build_array(
        jsonb_build_object(
          'source_id', v_event.source_id,
          'event_type', v_event.event_type,
          'source_table', v_event.source_table,
          'status_phase', v_event.status_phase
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'previous_count', v_previous_count,
    'correct_count', v_correct_count,
    'previous_balanced_count', v_previous_balanced_count,
    'balanced_count', v_balanced_count,
    'inserted_events', v_inserted_events
  );
end;
$$;

revoke all on function public.record_quiz_progression(text, text, text[], jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.record_quiz_progression(text, text, text[], jsonb)
  to service_role;
