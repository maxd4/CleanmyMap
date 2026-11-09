-- SPOGOMI registration quiz: resolve pgcrypto HMAC from its installed schema.
--
-- PURPOSE: repair the persisted-secret option rotation after the deployed
-- pgcrypto installation exposed hmac in extensions rather than public.
-- CALLER: service_role through the existing quiz definition/submission RPCs.
-- AUTHORIZATION_BOUNDARY: the persistent secret and this helper remain
-- unavailable to public, anon and authenticated.
-- IDEMPOTENCY: CREATE OR REPLACE preserves the existing secret row and key.
-- ATOMICITY: function replacement and ACL restoration are transactional DDL.
-- FAILURE_BEHAVIOR: a missing key still fails closed in the existing helper.
-- SEARCH_PATH: pg_catalog, public; HMAC is explicitly resolved in extensions.
-- GRANTS: only service_role can read the key table or execute the helper.

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
  v_rotated jsonb := '[]'::jsonb;
  v_rotation_secret bytea;
begin
  select secret
    into v_rotation_secret
    from public.spogomi_registration_quiz_rotation_secrets
   where secret_name = 'default';
  if v_rotation_secret is null then
    raise exception using errcode = 'P0001', message = 'spogomi_registration_quiz_rotation_unavailable';
  end if;

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
    v_correct_first := get_byte(
      extensions.hmac(
        convert_to(concat_ws(':', p_event_id::text, p_division_id::text, v_question ->> 'id'), 'UTF8'),
        v_rotation_secret,
        'sha256'
      ),
      0
    ) % 2 = 0;
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
