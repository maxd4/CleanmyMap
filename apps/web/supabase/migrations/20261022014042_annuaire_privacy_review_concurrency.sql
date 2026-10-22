-- PURPOSE: close the partner annuaire privacy projection and serialize review
-- operations without rewriting the published persistence migration.
-- CALLER: the server-only service_role review RPC and the canonical public read.
-- AUTHORIZATION_BOUNDARY: only service_role may read/write annuaire rows and
-- execute the review RPC; the cleanup never changes private_admin_contact.
-- IDEMPOTENCY: operation_id is globally unique; an exact replay returns the
-- committed entry, while any contradictory reuse raises an exception.
-- ATOMICITY: the review lock, request/entry mutation and audit insert share one
-- PostgreSQL transaction; the privacy cleanup is one append-only migration.
-- FAILURE_BEHAVIOR: duplicate audit ids abort before the unique index is made;
-- any review validation, conflict or audit failure rolls back the decision.
-- SEARCH_PATH: SECURITY DEFINER review RPC pins search_path to public, pg_temp.
-- GRANTS: review RPC and annuaire table remain service_role-only.

do $$
begin
  if exists (
    select 1
    from public.admin_operations_audit
    group by operation_id
    having count(*) > 1
  ) then
    raise exception 'cannot add unique operation_id index: existing duplicates require reconciliation';
  end if;
end;
$$;

create unique index if not exists uq_admin_operations_audit_operation_id
  on public.admin_operations_audit(operation_id);

-- Remove only contact-shaped public projections. Independent https links and
-- the canonical private_admin_contact object are intentionally preserved.
with base as (
  select
    id,
    public_data
      - case when lower(coalesce(public_data->>'primaryChannel', '')) like 'mailto:%'
                   or lower(coalesce(public_data->>'primaryChannel', '')) like 'tel:%'
              then 'primaryChannel' else '__no_private_primary_channel__' end
      - case when lower(coalesce(public_data->>'websiteUrl', '')) like 'mailto:%'
                   or lower(coalesce(public_data->>'websiteUrl', '')) like 'tel:%'
              then 'websiteUrl' else '__no_private_website__' end
      - case when lower(coalesce(public_data->>'instagramUrl', '')) like 'mailto:%'
                   or lower(coalesce(public_data->>'instagramUrl', '')) like 'tel:%'
              then 'instagramUrl' else '__no_private_instagram__' end
      - case when lower(coalesce(public_data->>'facebookUrl', '')) like 'mailto:%'
                   or lower(coalesce(public_data->>'facebookUrl', '')) like 'tel:%'
              then 'facebookUrl' else '__no_private_facebook__' end as public_data
  from public.partner_annuaire_entries
  where public_data::text ~* 'mailto:|tel:|contact direct'
), cleaned as (
  select
    id,
    case
      when jsonb_typeof(public_data #> '{associationProfile,usefulResources}') = 'array'
        then jsonb_set(
          public_data,
          '{associationProfile,usefulResources}',
          coalesce(
            (
              select jsonb_agg(resource order by ordinality)
              from jsonb_array_elements(public_data #> '{associationProfile,usefulResources}')
                with ordinality as resources(resource, ordinality)
              where lower(coalesce(resource->>'label', '')) <> 'contact direct'
                and lower(coalesce(resource->>'url', '')) not like 'mailto:%'
                and lower(coalesce(resource->>'url', '')) not like 'tel:%'
            ),
            '[]'::jsonb
          )
        )
      else public_data
    end as public_data
  from base
)
update public.partner_annuaire_entries entries
set public_data = cleaned.public_data
from cleaned
where entries.id = cleaned.id;

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
  v_existing_audit public.admin_operations_audit%rowtype;
  v_previous_status text;
  v_previous_verification text;
  v_existing_status text;
begin
  if p_publication_status not in ('accepted', 'rejected')
     or nullif(btrim(p_reviewed_by_user_id), '') is null
     or nullif(btrim(p_operation_id), '') is null
     or char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'invalid partner publication review contract';
  end if;

  -- All callers sharing an operation id enter the same transaction-critical
  -- section before reading the audit row or locking the business records.
  perform pg_advisory_xact_lock(hashtextextended(btrim(p_operation_id), 0));

  select a.*
  into v_existing_audit
  from public.admin_operations_audit a
  where a.operation_id = btrim(p_operation_id)
  for update;

  if found then
    v_existing_status := v_existing_audit.details #>> '{newValue,publicationStatus}';
    if v_existing_audit.operation_type <> 'admin_operation'
       or v_existing_audit.target_id is distinct from p_entry_id
       or v_existing_audit.details->>'operation' <> 'review_partner_publication'
       or v_existing_status is distinct from p_publication_status then
      raise exception 'partner publication operation id reuse conflict';
    end if;
    return query
      select e.*
      from public.partner_annuaire_entries e
      where e.id = p_entry_id;
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
    btrim(p_operation_id), now(), p_reviewed_by_user_id, 'admin_operation', 'success', p_entry_id,
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
