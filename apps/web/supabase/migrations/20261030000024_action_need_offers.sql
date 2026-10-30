-- PURPOSE: persist help offers separately from action registration and participation.
-- CALLER: authenticated HTTP routes through the service-role server client.
-- AUTHORIZATION_BOUNDARY: RPCs re-resolve the Clerk actor, need visibility and
--   canonical action-manager relation; the table has no browser write grant.
-- IDEMPOTENCY: the active-offer partial unique index converges duplicates;
--   acceptance notifications use a matching partial unique index.
-- ATOMICITY: create and transition RPCs lock the action and need, then update
--   the offer and acceptance notification in the same transaction.
-- FAILURE_BEHAVIOR: closed/expired/ineligible needs reject new offers and
--   accept/decline transitions; terminal offer states are never reopened.
-- SEARCH_PATH: all SECURITY DEFINER functions pin pg_catalog, public.
-- GRANTS: service_role executes the RPCs and may read the table; browser roles
--   receive no table privileges and no RPC execution privileges.

create table if not exists public.action_need_offers (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.action_needs(id) on delete cascade,
  offered_by_clerk_id text not null,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint action_need_offers_offered_by_check
    check (nullif(btrim(offered_by_clerk_id), '') is not null),
  constraint action_need_offers_message_length_check
    check (message is null or char_length(btrim(message)) <= 300),
  constraint action_need_offers_status_check
    check (status in ('pending', 'accepted', 'declined', 'withdrawn'))
);

create index if not exists action_need_offers_need_status_created_at_idx
  on public.action_need_offers (need_id, status, created_at desc);

create index if not exists action_need_offers_offered_by_created_at_idx
  on public.action_need_offers (offered_by_clerk_id, created_at desc);

create unique index if not exists action_need_offers_active_member_unique_idx
  on public.action_need_offers (need_id, offered_by_clerk_id)
  where status in ('pending', 'accepted');

create unique index if not exists action_need_offer_acceptance_notification_unique_idx
  on public.app_notifications (user_id, type, ((payload ->> 'offerId')))
  where type = 'community'
    and (payload ->> 'kind') = 'action_need_offer_accepted';

create or replace function public.enforce_action_need_offer_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'action_need_offer_must_start_pending' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.need_id is distinct from old.need_id
       or new.offered_by_clerk_id is distinct from old.offered_by_clerk_id
       or new.message is distinct from old.message
       or new.created_at is distinct from old.created_at then
      raise exception 'action_need_offer_identity_immutable' using errcode = '23514';
    end if;

    if old.status <> 'pending'
       or new.status not in ('accepted', 'declined', 'withdrawn') then
      raise exception 'action_need_offer_terminal_state_immutable' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists action_need_offers_lifecycle_guard on public.action_need_offers;
create trigger action_need_offers_lifecycle_guard
before insert or update on public.action_need_offers
for each row execute function public.enforce_action_need_offer_lifecycle();

drop trigger if exists action_need_offers_set_updated_at on public.action_need_offers;
create trigger action_need_offers_set_updated_at
before update on public.action_need_offers
for each row execute function public.set_updated_at();

alter table public.action_need_offers enable row level security;

drop policy if exists action_need_offers_service_role_select on public.action_need_offers;
create policy action_need_offers_service_role_select
on public.action_need_offers for select to service_role
using (true);

drop policy if exists action_need_offers_service_role_insert on public.action_need_offers;
create policy action_need_offers_service_role_insert
on public.action_need_offers for insert to service_role
with check (true);

drop policy if exists action_need_offers_service_role_update on public.action_need_offers;
create policy action_need_offers_service_role_update
on public.action_need_offers for update to service_role
using (true)
with check (true);

revoke all on table public.action_need_offers from public, anon, authenticated, service_role;
grant select on table public.action_need_offers to service_role;

revoke all on function public.enforce_action_need_offer_lifecycle() from public, anon, authenticated, service_role;

create or replace function public.is_public_open_action_need(p_need_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.action_needs n
    join public.actions a on a.id = n.action_id
    where n.id = p_need_id
      and n.status = 'open'
      and (n.expires_at is null or n.expires_at >= now())
      and coalesce(a.access_mode, 'public') <> 'invite_link'
      and public.is_public_future_pre_action(
        a.action_phase,
        a.published_at,
        a.moderation_visibility,
        a.status,
        a.action_date,
        a.event_start_time
      )
      and (a.review_state is null or a.review_state in ('not_required', 'approved'))
  );
$$;

revoke all on function public.is_public_open_action_need(uuid) from public, anon, authenticated;
grant execute on function public.is_public_open_action_need(uuid) to service_role;

create or replace function public.create_action_need_offer(
  p_need_id uuid,
  p_offered_by_clerk_id text,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_need public.action_needs%rowtype;
  v_action public.actions%rowtype;
  v_offer public.action_need_offers%rowtype;
  v_message text;
begin
  if nullif(btrim(p_offered_by_clerk_id), '') is null then
    raise exception 'action_need_offer_actor_required' using errcode = '42501';
  end if;

  v_message := nullif(btrim(p_message), '');
  if v_message is not null and char_length(v_message) > 300 then
    raise exception 'action_need_offer_message_too_long' using errcode = '22023';
  end if;

  select into v_need, v_action
    n, a
    from public.action_needs n
    join public.actions a on a.id = n.action_id
   where n.id = p_need_id
   for update of n, a;

  if not found or not public.is_public_open_action_need(v_need.id) then
    raise exception 'action_need_offer_not_public_or_open' using errcode = '42501';
  end if;

  insert into public.action_need_offers (need_id, offered_by_clerk_id, message)
  values (v_need.id, btrim(p_offered_by_clerk_id), v_message)
  returning * into v_offer;

  return jsonb_build_object('status', 'created', 'offer', to_jsonb(v_offer));
exception
  when unique_violation then
    raise exception 'action_need_offer_active_exists' using errcode = '23505';
end;
$$;

revoke all on function public.create_action_need_offer(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_action_need_offer(uuid, text, text) to service_role;

create or replace function public.transition_action_need_offer(
  p_offer_id uuid,
  p_actor_clerk_id text,
  p_operation text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_need_id uuid;
  v_need public.action_needs%rowtype;
  v_action public.actions%rowtype;
  v_offer public.action_need_offers%rowtype;
  v_target_status text;
  v_notification_id uuid;
begin
  if nullif(btrim(p_actor_clerk_id), '') is null then
    raise exception 'action_need_offer_actor_required' using errcode = '42501';
  end if;
  if p_operation not in ('accept', 'decline', 'withdraw') then
    raise exception 'action_need_offer_operation_invalid' using errcode = '22023';
  end if;

  select need_id into v_need_id
    from public.action_need_offers
   where id = p_offer_id;
  if not found then
    raise exception 'action_need_offer_not_found' using errcode = 'P0002';
  end if;

  -- Lock the action and need before reading eligibility. This serializes a
  -- close/publication change with accept/decline at the same resource boundary.
  select into v_need, v_action
    n, a
    from public.action_needs n
    join public.actions a on a.id = n.action_id
   where n.id = v_need_id
   for update of n, a;
  if not found then
    raise exception 'action_need_offer_not_found' using errcode = 'P0002';
  end if;

  select * into v_offer
    from public.action_need_offers
   where id = p_offer_id
   for update;
  if not found or v_offer.need_id <> v_need.id then
    raise exception 'action_need_offer_not_found' using errcode = 'P0002';
  end if;

  if p_operation = 'withdraw' then
    if v_offer.offered_by_clerk_id <> btrim(p_actor_clerk_id) then
      raise exception 'action_need_offer_withdraw_forbidden' using errcode = '42501';
    end if;
    if v_offer.status = 'withdrawn' then
      return jsonb_build_object('status', 'withdrawn', 'offer', to_jsonb(v_offer), 'notificationId', null);
    end if;
    if v_offer.status <> 'pending' then
      raise exception 'action_need_offer_transition_conflict' using errcode = '40001';
    end if;
    update public.action_need_offers
       set status = 'withdrawn'
     where id = v_offer.id
     returning * into v_offer;
    return jsonb_build_object('status', 'withdrawn', 'offer', to_jsonb(v_offer), 'notificationId', null);
  end if;

  if v_action.created_by_clerk_id <> btrim(p_actor_clerk_id)
     and not exists (
       select 1
       from public.action_organizers ao
       where ao.action_id = v_action.id
         and ao.organizer_clerk_id = btrim(p_actor_clerk_id)
     ) then
    raise exception 'action_need_offer_manager_forbidden' using errcode = '42501';
  end if;

  v_target_status := case when p_operation = 'accept' then 'accepted' else 'declined' end;
  if v_offer.status = v_target_status then
    -- A retry is idempotent. Repair the notification if an older accepted row
    -- predates this boundary, while the unique index prevents duplication.
    if v_target_status = 'accepted' then
      insert into public.app_notifications (user_id, type, title, content, payload)
      values (
        v_offer.offered_by_clerk_id,
        'community',
        'Offre d’aide acceptée',
        'Votre proposition d’aide pour un besoin d’action a été acceptée.',
        jsonb_build_object(
          'kind', 'action_need_offer_accepted',
          'offerId', v_offer.id::text,
          'needId', v_need.id::text,
          'actionId', v_action.id::text
        )
      )
      on conflict (user_id, type, ((payload ->> 'offerId')))
        where type = 'community'
          and (payload ->> 'kind') = 'action_need_offer_accepted'
      do nothing
      returning id into v_notification_id;
      if v_notification_id is null then
        select id into v_notification_id
          from public.app_notifications
         where user_id = v_offer.offered_by_clerk_id
           and type = 'community'
           and payload ->> 'kind' = 'action_need_offer_accepted'
           and payload ->> 'offerId' = v_offer.id::text
         limit 1;
      end if;
    end if;
    return jsonb_build_object('status', v_offer.status, 'offer', to_jsonb(v_offer), 'notificationId', v_notification_id);
  end if;

  if v_offer.status <> 'pending' then
    raise exception 'action_need_offer_transition_conflict' using errcode = '40001';
  end if;
  if not public.is_public_open_action_need(v_need.id) then
    raise exception 'action_need_offer_need_not_eligible' using errcode = '40001';
  end if;

  update public.action_need_offers
     set status = v_target_status
   where id = v_offer.id
   returning * into v_offer;

  if v_target_status = 'accepted' then
    insert into public.app_notifications (user_id, type, title, content, payload)
    values (
      v_offer.offered_by_clerk_id,
      'community',
      'Offre d’aide acceptée',
      'Votre proposition d’aide pour un besoin d’action a été acceptée.',
      jsonb_build_object(
        'kind', 'action_need_offer_accepted',
        'offerId', v_offer.id::text,
        'needId', v_need.id::text,
        'actionId', v_action.id::text
      )
    )
    on conflict (user_id, type, ((payload ->> 'offerId')))
      where type = 'community'
        and (payload ->> 'kind') = 'action_need_offer_accepted'
    do nothing
    returning id into v_notification_id;
  end if;

  return jsonb_build_object('status', v_offer.status, 'offer', to_jsonb(v_offer), 'notificationId', v_notification_id);
end;
$$;

revoke all on function public.transition_action_need_offer(uuid, text, text) from public, anon, authenticated;
grant execute on function public.transition_action_need_offer(uuid, text, text) to service_role;
