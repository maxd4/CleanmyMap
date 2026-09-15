-- Keep action registrations server-only while satisfying the explicit RLS
-- policy contract for browser roles. This migration is append-only; the
-- existing grants and RLS hardening remain unchanged.

alter table public.action_registrations enable row level security;

create policy action_registrations_browser_deny
on public.action_registrations
for all
to anon, authenticated
using (false)
with check (false);
