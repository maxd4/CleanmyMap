-- One successful detailed Reports export per account and Europe/Paris civil day.
-- This state is separate from report_generations so the quota remains atomic
-- even when two requests race before either snapshot is persisted.
create table if not exists public.report_generation_daily_quota (
  user_id text not null,
  quota_day date not null,
  export_count integer not null default 1,
  reserved_at timestamptz not null default now(),
  constraint report_generation_daily_quota_pkey primary key (user_id, quota_day),
  constraint report_generation_daily_quota_export_count_check check (export_count = 1)
);

alter table public.report_generation_daily_quota enable row level security;

drop policy if exists "report generation daily quota service only"
  on public.report_generation_daily_quota;
create policy "report generation daily quota service only"
  on public.report_generation_daily_quota
  for all
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

revoke all on table public.report_generation_daily_quota from public, anon, authenticated;
grant select, insert, update, delete on table public.report_generation_daily_quota to service_role;

create or replace function public.reserve_report_generation_daily_quota(p_user_id text)
returns table(allowed boolean, quota_day date)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_quota_day date := (statement_timestamp() at time zone 'Europe/Paris')::date;
begin
  if nullif(trim(p_user_id), '') is null then
    raise exception 'user id is required';
  end if;

  insert into public.report_generation_daily_quota (user_id, quota_day)
  values (trim(p_user_id), current_quota_day)
  on conflict (user_id, quota_day) do nothing;

  if found then
    return query select true, current_quota_day;
  else
    return query select false, current_quota_day;
  end if;
end;
$$;

create or replace function public.release_report_generation_daily_quota(
  p_user_id text,
  p_quota_day date
)
returns void
language sql
security definer
set search_path = public, pg_catalog
as $$
  delete from public.report_generation_daily_quota
  where user_id = trim(p_user_id)
    and quota_day = p_quota_day;
$$;

revoke all on function public.reserve_report_generation_daily_quota(text)
  from public, anon, authenticated;
grant execute on function public.reserve_report_generation_daily_quota(text)
  to service_role;
revoke all on function public.release_report_generation_daily_quota(text, date)
  from public, anon, authenticated;
grant execute on function public.release_report_generation_daily_quota(text, date)
  to service_role;
