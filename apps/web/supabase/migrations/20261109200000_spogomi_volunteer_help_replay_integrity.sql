-- PURPOSE: make requester retries independent from current event availability.
-- CALLER: authenticated Clerk server routes through service_role only.
-- AUTHORIZATION_BOUNDARY: the replay key remains scoped to event and requester.
-- IDEMPOTENCY: the first canonical payload is replayed; a changed payload raises
-- an explicit conflict; no second row or history event is written.
-- ATOMICITY: the advisory lock and proposal row lock serialize the lookup.
-- FAILURE_BEHAVIOR: new proposals retain the published/future/active guards;
-- mismatched replays fail before any mutation.
-- SEARCH_PATH: fixed to pg_catalog, public; GRANTS: unchanged service_role only.

create or replace function public.create_spogomi_volunteer_help_proposal(
  p_event_id uuid,
  p_requester_clerk_id text,
  p_client_request_id text,
  p_contact_first_name text,
  p_contact_last_name text,
  p_contact_email text,
  p_contact_phone text,
  p_help_type text,
  p_motivation text,
  p_useful_skills text,
  p_cleanwalk_experience text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_proposal public.spogomi_volunteer_help_proposals%rowtype;
  v_requester text := btrim(coalesce(p_requester_clerk_id, ''));
  v_client_request_id text := btrim(coalesce(p_client_request_id, ''));
  v_contact_email text := nullif(btrim(coalesce(p_contact_email, '')), '');
  v_contact_phone text := nullif(btrim(coalesce(p_contact_phone, '')), '');
  v_cleanwalk_experience text := btrim(coalesce(p_cleanwalk_experience, ''));
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_volunteer_help_service_only';
  end if;
  if length(v_requester) = 0 or length(v_client_request_id) not between 16 and 160 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_volunteer_help_proposal';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s', p_event_id, v_requester), 0));

  -- Resolve the key before checking whether a new proposal is currently allowed.
  -- This is the lost-response path: it must replay even after closure,
  -- cancellation or depublication, but only for the same account and event.
  select * into v_proposal
    from public.spogomi_volunteer_help_proposals proposal
   where proposal.event_id = p_event_id
     and proposal.requester_clerk_id = v_requester
     and proposal.client_request_id = v_client_request_id
   for update;
  if found then
    if v_proposal.contact_first_name is distinct from btrim(coalesce(p_contact_first_name, ''))
       or v_proposal.contact_last_name is distinct from btrim(coalesce(p_contact_last_name, ''))
       or v_proposal.contact_email is distinct from v_contact_email
       or v_proposal.contact_phone is distinct from v_contact_phone
       or v_proposal.help_type is distinct from btrim(coalesce(p_help_type, ''))
       or v_proposal.motivation is distinct from btrim(coalesce(p_motivation, ''))
       or v_proposal.useful_skills is distinct from btrim(coalesce(p_useful_skills, ''))
       or v_proposal.cleanwalk_experience is distinct from v_cleanwalk_experience then
      raise exception using errcode = '22023', message = 'spogomi_volunteer_help_idempotency_conflict';
    end if;
    return to_jsonb(v_proposal);
  end if;

  if v_contact_email is null and v_contact_phone is null then
    raise exception using errcode = '22023', message = 'spogomi_volunteer_help_contact_required';
  end if;

  if not exists (
    select 1 from public.spogomi_events event
     where event.id = p_event_id
       and event.public_visibility = 'published'
       and event.state not in ('cancelled', 'archived')
       and event.starts_at > now()
  ) then
    raise exception using errcode = 'P0002', message = 'spogomi_volunteer_help_unavailable';
  end if;

  if exists (
    select 1 from public.spogomi_volunteer_help_proposals proposal
     where proposal.event_id = p_event_id
       and proposal.requester_clerk_id = v_requester
       and proposal.status in ('pending', 'accepted')
  ) then
    raise exception using errcode = '23505', message = 'spogomi_volunteer_help_active_conflict';
  end if;

  insert into public.spogomi_volunteer_help_proposals (
    event_id, requester_clerk_id, client_request_id,
    contact_first_name, contact_last_name, contact_email, contact_phone,
    help_type, motivation, useful_skills, cleanwalk_experience
  ) values (
    p_event_id, v_requester, v_client_request_id,
    btrim(p_contact_first_name), btrim(p_contact_last_name), v_contact_email, v_contact_phone,
    btrim(p_help_type), btrim(p_motivation), btrim(p_useful_skills), v_cleanwalk_experience
  ) returning * into v_proposal;

  insert into public.spogomi_volunteer_help_proposal_events (proposal_id, event_id, status, actor_clerk_id)
  values (v_proposal.id, v_proposal.event_id, v_proposal.status, v_requester);

  return to_jsonb(v_proposal);
end;
$$;

revoke all on function public.create_spogomi_volunteer_help_proposal(uuid, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_spogomi_volunteer_help_proposal(uuid, text, text, text, text, text, text, text, text, text, text) to service_role;
