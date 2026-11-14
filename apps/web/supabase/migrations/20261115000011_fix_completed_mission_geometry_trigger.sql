-- PURPOSE: bind the stable mission-completion trigger directly to the canonical
--          trigger function. PostgreSQL does not allow a trigger-returning
--          function to be called as an ordinary SQL function.
-- CALLER: PostgreSQL invokes this function through the existing missions
--         transition trigger; no public RPC is introduced.
-- AUTHORIZATION_BOUNDARY: preserve the SECURITY DEFINER canonical function,
--                         its bounded search_path and service-only data path.
-- IDEMPOTENCY: the trigger name, transition predicate and target function are
--              recreated deterministically.
-- ATOMICITY: DDL is transactional with the migration.
-- FAILURE_BEHAVIOR: if the missions trigger cannot be replaced, the migration
--                   fails and no partial rebinding is accepted.
-- SEARCH_PATH: inherited from record_completed_mission_geometry_contribution().
-- GRANTS: trigger execution does not require a direct EXECUTE grant.

drop trigger if exists promote_completed_mission_geometry on public.missions;

create trigger promote_completed_mission_geometry
after update on public.missions
for each row
when (old.status is distinct from 'completed' and new.status = 'completed')
execute function public.record_completed_mission_geometry_contribution();
