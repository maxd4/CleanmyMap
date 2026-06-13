-- 20260601000003_action_pollution_scores.sql
-- Deux scores séparés. Aucun mélange, aucune pondération.

alter table public.actions
  add column if not exists waste_pollution_score integer
    generated always as (
      round(
        least(
          greatest((coalesce(waste_kg, 0) / 20::numeric) * 100, 0),
          100
        )
      )::integer
    ) stored,
  add column if not exists cigarette_butts_pollution_score integer
    generated always as (
      round(
        least(
          greatest((coalesce(cigarette_butts, 0)::numeric / 2000::numeric) * 100, 0),
          100
        )
      )::integer
    ) stored;
