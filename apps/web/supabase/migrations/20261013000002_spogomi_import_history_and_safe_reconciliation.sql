-- SPOGOMI corrective lot: preserve confirmed import rows independently from
-- the current participant provenance and allow ticket-only reconciliation.
-- Forward-only; previously published migrations remain unchanged.

create table if not exists public.spogomi_roster_import_rows (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  roster_import_id uuid not null,
  participant_id uuid not null,
  source_row_number integer not null check (source_row_number > 1),
  source_row_id text,
  source_fingerprint text not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (roster_import_id, event_id)
    references public.spogomi_roster_imports(id, event_id) on delete restrict,
  foreign key (participant_id, event_id)
    references public.spogomi_participants(id, event_id) on delete restrict,
  unique (roster_import_id, source_row_number),
  unique (roster_import_id, participant_id)
);

create index if not exists spogomi_roster_import_rows_event_import_idx
  on public.spogomi_roster_import_rows(event_id, roster_import_id, source_row_number);

alter table public.spogomi_roster_import_rows enable row level security;
revoke all on table public.spogomi_roster_import_rows from public, anon, authenticated;
grant all on table public.spogomi_roster_import_rows to service_role;

alter table public.spogomi_roster_import_changes
  drop constraint if exists spogomi_roster_import_changes_change_kind_check;

alter table public.spogomi_roster_import_changes
  add constraint spogomi_roster_import_changes_change_kind_check
  check (change_kind in (
    'ticket_status_changed',
    'ticket_cancelled',
    'ticket_reactivated',
    'ticket_order_changed',
    'ticket_advanced_order_changed',
    'ticket_identity_changed',
    'ticket_cancellation_conflict'
  ));

comment on table public.spogomi_roster_import_rows is
  'Append-only proof of the rows confirmed for an import; participant provenance may advance on a later export without changing this history.';

comment on column public.spogomi_roster_import_rows.source_snapshot is
  'Private source-row snapshot used for audit and replay; never exposed by public projections.';
