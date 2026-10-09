-- PURPOSE: make final participation an explicit, reviewable terrain claim.
-- CALLER: existing action and action_organizers triggers remain attached, but
--          these compatibility functions deliberately perform no participant write.
-- AUTHORIZATION_BOUNDARY: explicit participation mutations keep their existing
--                         authenticated/admin review and RLS boundaries.
-- IDEMPOTENCY: no-op trigger functions cannot create duplicate or implicit rows.
-- ATOMICITY: action creation, phase updates, organizer changes and restore keep
--            their existing transaction boundaries; no participant side effect is added.
-- FAILURE_BEHAVIOR: explicit post_action_claim/review errors remain unchanged;
--                   automatic initialization is retired without touching rows.
-- SEARCH_PATH: every function pins public, pg_catalog.
-- GRANTS: preserve service_role-only execution for the retained compatibility surface.

-- The function name is retained so deployed callers and historical trigger
-- definitions remain resolvable. It is intentionally inert: creating,
-- organizing or finalizing an action never proves field participation.
create or replace function public.initialize_action_final_participants(p_action_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  return;
end;
$$;

revoke all on function public.initialize_action_final_participants(uuid) from public, anon, authenticated;
grant execute on function public.initialize_action_final_participants(uuid) to service_role;

-- Keep the installed trigger and its restore compatibility surface, but make
-- its action-phase callback side-effect free.
create or replace function public.initialize_action_final_participants_on_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  return new;
end;
$$;

-- Adding or changing an organizer is an authorization/ownership change only;
-- it is never a confirmation of that user's terrain presence.
create or replace function public.initialize_action_final_participants_on_organizer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  return new;
end;
$$;

revoke all on function public.initialize_action_final_participants_on_action() from public, anon, authenticated;
revoke all on function public.initialize_action_final_participants_on_organizer() from public, anon, authenticated;
grant execute on function public.initialize_action_final_participants_on_action() to service_role;
grant execute on function public.initialize_action_final_participants_on_organizer() to service_role;
