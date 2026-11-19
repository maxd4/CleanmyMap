-- PURPOSE: disambiguate quota_day column vs OUT parameter in reserve_report_generation_daily_quota.
-- CALLER: Clerk-authenticated server routes through the existing service_role RPC.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: browser roles remain denied; service_role only.

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
  on conflict on constraint report_generation_daily_quota_pkey do nothing;

  if found then
    return query select true, current_quota_day;
  else
    return query select false, current_quota_day;
  end if;
end;
$$;

revoke all on function public.reserve_report_generation_daily_quota(text)
  from public, anon, authenticated;
grant execute on function public.reserve_report_generation_daily_quota(text)
  to service_role;
