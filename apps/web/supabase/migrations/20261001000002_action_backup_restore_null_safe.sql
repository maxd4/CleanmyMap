-- PURPOSE: Restore the normal trigger side effects outside an active restore.
-- CALLER: Existing action and action_organizers triggers.
-- AUTHORIZATION_BOUNDARY: SECURITY DEFINER functions remain owned by the
-- existing trigger contract; this migration changes only restore gating.
-- IDEMPOTENCY: CREATE OR REPLACE preserves the existing function identities,
-- triggers and grants.
-- ATOMICITY: Each trigger invocation keeps its existing delegated operation.
-- FAILURE_BEHAVIOR: Delegated function errors continue to propagate unchanged.
-- SEARCH_PATH: Explicitly restricted to public, pg_catalog.
-- GRANTS: Existing grants remain unchanged by CREATE OR REPLACE.

-- The preceding restore migration used `<> 'on'`. In PostgreSQL, a missing
-- custom setting returns NULL, so that predicate is NULL rather than TRUE.
-- IS DISTINCT FROM keeps the restore switch opt-in: absent/NULL and every
-- value other than `on` retain normal trigger behavior.

create or replace function public.initialize_action_final_participants_on_organizer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if current_setting('cleanmymap.action_restore', true) is distinct from 'on' then
    perform public.initialize_action_final_participants(new.action_id);
  end if;
  return new;
end;
$$;

create or replace function public.sync_action_conversation_notification_audience_on_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if current_setting('cleanmymap.action_restore', true) is distinct from 'on' then
    perform public.sync_action_conversation_notification_audience(new.id);
  end if;
  return new;
end;
$$;

create or replace function public.sync_action_conversation_notification_audience_on_action_source()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if current_setting('cleanmymap.action_restore', true) is distinct from 'on' then
    perform public.sync_action_conversation_notification_audience(
      case when tg_op = 'DELETE' then old.action_id else new.action_id end
    );
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
