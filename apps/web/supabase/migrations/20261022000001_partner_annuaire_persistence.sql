-- PURPOSE: make partner annuaire entries canonical in Supabase and keep the
-- onboarding request, public projection, review decision and audit coherent.
-- CALLER: server-only service_role RPCs invoked by the protected web API.
-- AUTHORIZATION_BOUNDARY: table access and both RPCs are denied to public,
-- anon and authenticated; HTTP AuthN/AuthZ remains in the application.
-- IDEMPOTENCY: request creation uses (submitted_by_user_id, idempotency_key)
-- and source_request_id is unique for the annuaire entry.
-- ATOMICITY: creation and review each run in one PostgreSQL transaction.
-- FAILURE_BEHAVIOR: any constraint or audit failure rolls back the mutation;
-- the caller can retry with the same idempotency/operation identifier.
-- SEARCH_PATH: SECURITY DEFINER functions pin search_path to public, pg_temp.
-- GRANTS: only service_role may execute the RPCs or access the table.

alter table public.partner_onboarding_requests
  add column if not exists idempotency_key text;

create unique index if not exists uq_partner_onboarding_requests_idempotency
  on public.partner_onboarding_requests(submitted_by_user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.partner_annuaire_entries (
  id text primary key,
  source_request_id uuid not null references public.partner_onboarding_requests(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  publication_status text not null default 'pending_admin_review'
    check (publication_status in ('pending_admin_review', 'accepted', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by_user_id text,
  public_data jsonb not null check (jsonb_typeof(public_data) = 'object'),
  private_admin_contact jsonb not null default '{}'::jsonb
    check (jsonb_typeof(private_admin_contact) = 'object'),
  unique (source_request_id),
  check (
    publication_status = 'pending_admin_review'
    or (reviewed_at is not null and nullif(btrim(reviewed_by_user_id), '') is not null)
  )
);

create index if not exists idx_partner_annuaire_entries_publication
  on public.partner_annuaire_entries(publication_status, published_at desc);

create index if not exists idx_partner_annuaire_entries_source_request
  on public.partner_annuaire_entries(source_request_id);

alter table public.partner_annuaire_entries enable row level security;

drop policy if exists partner_annuaire_entries_service_only
  on public.partner_annuaire_entries;
create policy partner_annuaire_entries_service_only
on public.partner_annuaire_entries
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

revoke all privileges on table public.partner_annuaire_entries
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.partner_annuaire_entries to service_role;

-- Non-destructive reconciliation for requests that predate the canonical
-- annuaire table. They stay pending until an authorized admin reviews them.
insert into public.partner_annuaire_entries (
  id,
  source_request_id,
  created_at,
  updated_at,
  published_at,
  publication_status,
  public_data,
  private_admin_contact
)
select
  'onboarded-' || r.id::text,
  r.id,
  r.created_at,
  r.created_at,
  r.created_at,
  'pending_admin_review',
  jsonb_build_object(
    'id', 'onboarded-' || r.id::text,
    'name', r.organization_name,
    'legalIdentity', r.legal_identity,
    'kind', case r.organization_type
      when 'association' then 'association'
      when 'commerce' then 'commerce'
      when 'entreprise' then 'entreprise'
      else 'groupe_parole'
    end,
    'scope', r.partner_scope,
    'types', case r.organization_type
      when 'commerce' then jsonb_build_array('social')
      when 'entreprise' then jsonb_build_array('environnemental', 'social')
      else jsonb_build_array('social', 'environnemental')
    end,
    'description', left(concat_ws(' · ', nullif(btrim(r.motivation), ''),
      case when nullif(btrim(r.relay_actions), '') is null then null
        else 'Relais: ' || btrim(r.relay_actions) end), 1000),
    'location', case when r.partner_scope = 'local' then 'Paris' else
      case r.partner_scope when 'national' then 'Association nationale' else 'France' end end,
    'lat', case when r.partner_scope = 'local' then 48.8566 else 46.603354 end,
    'lng', case when r.partner_scope = 'local' then 2.3522 else 1.888334 end,
    'coveredArrondissements', coalesce(r.coverage->'arrondissements', '[]'::jsonb),
    'contributionTypes', to_jsonb(r.contribution_types),
    'availability', coalesce(r.availability->>'note', ''),
    'tags', '[]'::jsonb,
    'verificationStatus', 'en_cours',
    'qualificationStatus', 'contact_non_qualifie',
    'provenance', 'published_partner',
    'lastUpdatedAt', r.created_at,
    'recentActivityAt', r.created_at
  ),
  jsonb_build_object(
    'referentName', r.contact_name,
    'email', case when position('@' in r.contact_details) > 0 then r.contact_details else 'non communiqué' end,
    'phone', case when position('@' in r.contact_details) = 0 then r.contact_details else 'non communiqué' end
  )
from public.partner_onboarding_requests r
where not exists (
  select 1
  from public.partner_annuaire_entries e
  where e.source_request_id = r.id
);

create or replace function public.create_partner_onboarding_request_with_annuaire(
  p_request_id uuid,
  p_entry_id text,
  p_created_at timestamptz,
  p_submitted_by_user_id text,
  p_submitted_by_email text,
  p_idempotency_key text,
  p_organization_name text,
  p_organization_type text,
  p_partner_scope text,
  p_legal_identity text,
  p_coverage jsonb,
  p_contribution_types text[],
  p_relay_actions text,
  p_availability jsonb,
  p_contact_name text,
  p_contact_channel text,
  p_contact_details text,
  p_motivation text,
  p_public_data jsonb,
  p_private_admin_contact jsonb
)
returns table(request_id uuid, entry_id text, request_status text, publication_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid;
begin
  if nullif(btrim(p_submitted_by_user_id), '') is null
     or nullif(btrim(p_idempotency_key), '') is null
     or nullif(btrim(p_entry_id), '') is null
     or jsonb_typeof(p_public_data) <> 'object'
     or jsonb_typeof(p_private_admin_contact) <> 'object' then
    raise exception 'invalid partner onboarding creation contract';
  end if;

  insert into public.partner_onboarding_requests (
    id, created_at, submitted_by_user_id, submitted_by_email, idempotency_key,
    organization_name, organization_type, partner_scope, legal_identity,
    coverage, contribution_types, relay_actions, availability,
    contact_name, contact_channel, contact_details, motivation,
    status, creator_state
  ) values (
    p_request_id, coalesce(p_created_at, now()), p_submitted_by_user_id,
    p_submitted_by_email, p_idempotency_key, p_organization_name,
    p_organization_type, p_partner_scope, p_legal_identity, p_coverage,
    p_contribution_types, p_relay_actions, p_availability, p_contact_name,
    p_contact_channel, p_contact_details, p_motivation,
    'pending_admin_review', 'pending'
  )
  on conflict do nothing;

  select r.id
  into v_request_id
  from public.partner_onboarding_requests r
  where r.submitted_by_user_id = p_submitted_by_user_id
    and r.idempotency_key = p_idempotency_key
  for update;

  if v_request_id is null then
    raise exception 'partner onboarding idempotency resolution failed';
  end if;

  insert into public.partner_annuaire_entries (
    id, source_request_id, created_at, updated_at, published_at,
    publication_status, public_data, private_admin_contact
  ) values (
    p_entry_id, v_request_id, coalesce(p_created_at, now()), now(),
    coalesce(p_created_at, now()), 'pending_admin_review',
    p_public_data, p_private_admin_contact
  )
  on conflict (source_request_id) do nothing;

  return query
  select r.id, e.id, r.status, e.publication_status
  from public.partner_onboarding_requests r
  join public.partner_annuaire_entries e on e.source_request_id = r.id
  where r.id = v_request_id;
end;
$$;

revoke all on function public.create_partner_onboarding_request_with_annuaire(
  uuid, text, timestamptz, text, text, text, text, text, text, text, jsonb,
  text[], text, jsonb, text, text, text, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_partner_onboarding_request_with_annuaire(
  uuid, text, timestamptz, text, text, text, text, text, text, text, jsonb,
  text[], text, jsonb, text, text, text, text, jsonb, jsonb
) to service_role;

create or replace function public.review_partner_publication(
  p_entry_id text,
  p_publication_status text,
  p_reviewed_by_user_id text,
  p_operation_id text,
  p_reason text
)
returns setof public.partner_annuaire_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry public.partner_annuaire_entries%rowtype;
  v_previous_status text;
  v_previous_verification text;
begin
  if p_publication_status not in ('accepted', 'rejected')
     or nullif(btrim(p_reviewed_by_user_id), '') is null
     or nullif(btrim(p_operation_id), '') is null
     or char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'invalid partner publication review contract';
  end if;

  -- A retried HTTP request with the same operation id returns the committed
  -- decision without creating a second audit row.
  if exists (
    select 1 from public.admin_operations_audit a
    where a.operation_id = p_operation_id
      and a.target_id = p_entry_id
      and a.operation_type = 'admin_operation'
      and a.details->>'operation' = 'review_partner_publication'
  ) then
    return query select e.* from public.partner_annuaire_entries e where e.id = p_entry_id;
    return;
  end if;

  select e.*
  into v_entry
  from public.partner_annuaire_entries e
  join public.partner_onboarding_requests r on r.id = e.source_request_id
  where e.id = p_entry_id
  for update of e, r;

  if not found then
    raise exception 'partner publication entry not found';
  end if;

  v_previous_status := v_entry.publication_status;
  v_previous_verification := coalesce(v_entry.public_data->>'verificationStatus', 'unknown');

  update public.partner_onboarding_requests
  set status = p_publication_status,
      creator_state = case when p_publication_status = 'accepted' then 'accepted' else 'rejected' end
  where id = v_entry.source_request_id;

  update public.partner_annuaire_entries
  set publication_status = p_publication_status,
      reviewed_at = now(),
      reviewed_by_user_id = p_reviewed_by_user_id,
      updated_at = now(),
      public_data = jsonb_set(
        jsonb_set(public_data, '{verificationStatus}', to_jsonb(
          case when p_publication_status = 'accepted' then 'verifie' else 'a_revalider' end
        )),
        '{lastUpdatedAt}', to_jsonb(now())
      )
  where id = p_entry_id
  returning * into v_entry;

  insert into public.admin_operations_audit (
    operation_id, at, actor_user_id, operation_type, outcome, target_id, details
  ) values (
    p_operation_id, now(), p_reviewed_by_user_id, 'admin_operation', 'success', p_entry_id,
    jsonb_build_object(
      'operation', 'review_partner_publication',
      'reason', btrim(p_reason),
      'sourceRequestId', v_entry.source_request_id,
      'previousValue', jsonb_build_object(
        'publicationStatus', v_previous_status,
        'verificationStatus', v_previous_verification
      ),
      'newValue', jsonb_build_object(
        'publicationStatus', v_entry.publication_status,
        'verificationStatus', v_entry.public_data->>'verificationStatus'
      ),
      'partialMutation', false
    )
  );

  return next v_entry;
end;
$$;

revoke all on function public.review_partner_publication(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.review_partner_publication(text, text, text, text, text)
  to service_role;
