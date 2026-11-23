-- PURPOSE: remove the remaining action_id ambiguity in the locked roster-entry lookup.
-- CALLER: authorized application server through service_role RPC.
-- AUTHORIZATION_BOUNDARY: function remains SECURITY DEFINER and service_role-only.
-- IDEMPOTENCY: repeated action/user/entry claims return the canonical pending row.
-- ATOMICITY: action, roster entry and participant remain locked in one transaction.
-- FAILURE_BEHAVIOR: unavailable, stale or conflicting claims keep the neutral P0002 failure.
-- SEARCH_PATH: fixed to pg_catalog, public.
-- GRANTS: only service_role may execute the RPC.

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

  select ae.* into v_entry
    from public.action_attendance_entries as ae
   where ae.id = p_attendance_entry_id and ae.action_id = p_action_id
     and ae.attendance_status = 'present' and ae.deleted_at is null
   for update;
  if not found then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
  end if;
  if v_entry.clerk_user_id is not null and v_entry.clerk_user_id <> p_user_id then
    raise exception 'attendance_claim_unavailable' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_action_id::text || ':' || p_user_id, 0));
  select ap.* into v_participant
    from public.action_participants as ap
   where ap.action_id = p_action_id and ap.user_id = p_user_id
   for update;
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
