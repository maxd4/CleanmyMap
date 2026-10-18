-- PURPOSE: expire private invitation links after three calendar months and
--          align their two lifecycle outcomes with the canonical action flows.
-- CALLER: Clerk-authenticated server routes through service_role-only RPCs.
-- AUTHORIZATION_BOUNDARY: browser roles have no table or function access;
--                         HTTP handlers verify Clerk and action permissions.
-- IDEMPOTENCY: one link per action, one registration per action/user, and
--              the existing post_action_claim uniqueness/replay contract.
-- ATOMICITY: link rotation and direct registration are transactional and lock
--             the invitation plus the action/user decision rows.
-- FAILURE_BEHAVIOR: expired, revoked, replaced, closed, or already refused
--                   links abort without creating or reviving a registration.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: service_role only for every new or replaced database capability.

alter table public.action_invitation_links
  add column if not exists expires_at timestamptz;

-- Rows created by the first private-link migration have no persisted expiry.
-- Their historical rotation instant is the canonical origin for the three
-- month validity window.
update public.action_invitation_links
   set expires_at = rotated_at + interval '3 months'
 where expires_at is null;

alter table public.action_invitation_links
  alter column expires_at set not null;

create index if not exists action_invitation_links_expires_at_idx
  on public.action_invitation_links (expires_at);

do $$
begin
  if exists (
    select 1
      from information_schema.table_constraints
     where constraint_schema = 'public'
       and table_name = 'action_registrations'
       and constraint_name = 'action_registrations_source_check'
  ) then
    alter table public.action_registrations
      drop constraint action_registrations_source_check;
  end if;
end
$$;

alter table public.action_registrations
  add constraint action_registrations_source_check
  check (
    registration_source in (
      'group_form',
      'manual_add',
      'admin',
      'admin_override',
      'import',
      'invite_link'
    )
  );

create or replace function public.create_action_invitation_link(
  p_action_id uuid,
  p_token_hash text,
  p_actor_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := timezone('utc', now());
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'action_invitation_token_hash_invalid' using errcode = '22023';
  end if;
  if nullif(trim(p_actor_id), '') is null then
    raise exception 'action_invitation_actor_required' using errcode = '22023';
  end if;
  if not exists (
    select 1
      from public.actions
     where id = p_action_id
       and access_mode = 'invite_link'
       and action_phase = 'pre_action'
       and status in ('pending', 'approved')
  ) then
    raise exception 'action_invitation_lifecycle_closed' using errcode = 'P0001';
  end if;

  insert into public.action_invitation_links (
    action_id,
    token_hash,
    created_at,
    rotated_at,
    expires_at,
    revoked_at,
    created_by_clerk_id
  ) values (
    p_action_id,
    p_token_hash,
    v_now,
    v_now,
    v_now + interval '3 months',
    null,
    p_actor_id
  )
  on conflict (action_id) do update
     set token_hash = excluded.token_hash,
         rotated_at = excluded.rotated_at,
         expires_at = excluded.expires_at,
         revoked_at = null,
         created_by_clerk_id = excluded.created_by_clerk_id;
end;
$$;

create or replace function public.request_private_action_registration(
  p_action_id uuid,
  p_user_id text,
  p_token_hash text
)
returns table (registration_id uuid, registration_status text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_registration public.action_registrations;
  v_invitation public.action_invitation_links;
  v_action public.actions;
  v_now timestamptz := timezone('utc', now());
  v_local_now timestamp := timezone('Europe/Paris', v_now);
begin
  if nullif(trim(p_user_id), '') is null then
    raise exception 'private_registration_user_required' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'private_registration_invitation_invalid' using errcode = 'P0001';
  end if;

  select *
    into v_invitation
    from public.action_invitation_links
   where action_id = p_action_id
     and token_hash = p_token_hash
   for update;
  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= v_now then
    raise exception 'private_registration_invitation_invalid' using errcode = 'P0001';
  end if;

  select *
    into v_action
    from public.actions
   where id = p_action_id
   for update;
  if not found
     or v_action.access_mode <> 'invite_link'
     or v_action.status not in ('pending', 'approved')
     or v_action.action_phase <> 'pre_action' then
    raise exception 'private_registration_action_unavailable' using errcode = 'P0001';
  end if;

  if v_action.action_date < v_local_now::date
     or (
       v_action.action_date = v_local_now::date
       and coalesce(v_action.event_start_time, '00:00:00'::time) <= v_local_now::time
     ) then
    raise exception 'private_registration_action_awaiting_finalization' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_action_id::text || ':' || p_user_id, 0)
  );

  select *
    into v_registration
    from public.action_registrations
   where action_id = p_action_id
     and user_id = p_user_id
   for update;

  if v_registration.id is null then
    insert into public.action_registrations (
      action_id,
      user_id,
      registered_at,
      registration_status,
      registration_source,
      registration_cancellation_reason
    ) values (
      p_action_id,
      p_user_id,
      v_now,
      'confirmed',
      'invite_link',
      null
    ) returning * into v_registration;
  elsif v_registration.registration_status = 'cancelled' then
    -- A refused or otherwise cancelled decision is terminal for this link
    -- flow. Never silently revive it on a repeated bearer-token request.
    raise exception 'private_registration_already_decided' using errcode = 'P0001';
  elsif v_registration.registration_status = 'pending' then
    update public.action_registrations
       set registered_at = coalesce(v_registration.registered_at, v_now),
           registration_status = 'confirmed',
           registration_source = 'invite_link',
           registration_cancellation_reason = null
     where id = v_registration.id
     returning * into v_registration;
  end if;

  return query
  select v_registration.id, v_registration.registration_status;
end;
$$;

revoke all on function public.create_action_invitation_link(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.request_private_action_registration(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.create_action_invitation_link(uuid, text, text)
  to service_role;
grant execute on function public.request_private_action_registration(uuid, text, text)
  to service_role;
