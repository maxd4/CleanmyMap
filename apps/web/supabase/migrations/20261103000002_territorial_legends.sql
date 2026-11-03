-- Territorial Legends are a separate, opt-in public projection. They do not
-- change XP leaderboards or the current progression definitions.
--
-- PURPOSE: retain one owner-scoped consent with a non-retroactive activation
-- boundary for the territorial ranking.
-- CALLER: authenticated web API after Clerk authentication and age-band gate.
-- AUTHORIZATION_BOUNDARY: the owner may read/write only its own consent; the
-- public ranking never reads this table directly from an anonymous client.
-- IDEMPOTENCY: PATCH replaces the current state for one user.
-- ATOMICITY: one consent row is updated in one statement.
-- FAILURE_BEHAVIOR: failed validation or persistence leaves the prior state.
-- SEARCH_PATH: explicit on the trigger function.
-- GRANTS: no anonymous access; authenticated owner policies and service_role.

create table if not exists public.territorial_legend_consents (
  user_id text primary key,
  enabled boolean not null default false,
  age_band text not null default 'unknown',
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint territorial_legend_consents_age_band_check
    check (age_band in ('under_15', '15_or_over', 'unknown')),
  constraint territorial_legend_consents_state_check
    check (
      (enabled = false)
      or (activated_at is not null and revoked_at is null)
    )
);

create index if not exists territorial_legend_consents_enabled_idx
  on public.territorial_legend_consents (enabled, activated_at);

create or replace function public.update_territorial_legend_consent_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists territorial_legend_consents_updated_at
  on public.territorial_legend_consents;
create trigger territorial_legend_consents_updated_at
before update on public.territorial_legend_consents
for each row execute function public.update_territorial_legend_consent_updated_at();

alter table public.territorial_legend_consents enable row level security;

revoke all on table public.territorial_legend_consents from public, anon;
grant select, insert, update on table public.territorial_legend_consents to authenticated;
grant all on table public.territorial_legend_consents to service_role;

drop policy if exists territorial_legend_consents_owner_select
  on public.territorial_legend_consents;
create policy territorial_legend_consents_owner_select
on public.territorial_legend_consents
for select
to authenticated
using (user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

drop policy if exists territorial_legend_consents_owner_insert
  on public.territorial_legend_consents;
create policy territorial_legend_consents_owner_insert
on public.territorial_legend_consents
for insert
to authenticated
with check (user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

drop policy if exists territorial_legend_consents_owner_update
  on public.territorial_legend_consents;
create policy territorial_legend_consents_owner_update
on public.territorial_legend_consents
for update
to authenticated
using (user_id = coalesce((select auth.jwt()) ->> 'sub', ''))
with check (user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

comment on table public.territorial_legend_consents is
  'Private, separate consent for Territorial Legends. enabled is false by default and activated_at prevents retroactive competition.';
