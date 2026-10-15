-- SPOGOMI event-scoped capabilities: observer/referee assignments and audit.
-- PUBLIC_READ is still served only by the published projection; this relation
-- never grants access outside its event_id.

alter table public.spogomi_event_reviewers
  drop constraint if exists spogomi_event_reviewers_role_check;

alter table public.spogomi_event_reviewers
  add constraint spogomi_event_reviewers_role_check
  check (role in ('observer', 'referee'));

create table public.spogomi_event_access_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  subject_clerk_id text not null check (length(btrim(subject_clerk_id)) > 0),
  access_role text not null check (access_role in ('observer', 'referee')),
  operation text not null check (operation in ('granted', 'revoked')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  created_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index spogomi_event_access_audit_event_idx
  on public.spogomi_event_access_audit(event_id, created_at desc);

create index spogomi_event_access_audit_subject_idx
  on public.spogomi_event_access_audit(subject_clerk_id, event_id, created_at desc);

alter table public.spogomi_event_access_audit enable row level security;
revoke all on table public.spogomi_event_access_audit from public, anon, authenticated;
grant all on table public.spogomi_event_access_audit to service_role;

create or replace function public.spogomi_set_event_access(
  p_event_id uuid,
  p_subject_clerk_id text,
  p_access_role text,
  p_operation text,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_reviewer public.spogomi_event_reviewers%rowtype;
  v_changed boolean := false;
begin
  -- PURPOSE: atomically grant or revoke one event-scoped SPOGOMI capability.
  -- CALLER: server route after the canonical organizer AuthZ guard.
  -- AUTHORIZATION_BOUNDARY: service_role execution only; the caller supplies the audited actor.
  -- IDEMPOTENCY: repeated grant/revoke of the current state is a no-op.
  -- ATOMICITY: relation state and audit row commit or fail together.
  -- FAILURE_BEHAVIOR: invalid role, operation, event or identity aborts the transaction.
  -- SEARCH_PATH: explicitly pg_catalog, public; all persistent objects are qualified.
  -- GRANTS: service_role only.
  if auth.role() <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI event access is server-only';
  end if;
  if p_access_role not in ('observer', 'referee') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI event access role is invalid';
  end if;
  if p_operation not in ('grant', 'revoke') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI event access operation is invalid';
  end if;
  if length(btrim(coalesce(p_subject_clerk_id, ''))) = 0
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI event access identities are required';
  end if;
  if not exists (select 1 from public.spogomi_events e where e.id = p_event_id) then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s', p_event_id, p_subject_clerk_id, p_access_role), 0));

  select *
    into v_reviewer
    from public.spogomi_event_reviewers
   where event_id = p_event_id
     and clerk_id = btrim(p_subject_clerk_id)
     and role = p_access_role
   for update;

  if p_operation = 'grant' then
    if not found then
      insert into public.spogomi_event_reviewers (
        event_id, clerk_id, role, assigned_by_clerk_id, revoked_at
      ) values (
        p_event_id, btrim(p_subject_clerk_id), p_access_role, btrim(p_actor_clerk_id), null
      ) returning * into v_reviewer;
      v_changed := true;
    elsif v_reviewer.revoked_at is not null then
      update public.spogomi_event_reviewers
         set assigned_by_clerk_id = btrim(p_actor_clerk_id), revoked_at = null, updated_at = now()
       where id = v_reviewer.id
       returning * into v_reviewer;
      v_changed := true;
    end if;
  elsif found and v_reviewer.revoked_at is null then
    update public.spogomi_event_reviewers
       set revoked_at = now(), updated_at = now()
     where id = v_reviewer.id
     returning * into v_reviewer;
    v_changed := true;
  end if;

  if v_changed then
    insert into public.spogomi_event_access_audit (
      event_id, subject_clerk_id, access_role, operation, actor_clerk_id, details
    ) values (
      p_event_id, btrim(p_subject_clerk_id), p_access_role,
      case when p_operation = 'grant' then 'granted' else 'revoked' end,
      btrim(p_actor_clerk_id), jsonb_build_object('reviewer_id', v_reviewer.id)
    );
  end if;

  return jsonb_build_object(
    'changed', v_changed,
    'event_id', p_event_id,
    'clerk_id', btrim(p_subject_clerk_id),
    'role', p_access_role,
    'revoked_at', case when v_reviewer.id is null then null else v_reviewer.revoked_at end
  );
end;
$$;

revoke all on function public.spogomi_set_event_access(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_set_event_access(uuid, text, text, text, text) to service_role;
