-- PURPOSE: persist per-action operational volunteer responsibilities and the
--          explicit primary-organizer transfer workflow.
-- CALLER: Clerk-authenticated server routes through service_role-only RPCs.
-- AUTHORIZATION_BOUNDARY: action_organizers remains the only organizer
--          authority; field-role assignments never grant action permissions.
-- IDEMPOTENCY: role replacement is unique by action/user/role and transfer
--          proposals have at most one pending proposal per action.
-- ATOMICITY: role replacement and primary transfer lock the action and the
--          relevant registration/proposal rows before mutation.
-- FAILURE_BEHAVIOR: non-confirmed, cancelled, non-registered or out-of-phase
--          targets are rejected without a partial assignment or transfer.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: browser roles have no table or RPC access; service_role only.

create table if not exists public.action_field_role_catalog (
  code text primary key,
  label text not null,
  description text not null,
  sort_order integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.action_field_role_catalog (code, label, description, sort_order)
values
  ('group_lead', 'Responsable du groupe', 'Coordination du groupe et du déroulé terrain.', 10),
  ('cigarette_bag_lead', 'Référent sacs mégots', 'Organisation et suivi des sacs dédiés aux mégots.', 20),
  ('recyclable_bag_lead', 'Référent sacs recyclables', 'Organisation et suivi des sacs de recyclables.', 30),
  ('household_waste_bag_lead', 'Référent sacs déchets ménagers', 'Organisation et suivi des sacs de déchets ménagers.', 40),
  ('glass_bag_lead', 'Référent sacs verre', 'Organisation et suivi des sacs de verre.', 50)
on conflict (code) do update
  set label = excluded.label,
      description = excluded.description,
      sort_order = excluded.sort_order;

create table if not exists public.action_field_role_assignments (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  user_id text not null,
  role_code text not null references public.action_field_role_catalog(code),
  assignment_status text not null default 'active'
    check (assignment_status in ('active', 'revoked')),
  assigned_by_clerk_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (action_id, user_id, role_code)
);

create index if not exists action_field_role_assignments_action_idx
  on public.action_field_role_assignments (action_id, assignment_status, role_code);

create index if not exists action_field_role_assignments_user_idx
  on public.action_field_role_assignments (action_id, user_id, assignment_status);

create table if not exists public.action_field_role_transfer_proposals (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  current_primary_user_id text not null,
  successor_user_id text not null,
  proposed_by_clerk_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  decided_by_clerk_id text,
  decision_reason text,
  check (current_primary_user_id <> successor_user_id)
);

create unique index if not exists action_field_role_transfer_one_pending_idx
  on public.action_field_role_transfer_proposals (action_id)
  where status = 'pending';

create index if not exists action_field_role_transfer_action_idx
  on public.action_field_role_transfer_proposals (action_id, created_at desc);

create table if not exists public.action_field_role_transfer_audit (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  proposal_id uuid references public.action_field_role_transfer_proposals(id) on delete set null,
  event_code text not null
    check (event_code in ('proposed', 'accepted', 'rejected', 'stale')),
  actor_clerk_id text not null,
  previous_primary_user_id text,
  next_primary_user_id text,
  created_at timestamptz not null default timezone('utc', now()),
  details jsonb not null default '{}'::jsonb
);

create index if not exists action_field_role_transfer_audit_action_idx
  on public.action_field_role_transfer_audit (action_id, created_at desc);

alter table public.action_field_role_catalog enable row level security;
alter table public.action_field_role_assignments enable row level security;
alter table public.action_field_role_transfer_proposals enable row level security;
alter table public.action_field_role_transfer_audit enable row level security;

revoke all on table public.action_field_role_catalog from public, anon, authenticated;
revoke all on table public.action_field_role_assignments from public, anon, authenticated;
revoke all on table public.action_field_role_transfer_proposals from public, anon, authenticated;
revoke all on table public.action_field_role_transfer_audit from public, anon, authenticated;
grant select on table public.action_field_role_catalog to service_role;
grant select, insert, update on table public.action_field_role_assignments to service_role;
grant select, insert, update on table public.action_field_role_transfer_proposals to service_role;
grant select, insert on table public.action_field_role_transfer_audit to service_role;

create or replace function public.assign_action_field_roles(
  p_action_id uuid,
  p_user_id text,
  p_role_codes text[],
  p_actor_id text
)
returns setof public.action_field_role_assignments
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions;
  v_registration public.action_registrations;
  v_role_codes text[] := coalesce(p_role_codes, '{}'::text[]);
begin
  if nullif(trim(p_user_id), '') is null or nullif(trim(p_actor_id), '') is null then
    raise exception 'action_field_role_actor_required' using errcode = '22023';
  end if;

  select * into v_action
    from public.actions
   where id = p_action_id
   for update;
  if not found or v_action.action_phase <> 'pre_action'
     or v_action.status not in ('pending', 'approved') then
    raise exception 'action_field_role_lifecycle_closed' using errcode = 'P0001';
  end if;

  select * into v_registration
    from public.action_registrations
   where action_id = p_action_id
     and user_id = trim(p_user_id)
   for update;
  if not found or v_registration.registration_status <> 'confirmed' then
    raise exception 'action_field_role_target_not_confirmed' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from unnest(v_role_codes) requested(code)
    where not exists (
      select 1 from public.action_field_role_catalog catalog
       where catalog.code = requested.code
    )
  ) then
    raise exception 'action_field_role_code_invalid' using errcode = '22023';
  end if;

  update public.action_field_role_assignments
     set assignment_status = case
           when role_code = any(v_role_codes) then 'active'
           else 'revoked'
         end,
         assigned_by_clerk_id = trim(p_actor_id),
         updated_at = timezone('utc', now())
   where action_id = p_action_id
     and user_id = trim(p_user_id);

  insert into public.action_field_role_assignments (
    action_id, user_id, role_code, assignment_status, assigned_by_clerk_id
  )
  select p_action_id, trim(p_user_id), requested.code, 'active', trim(p_actor_id)
    from unnest(v_role_codes) requested(code)
  on conflict (action_id, user_id, role_code) do update
    set assignment_status = 'active',
        assigned_by_clerk_id = excluded.assigned_by_clerk_id,
        updated_at = timezone('utc', now());

  return query
  select * from public.action_field_role_assignments
   where action_id = p_action_id
     and user_id = trim(p_user_id)
     and assignment_status = 'active'
   order by role_code;
end;
$$;

create or replace function public.propose_action_field_role_transfer(
  p_action_id uuid,
  p_successor_user_id text,
  p_actor_id text,
  p_actor_is_global_admin boolean default false
)
returns public.action_field_role_transfer_proposals
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions;
  v_primary text;
  v_proposal public.action_field_role_transfer_proposals;
begin
  if nullif(trim(p_successor_user_id), '') is null
     or nullif(trim(p_actor_id), '') is null then
    raise exception 'action_field_role_transfer_actor_required' using errcode = '22023';
  end if;

  select * into v_action from public.actions where id = p_action_id for update;
  if not found or v_action.action_phase <> 'pre_action' or v_action.status not in ('pending', 'approved') then
    raise exception 'action_field_role_transfer_lifecycle_closed' using errcode = 'P0001';
  end if;

  select organizer_clerk_id into v_primary
    from public.action_organizers
   where action_id = p_action_id and is_primary
   for update;
  if v_primary is null then
    raise exception 'action_field_role_primary_missing' using errcode = 'P0001';
  end if;
  if not (p_actor_is_global_admin or trim(p_actor_id) = v_primary or trim(p_actor_id) = v_action.created_by_clerk_id) then
    raise exception 'action_field_role_transfer_forbidden' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.action_organizers
     where action_id = p_action_id and organizer_clerk_id = trim(p_successor_user_id)
  ) then
    raise exception 'action_field_role_successor_not_organizer' using errcode = 'P0001';
  end if;

  insert into public.action_field_role_transfer_proposals (
    action_id, current_primary_user_id, successor_user_id, proposed_by_clerk_id
  ) values (
    p_action_id, v_primary, trim(p_successor_user_id), trim(p_actor_id)
  ) returning * into v_proposal;

  insert into public.action_field_role_transfer_audit (
    action_id, proposal_id, event_code, actor_clerk_id,
    previous_primary_user_id, next_primary_user_id
  ) values (
    p_action_id, v_proposal.id, 'proposed', trim(p_actor_id),
    v_primary, trim(p_successor_user_id)
  );
  return v_proposal;
end;
$$;

create or replace function public.respond_action_field_role_transfer(
  p_proposal_id uuid,
  p_actor_id text,
  p_decision text,
  p_actor_is_global_admin boolean default false,
  p_reason text default null
)
returns public.action_field_role_transfer_proposals
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_proposal public.action_field_role_transfer_proposals;
  v_action public.actions;
  v_current_primary text;
begin
  if nullif(trim(p_actor_id), '') is null or p_decision not in ('accept', 'reject') then
    raise exception 'action_field_role_transfer_decision_invalid' using errcode = '22023';
  end if;

  select * into v_proposal from public.action_field_role_transfer_proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'action_field_role_transfer_not_found' using errcode = 'P0001';
  end if;
  if v_proposal.status <> 'pending' or v_proposal.expires_at <= timezone('utc', now()) then
    raise exception 'action_field_role_transfer_stale' using errcode = 'P0001';
  end if;

  select * into v_action from public.actions where id = v_proposal.action_id for update;
  select organizer_clerk_id into v_current_primary
    from public.action_organizers
   where action_id = v_proposal.action_id and is_primary;
  if v_current_primary is distinct from v_proposal.current_primary_user_id
     or not exists (
       select 1 from public.action_organizers
        where action_id = v_proposal.action_id
          and organizer_clerk_id = v_proposal.successor_user_id
     ) then
    update public.action_field_role_transfer_proposals
       set status = 'expired', updated_at = timezone('utc', now()), decided_at = timezone('utc', now()),
           decided_by_clerk_id = trim(p_actor_id), decision_reason = 'primary_or_successor_changed'
     where id = v_proposal.id;
    insert into public.action_field_role_transfer_audit (action_id, proposal_id, event_code, actor_clerk_id, previous_primary_user_id, next_primary_user_id)
    values (v_proposal.action_id, v_proposal.id, 'stale', trim(p_actor_id), v_current_primary, v_proposal.successor_user_id);
    raise exception 'action_field_role_transfer_stale' using errcode = 'P0001';
  end if;

  if p_decision = 'accept' then
    if trim(p_actor_id) <> v_proposal.successor_user_id then
      raise exception 'action_field_role_transfer_accept_forbidden' using errcode = '42501';
    end if;
    update public.action_organizers set is_primary = false where action_id = v_proposal.action_id and is_primary;
    update public.action_organizers set is_primary = true where action_id = v_proposal.action_id and organizer_clerk_id = v_proposal.successor_user_id;
    update public.action_field_role_transfer_proposals
       set status = 'accepted', updated_at = timezone('utc', now()), decided_at = timezone('utc', now()), decided_by_clerk_id = trim(p_actor_id), decision_reason = nullif(trim(p_reason), '')
     where id = v_proposal.id returning * into v_proposal;
    insert into public.action_field_role_transfer_audit (action_id, proposal_id, event_code, actor_clerk_id, previous_primary_user_id, next_primary_user_id)
    values (v_proposal.action_id, v_proposal.id, 'accepted', trim(p_actor_id), v_proposal.current_primary_user_id, v_proposal.successor_user_id);
  else
    if not (p_actor_is_global_admin or trim(p_actor_id) in (v_proposal.current_primary_user_id, v_proposal.successor_user_id, v_action.created_by_clerk_id)) then
      raise exception 'action_field_role_transfer_reject_forbidden' using errcode = '42501';
    end if;
    update public.action_field_role_transfer_proposals
       set status = 'rejected', updated_at = timezone('utc', now()), decided_at = timezone('utc', now()), decided_by_clerk_id = trim(p_actor_id), decision_reason = nullif(trim(p_reason), '')
     where id = v_proposal.id returning * into v_proposal;
    insert into public.action_field_role_transfer_audit (action_id, proposal_id, event_code, actor_clerk_id, previous_primary_user_id, next_primary_user_id)
    values (v_proposal.action_id, v_proposal.id, 'rejected', trim(p_actor_id), v_proposal.current_primary_user_id, v_proposal.successor_user_id);
  end if;
  return v_proposal;
end;
$$;

revoke all on function public.assign_action_field_roles(uuid, text, text[], text) from public, anon, authenticated;
revoke all on function public.propose_action_field_role_transfer(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.respond_action_field_role_transfer(uuid, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.assign_action_field_roles(uuid, text, text[], text) to service_role;
grant execute on function public.propose_action_field_role_transfer(uuid, text, text, boolean) to service_role;
grant execute on function public.respond_action_field_role_transfer(uuid, text, text, boolean, text) to service_role;

create unique index if not exists action_organizers_one_primary_idx
  on public.action_organizers (action_id)
  where is_primary;
