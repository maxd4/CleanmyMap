-- SPOGOMI referee qualification and capability hardening.
--
-- PURPOSE: make referee qualification server-evaluated, regulation-versioned,
-- format-bounded and safe under concurrent candidature/participant writes.
-- CALLER: service_role through the existing server routes and RPC wrappers.
-- AUTHORIZATION_BOUNDARY: quiz keys, proofs and capability mutations remain
-- service_role-only; historical reviewer rows are not rewritten.
-- IDEMPOTENCY: CREATE OR REPLACE preserves existing contracts; the secret row
-- uses ON CONFLICT DO NOTHING and therefore keeps one stable key.
-- ATOMICITY: each RPC locks the event/subject capability lane before checking
-- qualification and mutating application, reviewer and audit rows.
-- FAILURE_BEHAVIOR: stale, cross-format or incomplete qualification fails
-- closed; partial role revocation does not revoke the whole application.
-- SEARCH_PATH: pg_catalog, public; HMAC is explicitly resolved in extensions.
-- GRANTS: only service_role can execute the server functions.

create table if not exists public.spogomi_referee_quiz_rotation_secrets (
  secret_name text primary key check (secret_name = 'default'),
  secret bytea not null check (octet_length(secret) >= 32),
  created_at timestamptz not null default now()
);

alter table public.spogomi_referee_quiz_rotation_secrets enable row level security;
revoke all on table public.spogomi_referee_quiz_rotation_secrets from public, anon, authenticated;
grant select on table public.spogomi_referee_quiz_rotation_secrets to service_role;
insert into public.spogomi_referee_quiz_rotation_secrets(secret_name, secret)
values ('default', gen_random_bytes(32)) on conflict (secret_name) do nothing;

create or replace function public.spogomi_referee_quiz_rotate_options(
  p_event_id uuid, p_division_id uuid, p_questions jsonb
)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  v_question jsonb; v_option jsonb; v_correct_label text; v_incorrect_label text;
  v_correct_first boolean; v_secret bytea; v_rotated jsonb := '[]'::jsonb;
begin
  select secret into v_secret from public.spogomi_referee_quiz_rotation_secrets where secret_name = 'default';
  if v_secret is null then raise exception using errcode = 'P0001', message = 'spogomi_referee_quiz_rotation_unavailable'; end if;
  for v_question in select value from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) as q(value) loop
    v_correct_label := null; v_incorrect_label := null;
    for v_option in select value from jsonb_array_elements(coalesce(v_question -> 'options', '[]'::jsonb)) as o(value) loop
      if v_option ->> 'id' = v_question ->> 'correctOptionId' then v_correct_label := v_option ->> 'label'; else v_incorrect_label := v_option ->> 'label'; end if;
    end loop;
    if v_correct_label is null or v_incorrect_label is null then raise exception using errcode = '22023', message = 'invalid_spogomi_referee_quiz_options'; end if;
    v_correct_first := get_byte(extensions.hmac(convert_to(concat_ws(':', p_event_id::text, p_division_id::text, v_question ->> 'id'), 'UTF8'), v_secret, 'sha256'), 0) % 2 = 0;
    v_question := jsonb_set(v_question, '{options}', case when v_correct_first then
      jsonb_build_array(jsonb_build_object('id','choice_a','label',v_correct_label), jsonb_build_object('id','choice_b','label',v_incorrect_label))
      else jsonb_build_array(jsonb_build_object('id','choice_a','label',v_incorrect_label), jsonb_build_object('id','choice_b','label',v_correct_label)) end, true);
    v_question := jsonb_set(v_question, '{correctOptionId}', to_jsonb(case when v_correct_first then 'choice_a' else 'choice_b' end), true);
    v_rotated := v_rotated || jsonb_build_array(v_question);
  end loop;
  return v_rotated;
end; $$;

create or replace function public.spogomi_referee_quiz_definition_internal(p_event_id uuid, p_division_id uuid)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  v_event public.spogomi_events%rowtype; v_division public.spogomi_divisions%rowtype;
  v_policy jsonb; v_questions jsonb; v_quiz_version text; v_category_summary text;
  v_penalty_summary text; v_safety text; v_measurement text; v_available boolean;
begin
  select * into v_event from public.spogomi_events where id = p_event_id;
  select * into v_division from public.spogomi_divisions where id = p_division_id and event_id = p_event_id;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then raise exception using errcode = 'P0002', message = 'spogomi_referee_quiz_unavailable'; end if;
  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb) || coalesce(v_division.regulation_config -> 'registrationPolicy', '{}'::jsonb);
  select coalesce(string_agg(format('%s (%s, %s)', label, measurement_kind, unit), '; ' order by display_order, id), 'Catégories non communiquées') into v_category_summary from public.spogomi_category_rules where event_id = p_event_id and division_id = p_division_id and regulation_version = v_division.regulation_version;
  select coalesce(string_agg(format('%s (%s points)', item ->> 'label', item ->> 'points'), '; '), 'Pénalités non communiquées') into v_penalty_summary from jsonb_array_elements(coalesce(v_division.regulation_config -> 'penalties', '[]'::jsonb)) as penalties(item);
  v_safety := coalesce(nullif(btrim(v_policy ->> 'safetyInstructions'), ''), 'Appliquer les consignes de sécurité publiées pour cette édition et interrompre une situation dangereuse.');
  v_measurement := format('Catégories et unités publiées : %s. Utiliser une balance tarée, vérifier les unités et conserver la traçabilité.', v_category_summary);
  v_questions := jsonb_build_array(
    jsonb_build_object('id','q01','prompt','Une personne est en danger ou un déchet dangereux est signalé. Quelle est votre priorité ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label',v_safety),jsonb_build_object('id','distractor','label','Continuer la collecte et décider plus tard.')),'correctOptionId','server_answer','explanation','La sécurité prime et la consigne de l’édition s’applique.'),
    jsonb_build_object('id','q02','prompt','Un accident survient sur le parcours. Que faites-vous avant toute reprise ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Protéger la zone, alerter selon la procédure et documenter les faits.'),jsonb_build_object('id','distractor','label','Reprendre sans signalement pour ne pas retarder l’épreuve.')),'correctOptionId','server_answer','explanation','Un incident doit être sécurisé et transmis selon la procédure versionnée.'),
    jsonb_build_object('id','q03','prompt','Comment traiter un déchet interdit ou potentiellement dangereux ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Ne pas le manipuler et suivre la consigne de signalement de l’édition.'),jsonb_build_object('id','distractor','label','Le collecter avec des protections improvisées.')),'correctOptionId','server_answer','explanation','Les déchets interdits ne doivent pas être collectés.'),
    jsonb_build_object('id','q04','prompt','Un comportement interdit est établi après vérification. Quelle décision est recevable ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Appliquer uniquement la pénalité ou disqualification prévue, avec une trace.'),jsonb_build_object('id','distractor','label','Choisir une sanction personnelle non prévue.')),'correctOptionId','server_answer','explanation','Une sanction doit être fondée sur le règlement applicable.'),
    jsonb_build_object('id','q05','prompt','Une équipe revient après la limite de retour. Comment agir ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label',format('Vérifier l’heure officielle et appliquer uniquement la pénalité publiée : %s.',v_penalty_summary)),jsonb_build_object('id','distractor','label','Négocier une pénalité différente selon l’équipe.')),'correctOptionId','server_answer','explanation','La limite et la pénalité sont celles de la version de règlement de la division.'),
    jsonb_build_object('id','q06','prompt','Une équipe quitte le périmètre ou se sépare du groupe. Que vérifiez-vous ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Le périmètre et le maintien du groupe selon le règlement, puis documenter le fait.'),jsonb_build_object('id','distractor','label','Autoriser l’écart si l’équipe promet de revenir.')),'correctOptionId','server_answer','explanation','Le périmètre et la composition du groupe sont contrôlés.'),
    jsonb_build_object('id','q07','prompt','Une équipe conteste une décision avec tension. Quelle communication adoptez-vous ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Rester factuel, rappeler la règle et escalader selon la procédure.'),jsonb_build_object('id','distractor','label','Répondre sur le même ton et trancher sans trace.')),'correctOptionId','server_answer','explanation','Le conflit se gère par une communication factuelle et traçable.'),
    jsonb_build_object('id','q08','prompt','Comment vérifier la catégorie d’un objet avant son intégration au résultat ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label',v_category_summary),jsonb_build_object('id','distractor','label','Utiliser la catégorie qui maximise les points.')),'correctOptionId','server_answer','explanation','La catégorie et l’unité viennent des règles publiées.'),
    jsonb_build_object('id','q09','prompt','Quelle séquence garantit une mesure exploitable ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label',v_measurement),jsonb_build_object('id','distractor','label','Lire la valeur sans tare ni vérification d’unité.')),'correctOptionId','server_answer','explanation','La tare, l’unité et la vérification sont indispensables.'),
    jsonb_build_object('id','q10','prompt','Avant de soumettre le formulaire de résultats, que faut-il contrôler ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Les catégories, unités, mesures, provenance et preuves attendues.'),jsonb_build_object('id','distractor','label','Soumettre immédiatement puis corriger sans motif.')),'correctOptionId','server_answer','explanation','La soumission doit être complète, cohérente et traçable.'),
    jsonb_build_object('id','q11','prompt','Quelle source utilise-t-on pour calculer les points ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label',format('La version %s et ses catégories, coefficients et pénalités publiés : %s.',v_division.regulation_version,v_penalty_summary)),jsonb_build_object('id','distractor','label','Un coefficient mémorisé d’une autre édition.')),'correctOptionId','server_answer','explanation','Les calculs utilisent le règlement versionné de la division.'),
    jsonb_build_object('id','q12','prompt','Quelle différence respecter entre mesure, arbitrage, certification et publication ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Ce sont des étapes distinctes, chacune dans son périmètre et avec sa trace.'),jsonb_build_object('id','distractor','label','Une mesure saisie devient automatiquement un résultat publié.')),'correctOptionId','server_answer','explanation','Aucune étape ne confère automatiquement le statut suivant.'),
    jsonb_build_object('id','q13','prompt','Quelle référence horaire utiliser pour la pesée et le tri ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Les horaires officiels, le fuseau et les limites publiés pour cette division.'),jsonb_build_object('id','distractor','label','L’heure locale du téléphone sans vérifier le fuseau.')),'correctOptionId','server_answer','explanation','Les horaires de l’édition et leur fuseau sont la référence.'),
    jsonb_build_object('id','q14','prompt','Comment documenter une mesure contestée ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Conserver la mesure, sa méthode, son unité, sa provenance et le motif.'),jsonb_build_object('id','distractor','label','Remplacer la valeur sans conserver l’ancienne.')),'correctOptionId','server_answer','explanation','La traçabilité permet une vérification ultérieure.'),
    jsonb_build_object('id','q15','prompt','Qui peut être considéré comme le sujet d’une décision d’arbitrage ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','L’équipe et la division identifiées dans le périmètre de l’édition.'),jsonb_build_object('id','distractor','label','Une équipe ressemblante dans une autre édition.')),'correctOptionId','server_answer','explanation','L’identification est bornée à l’événement et à la division.'),
    jsonb_build_object('id','q16','prompt','Pourquoi vérifier l’unité avant le calcul ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Parce que l’unité conditionne l’interprétation et le coefficient versionné.'),jsonb_build_object('id','distractor','label','Parce que l’unité n’a aucun effet si la valeur paraît plausible.')),'correctOptionId','server_answer','explanation','Une unité incorrecte peut fausser le résultat.'),
    jsonb_build_object('id','q17','prompt','Que faire si une donnée manque dans le formulaire ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','La signaler et suivre l’état prévu, sans inventer de preuve.'),jsonb_build_object('id','distractor','label','Estimer la valeur pour permettre la certification.')),'correctOptionId','server_answer','explanation','Une donnée absente reste absente jusqu’à une preuve valide.'),
    jsonb_build_object('id','q18','prompt','Comment traiter une demande de réexamen ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Utiliser la procédure et le motif versionnés sans modifier la preuve d’origine.'),jsonb_build_object('id','distractor','label','Modifier directement la valeur originale.')),'correctOptionId','server_answer','explanation','Le réexamen doit conserver l’historique et le motif.'),
    jsonb_build_object('id','q19','prompt','Quelle information partager avec une équipe ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','La décision utile, sans divulguer les données privées d’une autre personne.'),jsonb_build_object('id','distractor','label','Les notes internes et informations personnelles d’une autre équipe.')),'correctOptionId','server_answer','explanation','La confidentialité reste applicable pendant l’arbitrage.'),
    jsonb_build_object('id','q20','prompt','Que transmettre lors d’un relais d’arbitrage ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','L’état, les mesures, les preuves, les décisions et les points en attente autorisés.'),jsonb_build_object('id','distractor','label','Uniquement un résumé oral sans mise à jour des traces.')),'correctOptionId','server_answer','explanation','Le relais doit préserver la continuité et la traçabilité.'),
    jsonb_build_object('id','q21','prompt','Que signifie une habilitation événementielle ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label','Elle autorise uniquement les capacités et la division prévues pour cette édition.'),jsonb_build_object('id','distractor','label','Elle donne automatiquement les mêmes droits sur tous les événements.')),'correctOptionId','server_answer','explanation','Les capacités sont bornées par événement et périmètre.'),
    jsonb_build_object('id','q22','prompt','Une équipe revient après la limite publiée. Que faut-il comparer avant de calculer sa pénalité ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','server_answer','label',format('L’heure officielle, le fuseau et la pénalité publiés pour cette division : %s.',v_penalty_summary)),jsonb_build_object('id','distractor','label','Une pénalité retenue pour une autre division ou une autre édition.')),'correctOptionId','server_answer','explanation','La comparaison doit rester dans la version réglementaire et la division concernées.')
  );
  v_questions := public.spogomi_referee_quiz_rotate_options(p_event_id, p_division_id, v_questions);
  v_quiz_version := md5(p_event_id::text || ':' || p_division_id::text || ':' || v_division.regulation_version || ':' || v_questions::text);
  v_available := v_division.regulation_status = 'complete';
  return jsonb_build_object('eventId',p_event_id,'divisionId',p_division_id,'regulationVersion',v_division.regulation_version,'quizVersion',v_quiz_version,'available',v_available,'sourceReference',coalesce(v_division.regulation_source_reference,v_event.regulation_source_reference),'missing',case when v_available then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id','regulation','label','Règlement de la division','status','incomplete','href',format('/spogomi/%s',coalesce(v_event.event_slug,'')))) end,'questions',case when v_available then (select coalesce(jsonb_agg(question - 'correctOptionId' - 'explanation'),'[]'::jsonb) from jsonb_array_elements(v_questions) as questions(question)) else '[]'::jsonb end);
end; $$;

create or replace function public.spogomi_referee_quiz_definition(p_event_id uuid, p_division_id uuid)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
begin return public.spogomi_referee_quiz_definition_internal(p_event_id, p_division_id); end; $$;

create or replace function public.spogomi_submit_referee_quiz(p_event_id uuid,p_division_id uuid,p_user_id text,p_quiz_version text,p_answers jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_definition jsonb; v_question jsonb; v_application public.spogomi_referee_applications%rowtype; v_proof_id uuid; v_answer text; v_errors jsonb:='[]'; v_critical_total int:=0; v_critical_correct int:=0; v_other_total int:=0; v_other_correct int:=0; v_score int; v_passed boolean;
begin
  if coalesce(auth.role(),'') <> 'service_role' or jsonb_typeof(coalesce(p_answers,'{}')) <> 'object' then raise exception using errcode='22023',message='invalid_spogomi_referee_quiz_submission'; end if;
  select * into v_application from public.spogomi_referee_applications where event_id=p_event_id and division_id=p_division_id and clerk_id=btrim(p_user_id) for update;
  if not found or v_application.status in ('refused','revoked') then raise exception using errcode='42501',message='spogomi_referee_application_required'; end if;
  v_definition := public.spogomi_referee_quiz_definition_internal(p_event_id,p_division_id);
  if not coalesce((v_definition->>'available')::boolean,false) then raise exception using errcode='42501',message='spogomi_referee_quiz_unavailable'; end if;
  if p_quiz_version is distinct from v_definition->>'quizVersion' then raise exception using errcode='40001',message='spogomi_referee_quiz_stale'; end if;
  if v_application.status='habilitated' and v_application.quiz_version = v_definition->>'quizVersion' and v_application.regulation_version = v_definition->>'regulationVersion' then raise exception using errcode='42501',message='spogomi_referee_application_required'; end if;
  if (select count(*) from public.spogomi_referee_quiz_attempts where application_id=v_application.id and created_at > now()-interval '1 hour') >= 10 then raise exception using errcode='42900',message='spogomi_referee_quiz_attempt_limit'; end if;
  for v_question in select value from jsonb_array_elements(v_definition -> 'questions') as questions(value) loop
    v_answer := p_answers ->> (v_question->>'id');
    if coalesce((v_question->>'critical')::boolean,false) then v_critical_total:=v_critical_total+1; else v_other_total:=v_other_total+1; end if;
    if v_answer = v_question->>'correctOptionId' then if coalesce((v_question->>'critical')::boolean,false) then v_critical_correct:=v_critical_correct+1; else v_other_correct:=v_other_correct+1; end if; else v_errors:=v_errors||jsonb_build_array(jsonb_build_object('questionId',v_question->>'id','explanation',v_question->>'explanation')); end if;
  end loop;
  v_score:=round((v_critical_correct+v_other_correct)*100.0/nullif(v_critical_total+v_other_total,0))::int; v_passed:=v_critical_correct=v_critical_total and v_other_correct*100 >= v_other_total*90;
  insert into public.spogomi_referee_quiz_attempts(application_id,event_id,division_id,clerk_id,quiz_version,passed,score) values(v_application.id,p_event_id,p_division_id,btrim(p_user_id),p_quiz_version,v_passed,v_score);
  insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,p_event_id,btrim(p_user_id),'quiz_attempted',btrim(p_user_id),jsonb_build_object('passed',v_passed,'score',v_score));
  if v_passed then insert into public.spogomi_referee_quiz_proofs(event_id,division_id,clerk_id,quiz_version,regulation_version,score,critical_correct,critical_total,other_correct,other_total) values(p_event_id,p_division_id,btrim(p_user_id),p_quiz_version,v_application.regulation_version,v_score,v_critical_correct,v_critical_total,v_other_correct,v_other_total) on conflict(event_id,division_id,clerk_id,quiz_version) do update set score=excluded.score,passed_at=now() returning id into v_proof_id; update public.spogomi_referee_applications set status='theory_qualified',quiz_version=p_quiz_version,theory_proof_id=v_proof_id,updated_at=now() where id=v_application.id; insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,p_event_id,btrim(p_user_id),'theory_qualified',btrim(p_user_id),jsonb_build_object('proof_id',v_proof_id,'quiz_version',p_quiz_version)); end if;
  return jsonb_build_object('passed',v_passed,'quizVersion',p_quiz_version,'score',v_score,'totalQuestions',v_critical_total+v_other_total,'criticalCorrect',v_critical_correct,'criticalTotal',v_critical_total,'otherCorrect',v_other_correct,'otherTotal',v_other_total,'errors',v_errors,'proofId',v_proof_id);
end; $$;

create or replace function public.spogomi_referee_scope_current(p_event_id uuid, p_subject_clerk_id text)
returns boolean language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_total int; v_qualified int;
begin
  select count(*) into v_total from public.spogomi_divisions where event_id=p_event_id;
  if v_total = 0 then return false; end if;
  select count(*) into v_qualified
    from public.spogomi_divisions division
    join public.spogomi_referee_applications application on application.event_id=division.event_id and application.division_id=division.id and application.clerk_id=btrim(p_subject_clerk_id) and application.status='habilitated' and application.regulation_version=division.regulation_version
    join public.spogomi_referee_quiz_proofs proof on proof.id=application.theory_proof_id and proof.event_id=division.event_id and proof.division_id=division.id and proof.clerk_id=btrim(p_subject_clerk_id) and proof.quiz_version=application.quiz_version and proof.regulation_version=division.regulation_version
   where division.event_id=p_event_id and application.quiz_version=(public.spogomi_referee_quiz_definition_internal(p_event_id,division.id)->>'quizVersion');
  return v_qualified = v_total;
end; $$;

create or replace function public.spogomi_set_operational_access(p_event_id uuid,p_subject_clerk_id text,p_access_role text,p_operation text,p_actor_clerk_id text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_reviewer public.spogomi_event_reviewers%rowtype; v_changed boolean:=false; v_active_count int;
begin
  if auth.role()<>'service_role' then raise exception using errcode='insufficient_privilege',message='SPOGOMI operational access is server-only'; end if;
  if p_access_role not in ('timekeeper','weigher','data_entry','arbiter','certifier') or p_operation not in ('grant','revoke') then raise exception using errcode='check_violation',message='SPOGOMI operational access is invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('spogomi-role:%s:%s',p_event_id,btrim(p_subject_clerk_id)),0));
  if p_operation='grant' and not public.spogomi_referee_scope_current(p_event_id,p_subject_clerk_id) then raise exception using errcode='42501',message='spogomi_referee_qualification_required'; end if;
  select * into v_reviewer from public.spogomi_event_reviewers where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and role=p_access_role for update;
  if p_operation='grant' then if not found then insert into public.spogomi_event_reviewers(event_id,clerk_id,role,assigned_by_clerk_id,revoked_at) values(p_event_id,btrim(p_subject_clerk_id),p_access_role,btrim(p_actor_clerk_id),null) returning * into v_reviewer; v_changed:=true; elsif v_reviewer.revoked_at is not null then update public.spogomi_event_reviewers set assigned_by_clerk_id=btrim(p_actor_clerk_id),revoked_at=null,updated_at=now() where id=v_reviewer.id returning * into v_reviewer; v_changed:=true; end if; elsif found and v_reviewer.revoked_at is null then update public.spogomi_event_reviewers set revoked_at=now(),updated_at=now() where id=v_reviewer.id returning * into v_reviewer; v_changed:=true; end if;
  if p_operation='revoke' then select count(*) into v_active_count from public.spogomi_event_reviewers where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and revoked_at is null; if v_active_count=0 then update public.spogomi_referee_applications set status='revoked',revoked_at=now(),updated_at=now() where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and status='habilitated'; end if; end if;
  if v_changed then insert into public.spogomi_event_access_audit(event_id,subject_clerk_id,access_role,operation,actor_clerk_id,details) values(p_event_id,btrim(p_subject_clerk_id),p_access_role,case when p_operation='grant' then 'granted' else 'revoked' end,btrim(p_actor_clerk_id),jsonb_build_object('reviewer_id',v_reviewer.id,'scope','field_operations','qualification_scope',case when p_operation='grant' then 'all_current_divisions' else 'partial_or_total' end)); end if;
  return jsonb_build_object('changed',v_changed,'event_id',p_event_id,'clerk_id',btrim(p_subject_clerk_id),'role',p_access_role);
end; $$;

create or replace function public.spogomi_set_event_access(p_event_id uuid,p_subject_clerk_id text,p_access_role text,p_operation text,p_actor_clerk_id text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_reviewer public.spogomi_event_reviewers%rowtype; v_changed boolean:=false; v_active_count int;
begin
  if auth.role()<>'service_role' then raise exception using errcode='insufficient_privilege',message='SPOGOMI event access is server-only'; end if;
  if p_access_role not in ('observer','referee','checkin') or p_operation not in ('grant','revoke') then raise exception using errcode='check_violation',message='SPOGOMI event access is invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('spogomi-role:%s:%s',p_event_id,btrim(p_subject_clerk_id)),0));
  if p_operation='grant' and not public.spogomi_referee_scope_current(p_event_id,p_subject_clerk_id) then raise exception using errcode='42501',message='spogomi_referee_qualification_required'; end if;
  select * into v_reviewer from public.spogomi_event_reviewers where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and role=p_access_role for update;
  if p_operation='grant' then if not found then insert into public.spogomi_event_reviewers(event_id,clerk_id,role,assigned_by_clerk_id,revoked_at) values(p_event_id,btrim(p_subject_clerk_id),p_access_role,btrim(p_actor_clerk_id),null) returning * into v_reviewer; v_changed:=true; elsif v_reviewer.revoked_at is not null then update public.spogomi_event_reviewers set assigned_by_clerk_id=btrim(p_actor_clerk_id),revoked_at=null,updated_at=now() where id=v_reviewer.id returning * into v_reviewer; v_changed:=true; end if; elsif found and v_reviewer.revoked_at is null then update public.spogomi_event_reviewers set revoked_at=now(),updated_at=now() where id=v_reviewer.id returning * into v_reviewer; v_changed:=true; end if;
  if p_operation='revoke' then select count(*) into v_active_count from public.spogomi_event_reviewers where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and revoked_at is null; if v_active_count=0 then update public.spogomi_referee_applications set status='revoked',revoked_at=now(),updated_at=now() where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and status='habilitated'; end if; end if;
  if v_changed then insert into public.spogomi_event_access_audit(event_id,subject_clerk_id,access_role,operation,actor_clerk_id,details) values(p_event_id,btrim(p_subject_clerk_id),p_access_role,case when p_operation='grant' then 'granted' else 'revoked' end,btrim(p_actor_clerk_id),jsonb_build_object('reviewer_id',v_reviewer.id,'qualification_scope','all_current_divisions')); end if;
  return jsonb_build_object('changed',v_changed,'event_id',p_event_id,'clerk_id',btrim(p_subject_clerk_id),'role',p_access_role,'revoked_at',case when v_reviewer.id is null then null else v_reviewer.revoked_at end);
end; $$;

create or replace function public.spogomi_decide_referee_application(p_application_id uuid,p_actor_clerk_id text,p_decision text,p_reason text default null)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_application public.spogomi_referee_applications%rowtype; v_event public.spogomi_events%rowtype; v_division public.spogomi_divisions%rowtype; v_status text; v_reviewer record;
begin
  if coalesce(auth.role(),'') <> 'service_role' or p_decision not in ('approve','refuse') then raise exception using errcode='22023',message='invalid_spogomi_referee_decision'; end if;
  select application.* into v_application from public.spogomi_referee_applications application where application.id=p_application_id for update;
  if not found then raise exception using errcode='P0002',message='spogomi_referee_application_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('spogomi-role:%s:%s',v_application.event_id,v_application.clerk_id),0));
  select event.* into v_event from public.spogomi_events event where event.id=v_application.event_id;
  select division.* into v_division from public.spogomi_divisions division where division.id=v_application.division_id and division.event_id=v_application.event_id;
  if not found or not exists(select 1 from public.action_organizers organizer where organizer.action_id=v_event.action_id and organizer.organizer_clerk_id=btrim(p_actor_clerk_id)) and v_event.created_by_clerk_id <> btrim(p_actor_clerk_id) then raise exception using errcode='42501',message='spogomi_referee_organizer_required'; end if;
  if p_decision='approve' and (v_application.status <> 'practical_pending' or not exists(select 1 from public.spogomi_referee_quiz_proofs proof where proof.id=v_application.theory_proof_id and proof.quiz_version=v_application.quiz_version and proof.regulation_version=v_division.regulation_version) or v_application.regulation_version is distinct from v_division.regulation_version or v_application.quiz_version is distinct from public.spogomi_referee_quiz_definition_internal(v_application.event_id,v_application.division_id)->>'quizVersion') then raise exception using errcode='42501',message='spogomi_referee_qualification_incomplete'; end if;
  if p_decision='refuse' then for v_reviewer in select id, role from public.spogomi_event_reviewers where event_id=v_application.event_id and clerk_id=v_application.clerk_id and revoked_at is null for update loop update public.spogomi_event_reviewers set revoked_at=now(),updated_at=now() where id=v_reviewer.id; insert into public.spogomi_event_access_audit(event_id,subject_clerk_id,access_role,operation,actor_clerk_id,details) values(v_application.event_id,v_application.clerk_id,v_reviewer.role,'revoked',btrim(p_actor_clerk_id),jsonb_build_object('reason','referee_application_refused')); end loop; end if;
  v_status:=case when p_decision='approve' then 'habilitated' else 'refused' end;
  update public.spogomi_referee_applications set status=v_status,organizer_decision=case when p_decision='approve' then 'approved' else 'refused' end,organizer_decided_by_clerk_id=btrim(p_actor_clerk_id),organizer_decided_at=now(),refusal_reason=nullif(btrim(coalesce(p_reason,'')),''),updated_at=now() where id=v_application.id;
  insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,v_application.event_id,v_application.clerk_id,case when p_decision='approve' then 'approved' else 'refused' end,btrim(p_actor_clerk_id),jsonb_build_object('reason',p_reason,'revoked_existing_access',p_decision='refuse'));
  return jsonb_build_object('applicationId',v_application.id,'status',v_status,'decision',p_decision);
end; $$;

create or replace function public.guard_spogomi_referee_competitor_exclusion()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(format('spogomi-role:%s:%s',new.event_id,coalesce(new.clerk_id,'')),0));
  if new.clerk_id is not null and new.account_link_status='verified' and exists(select 1 from public.spogomi_referee_applications application where application.event_id=new.event_id and application.clerk_id=btrim(new.clerk_id) and application.status in ('candidate','theory_qualified','practical_pending','habilitated')) then raise exception using errcode='23514',message='spogomi_competitor_referee_conflict'; end if;
  return new;
end; $$;

create or replace function public.guard_spogomi_referee_admission_exclusion()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.requester_clerk_id is not null and new.request_kind='registration' and new.status in ('pending','approved') then
    perform pg_advisory_xact_lock(hashtextextended(format('spogomi-role:%s:%s',new.event_id,new.requester_clerk_id),0));
    if exists(select 1 from public.spogomi_referee_applications application where application.event_id=new.event_id and application.clerk_id=btrim(new.requester_clerk_id) and application.status in ('candidate','theory_qualified','practical_pending','habilitated')) then raise exception using errcode='23514',message='spogomi_competitor_referee_conflict'; end if;
  end if;
  return new;
end; $$;

revoke all on function public.spogomi_decide_referee_application(uuid,text,text,text), public.guard_spogomi_referee_competitor_exclusion(), public.guard_spogomi_referee_admission_exclusion() from public, anon, authenticated;
grant execute on function public.spogomi_decide_referee_application(uuid,text,text,text) to service_role;

create or replace function public.spogomi_create_referee_application(p_event_id uuid, p_division_id uuid, p_clerk_id text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_event public.spogomi_events%rowtype; v_division public.spogomi_divisions%rowtype; v_application public.spogomi_referee_applications%rowtype; v_definition jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' or length(btrim(coalesce(p_clerk_id,''))) = 0 then raise exception using errcode='22023', message='invalid_spogomi_referee_application'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('spogomi-role:%s:%s',p_event_id,p_clerk_id),0));
  select * into v_event from public.spogomi_events where id=p_event_id for update;
  select * into v_division from public.spogomi_divisions where id=p_division_id and event_id=p_event_id;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then raise exception using errcode='P0002', message='spogomi_referee_application_unavailable'; end if;
  if exists(select 1 from public.spogomi_participants p where p.event_id=p_event_id and p.clerk_id=btrim(p_clerk_id) and p.account_link_status='verified') or exists(select 1 from public.spogomi_team_join_requests r where r.event_id=p_event_id and r.requester_clerk_id=btrim(p_clerk_id) and r.request_kind='registration' and r.status in ('pending','approved')) then raise exception using errcode='23514', message='spogomi_competitor_referee_conflict'; end if;
  select * into v_application from public.spogomi_referee_applications where event_id=p_event_id and division_id=p_division_id and clerk_id=btrim(p_clerk_id) for update;
  if found and v_application.status not in ('refused','revoked') then
    if v_application.status in ('theory_qualified','practical_pending') and (v_application.regulation_version is distinct from v_division.regulation_version or v_application.quiz_version is distinct from (public.spogomi_referee_quiz_definition_internal(p_event_id,p_division_id)->>'quizVersion')) then
      update public.spogomi_referee_applications set status='candidate',quiz_version=null,theory_proof_id=null,practical_confirmation_version=null,practical_confirmed_by_clerk_id=null,practical_confirmed_at=null,organizer_decision=null,organizer_decided_by_clerk_id=null,organizer_decided_at=null,updated_at=now() where id=v_application.id returning * into v_application;
      insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,p_event_id,btrim(p_clerk_id),'applied',btrim(p_clerk_id),jsonb_build_object('reason','requalification_required','regulation_version',v_division.regulation_version));
    else return jsonb_build_object('applicationId',v_application.id,'eventId',p_event_id,'divisionId',p_division_id,'status',v_application.status,'quizVersion',v_application.quiz_version,'regulationVersion',v_application.regulation_version,'theoryQualified',v_application.theory_proof_id is not null,'practicalConfirmed',v_application.practical_confirmation_version is not null); end if;
  else
    if found then update public.spogomi_referee_applications set status='candidate',quiz_version=null,theory_proof_id=null,practical_confirmation_version=null,practical_confirmed_by_clerk_id=null,practical_confirmed_at=null,organizer_decision=null,organizer_decided_by_clerk_id=null,organizer_decided_at=null,refusal_reason=null,revoked_at=null,regulation_version=v_division.regulation_version,updated_at=now() where id=v_application.id returning * into v_application;
    else insert into public.spogomi_referee_applications(event_id,division_id,clerk_id,regulation_version) values(p_event_id,p_division_id,btrim(p_clerk_id),v_division.regulation_version) returning * into v_application; end if;
    insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,p_event_id,btrim(p_clerk_id),'applied',btrim(p_clerk_id),jsonb_build_object('division_id',p_division_id,'regulation_version',v_division.regulation_version));
  end if;
  return jsonb_build_object('applicationId',v_application.id,'eventId',p_event_id,'divisionId',p_division_id,'status','candidate','quizVersion',null,'regulationVersion',v_division.regulation_version,'theoryQualified',false,'practicalConfirmed',false);
end; $$;

grant execute on function public.spogomi_create_referee_application(uuid,uuid,text) to service_role;

revoke all on function public.spogomi_referee_quiz_rotate_options(uuid,uuid,jsonb), public.spogomi_referee_scope_current(uuid,text) from public, anon, authenticated;
grant execute on function public.spogomi_referee_quiz_definition(uuid,uuid), public.spogomi_submit_referee_quiz(uuid,uuid,text,text,jsonb), public.spogomi_referee_scope_current(uuid,text), public.spogomi_set_event_access(uuid,text,text,text,text), public.spogomi_set_operational_access(uuid,text,text,text,text) to service_role;
