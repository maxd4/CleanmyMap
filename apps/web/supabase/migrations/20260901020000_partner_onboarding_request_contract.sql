-- The runtime contract already persists these fields locally and sends them
-- to Supabase. Add the missing columns before making Supabase canonical.
alter table public.partner_onboarding_requests
  add column if not exists partner_scope text not null default 'local'
    check (partner_scope in ('local', 'france', 'national')),
  add column if not exists relay_actions text not null default '';
