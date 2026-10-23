-- PURPOSE: persist the optional public website and its publication consent on
-- the private onboarding request without exposing administrative contacts.
-- CALLER: the server-only onboarding persistence RPC.
-- AUTHORIZATION_BOUNDARY: public_data may contain only the independently
-- validated website URL; the consent proof stays in the private request row.
-- IDEMPOTENCY: the existing (submitted_by_user_id, idempotency_key) contract
-- returns the first committed request without applying a retry's new payload.
-- ATOMICITY: request, private consent proof and pending annuaire projection are
-- inserted by the existing single transaction.
-- FAILURE_BEHAVIOR: invalid URL/consent combinations abort the whole request.
-- SEARCH_PATH: SECURITY DEFINER function pins search_path to public, pg_temp.
-- GRANTS: the existing RPC remains service_role-only; no public table access is
-- added by this migration.

alter table public.partner_onboarding_requests
  add column if not exists public_website_url text,
  add column if not exists public_website_consent boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.partner_onboarding_requests'::regclass
      and conname = 'partner_onboarding_public_website_contract'
  ) then
    alter table public.partner_onboarding_requests
      add constraint partner_onboarding_public_website_contract
      check (
        (public_website_url is null and public_website_consent = false)
        or (public_website_url is not null
            and public_website_consent = true
            and public_website_url ~* '^https?://')
      );
  end if;
end;
$$;

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
  v_inserted_count bigint;
  v_public_website_url text;
  v_public_website_consent boolean;
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
    public_website_url, public_website_consent,
    status, creator_state
  ) values (
    p_request_id, coalesce(p_created_at, now()), p_submitted_by_user_id,
    p_submitted_by_email, p_idempotency_key, p_organization_name,
    p_organization_type, p_partner_scope, p_legal_identity, p_coverage,
    p_contribution_types, p_relay_actions, p_availability, p_contact_name,
    p_contact_channel, p_contact_details, p_motivation,
    nullif(btrim(p_public_data->>'websiteUrl'), ''),
    lower(coalesce(p_private_admin_contact->>'publicWebsiteConsent', 'false')) = 'true',
    'pending_admin_review', 'pending'
  )
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;

  select r.id
  into v_request_id
  from public.partner_onboarding_requests r
  where r.submitted_by_user_id = p_submitted_by_user_id
    and r.idempotency_key = p_idempotency_key
  for update;

  if v_request_id is null then
    raise exception 'partner onboarding idempotency resolution failed';
  end if;

  -- A retry with the same key is read-only: it cannot silently change the
  -- original consent or public URL, even if its payload differs.
  if v_inserted_count = 0 then
    return query
    select r.id, e.id, r.status, e.publication_status
    from public.partner_onboarding_requests r
    join public.partner_annuaire_entries e on e.source_request_id = r.id
    where r.id = v_request_id;
    return;
  end if;

  v_public_website_url := nullif(btrim(p_public_data->>'websiteUrl'), '');
  v_public_website_consent :=
    lower(coalesce(p_private_admin_contact->>'publicWebsiteConsent', 'false')) = 'true';

  if (v_public_website_url is null and v_public_website_consent)
     or (v_public_website_url is not null and not v_public_website_consent)
     or (v_public_website_url is not null and v_public_website_url !~* '^https?://') then
    raise exception 'invalid partner public website consent contract';
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
