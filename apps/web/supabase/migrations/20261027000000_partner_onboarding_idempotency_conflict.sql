-- PURPOSE: make a replay of a partner onboarding request safe without
-- accepting a different payload under the same actor-scoped idempotency key.
-- CALLER: the server-only partner onboarding persistence owner.
-- AUTHORIZATION_BOUNDARY: the existing service_role-only RPC and ownership
-- predicate remain unchanged; this migration does not grant client access.
-- IDEMPOTENCY: the first committed request is replayed only when every
-- persisted input field, actor email and public-consent projection matches.
-- ATOMICITY: the comparison and request/projection reconciliation stay inside
-- the existing single transaction and row lock.
-- FAILURE_BEHAVIOR: a same-key payload, actor metadata or scope mismatch
-- raises a deterministic conflict and does not create or mutate a request.
-- SEARCH_PATH: SECURITY DEFINER function pins search_path to public, pg_temp.
-- GRANTS: the existing service_role-only function signature is preserved.

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
  v_existing_actor text;
  v_inserted_count bigint;
  v_public_website_url text;
  v_public_website_consent boolean;
  v_expected_engagement_types text[] := '{}'::text[];
begin
  if nullif(btrim(p_submitted_by_user_id), '') is null
     or nullif(btrim(p_idempotency_key), '') is null
     or nullif(btrim(p_entry_id), '') is null
     or jsonb_typeof(p_public_data) <> 'object'
     or jsonb_typeof(p_private_admin_contact) <> 'object' then
    raise exception 'invalid partner onboarding creation contract';
  end if;

  -- The existing unique index is actor-scoped for historical compatibility.
  -- Serialize the key itself as well so two actors cannot win a new key at
  -- the same time and turn an actor mismatch into two accepted requests.
  perform pg_advisory_xact_lock(hashtext(p_idempotency_key));

  select r.id, r.submitted_by_user_id
  into v_request_id, v_existing_actor
  from public.partner_onboarding_requests r
  where r.idempotency_key = p_idempotency_key
  order by r.created_at asc
  limit 1
  for update;

  if v_existing_actor is not null
     and v_existing_actor is distinct from p_submitted_by_user_id then
    raise exception 'partner onboarding idempotency conflict'
      using errcode = 'P0001';
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

  v_public_website_url := nullif(btrim(p_public_data->>'websiteUrl'), '');
  v_public_website_consent :=
    lower(coalesce(p_private_admin_contact->>'publicWebsiteConsent', 'false')) = 'true';

  if p_public_data->>'engagementTypesSource' = 'partner_declaration' then
    select coalesce(array_agg(item.value order by item.ordinality), '{}'::text[])
    into v_expected_engagement_types
    from jsonb_array_elements_text(p_public_data->'types')
      with ordinality as item(value, ordinality);
  end if;

  if v_inserted_count = 0 then
    if exists (
      select 1
      from public.partner_onboarding_requests r
      where r.id = v_request_id
        and r.submitted_by_email is distinct from p_submitted_by_email
        or r.id = v_request_id
        and r.organization_name is distinct from p_organization_name
        or r.id = v_request_id
        and r.organization_type is distinct from p_organization_type
        or r.id = v_request_id
        and r.partner_scope is distinct from p_partner_scope
        or r.id = v_request_id
        and r.legal_identity is distinct from p_legal_identity
        or r.id = v_request_id
        and r.coverage is distinct from p_coverage
        or r.id = v_request_id
        and r.contribution_types is distinct from p_contribution_types
        or r.id = v_request_id
        and r.engagement_types is distinct from v_expected_engagement_types
        or r.id = v_request_id
        and r.relay_actions is distinct from p_relay_actions
        or r.id = v_request_id
        and r.availability is distinct from p_availability
        or r.id = v_request_id
        and r.contact_name is distinct from p_contact_name
        or r.id = v_request_id
        and r.contact_channel is distinct from p_contact_channel
        or r.id = v_request_id
        and r.contact_details is distinct from p_contact_details
        or r.id = v_request_id
        and r.motivation is distinct from p_motivation
        or r.id = v_request_id
        and r.public_website_url is distinct from v_public_website_url
        or r.id = v_request_id
        and r.public_website_consent is distinct from v_public_website_consent
    ) then
      raise exception 'partner onboarding idempotency conflict'
        using errcode = 'P0001';
    end if;

    return query
    select r.id, e.id, r.status, e.publication_status
    from public.partner_onboarding_requests r
    join public.partner_annuaire_entries e on e.source_request_id = r.id
    where r.id = v_request_id;
    return;
  end if;

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
