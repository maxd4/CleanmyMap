-- CANDIDATE CI SMOKE ONLY. Not executed in this preparation environment.
-- Run AFTER migration on ephemeral PostgreSQL with Supabase auth.jwt() available.
-- No production data. Enclose in a transaction and roll back.
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"personal-ai-smoke-owner-A"}',true);

insert into public.personal_ai_usage_records(
  owner_clerk_id,source_identity_key,source_provider,source_version,source_granularity,
  source_content_hash,execution_environment,normalized_payload,normalization_version
) values (
  'personal-ai-smoke-owner-A','smoke-unique-A','manual','fixture','manual',
  '0123456789abcdef0123456789abcdef','cloud_api','{}'::jsonb,'test-v1'
);

insert into public.personal_ai_monthly_token_budgets(owner_clerk_id,month_utc,budget_tokens)
values('personal-ai-smoke-owner-A','2026-11-01'::date,1000);

insert into public.personal_ai_estimate_revisions(owner_clerk_id,usage_record_id,revision,method_version,factors_version,estimated_payload)
select owner_clerk_id,id,1,'test-method','test-factors','{}'::jsonb
from public.personal_ai_usage_records
where owner_clerk_id='personal-ai-smoke-owner-A' and source_identity_key='smoke-unique-A';

select set_config('request.jwt.claims','{"role":"authenticated","sub":"personal-ai-smoke-owner-B"}',true);

do $$
begin
  if exists (select 1 from public.personal_ai_usage_records where owner_clerk_id='personal-ai-smoke-owner-A') then
    raise exception 'RLS breach: B read A usage';
  end if;
  if exists (select 1 from public.personal_ai_monthly_token_budgets where owner_clerk_id='personal-ai-smoke-owner-A') then
    raise exception 'RLS breach: B read A budget';
  end if;
  if exists (select 1 from public.personal_ai_estimate_revisions where owner_clerk_id='personal-ai-smoke-owner-A') then
    raise exception 'RLS breach: B read A revision';
  end if;
  begin
    insert into public.personal_ai_usage_records(
      owner_clerk_id,source_identity_key,source_provider,source_version,source_granularity,
      source_content_hash,execution_environment,normalized_payload,normalization_version
    ) values (
      'personal-ai-smoke-owner-A','smoke-illegal-B','manual','fixture','manual',
      '0123456789abcdef0123456789abcdef','cloud_api','{}'::jsonb,'test-v1'
    );
    raise exception 'RLS breach: B inserted under A';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims','{"role":"authenticated","sub":"personal-ai-smoke-owner-A"}',true);

do $$
begin
  if not exists(select 1 from public.personal_ai_usage_records where owner_clerk_id='personal-ai-smoke-owner-A') then
    raise exception 'RLS incorrect: A cannot read own record';
  end if;
end $$;

rollback;
