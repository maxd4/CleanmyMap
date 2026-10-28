-- Codex activity is observed, but its physical CO2e factor is intentionally
-- unavailable. Keep SQL persistence aligned with the runtime NA contract.

alter table public.codex_usage_weekly_snapshots
  alter column estimated_kg_co2e_proxy drop not null,
  alter column estimated_kg_co2e_proxy drop default;
