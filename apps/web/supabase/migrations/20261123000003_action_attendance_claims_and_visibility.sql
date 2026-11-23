-- PURPOSE: link a member's post-action claim to one private present roster row
--          and expose only participant profiles with holder-owned consent.
-- CALLER: authenticated application server through service_role RPCs.
-- AUTHORIZATION_BOUNDARY: route AuthN/rate limits plus SQL public-action,
--                        attendance and confirmed-participation checks.
-- IDEMPOTENCY: action_participants remains unique per account/action; a roster
--              row can be referenced by at most one account/action request.
-- ATOMICITY: accepting a claim links the roster row in the same transaction as
--            action_participants confirmation and existing notification hooks.
-- FAILURE_BEHAVIOR: stale, private, absent or claimed rows fail without writes.
-- SEARCH_PATH: all SECURITY DEFINER functions pin pg_catalog, public.
-- GRANTS: mutation/read RPCs are server-only; browser roles have no table access.

alter table public.action_participants
  add column if not exists attendance_entry_id uuid null
  references public.action_attendance_entries(id) on delete set null;

alter table public.action_participants
  add column if not exists attendance_claim_reviewed_by_clerk_id text null;

create unique index if not exists action_participants_action_attendance_entry_unique
  on public.action_participants(action_id, attendance_entry_id)
  where attendance_entry_id is not null;

alter table public.action_attendance_entries
  drop constraint if exists action_attendance_entries_provenance_check;
alter table public.action_attendance_entries
  add constraint action_attendance_entries_provenance_check
  check (provenance in ('confirmed_registration', 'organizer_entry', 'organizer_link', 'member_claim'));

create table if not exists public.action_participant_visibility_consents (
  action_id uuid not null references public.actions(id) on delete cascade,
  user_id text not null,
  consented_at timestamptz null,
  revoked_at timestamptz null,
  age_eligible boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (action_id, user_id),
  constraint action_participant_visibility_consent_state_check
    check ((consented_at is not null and revoked_at is null and age_eligible)
      or (consented_at is null and revoked_at is null and not age_eligible)
      or (consented_at is not null and revoked_at is not null and not age_eligible))
);

alter table public.action_participant_visibility_consents enable row level security;
revoke all on public.action_participant_visibility_consents from public, anon, authenticated;
grant select, insert, update, delete on public.action_participant_visibility_consents to service_role;

create or replace function public.request_action_attendance_claim(
  p_action_id uuid,
  p_user_id text,
  p_attendance_entry_id uuid
)
returns table (
  action_id uuid,
  participant_user_id text,
  participation_status text,
  participation_source text,
  joined_at timestamptz,
  updated_at timestamptz,
  already_requested boolean,
  attendance_entry_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action public.actions%rowtype;
  v_entry public.action_attendance_entries%rowtype;
  v_participant public.action_participants%rowtype;
  v_now timestamptz := now();
begin
  if nullif(btrim(p_user_id), '') is null or p_attendance_entry_id is null then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
  end if;

  select * into v_action from public.actions where id = p_action_id for update;
  if not found or v_action.status <> 'approved'
     or coalesce(v_action.access_mode, 'public') <> 'public'
     or coalesce(v_action.moderation_visibility, 'visible') = 'hidden'
     or v_action.published_at is null
     or v_action.action_phase <> 'post_action_complete'
     or v_action.event_start_at is null or v_action.event_start_at > v_now then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
  end if;

  select * into v_entry from public.action_attendance_entries
   where id = p_attendance_entry_id and action_id = p_action_id
     and attendance_status = 'present' and deleted_at is null
   for update;
  if not found then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
  end if;
  if v_entry.clerk_user_id is not null and v_entry.clerk_user_id <> p_user_id then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_action_id::text || ':' || p_user_id, 0));
  select * into v_participant from public.action_participants
   where action_id = p_action_id and user_id = p_user_id for update;
  if found then
    if v_participant.participation_source <> 'post_action_claim'
       or v_participant.participation_status not in ('pending', 'confirmed')
       or (v_participant.attendance_entry_id is not null
           and v_participant.attendance_entry_id <> p_attendance_entry_id)
       or (v_participant.participation_status = 'confirmed'
           and v_participant.attendance_entry_id is null) then
      raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
    end if;
    if v_participant.attendance_entry_id is null then
      update public.action_participants set attendance_entry_id = p_attendance_entry_id
       where id = v_participant.id returning * into v_participant;
    end if;
    return query select v_participant.action_id, v_participant.user_id,
      v_participant.participation_status, v_participant.participation_source,
      v_participant.joined_at, v_participant.updated_at, true,
      v_participant.attendance_entry_id;
    return;
  end if;

  if exists (select 1 from public.action_participants ap
      where ap.action_id = p_action_id and ap.attendance_entry_id = p_attendance_entry_id
        and ap.user_id <> p_user_id and ap.participation_status in ('pending', 'confirmed')) then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
  end if;

  insert into public.action_participants (
    action_id, user_id, joined_at, participation_status,
    participation_source, attendance_entry_id
  ) values (
    p_action_id, p_user_id, v_now, 'pending',
    'post_action_claim', p_attendance_entry_id
  ) returning * into v_participant;

  return query select v_participant.action_id, v_participant.user_id,
    v_participant.participation_status, v_participant.participation_source,
    v_participant.joined_at, v_participant.updated_at, false,
    v_participant.attendance_entry_id;
exception
  when unique_violation then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
end;
$$;

revoke all on function public.request_action_attendance_claim(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.request_action_attendance_claim(uuid, text, uuid)
  to service_role;

create or replace function public.link_claimed_attendance_entry_on_confirmation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entry public.action_attendance_entries%rowtype;
  v_after public.action_attendance_entries%rowtype;
  v_actor text;
begin
  if old.participation_status <> 'pending'
     or new.participation_status <> 'confirmed'
     or new.participation_source <> 'post_action_claim'
     or new.attendance_entry_id is null then
    return new;
  end if;

  v_actor := nullif(btrim(new.attendance_claim_reviewed_by_clerk_id), '');
  if v_actor is null then
    raise exception 'attendance_claim_reviewer_required' using errcode = '42501';
  end if;

  select * into v_entry from public.action_attendance_entries
   where id = new.attendance_entry_id and action_id = new.action_id
     and attendance_status = 'present' and deleted_at is null
   for update;
  if not found or (v_entry.clerk_user_id is not null and v_entry.clerk_user_id <> new.user_id) then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
  end if;

  if v_entry.clerk_user_id is null then
    update public.action_attendance_entries
       set clerk_user_id = new.user_id, provenance = 'member_claim',
           revision = revision + 1, updated_at = now(), updated_by = v_actor
     where id = v_entry.id returning * into v_after;
    insert into public.action_attendance_entry_audit(
      action_id, entry_id, actor_id, request_id, operation, before_value, after_value
    ) values (
      new.action_id, v_after.id, v_actor, gen_random_uuid(), 'link',
      to_jsonb(v_entry), to_jsonb(v_after)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.link_claimed_attendance_entry_on_confirmation()
  from public, anon, authenticated, service_role;
drop trigger if exists action_participants_link_claimed_attendance on public.action_participants;
create trigger action_participants_link_claimed_attendance
after update of participation_status on public.action_participants
for each row execute function public.link_claimed_attendance_entry_on_confirmation();

create or replace function public.set_action_participant_visibility_consent(
  p_action_id uuid,
  p_user_id text,
  p_enabled boolean,
  p_age_eligible boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action public.actions%rowtype;
  v_now timestamptz := now();
  v_confirmed boolean;
begin
  if nullif(btrim(p_user_id), '') is null then
    raise exception 'participant_visibility_unavailable' using errcode = 'P0002';
  end if;
  if not p_enabled then
    update public.action_participant_visibility_consents
       set revoked_at = coalesce(revoked_at, v_now), age_eligible = false, updated_at = v_now
     where action_id = p_action_id and user_id = p_user_id;
    return false;
  end if;

  select * into v_action from public.actions where id = p_action_id for update;
  if not found or v_action.status <> 'approved'
     or coalesce(v_action.access_mode, 'public') <> 'public'
     or coalesce(v_action.moderation_visibility, 'visible') = 'hidden'
     or v_action.published_at is null then
    raise exception 'participant_visibility_unavailable' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.action_registrations ar
     where ar.action_id = p_action_id and ar.user_id = p_user_id
       and ar.registration_status = 'confirmed'
       and v_action.action_phase = 'pre_action'
       and v_action.event_start_at > v_now
    union all
    select 1 from public.action_participants ap
     where ap.action_id = p_action_id and ap.user_id = p_user_id
       and ap.participation_status = 'confirmed'
       and v_action.action_phase = 'post_action_complete'
       and v_action.event_start_at <= v_now
  ) into v_confirmed;
  if not v_confirmed then
    raise exception 'participant_visibility_unavailable' using errcode = 'P0002';
  end if;

  if not p_age_eligible then
    raise exception 'participant_visibility_not_eligible' using errcode = '42501';
  end if;

  insert into public.action_participant_visibility_consents(
    action_id, user_id, consented_at, revoked_at, age_eligible, updated_at
  ) values (p_action_id, p_user_id, v_now, null, true, v_now)
  on conflict (action_id, user_id) do update
    set consented_at = coalesce(action_participant_visibility_consents.consented_at, excluded.consented_at),
        revoked_at = null, age_eligible = true, updated_at = v_now;
  return true;
end;
$$;

create or replace function public.revoke_all_action_participant_visibility_consents(p_user_id text)
returns integer
language sql
security definer
set search_path = pg_catalog, public
as $$
  with revoked as (
    update public.action_participant_visibility_consents
       set revoked_at = coalesce(revoked_at, now()),
           age_eligible = false, updated_at = now()
     where user_id = p_user_id and (revoked_at is null or age_eligible)
    returning 1
  ) select count(*)::integer from revoked
$$;

create or replace function public.load_public_action_participant_visibility(p_action_id uuid)
returns table (registered_count integer, profiles jsonb)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action public.actions%rowtype;
  v_now timestamptz := now();
begin
  select * into v_action from public.actions where id = p_action_id;
  if not found or v_action.status <> 'approved'
     or coalesce(v_action.access_mode, 'public') <> 'public'
     or coalesce(v_action.moderation_visibility, 'visible') = 'hidden'
     or v_action.published_at is null
     or (v_action.action_phase = 'pre_action' and v_action.event_start_at <= v_now)
     or v_action.action_phase not in ('pre_action', 'post_action_complete') then
    return query select 0, '[]'::jsonb;
    return;
  end if;

  if v_action.action_phase = 'pre_action' then
    return query
    select (select count(*)::integer from public.action_registrations ar
      where ar.action_id = p_action_id and ar.registration_status = 'confirmed'),
      coalesce((select jsonb_agg(jsonb_build_object(
        'displayName', coalesce(nullif(btrim(profiles.display_name), ''), nullif(btrim(profiles.handle), '')),
        'handle', nullif(btrim(profiles.handle), ''), 'avatarUrl', profiles.avatar_url
      ) order by profiles.display_name, profiles.handle)
      from (
        select pp.display_name, pp.handle, pp.avatar_url
        from public.action_registrations ar
        join public.action_participant_visibility_consents c
          on c.action_id = ar.action_id and c.user_id = ar.user_id
         and c.revoked_at is null and c.age_eligible
        join public.public_profiles pp on pp.id = ar.user_id
        where ar.action_id = p_action_id and ar.registration_status = 'confirmed'
          and coalesce(nullif(btrim(pp.display_name), ''), nullif(btrim(pp.handle), '')) is not null
        order by pp.display_name, pp.handle
        limit 100
      ) profiles), '[]'::jsonb);
    return;
  end if;

  return query
  select 0, coalesce((select jsonb_agg(jsonb_build_object(
      'displayName', coalesce(nullif(btrim(profiles.display_name), ''), nullif(btrim(profiles.handle), '')),
      'handle', nullif(btrim(profiles.handle), ''), 'avatarUrl', profiles.avatar_url
    ) order by profiles.display_name, profiles.handle)
    from (
      select pp.display_name, pp.handle, pp.avatar_url
      from public.action_participants ap
      join public.action_participant_visibility_consents c
        on c.action_id = ap.action_id and c.user_id = ap.user_id
       and c.revoked_at is null and c.age_eligible
      join public.public_profiles pp on pp.id = ap.user_id
      where ap.action_id = p_action_id and ap.participation_status = 'confirmed'
        and coalesce(nullif(btrim(pp.display_name), ''), nullif(btrim(pp.handle), '')) is not null
      order by pp.display_name, pp.handle
      limit 100
    ) profiles), '[]'::jsonb);
end;
$$;

revoke all on function public.set_action_participant_visibility_consent(uuid, text, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.set_action_participant_visibility_consent(uuid, text, boolean, boolean)
  to service_role;
revoke all on function public.revoke_all_action_participant_visibility_consents(text)
  from public, anon, authenticated;
grant execute on function public.revoke_all_action_participant_visibility_consents(text)
  to service_role;
revoke all on function public.load_public_action_participant_visibility(uuid)
  from public, anon, authenticated;
grant execute on function public.load_public_action_participant_visibility(uuid)
  to service_role;

comment on table public.action_participant_visibility_consents is
  'Per-account/per-action public identity consent. Disabled by default; only eligible account holders can enable it.';
