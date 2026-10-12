-- SPOGOMI lot 8: explicit, private identity proof for CleanMyMap accounts.
-- A roster identity is not a CleanMyMap account and never creates one.

alter table public.spogomi_participants
  add column identity_link_code_hash text,
  add column identity_link_code_issued_at timestamptz,
  add column identity_link_code_expires_at timestamptz,
  add column identity_link_code_revoked_at timestamptz;

alter table public.spogomi_participants
  add constraint spogomi_identity_link_code_hash_format
  check (
    identity_link_code_hash is null
    or identity_link_code_hash ~ '^[0-9a-f]{64}$'
  );

create unique index spogomi_participants_verified_account_per_event
  on public.spogomi_participants(event_id, clerk_id)
  where account_link_status = 'verified' and clerk_id is not null;

create unique index spogomi_participants_identity_link_code_hash_unique
  on public.spogomi_participants(identity_link_code_hash)
  where identity_link_code_hash is not null;

create table public.spogomi_identity_link_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  participant_id uuid not null references public.spogomi_participants(id) on delete cascade,
  event_type text not null check (event_type in ('code_issued', 'code_redeemed', 'code_rejected')),
  actor_kind text not null check (actor_kind in ('organizer', 'participant', 'system')),
  actor_clerk_id text,
  outcome text not null check (outcome in ('success', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  check (actor_kind = 'system' or actor_clerk_id is not null)
);

create index spogomi_identity_link_events_participant_idx
  on public.spogomi_identity_link_events(participant_id, created_at desc);

alter table public.spogomi_identity_link_events enable row level security;
revoke all on table public.spogomi_identity_link_events from public, anon, authenticated;
grant all on table public.spogomi_identity_link_events to service_role;

create or replace function public.issue_spogomi_identity_link_code(
  p_event_id uuid,
  p_participant_id uuid,
  p_code_hash text,
  p_issued_by_clerk_id text,
  p_expires_at timestamptz
)
returns table (participant_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_participant public.spogomi_participants%rowtype;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$'
     or length(btrim(coalesce(p_issued_by_clerk_id, ''))) = 0
     or p_expires_at <= now() then
    raise exception using errcode = '22023', message = 'invalid_identity_link_code_issue';
  end if;

  select p.*
    into v_participant
    from public.spogomi_participants p
   where p.id = p_participant_id
     and p.event_id = p_event_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_participant_not_found';
  end if;
  if v_participant.account_link_status = 'verified' then
    raise exception using errcode = '23505', message = 'spogomi_identity_already_linked';
  end if;

  update public.spogomi_participants
     set identity_link_code_hash = p_code_hash,
         identity_link_code_issued_at = now(),
         identity_link_code_expires_at = p_expires_at,
         identity_link_code_revoked_at = null,
         account_link_status = 'pending',
         updated_at = now()
   where id = p_participant_id;

  insert into public.spogomi_identity_link_events (
    event_id, participant_id, event_type, actor_kind, actor_clerk_id, outcome
  ) values (
    p_event_id, p_participant_id, 'code_issued', 'organizer', p_issued_by_clerk_id, 'success'
  );

  return query select p_participant_id, p_expires_at;
end;
$$;

create or replace function public.claim_spogomi_identity_link(
  p_event_id uuid,
  p_code_hash text,
  p_clerk_id text
)
returns table (
  link_status text,
  participant_id uuid,
  action_id uuid,
  attendance_status text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_participant public.spogomi_participants%rowtype;
begin
  if p_code_hash !~ '^[0-9a-f]{64}$'
     or length(btrim(coalesce(p_clerk_id, ''))) = 0 then
    raise exception using errcode = 'P0001', message = 'invalid_identity_link_code';
  end if;

  select p.*
    into v_participant
    from public.spogomi_participants p
   where p.event_id = p_event_id
     and p.identity_link_code_hash = p_code_hash
     and p.identity_link_code_revoked_at is null
     and p.identity_link_code_expires_at > now()
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_identity_link_code';
  end if;
  if v_participant.registration_status <> 'registered' then
    raise exception using errcode = 'P0001', message = 'invalid_identity_link_code';
  end if;
  if v_participant.account_link_status = 'verified' then
    if v_participant.clerk_id = p_clerk_id then
      return query
        select 'already_linked', v_participant.id, e.action_id, v_participant.attendance_status
          from public.spogomi_events e where e.id = p_event_id;
      return;
    end if;
    raise exception using errcode = '23505', message = 'spogomi_identity_already_linked';
  end if;
  if exists (
    select 1
      from public.spogomi_participants p
     where p.event_id = p_event_id
       and p.clerk_id = p_clerk_id
       and p.account_link_status = 'verified'
  ) then
    raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
  end if;

  update public.spogomi_participants
     set account_link_status = 'verified',
         clerk_id = p_clerk_id,
         identity_link_code_hash = null,
         identity_link_code_expires_at = null,
         identity_link_code_revoked_at = null,
         updated_at = now()
   where id = v_participant.id;

  insert into public.spogomi_identity_link_events (
    event_id, participant_id, event_type, actor_kind, actor_clerk_id, outcome
  ) values (
    p_event_id, v_participant.id, 'code_redeemed', 'participant', p_clerk_id, 'success'
  );

  return query
    select 'linked', v_participant.id, e.action_id, v_participant.attendance_status
      from public.spogomi_events e where e.id = p_event_id;
end;
$$;

revoke all on function public.issue_spogomi_identity_link_code(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_spogomi_identity_link(uuid, text, text) from public, anon, authenticated;
grant execute on function public.issue_spogomi_identity_link_code(uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function public.claim_spogomi_identity_link(uuid, text, text) to service_role;

comment on column public.spogomi_participants.identity_link_code_hash is
  'Hash SHA-256 d’un code individuel remis hors bande ; jamais le code en clair ni une donnée Excel.';
comment on column public.spogomi_participants.clerk_id is
  'Compte CleanMyMap explicitement lié ; une liaison ne vaut pas présence ni participation confirmée.';
