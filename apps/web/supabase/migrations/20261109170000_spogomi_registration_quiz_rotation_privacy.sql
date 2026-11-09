-- SPOGOMI quiz rotation privacy repair.
--
-- PURPOSE: keep a stable server-side option permutation without making the
-- correct/incorrect association observable through public labels.
-- CALLER: service_role through the existing definition and submission RPCs.
-- SECURITY: the rotation position is independent of option labels and the
-- correct option association; the public projection still strips the answer.
-- VERSIONING: the existing definition RPC continues to derive quizVersion from
-- the rotated server definition, so GET/POST and proof invalidation remain aligned.
-- MIGRATION: forward-only; no additional storage is required.

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
    -- Never include either label in this seed. A client can know the public
    -- labels, but cannot test both hidden correction associations anymore.
    v_seed := md5(concat_ws(':', p_event_id::text, p_division_id::text, v_question ->> 'id'));
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

revoke all on function public.spogomi_registration_quiz_rotate_options(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_registration_quiz_rotate_options(uuid, uuid, jsonb) to service_role;
