-- SPOGOMI lot 2: organizer preparation, private roster imports and official route reference.
-- Orchestration contract: PARTIAL_ALLOWED. A creation attempt retains its action id
-- and can resume the event link without creating a second canonical action.

alter table public.spogomi_events
  add column location_label text not null default 'Lieu à préciser'
    check (length(btrim(location_label)) > 0),
  add column idempotency_key text,
  add column creation_contract text not null default 'PARTIAL_ALLOWED'
    check (creation_contract = 'PARTIAL_ALLOWED'),
  add column creation_state text not null default 'ready'
    check (creation_state in ('action_pending', 'event_pending', 'ready', 'failed_recoverable'));

create unique index spogomi_events_idempotency_key_unique
  on public.spogomi_events(idempotency_key)
  where idempotency_key is not null;

create table public.spogomi_event_creation_attempts (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  created_by_clerk_id text not null,
  action_id uuid references public.actions(id) on delete restrict,
  event_id uuid references public.spogomi_events(id) on delete restrict,
  state text not null default 'action_pending'
    check (state in ('action_pending', 'event_pending', 'ready', 'failed_recoverable')),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table public.spogomi_roster_imports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  import_key text not null,
  file_name text not null check (length(btrim(file_name)) > 0 and length(file_name) <= 255),
  format text not null check (format in ('csv', 'xlsx')),
  column_mapping jsonb not null default '{}'::jsonb,
  status text not null default 'confirmed' check (status in ('previewed', 'confirmed', 'failed')),
  source_row_count integer not null default 0 check (source_row_count >= 0),
  imported_by_clerk_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, content_sha256),
  unique (event_id, import_key),
  unique (id, event_id)
);

alter table public.spogomi_participants
  add column roster_import_id uuid,
  add column source_row_number integer,
  add column source_row_id text,
  add column source_fingerprint text,
  add column group_preference text,
  add constraint spogomi_participants_roster_import_fk
    foreign key (roster_import_id, event_id)
    references public.spogomi_roster_imports(id, event_id)
    on delete restrict,
  add constraint spogomi_participants_source_row_number_check
    check (source_row_number is null or source_row_number > 1);

create unique index spogomi_participants_import_row_unique
  on public.spogomi_participants(event_id, roster_import_id, source_row_number)
  where roster_import_id is not null and source_row_number is not null;

create index spogomi_participants_source_fingerprint_idx
  on public.spogomi_participants(event_id, source_fingerprint)
  where source_fingerprint is not null;

create table public.spogomi_event_routes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.spogomi_events(id) on delete cascade,
  action_id uuid not null unique references public.actions(id) on delete restrict,
  source text not null default 'official_reference' check (source = 'official_reference'),
  file_name text not null check (length(btrim(file_name)) > 0),
  point_count integer not null check (point_count >= 2),
  reference_distance_km numeric not null check (reference_distance_km >= 0),
  inferred_topology text not null check (inferred_topology in ('loop', 'point_to_point')),
  geometry_geojson jsonb not null,
  imported_by_clerk_id text not null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spogomi_event_routes_action_id_idx on public.spogomi_event_routes(action_id);

create trigger spogomi_event_creation_attempts_set_updated_at
before update on public.spogomi_event_creation_attempts
for each row execute function public.set_updated_at();

create trigger spogomi_roster_imports_set_updated_at
before update on public.spogomi_roster_imports
for each row execute function public.set_updated_at();

create trigger spogomi_event_routes_set_updated_at
before update on public.spogomi_event_routes
for each row execute function public.set_updated_at();

alter table public.spogomi_event_creation_attempts enable row level security;
alter table public.spogomi_roster_imports enable row level security;
alter table public.spogomi_event_routes enable row level security;

revoke all on table public.spogomi_event_creation_attempts from public, anon, authenticated;
revoke all on table public.spogomi_roster_imports from public, anon, authenticated;
revoke all on table public.spogomi_event_routes from public, anon, authenticated;

grant all on table public.spogomi_event_creation_attempts to service_role;
grant all on table public.spogomi_roster_imports to service_role;
grant all on table public.spogomi_event_routes to service_role;
grant select on table public.spogomi_event_routes to authenticated;

create policy spogomi_event_routes_service_write on public.spogomi_event_routes
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy spogomi_event_routes_organizer_read on public.spogomi_event_routes
for select using (
  exists (
    select 1 from public.spogomi_events e
    where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);

comment on column public.spogomi_event_routes.reference_distance_km is
  'Distance calculée du parcours officiel de référence ; jamais une distance observée sur le terrain.';
comment on column public.spogomi_events.creation_contract is
  'Lot 2 uses PARTIAL_ALLOWED with idempotent recovery through spogomi_event_creation_attempts.';
