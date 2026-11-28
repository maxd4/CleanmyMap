-- Extend the canonical action creation transaction with an optional enterprise
-- association. The existing link RPC remains the sole authorization owner.
-- PURPOSE: create an action and attach its verified organization/site atomically.
-- CALLERS: authenticated server action creation through create_action_with_relations.
-- AUTHORIZATION_BOUNDARY: service_role only; link_organization_action verifies membership, role, site, organizer ref and action rights.
-- IDEMPOTENCY: the creation fingerprint includes association context; audit request id is deterministic per actor/org/request.
-- ATOMICITY: a rejected association rolls back the action and all child rows.
-- FAILURE_BEHAVIOR: malformed or unauthorized association aborts the canonical RPC.
-- SEARCH_PATH: pinned to public, pg_catalog.

create or replace function public.create_action_with_relations(
  p_action jsonb,
  p_organizers jsonb,
  p_registrations jsonb,
  p_creator_id text,
  p_client_request_id text default null,
  p_client_request_fingerprint text default null,
  p_organizer_required boolean default true
)
returns table (action_id uuid, replayed boolean)
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_action_id uuid;
  v_replayed boolean;
  v_link jsonb := p_action -> '_enterprise_organization_link';
begin
  perform set_config('cleanmymap.action_creation_provenance', 'real', true);

  select result.action_id, result.replayed
  into v_action_id, v_replayed
  from public.create_action_with_relations_legacy(
    p_action, p_organizers, p_registrations, p_creator_id,
    p_client_request_id, p_client_request_fingerprint, p_organizer_required
  ) result;

  if not coalesce(v_replayed, false) then
    update public.actions
    set action_timezone = coalesce(
      nullif(btrim(p_action ->> 'action_timezone'), ''),
      action_timezone,
      'Europe/Paris'
    )
    where id = v_action_id;
  end if;

  if v_link is not null then
    if jsonb_typeof(v_link) <> 'object'
      or jsonb_typeof(v_link -> 'organization_id') <> 'string'
      or jsonb_typeof(v_link -> 'request_id') <> 'string'
      or (v_link ? 'site_id' and jsonb_typeof(v_link -> 'site_id') not in ('string', 'null'))
    then
      raise exception using errcode = '22023', message = 'invalid organization action link';
    end if;

    perform public.link_organization_action(
      (v_link ->> 'organization_id')::uuid,
      p_creator_id,
      v_action_id,
      nullif(v_link ->> 'site_id', '')::uuid,
      (v_link ->> 'request_id')::uuid
    );
  end if;

  return query select v_action_id, v_replayed;
end;
$$;

create function public.organization_action_creation_enabled()
returns boolean
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select true
$$;

revoke all on function public.organization_action_creation_enabled() from public, anon, authenticated, service_role;
grant execute on function public.organization_action_creation_enabled() to service_role;

revoke all on function public.create_action_with_relations(
  jsonb, jsonb, jsonb, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.create_action_with_relations(
  jsonb, jsonb, jsonb, text, text, text, boolean
) to service_role;
