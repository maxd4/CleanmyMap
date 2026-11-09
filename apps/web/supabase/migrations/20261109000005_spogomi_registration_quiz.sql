-- SPOGOMI: server-verified educational quiz required before a new
-- CleanMyMap self-service sport registration.
--
-- The quiz is generated from the published event, division-owned regulation,
-- field-operation schedule, official route and verified registration policy.
-- No Japanese or ARTEMA generality is used as a fallback for an edition.

create table public.spogomi_registration_quiz_proofs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_id uuid not null,
  clerk_id text not null check (length(btrim(clerk_id)) > 0),
  quiz_version text not null check (length(btrim(quiz_version)) > 0),
  score integer not null check (score between 0 and 100),
  critical_correct integer not null check (critical_correct >= 0),
  critical_total integer not null check (critical_total >= 0),
  other_correct integer not null check (other_correct >= 0),
  other_total integer not null check (other_total >= 0),
  passed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, division_id, clerk_id, quiz_version),
  foreign key (division_id, event_id)
    references public.spogomi_divisions(id, event_id)
    on delete cascade
);

create index spogomi_registration_quiz_proofs_lookup_idx
  on public.spogomi_registration_quiz_proofs(event_id, division_id, clerk_id, passed_at desc);

alter table public.spogomi_registration_quiz_proofs enable row level security;
revoke all on table public.spogomi_registration_quiz_proofs from public, anon, authenticated;
grant all on table public.spogomi_registration_quiz_proofs to service_role;
create policy spogomi_registration_quiz_proofs_service_only
  on public.spogomi_registration_quiz_proofs for all to service_role
  using (true) with check (true);

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
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_operation public.spogomi_field_operations%rowtype;
  v_route record;
  v_policy jsonb;
  v_readiness jsonb;
  v_missing jsonb := '[]'::jsonb;
  v_questions jsonb;
  v_quiz_version text;
  v_categories_summary text;
  v_penalties_summary text;
  v_scoring_summary text;
  v_schedule_summary text;
  v_eligibility_summary text;
  v_route_summary text;
  v_safety text;
  v_minor_information text;
  v_assistance_summary text;
  v_source_reference text;
  v_available boolean := false;
  v_division_ready boolean := false;
  v_minors_applicable boolean;
begin
  select * into v_event
    from public.spogomi_events
   where id = p_event_id;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then
    raise exception using errcode = 'P0002', message = 'spogomi_registration_quiz_unavailable';
  end if;

  select * into v_division
    from public.spogomi_divisions
   where id = p_division_id and event_id = p_event_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_registration_quiz_unavailable';
  end if;

  v_readiness := public.spogomi_registration_readiness(p_event_id);
  select coalesce(jsonb_agg(item), '[]'::jsonb)
    into v_missing
    from jsonb_array_elements(coalesce(v_readiness -> 'editionItems', '[]'::jsonb)) as edition(item)
   where item ->> 'status' <> 'complete';
  select coalesce((division_item ->> 'ready')::boolean, false)
    into v_division_ready
    from jsonb_array_elements(coalesce(v_readiness -> 'divisions', '[]'::jsonb)) as divisions(division_item)
   where division_item ->> 'divisionId' = p_division_id::text;
  v_division_ready := coalesce(v_division_ready, false);
  v_missing := v_missing || coalesce((
    select jsonb_agg(item)
      from jsonb_array_elements(coalesce((
        select division_item -> 'items'
          from jsonb_array_elements(coalesce(v_readiness -> 'divisions', '[]'::jsonb)) as divisions(division_item)
         where division_item ->> 'divisionId' = p_division_id::text
         limit 1
      ), '[]'::jsonb)) as division_items(item)
     where item ->> 'status' <> 'complete'
  ), '[]'::jsonb);

  -- Keep the same precedence as the readiness and admission owners: the
  -- edition supplies defaults and a division may refine them.
  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb)
    || coalesce(v_division.regulation_config -> 'registrationPolicy', '{}'::jsonb);
  v_safety := btrim(coalesce(v_policy ->> 'safetyInstructions', ''));
  v_minor_information := btrim(coalesce(v_policy ->> 'minorInformation', ''));
  v_minors_applicable := case
    when jsonb_typeof(v_policy -> 'minorsApplicable') = 'boolean' then (v_policy ->> 'minorsApplicable')::boolean
    else null
  end;
  v_source_reference := coalesce(v_division.regulation_source_reference, v_event.regulation_source_reference);

  select * into v_operation
    from public.spogomi_field_operations
   where event_id = p_event_id and division_id = p_division_id;
  select file_name, point_count, reference_distance_km, inferred_topology
    into v_route
    from public.spogomi_event_routes
   where event_id = p_event_id
   order by updated_at desc, id desc
   limit 1;

  select coalesce(string_agg(format('%s (%s, %s, coefficient %s)', label, measurement_kind, unit, coalesce(coefficient::text, 'non applicable')), '; ' order by display_order, id), 'Catégories non communiquées')
    into v_categories_summary
    from public.spogomi_category_rules
   where event_id = p_event_id
     and division_id = p_division_id
     and regulation_version = v_division.regulation_version;
  select coalesce(string_agg(format('%s (%s points)', item ->> 'label', item ->> 'points'), '; '), 'Aucune pénalité communiquée')
    into v_penalties_summary
    from jsonb_array_elements(coalesce(v_division.regulation_config -> 'penalties', '[]'::jsonb)) as penalties(item);
  v_scoring_summary := format('Catégories : %s. Barèmes et pénalités : %s.', v_categories_summary, v_penalties_summary);

  if v_operation.id is not null then
    v_schedule_summary := format(
      'Début %s (%s), fin de collecte %s, tri jusqu’à %s, pesée de %s à %s.',
      to_char(v_operation.official_start_at at time zone v_operation.timezone_name, 'DD/MM/YYYY HH24:MI'),
      v_operation.timezone_name,
      coalesce(to_char(v_operation.collection_limit_at at time zone v_operation.timezone_name, 'DD/MM/YYYY HH24:MI'), 'non communiqué'),
      coalesce(to_char(v_operation.sorting_limit_at at time zone v_operation.timezone_name, 'DD/MM/YYYY HH24:MI'), 'non communiqué'),
      coalesce(to_char(v_operation.weighing_start_at at time zone v_operation.timezone_name, 'DD/MM/YYYY HH24:MI'), 'non communiqué'),
      coalesce(to_char(v_operation.weighing_end_at at time zone v_operation.timezone_name, 'DD/MM/YYYY HH24:MI'), 'non communiqué')
    );
  else
    v_schedule_summary := 'Horaires officiels non communiqués.';
  end if;

  v_eligibility_summary := format(
    'Version %s. Toutes les catégories requises : %s. Participants présents minimum : %s. Mineurs : %s%s',
    v_division.regulation_version,
    case when jsonb_typeof(v_division.regulation_config #> '{eligibility,requiresAllCategories}') = 'boolean' and (v_division.regulation_config #>> '{eligibility,requiresAllCategories}')::boolean then 'oui' else 'non' end,
    coalesce(v_division.regulation_config #>> '{eligibility,minimumPresentParticipants}', 'non communiqué'),
    case when v_minors_applicable is true then 'applicables' when v_minors_applicable is false then 'non applicables' else 'non vérifiés' end,
    case when v_minors_applicable is true then format('. Informations mineurs : %s.', coalesce(nullif(v_minor_information, ''), 'non communiquées')) else '' end
  );
  v_route_summary := case
    when v_route.file_name is not null then format('Parcours officiel CleanMyMap : %s, %s points, %s km, topologie %s.', v_route.file_name, v_route.point_count, v_route.reference_distance_km, v_route.inferred_topology)
    else 'Parcours officiel CleanMyMap non communiqué.'
  end;
  v_assistance_summary := format('Contact : %s. Assistance : %s.', coalesce(nullif(btrim(v_policy ->> 'organizationContact'), ''), 'non communiqué'), coalesce(nullif(btrim(v_policy ->> 'assistanceProcedure'), ''), 'non communiquée'));

  v_questions := jsonb_build_array(
    jsonb_build_object(
      'id', 'schedule', 'prompt', 'Quel déroulement et quels horaires officiels devez-vous respecter ?', 'critical', true,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'official', 'label', v_schedule_summary),
        jsonb_build_object('id', 'personal', 'label', 'Je peux choisir librement mes horaires et ignorer les limites de collecte, de tri ou de pesée.')
      ), 'correctOptionId', 'official',
      'explanation', 'Les horaires affichés sont ceux de la division et de son fuseau officiel ; les limites de collecte, de tri et de pesée font partie du déroulement applicable.'
    ),
    jsonb_build_object(
      'id', 'safety', 'prompt', 'Quelle consigne officielle devez-vous suivre pour la sécurité, les déplacements et les déchets interdits ?', 'critical', true,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'official', 'label', v_safety),
        jsonb_build_object('id', 'unsafe', 'label', 'Quitter le périmètre, traverser sans vérifier et ramasser tout déchet même s’il est interdit ou dangereux.')
      ), 'correctOptionId', 'official',
      'explanation', 'Les consignes vérifiées de cette édition priment. Ne quittez pas le périmètre annoncé et ne collectez jamais un déchet interdit ou dangereux.'
    ),
    jsonb_build_object(
      'id', 'scoring', 'prompt', 'Comment sont encadrés le tri, la pesée, les catégories et les points ?', 'critical', false,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'official', 'label', v_scoring_summary),
        jsonb_build_object('id', 'free_choice', 'label', 'Une seule catégorie et une unité libre suffisent ; les barèmes peuvent être remplacés par une estimation personnelle.')
      ), 'correctOptionId', 'official',
      'explanation', 'Les catégories, unités, coefficients et pénalités sont ceux de la version de règlement affichée pour cette division.'
    ),
    jsonb_build_object(
      'id', 'regulation', 'prompt', 'Quelles règles réglementaires et conditions particulières s’appliquent à votre division ?', 'critical', true,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'official', 'label', v_eligibility_summary),
        jsonb_build_object('id', 'generic', 'label', 'Les règles générales trouvées ailleurs remplacent automatiquement la version de règlement de cette édition.')
      ), 'correctOptionId', 'official',
      'explanation', 'La version et les conditions de la division sont les seules références applicables à cette demande. Les informations mineurs sont obligatoires lorsqu’elles sont applicables.'
    ),
    jsonb_build_object(
      'id', 'route', 'prompt', 'Comment utiliser le parcours SPOGOMI sur CleanMyMap ?', 'critical', false,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'official', 'label', v_route_summary),
        jsonb_build_object('id', 'invented', 'label', 'Créer un parcours personnel qui ignore le parcours officiel et le périmètre communiqué.')
      ), 'correctOptionId', 'official',
      'explanation', 'Le parcours affiché sur la fiche CleanMyMap est une référence de l’édition ; il ne doit pas être remplacé par un parcours inventé.'
    ),
    jsonb_build_object(
      'id', 'assistance', 'prompt', 'Où trouver le contact et la procédure d’assistance de cette édition ?', 'critical', true,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'official', 'label', v_assistance_summary),
        jsonb_build_object('id', 'none', 'label', 'Il n’existe pas de contact vérifié ; publier une information personnelle trouvée dans un autre événement.')
      ), 'correctOptionId', 'official',
      'explanation', 'Utilisez uniquement le contact et la procédure communiqués et vérifiés pour cette édition.'
    )
  );
  v_quiz_version := md5(p_event_id::text || ':' || p_division_id::text || ':' || v_questions::text);
  v_available := coalesce((v_readiness ->> 'ready')::boolean, false) and v_division_ready and jsonb_array_length(v_missing) = 0;

  return jsonb_build_object(
    'eventId', p_event_id,
    'divisionId', p_division_id,
    'regulationVersion', v_division.regulation_version,
    'quizVersion', v_quiz_version,
    'available', v_available,
    'sourceReference', v_source_reference,
    'missing', v_missing,
    'questions', case when v_available then v_questions else '[]'::jsonb end
  );
end;
$$;

create or replace function public.spogomi_registration_quiz(
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
  v_definition := public.spogomi_registration_quiz_definition(p_event_id, p_division_id);
  select coalesce(jsonb_agg(question - 'correctOptionId' - 'explanation'), '[]'::jsonb)
    into v_questions
    from jsonb_array_elements(coalesce(v_definition -> 'questions', '[]'::jsonb)) as questions(question);
  return jsonb_set(v_definition, '{questions}', v_questions, true);
end;
$$;

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

  for v_question in select value from jsonb_array_elements(v_definition -> 'questions') as questions(value) loop
    v_answer := v_answers ->> (v_question ->> 'id');
    v_correct_option := v_question ->> 'correctOptionId';
    if (v_question ->> 'critical')::boolean then
      v_critical_total := v_critical_total + 1;
    else
      v_other_total := v_other_total + 1;
    end if;
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
      event_id, division_id, clerk_id, quiz_version, score,
      critical_correct, critical_total, other_correct, other_total
    ) values (
      p_event_id, p_division_id, btrim(p_user_id), v_quiz_version,
      round(v_correct * 100.0 / nullif(v_total, 0))::integer,
      v_critical_correct, v_critical_total, v_other_correct, v_other_total
    ) on conflict (event_id, division_id, clerk_id, quiz_version) do update
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

revoke all on function public.spogomi_registration_quiz_definition(uuid, uuid) from public, anon, authenticated;
revoke all on function public.spogomi_registration_quiz(uuid, uuid) from public, anon, authenticated;
revoke all on function public.spogomi_submit_registration_quiz(uuid, uuid, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_registration_quiz_definition(uuid, uuid) to service_role;
grant execute on function public.spogomi_registration_quiz(uuid, uuid) to service_role;
grant execute on function public.spogomi_submit_registration_quiz(uuid, uuid, text, text, jsonb, text, text) to service_role;

comment on table public.spogomi_registration_quiz_proofs is
  'Minimal server proof that one Clerk account passed the effective event/division SPOGOMI registration quiz version. Existing admissions are never invalidated when a later version is generated.';
