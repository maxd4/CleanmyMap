-- 20260627000006_storage_usage_business_contributions.sql

alter table public.supabase_storage_usage_snapshots
  add column if not exists business_contributions jsonb not null default '{}'::jsonb;
