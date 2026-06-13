-- 20260521000011_environmental_impact_scope_totals.sql

alter table public.environmental_impact_snapshots
  add column if not exists site_kg_co2e_proxy numeric(14,6),
  add column if not exists user_kg_co2e_proxy numeric(14,6);
