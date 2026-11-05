-- PURPOSE: reject territorial snapshots calculated from an older canonical fact
--          revision when another same-day reconciliation has already advanced.
-- CALLER: the server-side reconciliation worker, service_role only.
-- AUTHORIZATION_BOUNDARY: the legacy two-argument writer is no longer exposed;
--                         publication requires an explicit source watermark.
-- IDEMPOTENCY: the existing temporal reconciliation function remains the sole
--              writer and keeps its replay/history semantics.
-- ATOMICITY: source tables are locked in SHARE mode before the watermark is
--            compared and the existing advisory locks serialize publication.
-- FAILURE_BEHAVIOR: stale or missing watermarks fail before any mutation.

create or replace function public.get_territorial_legend_fact_revision()
returns timestamptz
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    greatest(
      (select max(updated_at) from public.actions),
      (select max(updated_at) from public.action_participants),
      (select max(updated_at) from public.territorial_legend_consents),
      (select max(updated_at) from public.profiles)
    ),
    '1970-01-01 00:00:00+00'::timestamptz
  )
$$;

revoke all on function public.get_territorial_legend_fact_revision() from public, anon, authenticated;
grant execute on function public.get_territorial_legend_fact_revision() to service_role;

drop function if exists public.reconcile_territorial_legend_snapshot(date, jsonb, timestamptz);
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

revoke all on function public.reconcile_territorial_legend_snapshot(date, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.reconcile_territorial_legend_snapshot(date, jsonb, timestamptz)
  to service_role;
