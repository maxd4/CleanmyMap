-- Append-only, server-side ledger for prospective repollution predictions.
-- No current observations are backfilled by this migration.

create table if not exists public.action_pollution_prediction_evaluations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  evaluation_observation_type text not null check (evaluation_observation_type in ('action', 'spot')),
  evaluation_observation_id uuid not null,
  evaluation_observed_at timestamptz not null,
  previous_observation_type text not null check (previous_observation_type in ('action', 'spot')),
  previous_observation_id uuid not null,
  previous_observed_at timestamptz not null,
  predicted_score numeric not null check (predicted_score >= 0 and predicted_score <= 100),
  observed_score numeric not null check (observed_score >= 0 and observed_score <= 100),
  signed_error numeric not null,
  absolute_error numeric not null check (absolute_error >= 0),
  squared_error numeric not null check (squared_error >= 0),
  elapsed_days numeric not null check (elapsed_days >= 0),
  historical_score numeric not null check (historical_score >= 0 and historical_score <= 100),
  post_action_score numeric not null check (post_action_score >= 0 and post_action_score <= 100),
  post_action_score_source text not null check (post_action_score_source in ('measured', 'model_baseline')),
  t80_days numeric not null check (t80_days > 0),
  projection_provenance text not null check (projection_provenance in ('generic', 'local_history')),
  calibration_confidence text not null check (calibration_confidence in ('insufficient', 'low', 'medium', 'high')),
  model_version text not null,
  model_snapshot jsonb not null default '{}'::jsonb,
  spatial_match_distance_m numeric not null check (spatial_match_distance_m >= 0),
  spatial_match_method text not null check (spatial_match_method in ('distance_only', 'distance_and_label')),
  evaluation_mode text not null check (evaluation_mode in ('online_frozen', 'retrospective_replay')),
  derived_place_key_snapshot text,
  constraint action_pollution_prediction_evaluations_idempotency_key
    unique (evaluation_observation_type, evaluation_observation_id, model_version)
);

create index if not exists action_pollution_prediction_evaluations_observed_at_idx
  on public.action_pollution_prediction_evaluations (evaluation_observed_at desc);

alter table public.action_pollution_prediction_evaluations enable row level security;

drop policy if exists action_pollution_prediction_evaluations_service_read
  on public.action_pollution_prediction_evaluations;
drop policy if exists action_pollution_prediction_evaluations_service_insert
  on public.action_pollution_prediction_evaluations;

create policy action_pollution_prediction_evaluations_service_read
  on public.action_pollution_prediction_evaluations
  for select
  to service_role
  using (auth.role() = 'service_role');

create policy action_pollution_prediction_evaluations_service_insert
  on public.action_pollution_prediction_evaluations
  for insert
  to service_role
  with check (auth.role() = 'service_role');

revoke all on table public.action_pollution_prediction_evaluations from anon, authenticated;
grant select, insert on table public.action_pollution_prediction_evaluations to service_role;

comment on table public.action_pollution_prediction_evaluations is
  'Append-only prospective evaluation ledger; derived_place_key_snapshot is diagnostic only and not a stable place identity.';
