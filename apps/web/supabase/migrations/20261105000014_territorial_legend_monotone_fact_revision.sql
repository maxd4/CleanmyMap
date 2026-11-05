-- PURPOSE: make the territorial fact watermark advance for every effective
--          canonical fact mutation, including deletes, without relying on
--          wall-clock ordering across unrelated rows.
-- CALLER: the server-side reconciliation worker invokes the exposed wrapper;
--         fact triggers maintain the watermark for all writers.
-- AUTHORIZATION_BOUNDARY: only service_role executes the privileged wrapper;
--                         the watermark table and trigger helper are private.
-- IDEMPOTENCY: repeated reads do not advance the watermark; each committed
--              effective row mutation advances it at most once per row.
-- ATOMICITY: the watermark row is locked and updated in the same transaction
--            as the source INSERT, UPDATE or DELETE.
-- FAILURE_BEHAVIOR: a failed source transaction rolls back its watermark bump;
--                   stale snapshots are rejected before publication.
-- SEARCH_PATH: SECURITY DEFINER helpers use pg_catalog, public explicitly.
-- GRANTS: the exposed three-argument RPC is service_role-only.

create table if not exists public.territorial_legend_fact_revision_state (
  singleton boolean primary key default true check (singleton),
  revision_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.territorial_legend_fact_revision_state (singleton, revision_at)
select
  true,
  greatest(
    coalesce((select max(updated_at) from public.actions), '1970-01-01 00:00:00+00'::timestamptz),
    coalesce((select max(updated_at) from public.action_participants), '1970-01-01 00:00:00+00'::timestamptz),
    coalesce((select max(updated_at) from public.territorial_legend_consents), '1970-01-01 00:00:00+00'::timestamptz),
    coalesce((select max(updated_at) from public.profiles), '1970-01-01 00:00:00+00'::timestamptz),
    clock_timestamp()
  )
on conflict (singleton) do nothing;

revoke all on table public.territorial_legend_fact_revision_state from public, anon, authenticated;
grant select, update on table public.territorial_legend_fact_revision_state to service_role;

create or replace function public.bump_territorial_legend_fact_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current_revision timestamptz;
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then
    return new;
  end if;

  select revision_at
    into v_current_revision
    from public.territorial_legend_fact_revision_state
   where singleton = true
   for update;

  update public.territorial_legend_fact_revision_state
     set revision_at = greatest(clock_timestamp(), v_current_revision + interval '1 microsecond'),
         updated_at = timezone('utc', now())
   where singleton = true;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.bump_territorial_legend_fact_revision() from public, anon, authenticated, service_role;

drop trigger if exists territorial_legend_fact_revision_actions
  on public.actions;
create trigger territorial_legend_fact_revision_actions
after insert or update or delete on public.actions
for each row execute function public.bump_territorial_legend_fact_revision();

drop trigger if exists territorial_legend_fact_revision_action_participants
  on public.action_participants;
create trigger territorial_legend_fact_revision_action_participants
after insert or update or delete on public.action_participants
for each row execute function public.bump_territorial_legend_fact_revision();

drop trigger if exists territorial_legend_fact_revision_consents
  on public.territorial_legend_consents;
create trigger territorial_legend_fact_revision_consents
after insert or update or delete on public.territorial_legend_consents
for each row execute function public.bump_territorial_legend_fact_revision();

drop trigger if exists territorial_legend_fact_revision_profiles
  on public.profiles;
create trigger territorial_legend_fact_revision_profiles
after insert or update or delete on public.profiles
for each row execute function public.bump_territorial_legend_fact_revision();

create or replace function public.get_territorial_legend_fact_revision()
returns timestamptz
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select revision_at
    from public.territorial_legend_fact_revision_state
   where singleton = true
$$;

revoke all on function public.get_territorial_legend_fact_revision() from public, anon, authenticated;
grant execute on function public.get_territorial_legend_fact_revision() to service_role;

create or replace function public.reconcile_territorial_legend_snapshot(
  p_effective_on date,
  p_winners jsonb,
  p_fact_revision timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current_revision timestamptz;
  v_result jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_fact_revision is null then
    raise exception 'territorial legend fact revision is required';
  end if;

  -- DML on these sources takes a RowExclusive lock. SHARE therefore prevents
  -- a source mutation from landing between the revision check and publication.
  lock table public.actions, public.action_participants,
    public.territorial_legend_consents, public.profiles in share mode;

  v_current_revision := public.get_territorial_legend_fact_revision();
  if p_fact_revision < v_current_revision then
    raise exception 'territorial legend snapshot was calculated from an older fact revision';
  end if;

  v_result := public.reconcile_territorial_legend_snapshot(p_effective_on, p_winners);
  return v_result;
end;
$$;

revoke all on function public.reconcile_territorial_legend_snapshot(date, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reconcile_territorial_legend_snapshot(date, jsonb, timestamptz)
  to service_role;
