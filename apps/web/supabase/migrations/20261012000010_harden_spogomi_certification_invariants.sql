-- SPOGOMI reliability follow-up: the certification boundary owns the same
-- complete-regulation contract as the TypeScript preview and serializes
-- regulation changes with certification.

create or replace function public.spogomi_regulation_is_complete(
  p_event_id uuid,
  p_regulation_version text
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
with event_config as (
  select e.*
    from public.spogomi_events e
   where e.id = p_event_id
     and e.regulation_version = p_regulation_version
     and e.regulation_status = 'complete'
), regulation_categories as (
  select cr.*
    from public.spogomi_category_rules cr
   where cr.event_id = p_event_id
), regulation_tiebreakers as (
  select value
    from event_config e
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(e.regulation_config -> 'tiebreakers') = 'array'
          then e.regulation_config -> 'tiebreakers'
        else '[]'::jsonb
      end
    ) as values(value)
), regulation_penalties as (
  select item
    from event_config e
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(e.regulation_config -> 'penalties') = 'array'
          then e.regulation_config -> 'penalties'
        else '[]'::jsonb
      end
    ) as values(item)
)
select exists (select 1 from event_config)
   and coalesce((select length(btrim(e.regulation_source_reference)) > 0 from event_config e), false)
   and exists (select 1 from regulation_categories)
   and not exists (
     select 1
       from regulation_categories cr
      where cr.regulation_version <> p_regulation_version
         or length(btrim(cr.code)) = 0
         or length(btrim(cr.label)) = 0
         or length(btrim(cr.unit)) = 0
         or cr.is_complete = false
         or cr.coefficient_status <> 'confirmed'
         or cr.coefficient is null
   )
   and coalesce((
     select jsonb_typeof(e.regulation_config -> 'rounding') = 'object'
        and jsonb_typeof(e.regulation_config #> '{rounding,decimals}') = 'number'
        and (e.regulation_config #>> '{rounding,decimals}')::numeric = trunc((e.regulation_config #>> '{rounding,decimals}')::numeric)
        and (e.regulation_config #>> '{rounding,decimals}')::numeric between 0 and 6
        and e.regulation_config #>> '{rounding,mode}' in ('half_up', 'down', 'up')
       from event_config e
   ), false)
   and coalesce((
     select jsonb_typeof(e.regulation_config -> 'eligibility') = 'object'
        and jsonb_typeof(e.regulation_config #> '{eligibility,requiresAllCategories}') = 'boolean'
        and e.regulation_config -> 'eligibility' ? 'minimumPresentParticipants'
        and (
          jsonb_typeof(e.regulation_config #> '{eligibility,minimumPresentParticipants}') = 'null'
          or (
            jsonb_typeof(e.regulation_config #> '{eligibility,minimumPresentParticipants}') = 'number'
            and (e.regulation_config #>> '{eligibility,minimumPresentParticipants}')::numeric = trunc((e.regulation_config #>> '{eligibility,minimumPresentParticipants}')::numeric)
            and (e.regulation_config #>> '{eligibility,minimumPresentParticipants}')::numeric >= 0
          )
        )
       from event_config e
   ), false)
   and coalesce((
     select jsonb_typeof(e.regulation_config -> 'tiebreakers') = 'array'
        and jsonb_array_length(e.regulation_config -> 'tiebreakers') > 0
        and jsonb_array_length(e.regulation_config -> 'tiebreakers') = (select count(distinct value) from regulation_tiebreakers)
        and not exists (
          select 1 from regulation_tiebreakers
           where value not in ('sporting_score', 'mass_grams', 'counted_objects')
        )
       from event_config e
   ), false)
   and coalesce((
     select coalesce(jsonb_typeof(e.regulation_config -> 'penalties') in ('array', 'null'), true)
        and not exists (
          select 1
            from regulation_penalties penalty
           where jsonb_typeof(penalty.item) <> 'object'
              or length(btrim(penalty.item ->> 'code')) = 0
              or length(btrim(penalty.item ->> 'label')) = 0
              or jsonb_typeof(penalty.item -> 'points') <> 'number'
        )
       from event_config e
   ), false);
$$;

create or replace function public.prevent_spogomi_regulation_change_after_submission()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.mode is distinct from new.mode
     or old.team_size_config is distinct from new.team_size_config
     or old.regulation_version is distinct from new.regulation_version
     or old.regulation_status is distinct from new.regulation_status
     or old.regulation_source_reference is distinct from new.regulation_source_reference
     or old.regulation_config is distinct from new.regulation_config then
    if old.regulation_version is not distinct from new.regulation_version then
      raise exception using
        errcode = 'check_violation',
        message = 'A SPOGOMI regulation change requires a new version';
    end if;
    if exists (
      select 1
        from public.spogomi_result_submissions rs
       where rs.event_id = old.id
         and rs.status in ('submitted', 'provisional', 'certified')
    ) then
      raise exception using
        errcode = 'serialization_failure',
        message = 'The SPOGOMI regulation is locked by a current result';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_events_regulation_change_guard on public.spogomi_events;
create trigger spogomi_events_regulation_change_guard
before update on public.spogomi_events
for each row execute function public.prevent_spogomi_regulation_change_after_submission();

create or replace function public.prevent_spogomi_rule_or_measure_change_after_submission()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event_id uuid;
begin
  if tg_op = 'DELETE' then
    v_event_id := old.event_id;
  else
    v_event_id := new.event_id;
  end if;
  if exists (
    select 1
      from public.spogomi_result_submissions rs
     where rs.event_id = v_event_id
       and rs.status in ('submitted', 'provisional', 'certified')
  ) then
    raise exception using
      errcode = 'serialization_failure',
      message = 'Current SPOGOMI results lock regulation and measurement changes';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_category_rules_current_result_guard on public.spogomi_category_rules;
create trigger spogomi_category_rules_current_result_guard
before insert or update or delete on public.spogomi_category_rules
for each row execute function public.prevent_spogomi_rule_or_measure_change_after_submission();

drop trigger if exists spogomi_result_items_current_result_guard on public.spogomi_result_items;
create trigger spogomi_result_items_current_result_guard
before insert or update or delete on public.spogomi_result_items
for each row execute function public.prevent_spogomi_rule_or_measure_change_after_submission();

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
  v_event public.spogomi_events%rowtype;
begin
  -- PURPOSE: atomically certify or reject one submitted team version.
  -- CALLER: organizer/referee route after event AuthZ and reviewer identity checks.
  -- AUTHORIZATION_BOUNDARY: function is executable only by service_role.
  -- IDEMPOTENCY: row locks and the submitted-status predicate reject concurrent decisions.
  -- ATOMICITY: regulation validation, decision, current pointer, supersession and audit commit together.
  -- FAILURE_BEHAVIOR: stale/concurrent versions or regulation changes fail closed.
  -- SEARCH_PATH: explicitly public-qualified objects under pg_catalog, public.
  -- GRANTS: service_role only.
  if p_decision not in ('certified', 'rejected') then
    raise exception using errcode = 'check_violation', message = 'Review decision is invalid';
  end if;
  if p_actor_kind not in ('organizer', 'referee') or length(btrim(coalesce(p_reviewer_clerk_id, ''))) = 0 then
    raise exception using errcode = 'insufficient_privilege', message = 'A reviewer identity is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_team_id::text, 0));
  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;

  select * into v_submission
    from public.spogomi_result_submissions
   where id = p_submission_id and event_id = p_event_id and team_id = p_team_id
   for update;
  if not found or v_submission.status <> 'submitted' then
    raise exception using errcode = 'serialization_failure', message = 'Submission is no longer awaiting review';
  end if;

  if p_decision = 'certified' then
    if not public.spogomi_regulation_is_complete(p_event_id, v_event.regulation_version)
       or v_submission.regulation_version <> v_event.regulation_version then
      raise exception using errcode = 'check_violation', message = 'A complete matching regulation is required for certification';
    end if;
    if exists (
      select 1
        from public.spogomi_category_rules cr
       where cr.event_id = p_event_id
         and not exists (
           select 1
             from public.spogomi_result_items ri
            where ri.submission_id = v_submission.id
              and ri.event_id = p_event_id
              and ri.category_rule_id = cr.id
              and ri.quantity is not null
              and length(btrim(ri.provenance)) > 0
              and length(btrim(coalesce(ri.measurement_method, ''))) > 0
         )
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
      p_reviewer_clerk_id, jsonb_build_object('reason', p_reason, 'regulation_version', v_event.regulation_version)
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
set search_path = pg_catalog, public
as $$
begin
  if new.status in ('submitted', 'certified') and exists (
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
    raise exception using errcode = 'check_violation', message = 'A submitted SPOGOMI result must contain a measured item for every category';
  end if;

  if new.status = 'certified' then
    if not public.spogomi_regulation_is_complete(new.event_id, new.regulation_version) then
      raise exception using errcode = 'check_violation', message = 'A complete matching SPOGOMI regulation is required for certification';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status in ('provisional', 'rejected', 'superseded') and new.status = 'certified' then
    raise exception using errcode = 'check_violation', message = 'A provisional, rejected or superseded submission cannot become certified';
  end if;
  if tg_op = 'UPDATE' and old.status = 'certified' and new.status <> 'certified' and exists (
    select 1 from public.spogomi_teams t where t.certified_submission_id = old.id
  ) then
    raise exception using errcode = 'restrict_violation', message = 'Move the team current certification before superseding it';
  end if;
  return new;
end;
$$;

revoke all on function public.spogomi_regulation_is_complete(uuid, text) from public, anon, authenticated;
revoke all on function public.prevent_spogomi_regulation_change_after_submission() from public, anon, authenticated;
revoke all on function public.spogomi_review_team_submission(uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_regulation_is_complete(uuid, text) to service_role;
grant execute on function public.spogomi_review_team_submission(uuid, uuid, uuid, text, text, text, text) to service_role;

comment on function public.spogomi_regulation_is_complete(uuid, text) is
  'CURRENT server-side SPOGOMI certification contract: source, version, confirmed coefficients, units, rounding, eligibility and official tiebreakers.';
comment on function public.prevent_spogomi_regulation_change_after_submission() is
  'Locks regulation changes behind a new version and prevents submitted/provisional/certified results from becoming stale.';
