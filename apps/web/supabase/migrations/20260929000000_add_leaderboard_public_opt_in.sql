-- Public leaderboard visibility is an explicit, user-owned preference.
-- Existing profiles stay private because the default is false.
alter table public.profiles
  add column if not exists leaderboard_public_opt_in boolean not null default false;

alter table public.profiles
  alter column leaderboard_public_opt_in set default false;

grant update (leaderboard_public_opt_in)
on table public.profiles
to authenticated;

comment on column public.profiles.leaderboard_public_opt_in is
  'Explicit user consent for the sanitized CURRENT user leaderboard projection; false by default.';
