-- PostgreSQL contract for the private assistance proposal flow.
-- Execute only on an ephemeral Supabase/PostgreSQL replay database.

begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"spogomi-help-test-service"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select plan(7);

select has_table('public', 'spogomi_volunteer_help_proposals', 'proposal table exists');
select has_table('public', 'spogomi_volunteer_help_proposal_events', 'append-only history table exists');
select has_function('public', 'create_spogomi_volunteer_help_proposal', array['uuid', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text'], 'create RPC exists');
select has_function('public', 'transition_spogomi_volunteer_help_proposal', array['uuid', 'uuid', 'text', 'text', 'text'], 'transition RPC exists');
select ok(has_table_privilege('service_role', 'public.spogomi_volunteer_help_proposals', 'SELECT'), 'service role can read private proposals');
select ok(not has_table_privilege('authenticated', 'public.spogomi_volunteer_help_proposals', 'SELECT'), 'authenticated role cannot read private proposals directly');

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_other_event_id uuid := gen_random_uuid();
  v_proposal_id uuid;
  v_replayed_id uuid;
  v_withdrawn_id uuid;
  v_withdrawn_projection jsonb;
  v_unauthorized boolean := false;
begin
  insert into public.actions (id, created_by_clerk_id, action_date, location_label)
  values (v_action_id, 'help-organizer', current_date, 'SPOGOMI help SQL contract');
  insert into public.spogomi_events (id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, regulation_version, public_visibility)
  values (v_event_id, v_action_id, 'help-organizer', 'Help event', 'Paris', 'casual', 'draft', now() + interval '2 days', 'v1', 'published');
  insert into public.action_organizers (action_id, organizer_clerk_id, organizer_label)
  values (v_action_id, 'help-organizer', 'Help organizer');

  v_proposal_id := (public.create_spogomi_volunteer_help_proposal(
    v_event_id, 'help-requester', 'proposal-key-000001', 'Ada', 'Lovelace', 'ada' || '@example.test', null,
    'Accueil', 'Je souhaite aider.', 'Organisation', 'Une cleanwalk.'
  ) ->> 'id')::uuid;
  if v_proposal_id is null then raise exception 'proposal was not persisted'; end if;

  v_replayed_id := (public.create_spogomi_volunteer_help_proposal(
    v_event_id, 'help-requester', 'proposal-key-000001', 'Ada', 'Lovelace', 'ada' || '@example.test', null,
    'Accueil', 'Je souhaite aider.', 'Organisation', 'Une cleanwalk.'
  ) ->> 'id')::uuid;
  if v_replayed_id <> v_proposal_id then raise exception 'idempotent replay created another proposal'; end if;

  begin
    perform public.create_spogomi_volunteer_help_proposal(
      v_event_id, 'help-requester', 'proposal-key-000002', 'Ada', 'Lovelace', 'ada' || '@example.test', null,
      'Accueil', 'Je souhaite aider.', 'Organisation', ''
    );
    raise exception 'active duplicate was accepted';
  exception when unique_violation then null;
  end;

  if (public.transition_spogomi_volunteer_help_proposal(v_proposal_id, v_event_id, 'accepted', 'help-organizer', 'Bienvenue.') ->> 'status') <> 'accepted' then
    raise exception 'organizer transition failed';
  end if;
  if (select count(*) from public.spogomi_volunteer_help_proposal_events where proposal_id = v_proposal_id) <> 2 then
    raise exception 'proposal history is not append-only';
  end if;
  if (select count(*) from public.spogomi_participants where event_id = v_event_id and clerk_id = 'help-requester') <> 0 then
    raise exception 'help proposal created a sport participant';
  end if;

  v_withdrawn_id := (public.create_spogomi_volunteer_help_proposal(
    v_event_id, 'other-help-requester', 'proposal-key-other-0001', 'Grace', 'Hopper', 'grace' || '@example.test', null,
    'Accueil', 'Je souhaite aussi aider.', 'Accueil.', ''
  ) ->> 'id')::uuid;
  perform public.transition_spogomi_volunteer_help_proposal(v_withdrawn_id, v_event_id, 'withdrawn', 'other-help-requester', null);
  begin
    perform public.transition_spogomi_volunteer_help_proposal(v_withdrawn_id, v_event_id, 'withdrawn', 'help-requester', null);
  exception when insufficient_privilege then
    v_unauthorized := true;
  end;
  if not v_unauthorized then raise exception 'withdrawn proposal replay bypassed requester authorization'; end if;
  v_withdrawn_projection := public.transition_spogomi_volunteer_help_proposal(v_withdrawn_id, v_event_id, 'withdrawn', 'other-help-requester', null);
  if v_withdrawn_projection ? 'motivation' or v_withdrawn_projection ? 'contact_email' then
    raise exception 'withdrawal replay exposed private proposal fields';
  end if;

  insert into public.actions (id, created_by_clerk_id, action_date, location_label)
  values (gen_random_uuid(), 'help-organizer', current_date, 'SPOGOMI second help SQL contract')
  returning id into v_action_id;
  insert into public.spogomi_events (id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, regulation_version, public_visibility)
  values (v_other_event_id, v_action_id, 'help-organizer', 'Other help event', 'Lyon', 'casual', 'draft', now() + interval '2 days', 'v1', 'published');
  perform public.create_spogomi_volunteer_help_proposal(
    v_other_event_id, 'help-requester', 'proposal-key-000001', 'Ada', 'Lovelace', 'ada' || '@example.test', null,
    'Accueil', 'Je souhaite aider.', 'Organisation', ''
  );
end;
$$;

select ok(true, 'idempotence, active duplicate, organizer transition, authorized terminal replay, minimal withdrawal projection, history and event isolation exercised');
select * from finish();
rollback;
