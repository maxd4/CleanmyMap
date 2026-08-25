-- Explicit privilege hardening for the append-only prediction evaluation ledger.
-- Keep this corrective migration separate because the table migration may already
-- be present in a shared environment. No data, columns, RLS policies, or model
-- behavior are changed here.

revoke all on table public.action_pollution_prediction_evaluations
  from anon, authenticated, service_role;

grant select, insert on table public.action_pollution_prediction_evaluations
  to service_role;
