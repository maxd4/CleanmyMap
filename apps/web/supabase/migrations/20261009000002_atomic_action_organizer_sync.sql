-- PURPOSE: replace an action's organizer relations as one database operation.
-- CALLER: the authenticated server-side action edit workflow only.
-- ATOMICITY: lock the action row and keep delete/insert in one transaction;
--            a failed insert rolls back the relation replacement.
-- SAFETY: this function never deletes from public.actions and rejects malformed
--         or duplicated organizer payloads before mutating relations.
-- RLS: SECURITY INVOKER preserves the existing service_role-only table policies.
-- GRANTS: only service_role may execute this server-side synchronization RPC.

create or replace function public.replace_action_organizers(
  p_action_id uuid,
  p_organizers jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  action_exists boolean;
begin
  if p_organizers is null or jsonb_typeof(p_organizers) <> 'array' then
    raise exception 'organizers must be a JSON array'
      using errcode = '22023';
  end if;

  select exists(
    select 1
    from public.actions
    where id = p_action_id
  )
  into action_exists;

  if not action_exists then
    raise exception 'action does not exist'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_organizers) as item(
      organizer_clerk_id text,
      organizer_label text,
      organizer_handle text,
      is_primary boolean
    )
    where nullif(btrim(item.organizer_clerk_id), '') is null
      or nullif(btrim(item.organizer_label), '') is null
  ) then
    raise exception 'organizer id and label are required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_organizers) as item(
      organizer_clerk_id text,
      organizer_label text,
      organizer_handle text,
      is_primary boolean
    )
    group by btrim(item.organizer_clerk_id)
    having count(*) > 1
  ) then
    raise exception 'organizer ids must be unique'
      using errcode = '23505';
  end if;

  -- Serialize concurrent replacements for this action. The subsequent delete
  -- and insert are part of this same transaction and cannot leave a partial
  -- organizer set visible after an error.
  perform 1
  from public.actions
  where id = p_action_id
  for update;

  delete from public.action_organizers
  where action_id = p_action_id;

  with requested as (
    select
      item.ordinality,
      btrim(item.organizer_clerk_id) as organizer_clerk_id,
      btrim(item.organizer_label) as organizer_label,
      nullif(btrim(item.organizer_handle), '') as organizer_handle,
      coalesce(item.is_primary, false) as requested_primary
    from jsonb_to_recordset(p_organizers) with ordinality as item(
      organizer_clerk_id text,
      organizer_label text,
      organizer_handle text,
      is_primary boolean,
      ordinality bigint
    )
  ), primary_choice as (
    select coalesce(
      min(ordinality) filter (where requested_primary),
      min(ordinality)
    ) as ordinality
    from requested
  )
  insert into public.action_organizers (
    action_id,
    organizer_clerk_id,
    organizer_label,
    organizer_handle,
    is_primary
  )
  select
    p_action_id,
    requested.organizer_clerk_id,
    requested.organizer_label,
    requested.organizer_handle,
    requested.ordinality = primary_choice.ordinality
  from requested
  cross join primary_choice;
end;
$$;

revoke all on function public.replace_action_organizers(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_action_organizers(uuid, jsonb)
  to service_role;
