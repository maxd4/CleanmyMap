-- SPOGOMI lot 8: private volunteer certificate projections.
-- The recognition attestations remain the only source of certified mission facts.

alter table public.spogomi_recognition_attestations
  drop constraint if exists spogomi_recognition_attestations_kind_check;

alter table public.spogomi_recognition_attestations
  add constraint spogomi_recognition_attestations_kind_check check (kind in (
    'collector', 'referee', 'organizer', 'finish_control', 'field_safety',
    'weighing_sorting', 'logistics_support'
  ));

alter table public.spogomi_recognition_attestation_history
  drop constraint if exists spogomi_recognition_attestation_history_kind_check;

alter table public.spogomi_recognition_attestation_history
  add constraint spogomi_recognition_attestation_history_kind_check check (kind in (
    'collector', 'referee', 'organizer', 'finish_control', 'field_safety',
    'weighing_sorting', 'logistics_support'
  ));

create or replace function public.set_spogomi_recognition_attestation(
  p_event_id uuid,
  p_participant_id uuid,
  p_kind text,
  p_status text,
  p_evidence_reference text,
  p_certification_version text,
  p_actor_clerk_id text,
  p_reason text
)
returns public.spogomi_recognition_attestations
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_participant public.spogomi_participants%rowtype;
  v_existing public.spogomi_recognition_attestations%rowtype;
  v_result public.spogomi_recognition_attestations%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_event_id is null or p_participant_id is null or
     p_kind not in ('collector', 'referee', 'organizer', 'finish_control', 'field_safety', 'weighing_sorting', 'logistics_support') or
     p_status not in ('certified', 'revoked') or length(btrim(coalesce(p_evidence_reference, ''))) = 0 or
     length(btrim(coalesce(p_certification_version, ''))) = 0 or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 or
     (p_status = 'revoked' and length(btrim(coalesce(p_reason, ''))) = 0) then
    raise exception using errcode = '22023', message = 'Invalid SPOGOMI attestation';
  end if;
  select * into v_participant from public.spogomi_participants where id = p_participant_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI participant not found'; end if;
  if v_participant.clerk_id is not null and v_participant.clerk_id = p_actor_clerk_id then
    raise exception using errcode = '42501', message = 'SPOGOMI self-attestation is forbidden';
  end if;
  select * into v_existing from public.spogomi_recognition_attestations where event_id = p_event_id and participant_id = p_participant_id and kind = p_kind for update;
  if found then
    update public.spogomi_recognition_attestations set
      status = p_status, evidence_reference = btrim(p_evidence_reference), certified_by_clerk_id = p_actor_clerk_id,
      certified_at = coalesce(v_existing.certified_at, now()), certification_version = btrim(p_certification_version),
      revoked_at = case when p_status = 'revoked' then now() else null end,
      revoked_by_clerk_id = case when p_status = 'revoked' then p_actor_clerk_id else null end,
      revocation_reason = case when p_status = 'revoked' then nullif(btrim(coalesce(p_reason, '')), '') else null end,
      updated_at = now() where id = v_existing.id returning * into v_result;
  else
    if p_status = 'revoked' then raise exception using errcode = '23514', message = 'A recognition proof must be certified before revocation'; end if;
    insert into public.spogomi_recognition_attestations
      (event_id, participant_id, kind, status, evidence_reference, certified_by_clerk_id, certified_at, certification_version)
    values (p_event_id, p_participant_id, p_kind, p_status, btrim(p_evidence_reference), p_actor_clerk_id, now(), btrim(p_certification_version))
    returning * into v_result;
  end if;
  insert into public.spogomi_recognition_attestation_history
    (attestation_id, event_id, participant_id, kind, status, action, evidence_reference, certification_version, actor_clerk_id, reason)
  values (v_result.id, p_event_id, p_participant_id, p_kind, p_status,
    case when p_status = 'revoked' then 'revoked' when v_existing.id is null then 'certified' else 'corrected' end,
    v_result.evidence_reference, v_result.certification_version, p_actor_clerk_id, nullif(btrim(coalesce(p_reason, '')), ''));
  return v_result;
end;
$$;

create table public.spogomi_volunteer_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_reference text not null unique check (length(btrim(certificate_reference)) > 0),
  user_id text not null check (length(btrim(user_id)) > 0),
  event_id uuid not null references public.spogomi_events(id) on delete restrict,
  source_fingerprint text not null check (length(btrim(source_fingerprint)) = 64),
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),
  status text not null check (status in ('active', 'revoked', 'replaced')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, source_fingerprint),
  check (status = 'active' or (revoked_at is not null and length(btrim(coalesce(revocation_reason, ''))) > 0))
);

create table public.spogomi_volunteer_certificate_history (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.spogomi_volunteer_certificates(id) on delete restrict,
  user_id text not null,
  event_id uuid not null references public.spogomi_events(id) on delete restrict,
  certificate_reference text not null,
  action text not null check (action in ('issued', 'revoked', 'replaced')),
  status text not null check (status in ('active', 'revoked', 'replaced')),
  source_fingerprint text not null,
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  reason text,
  created_at timestamptz not null default now()
);

create index spogomi_volunteer_certificates_user_idx
  on public.spogomi_volunteer_certificates(user_id, issued_at desc);
create index spogomi_volunteer_certificates_event_idx
  on public.spogomi_volunteer_certificates(event_id, status);

create trigger spogomi_volunteer_certificates_set_updated_at
before update on public.spogomi_volunteer_certificates
for each row execute function public.set_updated_at();

alter table public.spogomi_volunteer_certificates enable row level security;
alter table public.spogomi_volunteer_certificate_history enable row level security;
revoke all on table public.spogomi_volunteer_certificates from public, anon, authenticated;
revoke all on table public.spogomi_volunteer_certificate_history from public, anon, authenticated;
grant all on table public.spogomi_volunteer_certificates to service_role;
grant all on table public.spogomi_volunteer_certificate_history to service_role;

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
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(btrim(coalesce(p_user_id, ''))) = 0
     or p_event_id is null or p_source_snapshot is null
     or jsonb_typeof(p_source_snapshot) <> 'object'
     or length(btrim(coalesce(p_source_fingerprint, ''))) <> 64
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI certificate issuance is forbidden';
  end if;

  select * into v_current
    from public.spogomi_volunteer_certificates
   where user_id = p_user_id and event_id = p_event_id and status = 'active'
   for update;

  if found and v_current.source_fingerprint = p_source_fingerprint then
    return v_current;
  end if;

  if found then
    update public.spogomi_volunteer_certificates
       set status = 'replaced', revoked_at = now(),
           revocation_reason = 'Nouvelle version de l’état certifié.', updated_at = now()
     where id = v_current.id;
    insert into public.spogomi_volunteer_certificate_history
      (certificate_id, user_id, event_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id, reason)
    values (v_current.id, v_current.user_id, v_current.event_id, v_current.certificate_reference,
            'replaced', 'replaced', v_current.source_fingerprint, p_actor_clerk_id,
            'Nouvelle version de l’état certifié.');
  end if;

  insert into public.spogomi_volunteer_certificates
    (certificate_reference, user_id, event_id, source_fingerprint, source_snapshot, status)
  values
    ('SPOGOMI-' || upper(replace(gen_random_uuid()::text, '-', '')), p_user_id, p_event_id,
     p_source_fingerprint, p_source_snapshot, 'active')
  returning * into v_result;

  insert into public.spogomi_volunteer_certificate_history
    (certificate_id, user_id, event_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id)
  values (v_result.id, v_result.user_id, v_result.event_id, v_result.certificate_reference,
          'issued', 'active', v_result.source_fingerprint, p_actor_clerk_id);
  return v_result;
end;
$$;

create or replace function public.revoke_spogomi_volunteer_certificate(
  p_user_id text,
  p_event_id uuid,
  p_reason text,
  p_actor_clerk_id text
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
  select * into v_current from public.spogomi_volunteer_certificates
   where user_id = p_user_id and event_id = p_event_id and status = 'active' for update;
  if not found then return false; end if;
  update public.spogomi_volunteer_certificates
     set status = 'revoked', revoked_at = now(), revocation_reason = p_reason, updated_at = now()
   where id = v_current.id;
  insert into public.spogomi_volunteer_certificate_history
    (certificate_id, user_id, event_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id, reason)
  values (v_current.id, v_current.user_id, v_current.event_id, v_current.certificate_reference,
          'revoked', 'revoked', v_current.source_fingerprint, p_actor_clerk_id, p_reason);
  return true;
end;
$$;

revoke all on function public.issue_spogomi_volunteer_certificate(text, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.issue_spogomi_volunteer_certificate(text, uuid, text, jsonb, text) to service_role;
revoke all on function public.revoke_spogomi_volunteer_certificate(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.revoke_spogomi_volunteer_certificate(text, uuid, text, text) to service_role;

comment on table public.spogomi_volunteer_certificates is
  'Private, versioned certificate projections derived only from certified recognition attestations.';
