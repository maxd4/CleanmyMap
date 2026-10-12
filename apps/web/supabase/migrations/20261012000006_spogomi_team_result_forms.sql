-- SPOGOMI lot 4: team-scoped result forms, controlled sessions and certified versions.
-- The token and session values are never stored in clear text. All writes remain
-- server-owned so an external participant does not need a CleanMyMap account.

alter table public.spogomi_result_submissions
  add column idempotency_key text,
  add constraint spogomi_result_submissions_idempotency_key_length
    check (idempotency_key is null or length(btrim(idempotency_key)) between 16 and 160);

create unique index spogomi_result_submissions_team_idempotency_unique
  on public.spogomi_result_submissions(team_id, idempotency_key)
  where idempotency_key is not null;

alter table public.spogomi_result_items
  alter column quantity drop not null,
  add column mass_grams numeric,
  add column object_count numeric,
  add column measurement_method text,
  add column arbitration_comment text,
  add constraint spogomi_result_items_mass_grams_check
    check (mass_grams is null or (mass_grams >= 0 and mass_grams <= 1000000000)),
  add constraint spogomi_result_items_object_count_check
    check (object_count is null or (object_count >= 0 and object_count = trunc(object_count))),
  add constraint spogomi_result_items_measurement_method_length
    check (measurement_method is null or length(btrim(measurement_method)) <= 200),
  add constraint spogomi_result_items_arbitration_comment_length
    check (arbitration_comment is null or length(btrim(arbitration_comment)) <= 2000);

create table public.spogomi_team_access_grants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  team_id uuid not null,
  token_hash text not null unique,
  created_by_clerk_id text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, event_id)
    references public.spogomi_teams(id, event_id)
    on delete cascade,
  check (length(token_hash) = 64),
  check (expires_at > created_at)
);

create table public.spogomi_team_access_sessions (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.spogomi_team_access_grants(id) on delete cascade,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  team_id uuid not null,
  session_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, event_id)
    references public.spogomi_teams(id, event_id)
    on delete cascade,
  check (length(session_hash) = 64),
  check (expires_at > created_at)
);

create index spogomi_team_access_grants_team_idx
  on public.spogomi_team_access_grants(team_id, expires_at)
  where revoked_at is null;
create index spogomi_team_access_sessions_team_idx
  on public.spogomi_team_access_sessions(team_id, expires_at)
  where revoked_at is null;

create table public.spogomi_result_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  team_id uuid not null,
  submission_id uuid not null,
  action text not null check (action in ('draft_saved', 'submitted', 'corrected', 'certified', 'rejected', 'superseded')),
  actor_kind text not null check (actor_kind in ('team_session', 'organizer', 'referee', 'system')),
  actor_clerk_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (team_id, event_id)
    references public.spogomi_teams(id, event_id)
    on delete cascade,
  foreign key (submission_id, event_id)
    references public.spogomi_result_submissions(id, event_id)
    on delete cascade
);

create table public.spogomi_event_reviewers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  clerk_id text not null check (length(btrim(clerk_id)) > 0),
  role text not null default 'referee' check (role = 'referee'),
  assigned_by_clerk_id text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, clerk_id, role)
);

create index spogomi_result_audit_events_submission_idx
  on public.spogomi_result_audit_events(submission_id, created_at);
create index spogomi_event_reviewers_active_idx
  on public.spogomi_event_reviewers(event_id, clerk_id)
  where revoked_at is null;

create or replace function public.spogomi_save_team_submission(
  p_event_id uuid,
  p_team_id uuid,
  p_submission_id uuid,
  p_idempotency_key text,
  p_status text,
  p_regulation_version text,
  p_replaces_submission_id uuid,
  p_correction_reason text,
  p_items jsonb,
  p_actor_kind text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_submission public.spogomi_result_submissions%rowtype;
  v_existing public.spogomi_result_submissions%rowtype;
  v_version integer;
  v_action text;
begin
  -- PURPOSE: serialize one team's draft/submission version and its item set.
  -- CALLER: server route after a valid team session has scoped event_id/team_id.
  -- AUTHORIZATION_BOUNDARY: function is executable only by service_role.
  -- IDEMPOTENCY: team_id + idempotency_key returns the existing submission.
  -- ATOMICITY: submission, items and audit event commit or fail together.
  -- FAILURE_BEHAVIOR: invalid status, team, version or item constraints abort the transaction.
  -- SEARCH_PATH: explicitly public-qualified objects under pg_catalog, public.
  -- GRANTS: service_role only.
  if p_status not in ('draft', 'submitted') then
    raise exception using errcode = 'check_violation', message = 'Team submission status is invalid';
  end if;
  if p_actor_kind <> 'team_session' then
    raise exception using errcode = 'insufficient_privilege', message = 'Team submission requires a team session';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_team_id::text, 0));

  if p_idempotency_key is not null then
    select * into v_existing
      from public.spogomi_result_submissions
     where team_id = p_team_id and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('submission', to_jsonb(v_existing), 'already_processed', true);
    end if;
  end if;

  if p_submission_id is not null then
    select * into v_submission
      from public.spogomi_result_submissions
     where id = p_submission_id and event_id = p_event_id and team_id = p_team_id
     for update;
    if not found then
      raise exception using errcode = 'no_data_found', message = 'Submission does not belong to this team';
    end if;
    if v_submission.status <> 'draft' then
      raise exception using errcode = 'serialization_failure', message = 'Only a draft submission can be edited';
    end if;
    delete from public.spogomi_result_items where submission_id = v_submission.id;
    update public.spogomi_result_submissions
       set status = 'draft',
           idempotency_key = coalesce(p_idempotency_key, idempotency_key),
           regulation_version = p_regulation_version,
           correction_reason = p_correction_reason,
           updated_at = now()
     where id = v_submission.id
     returning * into v_submission;
  else
    select * into v_submission
      from public.spogomi_result_submissions
     where team_id = p_team_id and status = 'draft'
     order by version desc
     limit 1
     for update;
    if found then
      delete from public.spogomi_result_items where submission_id = v_submission.id;
      update public.spogomi_result_submissions
         set idempotency_key = coalesce(p_idempotency_key, idempotency_key),
             regulation_version = p_regulation_version,
             updated_at = now()
       where id = v_submission.id
       returning * into v_submission;
    else
      select coalesce(max(version), 0) + 1 into v_version
        from public.spogomi_result_submissions
       where team_id = p_team_id;
      insert into public.spogomi_result_submissions (
        event_id, team_id, version, status, regulation_version,
        replaces_submission_id, correction_reason, idempotency_key
      ) values (
        p_event_id, p_team_id, v_version, 'draft', p_regulation_version,
        p_replaces_submission_id, p_correction_reason, p_idempotency_key
      ) returning * into v_submission;
    end if;
  end if;

  insert into public.spogomi_result_items (
    event_id, submission_id, category_rule_id, measurement_kind, unit,
    quantity, mass_grams, object_count, measurement_method, provenance,
    arbitration_comment, source_reference
  )
  select p_event_id, v_submission.id, item.category_rule_id, item.measurement_kind,
         item.unit, item.quantity, item.mass_grams, item.object_count,
         item.measurement_method, item.provenance, item.arbitration_comment,
         item.source_reference
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(
      category_rule_id uuid,
      measurement_kind text,
      unit text,
      quantity numeric,
      mass_grams numeric,
      object_count numeric,
      measurement_method text,
      provenance text,
      arbitration_comment text,
      source_reference text
    );

  if p_status = 'submitted' then
    update public.spogomi_result_submissions
       set status = 'submitted',
           submitted_at = now()
     where id = v_submission.id
     returning * into v_submission;
    v_action := case when v_submission.replaces_submission_id is null then 'submitted' else 'corrected' end;
  else
    v_action := 'draft_saved';
  end if;

  insert into public.spogomi_result_audit_events (
    event_id, team_id, submission_id, action, actor_kind, details
  ) values (
    p_event_id, p_team_id, v_submission.id, v_action, p_actor_kind,
    jsonb_build_object('version', v_submission.version, 'status', v_submission.status)
  );

  return jsonb_build_object('submission', to_jsonb(v_submission), 'already_processed', false);
end;
$$;

create or replace function public.spogomi_review_team_submission(
  p_event_id uuid,
  p_team_id uuid,
  p_submission_id uuid,
  p_decision text,
  p_reviewer_clerk_id text,
  p_reason text,
  p_actor_kind text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_submission public.spogomi_result_submissions%rowtype;
  v_previous_certified uuid;
  v_regulation_status text;
  v_regulation_version text;
begin
  -- PURPOSE: atomically certify or reject one submitted team version.
  -- CALLER: organizer/referee route after event AuthZ and reviewer identity checks.
  -- AUTHORIZATION_BOUNDARY: function is executable only by service_role.
  -- IDEMPOTENCY: row lock and submitted-status predicate reject concurrent decisions.
  -- ATOMICITY: decision, current pointer, supersession and audit commit together.
  -- FAILURE_BEHAVIOR: stale/concurrent versions return a serialization failure.
  -- SEARCH_PATH: explicitly public-qualified objects under pg_catalog, public.
  -- GRANTS: service_role only.
  if p_decision not in ('certified', 'rejected') then
    raise exception using errcode = 'check_violation', message = 'Review decision is invalid';
  end if;
  if p_actor_kind not in ('organizer', 'referee') or length(btrim(coalesce(p_reviewer_clerk_id, ''))) = 0 then
    raise exception using errcode = 'insufficient_privilege', message = 'A reviewer identity is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_team_id::text, 0));
  select * into v_submission
    from public.spogomi_result_submissions
   where id = p_submission_id and event_id = p_event_id and team_id = p_team_id
   for update;
  if not found or v_submission.status <> 'submitted' then
    raise exception using errcode = 'serialization_failure', message = 'Submission is no longer awaiting review';
  end if;

  if p_decision = 'certified' then
    select e.regulation_status, e.regulation_version
      into v_regulation_status, v_regulation_version
      from public.spogomi_events e where e.id = p_event_id;
    if v_regulation_status <> 'complete' or v_submission.regulation_version <> v_regulation_version then
      raise exception using errcode = 'check_violation', message = 'A complete matching regulation is required for certification';
    end if;
    if exists (
      select 1 from public.spogomi_category_rules cr
       where cr.event_id = p_event_id and (cr.is_complete = false or not exists (
         select 1 from public.spogomi_result_items ri
          where ri.submission_id = v_submission.id and ri.category_rule_id = cr.id
            and ri.quantity is not null and length(btrim(ri.provenance)) > 0
            and length(btrim(coalesce(ri.measurement_method, ''))) > 0
       ))
    ) then
      raise exception using errcode = 'check_violation', message = 'Every complete category must have a measured item';
    end if;

    select certified_submission_id into v_previous_certified
      from public.spogomi_teams where id = p_team_id for update;
    update public.spogomi_result_submissions
       set status = 'certified', certified_by_clerk_id = p_reviewer_clerk_id,
           certified_at = now()
     where id = v_submission.id;
    update public.spogomi_teams
       set certified_submission_id = v_submission.id, updated_at = now()
     where id = p_team_id;
    if v_previous_certified is not null and v_previous_certified <> v_submission.id then
      update public.spogomi_result_submissions
         set status = 'superseded', updated_at = now()
       where id = v_previous_certified and status = 'certified';
      insert into public.spogomi_result_audit_events (
        event_id, team_id, submission_id, action, actor_kind, actor_clerk_id, details
      ) values (
        p_event_id, p_team_id, v_previous_certified, 'superseded', p_actor_kind,
        p_reviewer_clerk_id, jsonb_build_object('replaced_by', v_submission.id)
      );
    end if;
    insert into public.spogomi_result_reviews (
      event_id, submission_id, decision, reviewer_clerk_id, reason, replaces_submission_id
    ) values (p_event_id, v_submission.id, 'certified', p_reviewer_clerk_id, p_reason, v_previous_certified);
    insert into public.spogomi_result_audit_events (
      event_id, team_id, submission_id, action, actor_kind, actor_clerk_id, details
    ) values (
      p_event_id, p_team_id, v_submission.id, 'certified', p_actor_kind,
      p_reviewer_clerk_id, jsonb_build_object('reason', p_reason)
    );
  else
    update public.spogomi_result_submissions
       set status = 'rejected', updated_at = now()
     where id = v_submission.id;
    insert into public.spogomi_result_reviews (
      event_id, submission_id, decision, reviewer_clerk_id, reason
    ) values (p_event_id, v_submission.id, 'rejected', p_reviewer_clerk_id, p_reason);
    insert into public.spogomi_result_audit_events (
      event_id, team_id, submission_id, action, actor_kind, actor_clerk_id, details
    ) values (
      p_event_id, p_team_id, v_submission.id, 'rejected', p_actor_kind,
      p_reviewer_clerk_id, jsonb_build_object('reason', p_reason)
    );
  end if;

  select * into v_submission from public.spogomi_result_submissions where id = p_submission_id;
  return jsonb_build_object('submission', to_jsonb(v_submission), 'decision', p_decision);
end;
$$;

create or replace function public.validate_spogomi_submission_certification()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_regulation_status text;
begin
  if new.status in ('submitted', 'certified') then
    if exists (
      select 1
        from public.spogomi_category_rules cr
       where cr.event_id = new.event_id
         and not exists (
           select 1
             from public.spogomi_result_items ri
            where ri.submission_id = new.id
              and ri.event_id = new.event_id
              and ri.category_rule_id = cr.id
              and ri.quantity is not null
              and length(btrim(ri.provenance)) > 0
              and length(btrim(coalesce(ri.measurement_method, ''))) > 0
         )
    ) then
      raise exception using
        errcode = 'check_violation',
        message = 'A submitted SPOGOMI result must contain a measured item for every category';
    end if;
  end if;

  if new.status = 'certified' then
    select e.regulation_status
      into v_regulation_status
      from public.spogomi_events e
     where e.id = new.event_id;

    if v_regulation_status <> 'complete' then
      raise exception using
        errcode = 'check_violation',
        message = 'An incomplete SPOGOMI regulation cannot certify a submission';
    end if;

    if new.regulation_version <> (
      select e.regulation_version
        from public.spogomi_events e
       where e.id = new.event_id
    ) then
      raise exception using
        errcode = 'check_violation',
        message = 'The certified submission must use the event regulation version';
    end if;

    if not exists (
      select 1 from public.spogomi_category_rules cr where cr.event_id = new.event_id
    )
    or exists (
      select 1
        from public.spogomi_category_rules cr
       where cr.event_id = new.event_id
         and cr.is_complete = false
    ) then
      raise exception using
        errcode = 'check_violation',
        message = 'Incomplete SPOGOMI category rules cannot certify a submission';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and old.status in ('provisional', 'rejected', 'superseded')
     and new.status = 'certified' then
    raise exception using
      errcode = 'check_violation',
      message = 'A provisional, rejected or superseded submission cannot become certified';
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'certified'
     and new.status <> 'certified'
     and exists (
       select 1
         from public.spogomi_teams t
        where t.certified_submission_id = old.id
     ) then
    raise exception using
      errcode = 'restrict_violation',
      message = 'Move the team current certification before superseding it';
  end if;

  return new;
end;
$$;

create trigger spogomi_team_access_grants_set_updated_at
before update on public.spogomi_team_access_grants
for each row execute function public.set_updated_at();

create trigger spogomi_team_access_sessions_set_updated_at
before update on public.spogomi_team_access_sessions
for each row execute function public.set_updated_at();

create trigger spogomi_event_reviewers_set_updated_at
before update on public.spogomi_event_reviewers
for each row execute function public.set_updated_at();

alter table public.spogomi_team_access_grants enable row level security;
alter table public.spogomi_team_access_sessions enable row level security;
alter table public.spogomi_result_audit_events enable row level security;
alter table public.spogomi_event_reviewers enable row level security;

revoke all on table public.spogomi_team_access_grants from public, anon, authenticated;
revoke all on table public.spogomi_team_access_sessions from public, anon, authenticated;
revoke all on table public.spogomi_result_audit_events from public, anon, authenticated;
revoke all on table public.spogomi_event_reviewers from public, anon, authenticated;
grant all on table public.spogomi_team_access_grants to service_role;
grant all on table public.spogomi_team_access_sessions to service_role;
grant select, insert on table public.spogomi_result_audit_events to service_role;
grant all on table public.spogomi_event_reviewers to service_role;
revoke all on function public.spogomi_save_team_submission(uuid, uuid, uuid, text, text, text, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_save_team_submission(uuid, uuid, uuid, text, text, text, uuid, text, jsonb, text) to service_role;
revoke all on function public.spogomi_review_team_submission(uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_review_team_submission(uuid, uuid, uuid, text, text, text, text) to service_role;

create policy spogomi_team_access_grants_service_only on public.spogomi_team_access_grants
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_team_access_sessions_service_only on public.spogomi_team_access_sessions
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_result_audit_events_service_append on public.spogomi_result_audit_events
for insert with check (auth.role() = 'service_role');
create policy spogomi_result_audit_events_organizer_read on public.spogomi_result_audit_events
for select using (
  exists (
    select 1 from public.spogomi_events e
    where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);
create policy spogomi_event_reviewers_service_only on public.spogomi_event_reviewers
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- PURPOSE: server-only writes for team sessions and append-only result audit.
-- CALLER: service_role after the route has checked team session or organizer AuthZ.
-- AUTHORIZATION_BOUNDARY: RLS denies public, anon and authenticated table access.
-- IDEMPOTENCY: result submissions use (team_id, idempotency_key) when supplied.
-- ATOMICITY: multi-row transitions remain in the server orchestration boundary.
-- FAILURE_BEHAVIOR: constraints reject cross-event/team references and invalid states.
-- SEARCH_PATH: trigger functions use pg_catalog and qualify public objects.
-- GRANTS: only service_role writes; organizer reads remain policy-scoped.
