-- PURPOSE: restore pg_advisory_xact_lock serialization in issue_spogomi_volunteer_certificate and revoke_spogomi_volunteer_certificate.
-- CALLER: server-only SPOGOMI certificate issuance/revocation routes and concurrency proofs.
-- AUTHORIZATION_BOUNDARY: service_role only; HTTP AuthN/AuthZ remains outside SQL.
-- IDEMPOTENCY: identical source_fingerprint returns the active certificate without reissuing.
-- ATOMICITY: transaction-scoped advisory lock closes the no-row race before FOR UPDATE and insert/replace/revoke.
-- FAILURE_BEHAVIOR: missing divisions raise P0002; invalid role/input raises 42501.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: browser roles remain denied; service_role only.

create or replace function public.issue_spogomi_volunteer_certificate(
  p_user_id text,
  p_event_id uuid,
  p_source_fingerprint text,
  p_source_snapshot jsonb,
  p_actor_clerk_id text
)
returns public.spogomi_volunteer_certificates
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_current public.spogomi_volunteer_certificates%rowtype;
  v_result public.spogomi_volunteer_certificates%rowtype;
  v_division_id uuid;
  v_division_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(btrim(coalesce(p_user_id, ''))) = 0
     or p_event_id is null or p_source_snapshot is null
     or jsonb_typeof(p_source_snapshot) <> 'object'
     or length(btrim(coalesce(p_source_fingerprint, ''))) <> 64
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI certificate issuance is forbidden';
  end if;

  -- Issue and revoke take this same lock before reading the active row. This
  -- closes the no-row race; the partial unique index remains the last defense.
  perform pg_advisory_xact_lock(hashtextextended(
    format('spogomi-volunteer-certificate:%s:%s', p_user_id, p_event_id), 0
  ));

  select count(*)::integer, (array_agg(id order by id))[1] into v_division_count, v_division_id
    from public.spogomi_divisions where event_id = p_event_id;
  if v_division_count = 0 then
    raise exception using errcode = 'P0002', message = 'SPOGOMI divisions not found';
  end if;
  if v_division_count > 1 then v_division_id := null; end if;

  select * into v_current from public.spogomi_volunteer_certificates
   where user_id = p_user_id and event_id = p_event_id and status = 'active' for update;
  if found and v_current.source_fingerprint = p_source_fingerprint then return v_current; end if;
  if found then
    update public.spogomi_volunteer_certificates
       set status = 'replaced', revoked_at = now(), revocation_reason = 'Nouvelle version de l’état certifié.', updated_at = now()
     where id = v_current.id;
    insert into public.spogomi_volunteer_certificate_history
      (certificate_id, user_id, event_id, division_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id, reason)
    values (v_current.id, v_current.user_id, v_current.event_id, v_current.division_id, v_current.certificate_reference, 'replaced', 'replaced', v_current.source_fingerprint, p_actor_clerk_id, 'Nouvelle version de l’état certifié.');
  end if;
  insert into public.spogomi_volunteer_certificates
    (certificate_reference, user_id, event_id, division_id, source_fingerprint, source_snapshot, status)
  values ('SPOGOMI-' || upper(replace(gen_random_uuid()::text, '-', '')), p_user_id, p_event_id, v_division_id, p_source_fingerprint, p_source_snapshot, 'active')
  returning * into v_result;
  insert into public.spogomi_volunteer_certificate_history
    (certificate_id, user_id, event_id, division_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id)
  values (v_result.id, v_result.user_id, v_result.event_id, v_result.division_id, v_result.certificate_reference, 'issued', 'active', v_result.source_fingerprint, p_actor_clerk_id);
  return v_result;
end;
$$;

create or replace function public.revoke_spogomi_volunteer_certificate(
  p_user_id text, p_event_id uuid, p_reason text, p_actor_clerk_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_current public.spogomi_volunteer_certificates%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(btrim(coalesce(p_user_id, ''))) = 0
     or p_event_id is null or length(btrim(coalesce(p_reason, ''))) = 0
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI certificate revocation is forbidden';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    format('spogomi-volunteer-certificate:%s:%s', p_user_id, p_event_id), 0
  ));

  select * into v_current from public.spogomi_volunteer_certificates
   where user_id = p_user_id and event_id = p_event_id and status = 'active' for update;
  if not found then return false; end if;
  update public.spogomi_volunteer_certificates
     set status = 'revoked', revoked_at = now(), revocation_reason = p_reason, updated_at = now()
   where id = v_current.id;
  insert into public.spogomi_volunteer_certificate_history
    (certificate_id, user_id, event_id, division_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id, reason)
  values (v_current.id, v_current.user_id, v_current.event_id, v_current.division_id, v_current.certificate_reference, 'revoked', 'revoked', v_current.source_fingerprint, p_actor_clerk_id, p_reason);
  return true;
end;
$$;

revoke all on function public.issue_spogomi_volunteer_certificate(text, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.issue_spogomi_volunteer_certificate(text, uuid, text, jsonb, text) to service_role;
revoke all on function public.revoke_spogomi_volunteer_certificate(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.revoke_spogomi_volunteer_certificate(text, uuid, text, text) to service_role;
