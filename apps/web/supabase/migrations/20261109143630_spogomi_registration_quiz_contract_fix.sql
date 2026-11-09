-- SPOGOMI registration quiz contract repair after migration 20261109000007.
--
-- PURPOSE: restore version-aware idempotent quiz proof writes and remove the
-- fixed-first-option answer convention from the server definition.
-- CALLER: service_role through the existing quiz and admission RPCs.
-- AUTHORIZATION_BOUNDARY: client roles remain denied; no table or RLS grant is widened.
-- IDEMPOTENCY: one proof per event, division, account, quiz version and
-- registration contract revision; repeated successful submissions update it.
-- ATOMICITY: the proof write remains a single INSERT ... ON CONFLICT operation.
-- FAILURE_BEHAVIOR: stale versions and malformed submissions keep their existing errors.
-- SEARCH_PATH: pg_catalog, public.
-- GRANTS: only the existing service_role quiz RPCs and private server helpers.

alter function public.spogomi_registration_quiz_definition(uuid, uuid)
  rename to spogomi_registration_quiz_definition_legacy;
alter function public.spogomi_submit_registration_quiz(uuid, uuid, text, text, jsonb, text, text)
  rename to spogomi_submit_registration_quiz_legacy;

create or replace function public.spogomi_registration_quiz_rotate_options(
  p_event_id uuid,
  p_division_id uuid,
  p_questions jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_question jsonb;
  v_option jsonb;
  v_correct_label text;
  v_incorrect_label text;
  v_correct_first boolean;
  v_seed text;
  v_rotated jsonb := '[]'::jsonb;
begin
  for v_question in select value from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) as quiz_question(value) loop
    v_correct_label := null;
    v_incorrect_label := null;
    for v_option in select value from jsonb_array_elements(coalesce(v_question -> 'options', '[]'::jsonb)) as quiz_option(value) loop
      if v_option ->> 'id' = v_question ->> 'correctOptionId' then
        v_correct_label := v_option ->> 'label';
      else
        v_incorrect_label := v_option ->> 'label';
      end if;
    end loop;
    if v_correct_label is null or v_incorrect_label is null then
      raise exception using errcode = '22023', message = 'invalid_spogomi_registration_quiz_options';
    end if;
    v_seed := md5(concat_ws(':', p_event_id::text, p_division_id::text, v_question ->> 'id', v_correct_label, v_incorrect_label));
    v_correct_first := get_byte(decode(v_seed, 'hex'), 0) % 2 = 0;
    v_question := jsonb_set(v_question, '{options}', case when v_correct_first then
      jsonb_build_array(jsonb_build_object('id', 'choice_a', 'label', v_correct_label), jsonb_build_object('id', 'choice_b', 'label', v_incorrect_label))
      else jsonb_build_array(jsonb_build_object('id', 'choice_a', 'label', v_incorrect_label), jsonb_build_object('id', 'choice_b', 'label', v_correct_label)) end, true);
    v_question := jsonb_set(v_question, '{correctOptionId}', to_jsonb(case when v_correct_first then 'choice_a' else 'choice_b' end), true);
    v_rotated := v_rotated || jsonb_build_array(v_question);
  end loop;
  return v_rotated;
end;
$$;

revoke all on function public.spogomi_registration_quiz_definition_legacy(uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_registration_quiz_definition_legacy(uuid, uuid) to service_role;
revoke all on function public.spogomi_registration_quiz_rotate_options(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_registration_quiz_rotate_options(uuid, uuid, jsonb) to service_role;

create or replace function public.spogomi_registration_quiz_definition(
  p_event_id uuid,
  p_division_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_definition jsonb;
  v_questions jsonb;
begin
  v_definition := public.spogomi_registration_quiz_definition_legacy(p_event_id, p_division_id);
  v_questions := public.spogomi_registration_quiz_rotate_options(p_event_id, p_division_id, v_definition -> 'questions');
  return jsonb_set(
    jsonb_set(v_definition, '{questions}', v_questions, true),
    '{quizVersion}',
    to_jsonb(md5(coalesce(v_definition ->> 'quizVersion', '') || ':' || v_questions::text)),
    true
  );
end;
$$;

revoke all on function public.spogomi_registration_quiz_definition(uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_registration_quiz_definition(uuid, uuid) to service_role;

create or replace function public.spogomi_submit_registration_quiz(
  p_event_id uuid,
  p_division_id uuid,
  p_user_id text,
  p_quiz_version text,
  p_answers jsonb,
  p_experience text default null,
  p_experience_description text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_definition jsonb;
  v_question jsonb;
  v_answers jsonb := coalesce(p_answers, '{}'::jsonb);
  v_answer text;
  v_correct_option text;
  v_errors jsonb := '[]'::jsonb;
  v_proof_id uuid;
  v_quiz_version text;
  v_contract_revision bigint;
  v_critical_total integer := 0;
  v_critical_correct integer := 0;
  v_other_total integer := 0;
  v_other_correct integer := 0;
  v_total integer;
  v_correct integer;
  v_passed boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or length(btrim(coalesce(p_user_id, ''))) = 0
     or length(btrim(coalesce(p_quiz_version, ''))) = 0
     or jsonb_typeof(v_answers) <> 'object'
     or p_experience is not null and p_experience not in ('yes', 'no', 'prefer_not_to_say')
     or length(coalesce(p_experience_description, '')) > 2000 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_registration_quiz_submission';
  end if;

  v_definition := public.spogomi_registration_quiz_definition(p_event_id, p_division_id);
  if coalesce((v_definition ->> 'available')::boolean, false) = false then
    raise exception using errcode = '42501', message = 'spogomi_registration_quiz_unavailable';
  end if;
  v_quiz_version := v_definition ->> 'quizVersion';
  if p_quiz_version is distinct from v_quiz_version then
    raise exception using errcode = '40001', message = 'spogomi_registration_quiz_stale';
  end if;
  select registration_contract_revision into v_contract_revision from public.spogomi_events where id = p_event_id;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;

  for v_question in select value from jsonb_array_elements(v_definition -> 'questions') as questions(value) loop
    v_answer := v_answers ->> (v_question ->> 'id');
    v_correct_option := v_question ->> 'correctOptionId';
    if (v_question ->> 'critical')::boolean then v_critical_total := v_critical_total + 1; else v_other_total := v_other_total + 1; end if;
    if v_answer = v_correct_option then
      if (v_question ->> 'critical')::boolean then v_critical_correct := v_critical_correct + 1; else v_other_correct := v_other_correct + 1; end if;
    else
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('questionId', v_question ->> 'id', 'explanation', v_question ->> 'explanation'));
    end if;
  end loop;

  v_total := v_critical_total + v_other_total;
  v_correct := v_critical_correct + v_other_correct;
  v_passed := v_critical_correct = v_critical_total and (v_other_total = 0 or v_other_correct * 100 >= v_other_total * 80);
  if v_passed then
    insert into public.spogomi_registration_quiz_proofs (
      event_id, division_id, clerk_id, quiz_version, registration_contract_revision,
      score, critical_correct, critical_total, other_correct, other_total
    ) values (
      p_event_id, p_division_id, btrim(p_user_id), v_quiz_version, v_contract_revision,
      round(v_correct * 100.0 / nullif(v_total, 0))::integer,
      v_critical_correct, v_critical_total, v_other_correct, v_other_total
    ) on conflict (event_id, division_id, clerk_id, quiz_version, registration_contract_revision) do update
      set score = excluded.score,
          critical_correct = excluded.critical_correct,
          critical_total = excluded.critical_total,
          other_correct = excluded.other_correct,
          other_total = excluded.other_total,
          passed_at = now()
    returning id into v_proof_id;
  end if;

  return jsonb_build_object(
    'passed', v_passed,
    'quizVersion', v_quiz_version,
    'score', round(v_correct * 100.0 / nullif(v_total, 0))::integer,
    'totalQuestions', v_total,
    'criticalCorrect', v_critical_correct,
    'criticalTotal', v_critical_total,
    'otherCorrect', v_other_correct,
    'otherTotal', v_other_total,
    'errors', v_errors,
    'proofId', v_proof_id
  );
end;
$$;

revoke all on function public.spogomi_submit_registration_quiz_legacy(uuid, uuid, text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.spogomi_submit_registration_quiz(uuid, uuid, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_submit_registration_quiz(uuid, uuid, text, text, jsonb, text, text) to service_role;
