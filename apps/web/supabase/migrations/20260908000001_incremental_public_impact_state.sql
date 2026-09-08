-- IMPACT-2026-02: maintain the public Impact terrain aggregate incrementally.
-- The existing load_public_landing_action_summary(date) RPC remains the full
-- rebuild oracle. The normal monthly path reads only the state below.

create table if not exists public.public_impact_action_contributions (
  action_id uuid primary key references public.actions(id) on delete cascade,
  source_updated_at timestamptz not null,
  action_date date not null,
  eligible_non_temporal boolean not null,
  location_label text,
  waste_kg numeric not null default 0 check (waste_kg >= 0),
  cigarette_butts bigint not null default 0 check (cigarette_butts >= 0),
  participants_total bigint not null default 0 check (participants_total >= 0),
  duration_minutes bigint not null default 0 check (duration_minutes >= 0),
  category_key text not null,
  category_label text not null,
  warning_code text,
  butts_condition text,
  butts_condition_count bigint not null default 0 check (butts_condition_count >= 0),
  methodology_version text not null default 'impact-terrain-public-2026.09-v2',
  projected_at timestamptz not null default now()
);

create index if not exists idx_public_impact_action_contributions_action_date
  on public.public_impact_action_contributions(action_date);

create index if not exists idx_public_impact_action_contributions_updated_at
  on public.public_impact_action_contributions(source_updated_at);

create table if not exists public.public_impact_action_aggregate_state (
  state_id boolean primary key default true check (state_id),
  floor_date date not null,
  initialized_at timestamptz,
  methodology_version text not null default 'impact-terrain-public-2026.09-v2',
  visible_actions bigint not null default 0 check (visible_actions >= 0),
  distinct_locations bigint not null default 0 check (distinct_locations >= 0),
  waste_kg numeric not null default 0 check (waste_kg >= 0),
  cigarette_butts bigint not null default 0 check (cigarette_butts >= 0),
  participants_total bigint not null default 0 check (participants_total >= 0),
  total_duration_minutes bigint not null default 0 check (total_duration_minutes >= 0),
  updated_at timestamptz not null default now()
);

insert into public.public_impact_action_aggregate_state (state_id, floor_date)
values (true, (current_date - 365))
on conflict (state_id) do nothing;

create table if not exists public.public_impact_action_location_counts (
  location_label text primary key,
  action_count bigint not null check (action_count > 0)
);

create table if not exists public.public_impact_action_distribution_counts (
  category_key text primary key,
  category_label text not null,
  action_count bigint not null check (action_count > 0)
);

create table if not exists public.public_impact_action_warning_counts (
  warning_code text primary key,
  warning_count bigint not null check (warning_count > 0)
);

create table if not exists public.public_impact_action_butt_condition_counts (
  condition text primary key,
  cigarette_butts bigint not null check (cigarette_butts > 0)
);

comment on table public.public_impact_action_contributions is
  'Service-only projection of public.actions used to apply reversible Impact terrain deltas.';
comment on table public.public_impact_action_aggregate_state is
  'Service-only incremental public Impact terrain state; public.actions remains canonical.';

alter table public.public_impact_action_contributions enable row level security;
alter table public.public_impact_action_aggregate_state enable row level security;
alter table public.public_impact_action_location_counts enable row level security;
alter table public.public_impact_action_distribution_counts enable row level security;
alter table public.public_impact_action_warning_counts enable row level security;
alter table public.public_impact_action_butt_condition_counts enable row level security;

drop policy if exists public_impact_action_contributions_service_only
  on public.public_impact_action_contributions;
create policy public_impact_action_contributions_service_only
  on public.public_impact_action_contributions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists public_impact_action_aggregate_state_service_only
  on public.public_impact_action_aggregate_state;
create policy public_impact_action_aggregate_state_service_only
  on public.public_impact_action_aggregate_state
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists public_impact_action_location_counts_service_only
  on public.public_impact_action_location_counts;
create policy public_impact_action_location_counts_service_only
  on public.public_impact_action_location_counts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists public_impact_action_distribution_counts_service_only
  on public.public_impact_action_distribution_counts;
create policy public_impact_action_distribution_counts_service_only
  on public.public_impact_action_distribution_counts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists public_impact_action_warning_counts_service_only
  on public.public_impact_action_warning_counts;
create policy public_impact_action_warning_counts_service_only
  on public.public_impact_action_warning_counts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists public_impact_action_butt_condition_counts_service_only
  on public.public_impact_action_butt_condition_counts;
create policy public_impact_action_butt_condition_counts_service_only
  on public.public_impact_action_butt_condition_counts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

revoke all on table public.public_impact_action_contributions from public, anon, authenticated;
revoke all on table public.public_impact_action_aggregate_state from public, anon, authenticated;
revoke all on table public.public_impact_action_location_counts from public, anon, authenticated;
revoke all on table public.public_impact_action_distribution_counts from public, anon, authenticated;
revoke all on table public.public_impact_action_warning_counts from public, anon, authenticated;
revoke all on table public.public_impact_action_butt_condition_counts from public, anon, authenticated;
grant all on table public.public_impact_action_contributions to service_role;
grant all on table public.public_impact_action_aggregate_state to service_role;
grant all on table public.public_impact_action_location_counts to service_role;
grant all on table public.public_impact_action_distribution_counts to service_role;
grant all on table public.public_impact_action_warning_counts to service_role;
grant all on table public.public_impact_action_butt_condition_counts to service_role;

create or replace function public.build_public_impact_action_contribution(
  p_action public.actions
)
returns public.public_impact_action_contributions
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
with source_action as (
  select
    p_action.id as action_id,
    p_action.updated_at as source_updated_at,
    p_action.action_date,
    p_action.status,
    p_action.moderation_visibility,
    nullif(btrim(p_action.location_label), '') as location_label,
    greatest(
      0::numeric,
      coalesce(p_action.waste_kg, 0::numeric),
      coalesce(
        nullif(
          (
            regexp_match(
              p_action.notes,
              '(?m)^\[cmm-meta\][^\r\n]*"megotsKg"\s*:\s*([-+]?[0-9]+(\.[0-9]+)?)'
            )
          )[1],
          ''
        )::numeric,
        0::numeric
      ),
      greatest(coalesce(p_action.cigarette_butts, 0), 0)::numeric / 2500::numeric
    ) as waste_kg,
    greatest(coalesce(p_action.cigarette_butts, 0), 0)::bigint as cigarette_butts,
    greatest(coalesce(p_action.volunteers_count, 0), 0)::bigint as participants_total,
    greatest(coalesce(p_action.duration_minutes, 0), 0)::bigint as duration_minutes,
    nullif(btrim(p_action.organizer_type), '') as organizer_type,
    nullif(
      (
        regexp_match(
          p_action.notes,
          '(?m)"megotsCondition"\s*:\s*"(propre|humide|mouille)"'
        )
      )[1],
      ''
    ) as butts_condition,
    lower(
      concat_ws(
        ' ',
        p_action.id::text,
        'actions',
        coalesce(p_action.location_label, ''),
        coalesce(p_action.actor_name, ''),
        coalesce(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                coalesce(p_action.notes, ''),
                '(?mi)^\[cmm-meta\].*(\r?\n|$)',
                '',
                'g'
              ),
              '(?mi)^\[google-sheet-sync\][ \t]*(\r?\n|$)',
              '',
              'g'
            ),
            '(?mi)^association\s*:\s*.*(\r?\n|$)',
            '',
            'g'
          ),
          ''
        )
      )
    ) as marker_text
), classified as (
  select
    s.*,
    case
      when s.organizer_type = 'spontaneous' and s.participants_total > 0
        then 'spontaneous:' || s.participants_total::text
      when s.organizer_type in (
        'company', 'association', 'student_association', 'collective', 'other'
      ) then s.organizer_type
      else 'other'
    end as category_key,
    case
      when s.organizer_type = 'spontaneous' and s.participants_total = 1 then 'Solo'
      when s.organizer_type = 'spontaneous' and s.participants_total = 2 then 'Duo'
      when s.organizer_type = 'spontaneous' and s.participants_total = 3 then 'Trio'
      when s.organizer_type = 'spontaneous' and s.participants_total = 4 then 'Quatuor'
      when s.organizer_type = 'spontaneous' and s.participants_total = 5 then 'Quintet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 6 then 'Sextet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 7 then 'Septet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 8 then 'Octet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 9 then 'Nonet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 10 then 'Décet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 11 then 'Undécet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 12 then 'Duodécet'
      when s.organizer_type = 'company' then 'Entreprise'
      when s.organizer_type = 'association' then 'Association'
      when s.organizer_type = 'student_association' then 'Association étudiante'
      when s.organizer_type = 'collective' then 'Collectif'
      else case
        when s.organizer_type = 'spontaneous' and s.participants_total > 12
          then 'Groupe de ' || s.participants_total::text || ' participants'
        else 'Autres'
      end
    end as category_label,
    case
      when s.organizer_type is null then 'missing_organizer_type'
      when s.organizer_type not in (
        'spontaneous', 'company', 'association', 'student_association', 'collective', 'other'
      ) then 'invalid_organizer_type'
      when s.organizer_type = 'spontaneous' and s.participants_total < 1
        then 'invalid_spontaneous_participant_count'
      else null
    end as warning_code,
    (
      s.status = 'approved'
      and coalesce(s.moderation_visibility, 'visible') = 'visible'
      and s.marker_text not like '%test%'
      and s.marker_text not like '%demo%'
      and s.marker_text not like '%seed%'
      and s.marker_text not like '%dummy%'
      and s.marker_text not like '%fake%'
      and s.marker_text not like '%exemple%'
    ) as eligible_non_temporal
  from source_action s
)
select
  action_id,
  source_updated_at,
  action_date,
  eligible_non_temporal,
  location_label,
  waste_kg,
  cigarette_butts,
  participants_total,
  duration_minutes,
  category_key,
  category_label,
  warning_code,
  butts_condition,
  case when butts_condition is null then 0 else cigarette_butts end as butts_condition_count,
  'impact-terrain-public-2026.09-v2' as methodology_version,
  now() as projected_at
from classified;
$$;

revoke all on function public.build_public_impact_action_contribution(public.actions)
  from public, anon, authenticated;
grant execute on function public.build_public_impact_action_contribution(public.actions)
  to service_role;

create or replace function public.public_impact_adjust_contribution(
  p_contribution public.public_impact_action_contributions,
  p_sign integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
  v_location_count bigint;
  v_location_delta bigint := 0;
begin
  if p_sign not in (-1, 1) then
    raise exception 'Invalid public Impact contribution delta sign: %', p_sign;
  end if;

  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true
  for update;

  if not found or v_state.initialized_at is null then
    return;
  end if;

  if not p_contribution.eligible_non_temporal
     or p_contribution.action_date < v_state.floor_date then
    return;
  end if;

  if v_state.visible_actions + p_sign < 0
     or v_state.waste_kg + (p_sign * p_contribution.waste_kg) < 0
     or v_state.cigarette_butts + (p_sign * p_contribution.cigarette_butts) < 0
     or v_state.participants_total + (p_sign * p_contribution.participants_total) < 0
     or v_state.total_duration_minutes + (p_sign * p_contribution.duration_minutes) < 0 then
    raise exception 'Public Impact aggregate would become negative for action %', p_contribution.action_id;
  end if;

  if p_contribution.location_label is not null then
    select action_count into v_location_count
    from public.public_impact_action_location_counts
    where location_label = p_contribution.location_label
    for update;

    if p_sign = 1 then
      if v_location_count is null then
        insert into public.public_impact_action_location_counts(location_label, action_count)
        values (p_contribution.location_label, 1);
        v_location_delta := 1;
      else
        update public.public_impact_action_location_counts
        set action_count = action_count + 1
        where location_label = p_contribution.location_label;
      end if;
    else
      if v_location_count is null or v_location_count <= 0 then
        raise exception 'Missing public Impact location counter for %', p_contribution.location_label;
      elsif v_location_count = 1 then
        delete from public.public_impact_action_location_counts
        where location_label = p_contribution.location_label;
        v_location_delta := -1;
      else
        update public.public_impact_action_location_counts
        set action_count = action_count - 1
        where location_label = p_contribution.location_label;
      end if;
    end if;
  end if;

  if v_state.distinct_locations + v_location_delta < 0 then
    raise exception 'Public Impact distinct location counter would become negative';
  end if;

  update public.public_impact_action_aggregate_state
  set visible_actions = visible_actions + p_sign,
      distinct_locations = distinct_locations + v_location_delta,
      waste_kg = waste_kg + (p_sign * p_contribution.waste_kg),
      cigarette_butts = cigarette_butts + (p_sign * p_contribution.cigarette_butts),
      participants_total = participants_total + (p_sign * p_contribution.participants_total),
      total_duration_minutes = total_duration_minutes + (p_sign * p_contribution.duration_minutes),
      updated_at = now()
  where state_id = true;

  if p_sign = 1 then
    insert into public.public_impact_action_distribution_counts(category_key, category_label, action_count)
    values (p_contribution.category_key, p_contribution.category_label, 1)
    on conflict (category_key) do update
      set category_label = excluded.category_label,
          action_count = public.public_impact_action_distribution_counts.action_count + 1;
  else
    update public.public_impact_action_distribution_counts
    set action_count = action_count - 1
    where category_key = p_contribution.category_key
      and action_count > 0;
    if not found then
      raise exception 'Missing public Impact distribution counter for %', p_contribution.category_key;
    end if;
    delete from public.public_impact_action_distribution_counts
    where category_key = p_contribution.category_key and action_count = 0;
  end if;

  if p_contribution.warning_code is not null then
    if p_sign = 1 then
      insert into public.public_impact_action_warning_counts(warning_code, warning_count)
      values (p_contribution.warning_code, 1)
      on conflict (warning_code) do update
        set warning_count = public.public_impact_action_warning_counts.warning_count + 1;
    else
      update public.public_impact_action_warning_counts
      set warning_count = warning_count - 1
      where warning_code = p_contribution.warning_code
        and warning_count > 0;
      if not found then
        raise exception 'Missing public Impact warning counter for %', p_contribution.warning_code;
      end if;
      delete from public.public_impact_action_warning_counts
      where warning_code = p_contribution.warning_code and warning_count = 0;
    end if;
  end if;

  if p_contribution.butts_condition is not null
     and p_contribution.butts_condition_count > 0 then
    if p_sign = 1 then
      insert into public.public_impact_action_butt_condition_counts(condition, cigarette_butts)
      values (p_contribution.butts_condition, p_contribution.butts_condition_count)
      on conflict (condition) do update
        set cigarette_butts = public.public_impact_action_butt_condition_counts.cigarette_butts
          + excluded.cigarette_butts;
    else
      update public.public_impact_action_butt_condition_counts
      set cigarette_butts = cigarette_butts - p_contribution.butts_condition_count
      where condition = p_contribution.butts_condition
        and cigarette_butts >= p_contribution.butts_condition_count;
      if not found then
        raise exception 'Missing public Impact butt condition counter for %', p_contribution.butts_condition;
      end if;
      delete from public.public_impact_action_butt_condition_counts
      where condition = p_contribution.butts_condition and cigarette_butts = 0;
    end if;
  end if;
end;
$$;

revoke all on function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) from public, anon, authenticated;
grant execute on function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) to service_role;

create or replace function public.sync_public_impact_action_contribution()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous public.public_impact_action_contributions%rowtype;
  v_next public.public_impact_action_contributions%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));

  if tg_op = 'UPDATE' then
    select * into v_previous
    from public.public_impact_action_contributions
    where action_id = old.id
    for update;
    if found then
      perform public.public_impact_adjust_contribution(v_previous, -1);
      delete from public.public_impact_action_contributions where action_id = old.id;
    end if;
  end if;

  select (public.build_public_impact_action_contribution(new)).* into v_next;
  insert into public.public_impact_action_contributions
  select v_next.*
  on conflict (action_id) do update set
    source_updated_at = excluded.source_updated_at,
    action_date = excluded.action_date,
    eligible_non_temporal = excluded.eligible_non_temporal,
    location_label = excluded.location_label,
    waste_kg = excluded.waste_kg,
    cigarette_butts = excluded.cigarette_butts,
    participants_total = excluded.participants_total,
    duration_minutes = excluded.duration_minutes,
    category_key = excluded.category_key,
    category_label = excluded.category_label,
    warning_code = excluded.warning_code,
    butts_condition = excluded.butts_condition,
    butts_condition_count = excluded.butts_condition_count,
    methodology_version = excluded.methodology_version,
    projected_at = excluded.projected_at;
  perform public.public_impact_adjust_contribution(v_next, 1);
  return new;
end;
$$;

create or replace function public.remove_public_impact_action_contribution()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous public.public_impact_action_contributions%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));
  select * into v_previous
  from public.public_impact_action_contributions
  where action_id = old.id
  for update;
  if found then
    perform public.public_impact_adjust_contribution(v_previous, -1);
    delete from public.public_impact_action_contributions where action_id = old.id;
  end if;
  return old;
end;
$$;

revoke all on function public.sync_public_impact_action_contribution() from public, anon, authenticated;
revoke all on function public.remove_public_impact_action_contribution() from public, anon, authenticated;
grant execute on function public.sync_public_impact_action_contribution() to service_role;
grant execute on function public.remove_public_impact_action_contribution() to service_role;

drop trigger if exists trg_public_impact_action_contribution_sync on public.actions;
create trigger trg_public_impact_action_contribution_sync
after insert or update on public.actions
for each row execute function public.sync_public_impact_action_contribution();

drop trigger if exists trg_public_impact_action_contribution_delete on public.actions;
create trigger trg_public_impact_action_contribution_delete
before delete on public.actions
for each row execute function public.remove_public_impact_action_contribution();

create or replace function public.advance_public_impact_action_state(p_floor_date date)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
  v_contribution public.public_impact_action_contributions%rowtype;
begin
  if p_floor_date is null then
    raise exception 'Impact floor date is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));
  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true
  for update;

  if not found or v_state.initialized_at is null then
    raise exception 'Public Impact incremental state is not initialized; run rebuild=true';
  end if;
  if p_floor_date < v_state.floor_date then
    raise exception 'Impact floor date cannot move backwards from % to %', v_state.floor_date, p_floor_date;
  end if;

  for v_contribution in
    select *
    from public.public_impact_action_contributions
    where eligible_non_temporal
      and action_date >= v_state.floor_date
      and action_date < p_floor_date
  loop
    perform public.public_impact_adjust_contribution(v_contribution, -1);
  end loop;

  update public.public_impact_action_aggregate_state
  set floor_date = p_floor_date, updated_at = now()
  where state_id = true;
end;
$$;

revoke all on function public.advance_public_impact_action_state(date) from public, anon, authenticated;
grant execute on function public.advance_public_impact_action_state(date) to service_role;

create or replace function public.load_public_landing_action_summary_incremental()
returns table (
  visible_actions bigint,
  distinct_locations bigint,
  waste_kg numeric,
  cigarette_butts bigint,
  volunteers bigint,
  participants_total bigint,
  total_duration_minutes bigint,
  action_distribution jsonb,
  classification_warnings jsonb,
  butts_by_condition jsonb
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
begin
  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true;
  if not found or v_state.initialized_at is null then
    raise exception 'Public Impact incremental state is not initialized; run rebuild=true';
  end if;

  return query
  select
    v_state.visible_actions,
    v_state.distinct_locations,
    v_state.waste_kg,
    v_state.cigarette_butts,
    v_state.participants_total,
    v_state.participants_total,
    v_state.total_duration_minutes,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key', d.category_key,
            'category', d.category_label,
            'count', d.action_count
          )
          order by
            case when d.category_key like 'spontaneous:%' then 1 else 2 end,
            case when d.category_key like 'spontaneous:%'
              then split_part(d.category_key, ':', 2)::bigint
              else 0::bigint
            end,
            d.category_label
        )
        from public.public_impact_action_distribution_counts d
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('code', w.warning_code, 'count', w.warning_count)
          order by w.warning_code
        )
        from public.public_impact_action_warning_counts w
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('condition', b.condition, 'count', b.cigarette_butts)
          order by b.condition
        )
        from public.public_impact_action_butt_condition_counts b
      ),
      '[]'::jsonb
    );
end;
$$;

revoke all on function public.load_public_landing_action_summary_incremental() from public, anon, authenticated;
grant execute on function public.load_public_landing_action_summary_incremental() to service_role;

create or replace function public.rebuild_public_impact_action_state(p_floor_date date)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_contribution public.public_impact_action_contributions%rowtype;
begin
  if p_floor_date is null then
    raise exception 'Impact floor date is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));

  delete from public.public_impact_action_location_counts;
  delete from public.public_impact_action_distribution_counts;
  delete from public.public_impact_action_warning_counts;
  delete from public.public_impact_action_butt_condition_counts;
  delete from public.public_impact_action_contributions;
  update public.public_impact_action_aggregate_state
  set floor_date = p_floor_date,
      initialized_at = null,
      visible_actions = 0,
      distinct_locations = 0,
      waste_kg = 0,
      cigarette_butts = 0,
      participants_total = 0,
      total_duration_minutes = 0,
      methodology_version = 'impact-terrain-public-2026.09-v2',
      updated_at = now()
  where state_id = true;

  insert into public.public_impact_action_contributions
  select (public.build_public_impact_action_contribution(a)).*
  from public.actions a;

  update public.public_impact_action_aggregate_state
  set initialized_at = now(), updated_at = now()
  where state_id = true;

  for v_contribution in
    select *
    from public.public_impact_action_contributions
    where eligible_non_temporal and action_date >= p_floor_date
  loop
    perform public.public_impact_adjust_contribution(v_contribution, 1);
  end loop;
end;
$$;

revoke all on function public.rebuild_public_impact_action_state(date) from public, anon, authenticated;
grant execute on function public.rebuild_public_impact_action_state(date) to service_role;
