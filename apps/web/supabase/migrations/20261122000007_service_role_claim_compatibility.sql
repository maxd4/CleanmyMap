-- PURPOSE: read the effective role from PostgREST's supported JWT claim helper
--          in privileged workers that currently inspect only the legacy GUC.
-- CALLER: the daily territorial reconciliation and its gamification projection.
-- AUTHORIZATION_BOUNDARY: function grants and the service_role equality check
--                         remain unchanged; no caller role is elevated.
-- IDEMPOTENCY: migration replaces exactly one guard in each known function.
-- ATOMICITY: all four function definitions are replaced in one migration tx.
-- FAILURE_BEHAVIOR: missing or changed source guards abort before any replace.
-- SEARCH_PATH: each function keeps its existing fixed search_path; auth.role()
--              is schema-qualified.
-- GRANTS: CREATE OR REPLACE preserves existing ownership and function grants.

do $$
declare
  v_signature regprocedure;
  v_definition text;
  v_old_guard constant text := $guard$coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'$guard$;
  v_new_guard constant text := $guard$coalesce(auth.role(), '') <> 'service_role'$guard$;
  v_signatures constant regprocedure[] := array[
    'public.set_territorial_legend_consent(text, boolean, text, timestamptz)'::regprocedure,
    'public.reconcile_territorial_legend_snapshot(date, jsonb)'::regprocedure,
    'public.reconcile_territorial_legend_snapshot(date, jsonb, timestamptz)'::regprocedure,
    'public.apply_gamification_reconciliation(text, jsonb, jsonb, jsonb, bigint[], timestamptz, jsonb, jsonb, jsonb)'::regprocedure
  ];
begin
  foreach v_signature in array v_signatures loop
    v_definition := pg_get_functiondef(v_signature);
    if position(v_old_guard in v_definition) = 0
      or (length(v_definition) - length(replace(v_definition, v_old_guard, ''))) / length(v_old_guard) <> 1 then
      raise exception 'Expected one legacy service-role guard in %.', v_signature;
    end if;
    execute replace(v_definition, v_old_guard, v_new_guard);
  end loop;
end;
$$;
