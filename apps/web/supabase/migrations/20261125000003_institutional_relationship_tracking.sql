-- Private server-only institutional relationship tracking.
-- Never exposed to public projections, anon, or authenticated roles.
-- Visual distinctions are derived at read time from verified facts, never persisted as redundant flags.

create table if not exists public.institutional_relationship_contacts (
  id text primary key,
  institutional_node_id text,
  display_name text not null,
  role_label text,
  is_publicly_publishable boolean not null default false,
  revalidation_status text not null default 'a_revalider'
    check (revalidation_status in ('verifie', 'a_revalider', 'retire')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institutional_relationship_facts (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null references public.institutional_relationship_contacts(id) on delete cascade,
  kind text not null
    check (kind in (
      'direct_exchange',
      'outreach',
      'meeting',
      'commitment',
      'followup',
      'note',
      'explicit_support',
      'completed_contribution'
    )),
  origin text not null
    check (origin in ('direct', 'third_party', 'public_source')),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'verified', 'withdrawn')),
  evidence_ref text not null,
  summary text not null,
  occurred_at timestamptz,
  support_target text
    check (support_target is null or support_target in ('cleanmymap', 'third_party')),
  contribution_role text
    check (contribution_role is null or contribution_role in ('participation', 'organization', 'logistics', 'coordination')),
  activity_kind text
    check (activity_kind is null or activity_kind in ('cleanmymap_action', 'external_event')),
  activity_ref text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_institutional_relationship_facts_contact_id
  on public.institutional_relationship_facts (contact_id);

alter table public.institutional_relationship_contacts enable row level security;
alter table public.institutional_relationship_facts enable row level security;

revoke all on table public.institutional_relationship_contacts from anon, authenticated, public;
revoke all on table public.institutional_relationship_facts from anon, authenticated, public;

grant select, insert, update, delete on table public.institutional_relationship_contacts to service_role;
grant select, insert, update, delete on table public.institutional_relationship_facts to service_role;
