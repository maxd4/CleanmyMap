-- PURPOSE: harden replay authorization and keep requester transition responses minimal.
-- CALLER: service_role server RPC only.
-- AUTHORIZATION_BOUNDARY: requester ownership for withdrawal; event creator/action_organizers for decisions, before replay.
-- IDEMPOTENCY: terminal replay is allowed only after the same authorization check.
-- ATOMICITY: row lock, transition and append-only history stay in one transaction.
-- FAILURE_BEHAVIOR: unauthorized callers receive 42501 without a private proposal projection.
-- SEARCH_PATH: fixed to pg_catalog, public. GRANTS: service_role only, unchanged.

create or replace function public.transition_spogomi_volunteer_help_proposal(
  p_proposal_id uuid,
  p_event_id uuid,
  p_target_status text,
  p_actor_clerk_id text,
  p_decision_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_proposal public.spogomi_volunteer_help_proposals%rowtype;
  v_event public.spogomi_events%rowtype;
  v_actor text := btrim(coalesce(p_actor_clerk_id, ''));
  v_is_organizer boolean;
  v_is_requester boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_volunteer_help_service_only';
  end if;
  if p_target_status not in ('accepted', 'rejected', 'withdrawn') or length(v_actor) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_volunteer_help_transition';
  end if;

  select * into v_proposal
  from public.spogomi_volunteer_help_proposals proposal
  where proposal.id = p_proposal_id and proposal.event_id = p_event_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_volunteer_help_unavailable';
  end if;

  select event.* into v_event from public.spogomi_events event where event.id = p_event_id;
  v_is_requester := v_actor = v_proposal.requester_clerk_id;
  select v_event.created_by_clerk_id = v_actor or exists (
    select 1 from public.action_organizers organizer
    where organizer.action_id = v_event.action_id
      and organizer.organizer_clerk_id = v_actor
  ) into v_is_organizer;

  if p_target_status = 'withdrawn' and not coalesce(v_is_requester, false) then
    raise exception using errcode = '42501', message = 'spogomi_volunteer_help_requester_required';
  end if;
  if p_target_status <> 'withdrawn' and not coalesce(v_is_organizer, false) then
    raise exception using errcode = '42501', message = 'spogomi_volunteer_help_organizer_required';
  end if;

  if v_proposal.status = p_target_status then
    if p_target_status = 'withdrawn' then
      return jsonb_build_object(
        'id', v_proposal.id,
        'event_id', v_proposal.event_id,
        'status', v_proposal.status,
        'decision_note', v_proposal.decision_note,
        'decided_at', v_proposal.decided_at,
        'created_at', v_proposal.created_at
      );
    end if;
    return to_jsonb(v_proposal);
  end if;
  if v_proposal.status <> 'pending' then
    raise exception using errcode = '40001', message = 'spogomi_volunteer_help_already_resolved';
  end if;

  update public.spogomi_volunteer_help_proposals
  set status = p_target_status,
      decision_note = nullif(btrim(coalesce(p_decision_note, '')), ''),
      decided_by_clerk_id = v_actor,
      decided_at = now(),
      retention_until = now() + interval '24 months',
      updated_at = now()
  where id = v_proposal.id
  returning * into v_proposal;

  insert into public.spogomi_volunteer_help_proposal_events (proposal_id, event_id, status, actor_clerk_id, details)
  values (v_proposal.id, v_proposal.event_id, v_proposal.status, v_actor, jsonb_build_object('has_decision_note', v_proposal.decision_note is not null));

  if p_target_status = 'withdrawn' then
    return jsonb_build_object(
      'id', v_proposal.id,
      'event_id', v_proposal.event_id,
      'status', v_proposal.status,
      'decision_note', v_proposal.decision_note,
      'decided_at', v_proposal.decided_at,
      'created_at', v_proposal.created_at
    );
  end if;
  return to_jsonb(v_proposal);
end;
$$;

revoke all on function public.transition_spogomi_volunteer_help_proposal(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.transition_spogomi_volunteer_help_proposal(uuid, uuid, text, text, text) to service_role;
