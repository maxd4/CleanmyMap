-- Action-scoped school recognition is a descriptive, reconcilable projection.
-- It must never create a personal progression event, XP, ranking, or student PII.
create table if not exists public.action_school_collective_recognitions (
  action_id uuid not null references public.actions(id) on delete cascade,
  recognition_id text not null,
  status text not null default 'active',
  proof_snapshot jsonb not null default '{}'::jsonb,
  invalidated_reason text,
  evaluated_at timestamptz not null default now(),
  evaluated_by_clerk_id text,
  primary key (action_id, recognition_id),
  constraint action_school_collective_recognitions_status_check
    check (status in ('active', 'invalidated')),
  constraint action_school_collective_recognitions_id_check
    check (recognition_id in (
      'school_first_mission',
      'school_documented_sorting',
      'school_field_debrief'
    ))
);

create index if not exists idx_action_school_collective_recognitions_status
  on public.action_school_collective_recognitions (status, recognition_id);

alter table public.action_school_collective_recognitions enable row level security;

drop policy if exists action_school_collective_recognitions_service_role_only
  on public.action_school_collective_recognitions;
create policy action_school_collective_recognitions_service_role_only
  on public.action_school_collective_recognitions
  for all to service_role
  using (true)
  with check (true);

comment on table public.action_school_collective_recognitions is
  'Reconciled non-competitive recognition for one confirmed school action; no XP, ranking, or student identity.';
comment on column public.action_school_collective_recognitions.proof_snapshot is
  'Bounded evidence snapshot only; never stores student names, grades, quiz results, or photos.';
