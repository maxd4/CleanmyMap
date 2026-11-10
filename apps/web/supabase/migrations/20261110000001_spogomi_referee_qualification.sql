-- SPOGOMI: event-scoped referee candidature and reinforced qualification.
-- This migration is forward-only. It does not grant a Clerk role and it never
-- turns a quiz proof into an event capability without an organizer decision.

create table public.spogomi_referee_applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_id uuid not null,
  clerk_id text not null check (length(btrim(clerk_id)) > 0),
  status text not null default 'candidate' check (status in ('candidate', 'theory_qualified', 'practical_pending', 'habilitated', 'refused', 'revoked')),
  quiz_version text,
  regulation_version text not null check (length(btrim(regulation_version)) > 0),
  theory_proof_id uuid,
  practical_confirmation_version text,
  practical_confirmed_by_clerk_id text,
  practical_confirmed_at timestamptz,
  organizer_decision text check (organizer_decision is null or organizer_decision in ('approved', 'refused')),
  organizer_decided_by_clerk_id text,
  organizer_decided_at timestamptz,
  refusal_reason text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, division_id, clerk_id),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade,
  check ((status = 'candidate' and organizer_decision is null and theory_proof_id is null)
    or (status = 'theory_qualified' and theory_proof_id is not null and organizer_decision is null)
    or (status = 'practical_pending' and theory_proof_id is not null and practical_confirmation_version is not null and practical_confirmed_by_clerk_id is not null and organizer_decision is null)
    or (status = 'habilitated' and theory_proof_id is not null and practical_confirmation_version is not null and practical_confirmed_by_clerk_id is not null and organizer_decision = 'approved' and organizer_decided_by_clerk_id is not null and organizer_decided_at is not null)
    or (status in ('refused', 'revoked') and organizer_decision is not null))
);

create table public.spogomi_referee_quiz_proofs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_id uuid not null,
  clerk_id text not null check (length(btrim(clerk_id)) > 0),
  quiz_version text not null check (length(btrim(quiz_version)) > 0),
  regulation_version text not null check (length(btrim(regulation_version)) > 0),
  score integer not null check (score between 0 and 100),
  critical_correct integer not null check (critical_correct >= 0),
  critical_total integer not null check (critical_total > 0),
  other_correct integer not null check (other_correct >= 0),
  other_total integer not null check (other_total >= 0),
  passed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, division_id, clerk_id, quiz_version),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade
);

alter table public.spogomi_referee_applications
  add constraint spogomi_referee_application_theory_proof_fk
  foreign key (theory_proof_id) references public.spogomi_referee_quiz_proofs(id) on delete restrict;

create table public.spogomi_referee_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.spogomi_referee_applications(id) on delete cascade,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_id uuid not null,
  clerk_id text not null check (length(btrim(clerk_id)) > 0),
  quiz_version text not null,
  passed boolean not null,
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade
);

create table public.spogomi_referee_practical_confirmations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.spogomi_referee_applications(id) on delete cascade,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_id uuid not null,
  subject_clerk_id text not null check (length(btrim(subject_clerk_id)) > 0),
  confirmation_version text not null check (length(btrim(confirmation_version)) > 0),
  confirmed_by_clerk_id text not null check (length(btrim(confirmed_by_clerk_id)) > 0),
  confirmed_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade
);

create table public.spogomi_referee_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.spogomi_referee_applications(id) on delete cascade,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  subject_clerk_id text not null check (length(btrim(subject_clerk_id)) > 0),
  action text not null check (action in ('applied', 'quiz_attempted', 'theory_qualified', 'practical_confirmed', 'approved', 'refused', 'revoked')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index spogomi_referee_applications_subject_idx on public.spogomi_referee_applications(event_id, clerk_id, status);
create index spogomi_referee_quiz_proofs_lookup_idx on public.spogomi_referee_quiz_proofs(event_id, division_id, clerk_id, passed_at desc);
create index spogomi_referee_quiz_attempts_abuse_idx on public.spogomi_referee_quiz_attempts(event_id, clerk_id, created_at desc);
create index spogomi_referee_application_events_lookup_idx on public.spogomi_referee_application_events(application_id, created_at desc);

alter table public.spogomi_referee_applications enable row level security;
alter table public.spogomi_referee_quiz_proofs enable row level security;
alter table public.spogomi_referee_quiz_attempts enable row level security;
alter table public.spogomi_referee_practical_confirmations enable row level security;
alter table public.spogomi_referee_application_events enable row level security;
revoke all on table public.spogomi_referee_applications, public.spogomi_referee_quiz_proofs, public.spogomi_referee_quiz_attempts, public.spogomi_referee_practical_confirmations, public.spogomi_referee_application_events from public, anon, authenticated;
grant all on table public.spogomi_referee_applications, public.spogomi_referee_quiz_proofs, public.spogomi_referee_quiz_attempts, public.spogomi_referee_practical_confirmations, public.spogomi_referee_application_events to service_role;

create or replace function public.guard_spogomi_referee_competitor_exclusion()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  -- PURPOSE: prevent one account from being a competitor and referee of one event.
  -- CALLER: database trigger on all participant admission/identity writes.
  -- AUTHORIZATION_BOUNDARY: service-owned writes only; the invariant is database-enforced.
  -- IDEMPOTENCY: unchanged non-verified rows are unaffected.
  -- ATOMICITY: the conflicting mutation aborts with no partial participant state.
  -- FAILURE_BEHAVIOR: active referee candidature or access rejects competitor linkage.
  -- SEARCH_PATH: explicitly pg_catalog, public; persistent objects are qualified.
  -- GRANTS: trigger only; no public execute grant.
  if new.clerk_id is not null and new.account_link_status = 'verified'
     and exists (
       select 1 from public.spogomi_referee_applications application
        where application.event_id = new.event_id
          and application.clerk_id = btrim(new.clerk_id)
          and application.status in ('candidate', 'theory_qualified', 'practical_pending', 'habilitated')
     ) then
    raise exception using errcode = '23514', message = 'spogomi_competitor_referee_conflict';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_referee_competitor_exclusion on public.spogomi_participants;
create trigger spogomi_referee_competitor_exclusion
before insert or update of clerk_id, account_link_status on public.spogomi_participants
for each row execute function public.guard_spogomi_referee_competitor_exclusion();

create or replace function public.guard_spogomi_referee_admission_exclusion()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.request_kind = 'registration' then
    perform pg_advisory_xact_lock(hashtextextended(format('spogomi-role:%s:%s', new.event_id, new.requester_clerk_id), 0));
    if exists (
      select 1 from public.spogomi_referee_applications application
       where application.event_id = new.event_id
         and application.clerk_id = btrim(new.requester_clerk_id)
         and application.status in ('candidate', 'theory_qualified', 'practical_pending', 'habilitated')
    ) then
      raise exception using errcode = '23514', message = 'spogomi_competitor_referee_conflict';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_referee_admission_exclusion on public.spogomi_team_join_requests;
create trigger spogomi_referee_admission_exclusion
before insert or update of requester_clerk_id, request_kind on public.spogomi_team_join_requests
for each row execute function public.guard_spogomi_referee_admission_exclusion();

create or replace function public.spogomi_referee_quiz_definition_internal(p_event_id uuid, p_division_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_policy jsonb;
  v_questions jsonb;
  v_quiz_version text;
  v_category_summary text;
  v_penalty_summary text;
  v_safety text;
  v_measurement text;
  v_available boolean;
begin
  select * into v_event from public.spogomi_events where id = p_event_id;
  select * into v_division from public.spogomi_divisions where id = p_division_id and event_id = p_event_id;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then
    raise exception using errcode = 'P0002', message = 'spogomi_referee_quiz_unavailable';
  end if;
  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb) || coalesce(v_division.regulation_config -> 'registrationPolicy', '{}'::jsonb);
  select coalesce(string_agg(format('%s (%s, %s)', label, measurement_kind, unit), '; ' order by display_order, id), 'Catégories non communiquées')
    into v_category_summary from public.spogomi_category_rules
   where event_id = p_event_id and division_id = p_division_id and regulation_version = v_division.regulation_version;
  select coalesce(string_agg(format('%s (%s points)', item ->> 'label', item ->> 'points'), '; '), 'Pénalités non communiquées')
    into v_penalty_summary from jsonb_array_elements(coalesce(v_division.regulation_config -> 'penalties', '[]'::jsonb)) as penalties(item);
  v_safety := coalesce(nullif(btrim(v_policy ->> 'safetyInstructions'), ''), 'Appliquer les consignes de sécurité publiées pour cette édition et interrompre une situation dangereuse.');
  v_measurement := format('Catégories et unités publiées : %s. Utiliser une balance tarée, vérifier les unités et conserver la traçabilité.', v_category_summary);
  v_questions := jsonb_build_array(
    jsonb_build_object('id','safety','prompt','Une personne est en danger ou un déchet dangereux est signalé. Quelle est votre priorité ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label',v_safety),jsonb_build_object('id','ignore','label','Continuer la collecte et décider plus tard si le résultat reste intéressant.')),'correctOptionId','official','explanation','La sécurité prime : interrompre, sécuriser et appliquer les consignes de l’édition.'),
    jsonb_build_object('id','accident','prompt','Un accident survient sur le parcours. Que faites-vous avant toute reprise ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label','Protéger la zone, alerter selon la procédure et documenter les faits.'),jsonb_build_object('id','continue','label','Déplacer la personne et reprendre sans signalement pour ne pas retarder l’épreuve.')),'correctOptionId','official','explanation','Un incident doit être sécurisé et transmis selon la procédure versionnée.'),
    jsonb_build_object('id','prohibited','prompt','Comment traiter un déchet interdit ou potentiellement dangereux ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label','Ne pas le manipuler et suivre la consigne de signalement de l’édition.'),jsonb_build_object('id','collect','label','Le collecter avec des protections improvisées et le compter comme les autres.')),'correctOptionId','official','explanation','Les déchets interdits ne doivent pas être collectés ; la consigne de l’édition s’applique.'),
    jsonb_build_object('id','sanction','prompt','Un comportement interdit est établi après vérification. Quelle décision est recevable ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label','Appliquer l’avertissement, la pénalité ou la disqualification prévue par le règlement, avec une trace.'),jsonb_build_object('id','personal','label','Choisir une sanction personnelle non prévue car elle semble plus juste.')),'correctOptionId','official','explanation','Une sanction doit être fondée sur le règlement applicable et être traçable.'),
    jsonb_build_object('id','late','prompt','Une équipe revient après la limite de retour. Comment agir ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label',format('Vérifier l’heure officielle et appliquer uniquement la pénalité publiée : %s.',v_penalty_summary)),jsonb_build_object('id','negotiate','label','Négocier une pénalité différente selon l’équipe et son explication.')),'correctOptionId','official','explanation','La limite et la pénalité sont celles de la version de règlement de la division.'),
    jsonb_build_object('id','perimeter','prompt','Une équipe quitte le périmètre ou se sépare du groupe. Que vérifiez-vous ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label','Le périmètre et le maintien du groupe selon le règlement, puis documenter le fait.'),jsonb_build_object('id','allow','label','Autoriser l’écart si l’équipe promet de revenir avant la fin.')),'correctOptionId','official','explanation','Le périmètre et la composition du groupe sont des conditions contrôlées de l’édition.'),
    jsonb_build_object('id','conflict','prompt','Une équipe conteste une décision avec tension. Quelle communication adoptez-vous ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label','Rester factuel, écouter, rappeler la règle et escalader selon la procédure.'),jsonb_build_object('id','argue','label','Répondre sur le même ton et trancher immédiatement sans trace.')),'correctOptionId','official','explanation','Le conflit se gère par une communication factuelle et la procédure d’escalade.'),
    jsonb_build_object('id','categories','prompt','Comment vérifier la catégorie d’un objet avant son intégration au résultat ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label',v_category_summary),jsonb_build_object('id','estimate','label','Utiliser la catégorie qui maximise les points, même si elle ne correspond pas à la règle.')),'correctOptionId','official','explanation','La catégorie et l’unité viennent des catégories publiées pour la version effective.'),
    jsonb_build_object('id','weighing','prompt','Quelle séquence garantit une mesure exploitable ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label',v_measurement),jsonb_build_object('id','shortcut','label','Lire la valeur affichée sans tare ni vérification d’unité pour gagner du temps.')),'correctOptionId','official','explanation','La tare, l’unité et la vérification sont indispensables à la traçabilité.'),
    jsonb_build_object('id','form','prompt','Avant de soumettre le formulaire de résultats, que faut-il contrôler ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label','Présence des catégories requises, unités, mesures, provenance et cohérence avec les preuves.'),jsonb_build_object('id','submit','label','Soumettre immédiatement puis corriger les valeurs sans version ni motif.')),'correctOptionId','official','explanation','La soumission doit être complète, cohérente et traçable.'),
    jsonb_build_object('id','scoring','prompt','Quelle source utilise-t-on pour calculer les points ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label',format('La version %s et ses catégories, coefficients et pénalités publiés : %s.',v_division.regulation_version,v_penalty_summary)),jsonb_build_object('id','memory','label','Un coefficient mémorisé d’une autre édition.')),'correctOptionId','official','explanation','Les calculs utilisent le règlement versionné de la division.'),
    jsonb_build_object('id','publication','prompt','Quelle différence respecter entre mesure, arbitrage, certification et publication ?','critical',true,'options',jsonb_build_array(jsonb_build_object('id','official','label','Mesurer et soumettre sont des étapes distinctes ; arbitrer décide, certifier valide selon le périmètre, publier relève de l’organisation.'),jsonb_build_object('id','shortcut','label','Une mesure saisie devient automatiquement un résultat officiel publié.')),'correctOptionId','official','explanation','Aucune étape ne confère automatiquement les droits ou le statut de l’étape suivante.'),
    jsonb_build_object('id','schedule','prompt','Quelle référence horaire utiliser pour la pesée et le tri ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','Les horaires officiels, le fuseau et les limites publiés pour cette division.'),jsonb_build_object('id','personal','label','L’heure locale de son téléphone sans vérifier le fuseau officiel.')),'correctOptionId','official','explanation','Les horaires de l’édition et leur fuseau sont la référence.'),
    jsonb_build_object('id','evidence','prompt','Comment documenter une mesure contestée ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','Conserver la mesure, sa méthode, son unité, sa provenance et le motif de la décision.'),jsonb_build_object('id','erase','label','Remplacer la valeur sans conserver l’ancienne ni le motif.')),'correctOptionId','official','explanation','La traçabilité permet une vérification ultérieure.'),
    jsonb_build_object('id','identity','prompt','Qui peut être considéré comme le sujet d’une décision d’arbitrage ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','L’équipe et la division identifiées dans le périmètre de l’édition.'),jsonb_build_object('id','guess','label','Une équipe choisie à partir d’un nom ressemblant dans une autre édition.')),'correctOptionId','official','explanation','L’identification est bornée à l’événement et à la division.'),
    jsonb_build_object('id','units','prompt','Pourquoi vérifier l’unité avant le calcul ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','Parce que l’unité conditionne l’interprétation et l’application du coefficient versionné.'),jsonb_build_object('id','ignore','label','Parce que l’unité n’a aucun effet si la valeur paraît plausible.')),'correctOptionId','official','explanation','Une conversion ou une unité incorrecte peut fausser le résultat.'),
    jsonb_build_object('id','review','prompt','Que faire si une donnée manque dans le formulaire ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','La signaler et suivre l’état prévu, sans inventer ni compléter une preuve absente.'),jsonb_build_object('id','invent','label','Estimer la valeur pour permettre la certification.')),'correctOptionId','official','explanation','Une donnée absente reste absente jusqu’à une preuve valide.'),
    jsonb_build_object('id','appeal','prompt','Comment traiter une demande de réexamen ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','Utiliser la procédure et le motif versionnés, sans modifier la preuve d’origine.'),jsonb_build_object('id','overwrite','label','Modifier directement la valeur originale pour satisfaire la demande.')),'correctOptionId','official','explanation','Le réexamen doit conserver l’historique et le motif.'),
    jsonb_build_object('id','privacy','prompt','Quelle information partager avec une équipe ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','La décision et l’explication utiles, sans divulguer de données privées d’une autre personne.'),jsonb_build_object('id','share','label','Les notes internes et les informations personnelles d’une autre équipe.')),'correctOptionId','official','explanation','La confidentialité reste applicable pendant l’arbitrage.'),
    jsonb_build_object('id','handover','prompt','Que transmettre lors d’un relais d’arbitrage ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','L’état, les mesures, les preuves, les décisions et les points en attente dans le périmètre autorisé.'),jsonb_build_object('id','verbal','label','Uniquement un résumé oral sans mise à jour des traces.')),'correctOptionId','official','explanation','Le relais doit préserver la continuité et la traçabilité.'),
    jsonb_build_object('id','scope','prompt','Que signifie une habilitation événementielle ?','critical',false,'options',jsonb_build_array(jsonb_build_object('id','official','label','Elle autorise uniquement les capacités et la division prévues pour cette édition.'),jsonb_build_object('id','global','label','Elle donne automatiquement les mêmes droits sur tous les événements.')),'correctOptionId','official','explanation','Les capacités sont bornées par événement et ne créent aucun rôle global.')
  );
  v_quiz_version := md5(p_event_id::text || ':' || p_division_id::text || ':' || v_division.regulation_version || ':' || v_questions::text);
  v_available := v_division.regulation_status = 'complete';
  return jsonb_build_object('eventId',p_event_id,'divisionId',p_division_id,'regulationVersion',v_division.regulation_version,'quizVersion',v_quiz_version,'available',v_available,'sourceReference',coalesce(v_division.regulation_source_reference,v_event.regulation_source_reference),'missing',case when v_available then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id','regulation','label','Règlement de la division','status','incomplete','href',format('/spogomi/%s',coalesce(v_event.event_slug,'')))) end,'questions',case when v_available then (select coalesce(jsonb_agg(question - 'correctOptionId' - 'explanation'),'[]'::jsonb) from jsonb_array_elements(v_questions) as questions(question)) else '[]'::jsonb end);
end;
$$;

create or replace function public.spogomi_create_referee_application(p_event_id uuid, p_division_id uuid, p_clerk_id text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_event public.spogomi_events%rowtype; v_division public.spogomi_divisions%rowtype; v_application public.spogomi_referee_applications%rowtype;
begin
  -- PURPOSE: create or idempotently reopen one event/division referee candidature.
  -- CALLER: authenticated server route after Clerk AuthN.
  -- AUTHORIZATION_BOUNDARY: service_role only; competitor/referee exclusion is transactional.
  -- IDEMPOTENCY: active application is returned; refused/revoked may reapply with audit.
  -- ATOMICITY: candidature, state and audit row commit together.
  -- FAILURE_BEHAVIOR: unavailable event, missing division or competitor conflict aborts.
  -- SEARCH_PATH: explicitly pg_catalog, public. GRANTS: service_role only.
  if coalesce(auth.role(),'') <> 'service_role' or length(btrim(coalesce(p_clerk_id,''))) = 0 then raise exception using errcode='22023', message='invalid_spogomi_referee_application'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('spogomi-role:%s:%s',p_event_id,p_clerk_id),0));
  select * into v_event from public.spogomi_events where id=p_event_id for update;
  select * into v_division from public.spogomi_divisions where id=p_division_id and event_id=p_event_id;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then raise exception using errcode='P0002', message='spogomi_referee_application_unavailable'; end if;
  if exists(select 1 from public.spogomi_participants p where p.event_id=p_event_id and p.clerk_id=btrim(p_clerk_id) and p.account_link_status='verified') or exists(select 1 from public.spogomi_team_join_requests r where r.event_id=p_event_id and r.requester_clerk_id=btrim(p_clerk_id) and r.request_kind='registration' and r.status in ('pending','approved')) then raise exception using errcode='23514', message='spogomi_competitor_referee_conflict'; end if;
  select * into v_application from public.spogomi_referee_applications where event_id=p_event_id and division_id=p_division_id and clerk_id=btrim(p_clerk_id) for update;
  if found and v_application.status not in ('refused','revoked') then return jsonb_build_object('applicationId',v_application.id,'eventId',p_event_id,'divisionId',p_division_id,'status',v_application.status,'quizVersion',v_application.quiz_version,'regulationVersion',v_application.regulation_version,'theoryQualified',v_application.theory_proof_id is not null,'practicalConfirmed',v_application.practical_confirmation_version is not null); end if;
  if found then update public.spogomi_referee_applications set status='candidate', quiz_version=null, theory_proof_id=null, practical_confirmation_version=null, practical_confirmed_by_clerk_id=null, practical_confirmed_at=null, organizer_decision=null, organizer_decided_by_clerk_id=null, organizer_decided_at=null, refusal_reason=null, revoked_at=null, regulation_version=v_division.regulation_version, updated_at=now() where id=v_application.id returning * into v_application;
  else insert into public.spogomi_referee_applications(event_id,division_id,clerk_id,regulation_version) values(p_event_id,p_division_id,btrim(p_clerk_id),v_division.regulation_version) returning * into v_application; end if;
  insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,p_event_id,btrim(p_clerk_id),'applied',btrim(p_clerk_id),jsonb_build_object('division_id',p_division_id,'regulation_version',v_division.regulation_version));
  return jsonb_build_object('applicationId',v_application.id,'eventId',p_event_id,'divisionId',p_division_id,'status','candidate','quizVersion',null,'regulationVersion',v_division.regulation_version,'theoryQualified',false,'practicalConfirmed',false);
end; $$;

create or replace function public.spogomi_referee_quiz_definition(p_event_id uuid, p_division_id uuid)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_definition jsonb;
begin
  v_definition := public.spogomi_referee_quiz_definition_internal(p_event_id, p_division_id);
  return jsonb_set(v_definition, '{questions}', (select coalesce(jsonb_agg(question - 'correctOptionId' - 'explanation'), '[]'::jsonb) from jsonb_array_elements(coalesce(v_definition -> 'questions', '[]'::jsonb)) as questions(question)), true);
end; $$;

create or replace function public.spogomi_submit_referee_quiz(p_event_id uuid,p_division_id uuid,p_user_id text,p_quiz_version text,p_answers jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_definition jsonb; v_question jsonb; v_application public.spogomi_referee_applications%rowtype; v_proof_id uuid; v_answer text; v_errors jsonb:='[]'; v_critical_total int:=0; v_critical_correct int:=0; v_other_total int:=0; v_other_correct int:=0; v_score int; v_passed boolean;
begin
  if coalesce(auth.role(),'') <> 'service_role' or jsonb_typeof(coalesce(p_answers,'{}')) <> 'object' then raise exception using errcode='22023',message='invalid_spogomi_referee_quiz_submission'; end if;
  select * into v_application from public.spogomi_referee_applications where event_id=p_event_id and division_id=p_division_id and clerk_id=btrim(p_user_id) for update;
  if not found or v_application.status in ('refused','revoked','habilitated') then raise exception using errcode='42501',message='spogomi_referee_application_required'; end if;
  v_definition := public.spogomi_referee_quiz_definition_internal(p_event_id,p_division_id);
  if not coalesce((v_definition->>'available')::boolean,false) then raise exception using errcode='42501',message='spogomi_referee_quiz_unavailable'; end if;
  if p_quiz_version is distinct from v_definition->>'quizVersion' then raise exception using errcode='40001',message='spogomi_referee_quiz_stale'; end if;
  if (select count(*) from public.spogomi_referee_quiz_attempts where application_id=v_application.id and created_at > now()-interval '1 hour') >= 10 then raise exception using errcode='42900',message='spogomi_referee_quiz_attempt_limit'; end if;
  for v_question in select value from jsonb_array_elements(v_definition -> 'questions') as questions(value) loop
    v_answer := p_answers ->> (v_question->>'id');
    if coalesce((v_question->>'critical')::boolean,false) then v_critical_total:=v_critical_total+1; else v_other_total:=v_other_total+1; end if;
    if v_answer='official' then if coalesce((v_question->>'critical')::boolean,false) then v_critical_correct:=v_critical_correct+1; else v_other_correct:=v_other_correct+1; end if; else v_errors:=v_errors||jsonb_build_array(jsonb_build_object('questionId',v_question->>'id','explanation','Relisez la consigne versionnée et la procédure correspondante avant une nouvelle tentative.')); end if;
  end loop;
  v_score:=round((v_critical_correct+v_other_correct)*100.0/nullif(v_critical_total+v_other_total,0))::int; v_passed:=v_critical_correct=v_critical_total and v_other_correct*100 >= v_other_total*90;
  insert into public.spogomi_referee_quiz_attempts(application_id,event_id,division_id,clerk_id,quiz_version,passed,score) values(v_application.id,p_event_id,p_division_id,btrim(p_user_id),p_quiz_version,v_passed,v_score);
  insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,p_event_id,btrim(p_user_id),'quiz_attempted',btrim(p_user_id),jsonb_build_object('passed',v_passed,'score',v_score));
  if v_passed then insert into public.spogomi_referee_quiz_proofs(event_id,division_id,clerk_id,quiz_version,regulation_version,score,critical_correct,critical_total,other_correct,other_total) values(p_event_id,p_division_id,btrim(p_user_id),p_quiz_version,v_application.regulation_version,v_score,v_critical_correct,v_critical_total,v_other_correct,v_other_total) on conflict(event_id,division_id,clerk_id,quiz_version) do update set score=excluded.score,passed_at=now() returning id into v_proof_id; update public.spogomi_referee_applications set status='theory_qualified',quiz_version=p_quiz_version,theory_proof_id=v_proof_id,updated_at=now() where id=v_application.id; insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,p_event_id,btrim(p_user_id),'theory_qualified',btrim(p_user_id),jsonb_build_object('proof_id',v_proof_id,'quiz_version',p_quiz_version)); end if;
  return jsonb_build_object('passed',v_passed,'quizVersion',p_quiz_version,'score',v_score,'totalQuestions',v_critical_total+v_other_total,'criticalCorrect',v_critical_correct,'criticalTotal',v_critical_total,'otherCorrect',v_other_correct,'otherTotal',v_other_total,'errors',v_errors,'proofId',v_proof_id);
end; $$;

create or replace function public.spogomi_confirm_referee_practical(p_application_id uuid,p_actor_clerk_id text,p_confirmation_version text,p_details jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_application public.spogomi_referee_applications%rowtype; v_event public.spogomi_events%rowtype; v_confirmation_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception using errcode='42501',message='spogomi_referee_practical_server_only'; end if;
  select application.* into v_application from public.spogomi_referee_applications application where application.id=p_application_id for update;
  select event.* into v_event from public.spogomi_events event where event.id=v_application.event_id;
  if not found or not exists(select 1 from public.action_organizers organizer where organizer.action_id=v_event.action_id and organizer.organizer_clerk_id=btrim(p_actor_clerk_id)) and v_event.created_by_clerk_id <> btrim(p_actor_clerk_id) then raise exception using errcode='42501',message='spogomi_referee_organizer_required'; end if;
  if v_application.status <> 'theory_qualified' then raise exception using errcode='42501',message='spogomi_referee_theory_required'; end if;
  insert into public.spogomi_referee_practical_confirmations(application_id,event_id,division_id,subject_clerk_id,confirmation_version,confirmed_by_clerk_id,details) values(v_application.id,v_application.event_id,v_application.division_id,v_application.clerk_id,btrim(p_confirmation_version),btrim(p_actor_clerk_id),coalesce(p_details,'{}')) returning id into v_confirmation_id;
  update public.spogomi_referee_applications set status='practical_pending',practical_confirmation_version=btrim(p_confirmation_version),practical_confirmed_by_clerk_id=btrim(p_actor_clerk_id),practical_confirmed_at=now(),updated_at=now() where id=v_application.id;
  insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,v_application.event_id,v_application.clerk_id,'practical_confirmed',btrim(p_actor_clerk_id),jsonb_build_object('confirmation_id',v_confirmation_id,'confirmation_version',p_confirmation_version));
  return jsonb_build_object('applicationId',v_application.id,'status','practical_pending','confirmationVersion',p_confirmation_version);
end; $$;

create or replace function public.spogomi_decide_referee_application(p_application_id uuid,p_actor_clerk_id text,p_decision text,p_reason text default null)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_application public.spogomi_referee_applications%rowtype; v_event public.spogomi_events%rowtype; v_division public.spogomi_divisions%rowtype; v_status text;
begin
  if coalesce(auth.role(),'') <> 'service_role' or p_decision not in ('approve','refuse') then raise exception using errcode='22023',message='invalid_spogomi_referee_decision'; end if;
  select application.* into v_application from public.spogomi_referee_applications application where application.id=p_application_id for update;
  select event.* into v_event from public.spogomi_events event where event.id=v_application.event_id;
  select division.* into v_division from public.spogomi_divisions division where division.id=v_application.division_id and division.event_id=v_application.event_id;
  if not found or not exists(select 1 from public.action_organizers organizer where organizer.action_id=v_event.action_id and organizer.organizer_clerk_id=btrim(p_actor_clerk_id)) and v_event.created_by_clerk_id <> btrim(p_actor_clerk_id) then raise exception using errcode='42501',message='spogomi_referee_organizer_required'; end if;
  if p_decision='approve' and (v_application.status <> 'practical_pending' or not exists(select 1 from public.spogomi_referee_quiz_proofs proof where proof.id=v_application.theory_proof_id and proof.quiz_version=v_application.quiz_version and proof.regulation_version=v_division.regulation_version) or v_application.regulation_version is distinct from v_division.regulation_version) then raise exception using errcode='42501',message='spogomi_referee_qualification_incomplete'; end if;
  v_status:=case when p_decision='approve' then 'habilitated' else 'refused' end;
  update public.spogomi_referee_applications set status=v_status,organizer_decision=case when p_decision='approve' then 'approved' else 'refused' end,organizer_decided_by_clerk_id=btrim(p_actor_clerk_id),organizer_decided_at=now(),refusal_reason=nullif(btrim(coalesce(p_reason,'')),''),updated_at=now() where id=v_application.id;
  insert into public.spogomi_referee_application_events(application_id,event_id,subject_clerk_id,action,actor_clerk_id,details) values(v_application.id,v_application.event_id,v_application.clerk_id,case when p_decision='approve' then 'approved' else 'refused' end,btrim(p_actor_clerk_id),jsonb_build_object('reason',p_reason));
  return jsonb_build_object('applicationId',v_application.id,'status',v_status,'decision',p_decision);
end; $$;

-- New referee grants must follow the qualification chain. Existing rows are not
-- rewritten, so historical habilitations remain valid until explicitly revoked.
create or replace function public.spogomi_set_operational_access(p_event_id uuid,p_subject_clerk_id text,p_access_role text,p_operation text,p_actor_clerk_id text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_reviewer public.spogomi_event_reviewers%rowtype; v_changed boolean:=false;
begin
  if auth.role()<>'service_role' then raise exception using errcode='insufficient_privilege',message='SPOGOMI operational access is server-only'; end if;
  if p_access_role not in ('timekeeper','weigher','data_entry','arbiter','certifier') or p_operation not in ('grant','revoke') then raise exception using errcode='check_violation',message='SPOGOMI operational access is invalid'; end if;
  if p_operation='grant' and not exists(select 1 from public.spogomi_referee_applications application where application.event_id=p_event_id and application.clerk_id=btrim(p_subject_clerk_id) and application.status='habilitated') then raise exception using errcode='42501',message='spogomi_referee_qualification_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s',p_event_id,p_subject_clerk_id,p_access_role),0));
  select * into v_reviewer from public.spogomi_event_reviewers where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and role=p_access_role for update;
  if p_operation='grant' then if not found then insert into public.spogomi_event_reviewers(event_id,clerk_id,role,assigned_by_clerk_id,revoked_at) values(p_event_id,btrim(p_subject_clerk_id),p_access_role,btrim(p_actor_clerk_id),null) returning * into v_reviewer; v_changed:=true; elsif v_reviewer.revoked_at is not null then update public.spogomi_event_reviewers set assigned_by_clerk_id=btrim(p_actor_clerk_id),revoked_at=null,updated_at=now() where id=v_reviewer.id returning * into v_reviewer; v_changed:=true; end if; elsif found and v_reviewer.revoked_at is null then update public.spogomi_event_reviewers set revoked_at=now(),updated_at=now() where id=v_reviewer.id returning * into v_reviewer; v_changed:=true; update public.spogomi_referee_applications set status='revoked',revoked_at=now(),updated_at=now() where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and status='habilitated'; end if;
  if v_changed then insert into public.spogomi_event_access_audit(event_id,subject_clerk_id,access_role,operation,actor_clerk_id,details) values(p_event_id,btrim(p_subject_clerk_id),p_access_role,case when p_operation='grant' then 'granted' else 'revoked' end,btrim(p_actor_clerk_id),jsonb_build_object('reviewer_id',v_reviewer.id,'scope','field_operations')); end if;
  return jsonb_build_object('changed',v_changed,'event_id',p_event_id,'clerk_id',btrim(p_subject_clerk_id),'role',p_access_role);
end; $$;

create or replace function public.spogomi_set_event_access(p_event_id uuid,p_subject_clerk_id text,p_access_role text,p_operation text,p_actor_clerk_id text)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_reviewer public.spogomi_event_reviewers%rowtype; v_changed boolean:=false;
begin
  if auth.role()<>'service_role' then raise exception using errcode='insufficient_privilege',message='SPOGOMI event access is server-only'; end if;
  if p_access_role not in ('observer','referee','checkin') or p_operation not in ('grant','revoke') then raise exception using errcode='check_violation',message='SPOGOMI event access is invalid'; end if;
  if p_operation='grant' and p_access_role='referee' and not exists(select 1 from public.spogomi_referee_applications application where application.event_id=p_event_id and application.clerk_id=btrim(p_subject_clerk_id) and application.status='habilitated') then raise exception using errcode='42501',message='spogomi_referee_qualification_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s',p_event_id,p_subject_clerk_id,p_access_role),0));
  select * into v_reviewer from public.spogomi_event_reviewers where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and role=p_access_role for update;
  if p_operation='grant' then if not found then insert into public.spogomi_event_reviewers(event_id,clerk_id,role,assigned_by_clerk_id,revoked_at) values(p_event_id,btrim(p_subject_clerk_id),p_access_role,btrim(p_actor_clerk_id),null) returning * into v_reviewer; v_changed:=true; elsif v_reviewer.revoked_at is not null then update public.spogomi_event_reviewers set assigned_by_clerk_id=btrim(p_actor_clerk_id),revoked_at=null,updated_at=now() where id=v_reviewer.id returning * into v_reviewer; v_changed:=true; end if; elsif found and v_reviewer.revoked_at is null then update public.spogomi_event_reviewers set revoked_at=now(),updated_at=now() where id=v_reviewer.id returning * into v_reviewer; v_changed:=true; update public.spogomi_referee_applications set status='revoked',revoked_at=now(),updated_at=now() where event_id=p_event_id and clerk_id=btrim(p_subject_clerk_id) and status='habilitated'; end if;
  if v_changed then insert into public.spogomi_event_access_audit(event_id,subject_clerk_id,access_role,operation,actor_clerk_id,details) values(p_event_id,btrim(p_subject_clerk_id),p_access_role,case when p_operation='grant' then 'granted' else 'revoked' end,btrim(p_actor_clerk_id),jsonb_build_object('reviewer_id',v_reviewer.id)); end if;
  return jsonb_build_object('changed',v_changed,'event_id',p_event_id,'clerk_id',btrim(p_subject_clerk_id),'role',p_access_role,'revoked_at',case when v_reviewer.id is null then null else v_reviewer.revoked_at end);
end; $$;

revoke all on function public.spogomi_referee_quiz_definition_internal(uuid,uuid), public.spogomi_referee_quiz_definition(uuid,uuid), public.spogomi_create_referee_application(uuid,uuid,text), public.spogomi_submit_referee_quiz(uuid,uuid,text,text,jsonb), public.spogomi_confirm_referee_practical(uuid,text,text,jsonb), public.spogomi_decide_referee_application(uuid,text,text,text), public.spogomi_set_event_access(uuid,text,text,text,text), public.spogomi_set_operational_access(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.spogomi_referee_quiz_definition(uuid,uuid), public.spogomi_create_referee_application(uuid,uuid,text), public.spogomi_submit_referee_quiz(uuid,uuid,text,text,jsonb), public.spogomi_confirm_referee_practical(uuid,text,text,jsonb), public.spogomi_decide_referee_application(uuid,text,text,text), public.spogomi_set_event_access(uuid,text,text,text,text), public.spogomi_set_operational_access(uuid,text,text,text,text) to service_role;

comment on table public.spogomi_referee_applications is 'Event/division-scoped referee candidature. It is not a Clerk role, sports registration, or capability by itself.';
comment on table public.spogomi_referee_quiz_proofs is 'Server-only proof of the advanced referee quiz, versioned by event, division, quiz and regulation.';
comment on table public.spogomi_referee_practical_confirmations is 'Versioned organizer confirmation of practical referee training; it never grants access without an explicit decision.';
