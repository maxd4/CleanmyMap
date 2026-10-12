-- SPOGOMI lot 1: domain foundation only.
-- No public UI, Excel import, score engine or projection into actions is created here.

create table public.spogomi_events (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.actions(id) on delete restrict,
  created_by_clerk_id text not null,
  name text not null check (length(btrim(name)) > 0),
  mode text not null check (mode in ('casual', 'world_cup')),
  state text not null default 'draft' check (
    state in (
      'draft', 'registration_open', 'composition_locked', 'in_progress',
      'judging', 'certified', 'archived', 'cancelled'
    )
  ),
  starts_at timestamptz not null,
  ends_at timestamptz,
  team_size_config jsonb not null default '{}'::jsonb,
  regulation_version text not null check (length(btrim(regulation_version)) > 0),
  regulation_status text not null default 'incomplete' check (
    regulation_status in ('incomplete', 'complete')
  ),
  regulation_source_reference text,
  regulation_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.spogomi_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  team_number integer not null check (team_number > 0),
  public_name text not null check (length(btrim(public_name)) > 0),
  composition_state text not null default 'draft' check (
    composition_state in ('draft', 'locked', 'verified')
  ),
  certified_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id),
  unique (event_id, team_number)
);

create table public.spogomi_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  team_id uuid,
  external_reference text,
  display_name text,
  registration_status text not null default 'registered' check (
    registration_status in ('registered', 'withdrawn')
  ),
  attendance_status text not null default 'unknown' check (
    attendance_status in ('unknown', 'present', 'absent')
  ),
  account_link_status text not null default 'unlinked' check (
    account_link_status in ('unlinked', 'pending', 'verified', 'rejected')
  ),
  clerk_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, event_id)
    references public.spogomi_teams(id, event_id)
    on delete restrict,
  check (
    (account_link_status = 'verified' and clerk_id is not null and length(btrim(clerk_id)) > 0)
    or (account_link_status <> 'verified' and clerk_id is null)
  )
);

create unique index spogomi_participants_event_external_reference_unique
  on public.spogomi_participants(event_id, external_reference)
  where external_reference is not null;

create table public.spogomi_category_rules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  regulation_version text not null check (length(btrim(regulation_version)) > 0),
  code text not null check (length(btrim(code)) > 0),
  label text not null check (length(btrim(label)) > 0),
  measurement_kind text not null check (measurement_kind in ('mass', 'count', 'volume')),
  unit text not null check (length(btrim(unit)) > 0),
  coefficient numeric,
  coefficient_status text not null default 'unknown' check (
    coefficient_status in ('unknown', 'confirmed', 'not_applicable')
  ),
  environmental_category_slug text,
  display_order integer not null default 0,
  is_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id),
  unique (event_id, regulation_version, code),
  check (
    (coefficient_status = 'confirmed' and coefficient is not null)
    or (coefficient_status <> 'confirmed')
  )
);

create table public.spogomi_result_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  team_id uuid not null,
  version integer not null check (version > 0),
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'provisional', 'certified', 'rejected', 'superseded')
  ),
  regulation_version text not null check (length(btrim(regulation_version)) > 0),
  submitted_by_clerk_id text,
  submitted_at timestamptz,
  certified_by_clerk_id text,
  certified_at timestamptz,
  replaces_submission_id uuid,
  correction_reason text,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, event_id)
    references public.spogomi_teams(id, event_id)
    on delete cascade,
  foreign key (replaces_submission_id, event_id)
    references public.spogomi_result_submissions(id, event_id)
    on delete restrict,
  unique (id, event_id),
  unique (id, team_id),
  unique (team_id, version),
  check (status <> 'certified' or (certified_by_clerk_id is not null and certified_at is not null)),
  check (status in ('draft', 'rejected') or submitted_at is not null),
  check (replaces_submission_id is null or replaces_submission_id <> id)
);

create table public.spogomi_result_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  submission_id uuid not null,
  category_rule_id uuid not null,
  measurement_kind text not null check (measurement_kind in ('mass', 'count', 'volume')),
  unit text not null check (length(btrim(unit)) > 0),
  quantity numeric not null check (quantity >= 0),
  provenance text not null check (length(btrim(provenance)) > 0),
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (submission_id, event_id)
    references public.spogomi_result_submissions(id, event_id)
    on delete cascade,
  foreign key (category_rule_id, event_id)
    references public.spogomi_category_rules(id, event_id)
    on delete restrict,
  unique (submission_id, category_rule_id),
  check (measurement_kind <> 'count' or quantity = trunc(quantity))
);

create table public.spogomi_result_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  submission_id uuid not null,
  decision text not null check (decision in ('certified', 'rejected', 'superseded')),
  reviewer_clerk_id text not null,
  reason text,
  replaces_submission_id uuid,
  decided_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb,
  foreign key (submission_id, event_id)
    references public.spogomi_result_submissions(id, event_id)
    on delete cascade,
  foreign key (replaces_submission_id, event_id)
    references public.spogomi_result_submissions(id, event_id)
    on delete restrict,
  check (replaces_submission_id is null or replaces_submission_id <> submission_id)
);

alter table public.spogomi_teams
  add constraint spogomi_teams_certified_submission_same_team_fk
  foreign key (certified_submission_id, id)
  references public.spogomi_result_submissions(id, team_id)
  on delete restrict;

create index spogomi_teams_event_id_idx on public.spogomi_teams(event_id);
create index spogomi_participants_event_id_idx on public.spogomi_participants(event_id);
create index spogomi_participants_team_id_idx on public.spogomi_participants(team_id);
create index spogomi_category_rules_event_id_idx on public.spogomi_category_rules(event_id);
create index spogomi_result_submissions_event_id_idx on public.spogomi_result_submissions(event_id);
create index spogomi_result_submissions_team_id_idx on public.spogomi_result_submissions(team_id);
create index spogomi_result_items_submission_id_idx on public.spogomi_result_items(submission_id);
create index spogomi_result_reviews_submission_id_idx on public.spogomi_result_reviews(submission_id);

create or replace function public.is_spogomi_action_organizer(p_action_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.action_organizers ao
      where ao.action_id = p_action_id
        and ao.organizer_clerk_id = coalesce(auth.jwt() ->> 'sub', '')
    );
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

create or replace function public.validate_spogomi_result_item()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_measurement_kind text;
  v_unit text;
begin
  select cr.measurement_kind, cr.unit
    into v_measurement_kind, v_unit
    from public.spogomi_category_rules cr
   where cr.id = new.category_rule_id
     and cr.event_id = new.event_id;

  if v_measurement_kind is distinct from new.measurement_kind
     or v_unit is distinct from new.unit then
    raise exception using
      errcode = 'check_violation',
      message = 'A SPOGOMI result item must keep the category measurement kind and unit';
  end if;

  return new;
end;
$$;

create or replace function public.validate_spogomi_team_certification()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_submission_status text;
begin
  if new.certified_submission_id is null then
    return new;
  end if;

  select rs.status
    into v_submission_status
    from public.spogomi_result_submissions rs
   where rs.id = new.certified_submission_id
     and rs.team_id = new.id;

  if v_submission_status is distinct from 'certified' then
    raise exception using
      errcode = 'check_violation',
      message = 'A team current certification must reference a certified submission';
  end if;

  return new;
end;
$$;

create trigger spogomi_events_set_updated_at
before update on public.spogomi_events
for each row execute function public.set_updated_at();

create trigger spogomi_teams_set_updated_at
before update on public.spogomi_teams
for each row execute function public.set_updated_at();

create trigger spogomi_participants_set_updated_at
before update on public.spogomi_participants
for each row execute function public.set_updated_at();

create trigger spogomi_category_rules_set_updated_at
before update on public.spogomi_category_rules
for each row execute function public.set_updated_at();

create trigger spogomi_result_submissions_set_updated_at
before update on public.spogomi_result_submissions
for each row execute function public.set_updated_at();

create trigger spogomi_result_items_set_updated_at
before update on public.spogomi_result_items
for each row execute function public.set_updated_at();

create trigger spogomi_submission_certification_guard
before insert or update of status, event_id on public.spogomi_result_submissions
for each row execute function public.validate_spogomi_submission_certification();

create trigger spogomi_result_item_measurement_guard
before insert or update of event_id, category_rule_id, measurement_kind, unit
on public.spogomi_result_items
for each row execute function public.validate_spogomi_result_item();

create trigger spogomi_team_certification_guard
before insert or update of certified_submission_id, id on public.spogomi_teams
for each row execute function public.validate_spogomi_team_certification();

alter table public.spogomi_events enable row level security;
alter table public.spogomi_teams enable row level security;
alter table public.spogomi_participants enable row level security;
alter table public.spogomi_category_rules enable row level security;
alter table public.spogomi_result_submissions enable row level security;
alter table public.spogomi_result_items enable row level security;
alter table public.spogomi_result_reviews enable row level security;

revoke all on table public.spogomi_events from public, anon, authenticated;
revoke all on table public.spogomi_teams from public, anon, authenticated;
revoke all on table public.spogomi_participants from public, anon, authenticated;
revoke all on table public.spogomi_category_rules from public, anon, authenticated;
revoke all on table public.spogomi_result_submissions from public, anon, authenticated;
revoke all on table public.spogomi_result_items from public, anon, authenticated;
revoke all on table public.spogomi_result_reviews from public, anon, authenticated;

grant all on table public.spogomi_events to service_role;
grant all on table public.spogomi_teams to service_role;
grant all on table public.spogomi_participants to service_role;
grant all on table public.spogomi_category_rules to service_role;
grant all on table public.spogomi_result_submissions to service_role;
grant all on table public.spogomi_result_items to service_role;
grant select, insert on table public.spogomi_result_reviews to service_role;

grant select on table public.spogomi_events to authenticated;
grant select on table public.spogomi_teams to authenticated;
grant select on table public.spogomi_category_rules to authenticated;
grant select on table public.spogomi_result_submissions to authenticated;
grant select on table public.spogomi_result_items to authenticated;
grant select on table public.spogomi_result_reviews to authenticated;

create policy spogomi_events_service_write on public.spogomi_events
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_events_organizer_read on public.spogomi_events
for select using (public.is_spogomi_action_organizer(action_id));

create policy spogomi_teams_service_write on public.spogomi_teams
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_teams_organizer_read on public.spogomi_teams
for select using (
  exists (
    select 1 from public.spogomi_events e
    where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);

create policy spogomi_participants_service_only on public.spogomi_participants
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy spogomi_category_rules_service_write on public.spogomi_category_rules
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_category_rules_organizer_read on public.spogomi_category_rules
for select using (
  exists (
    select 1 from public.spogomi_events e
    where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);

create policy spogomi_result_submissions_service_write on public.spogomi_result_submissions
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_result_submissions_organizer_read on public.spogomi_result_submissions
for select using (
  exists (
    select 1 from public.spogomi_events e
    where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);

create policy spogomi_result_items_service_write on public.spogomi_result_items
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_result_items_organizer_read on public.spogomi_result_items
for select using (
  exists (
    select 1
      from public.spogomi_events e
     where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);

create policy spogomi_result_reviews_service_append on public.spogomi_result_reviews
for insert with check (auth.role() = 'service_role');
create policy spogomi_result_reviews_organizer_read on public.spogomi_result_reviews
for select using (
  exists (
    select 1 from public.spogomi_events e
    where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);

revoke all on function public.is_spogomi_action_organizer(uuid) from public;
grant execute on function public.is_spogomi_action_organizer(uuid) to authenticated, service_role;
revoke all on function public.validate_spogomi_submission_certification() from public;
revoke all on function public.validate_spogomi_team_certification() from public;
revoke all on function public.validate_spogomi_result_item() from public;
