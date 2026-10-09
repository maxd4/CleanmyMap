-- Keep the original reviewer event truthful after a group_form decision.
-- The recipient decision event is informational; the reviewer event remains
-- the durable decision card used by the dashboard and notification bell.

create or replace function public.sync_action_registration_review_notification_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if old.registration_source = 'group_form'
    and old.registration_status = 'pending'
    and new.registration_status in ('confirmed', 'cancelled')
    and exists (
      select 1
      from public.actions a
      where a.id = new.action_id
        and a.status in ('pending', 'approved')
        and a.action_phase = 'pre_action'
        and a.published_at is not null
    )
  then
    update public.app_notifications n
    set read_at = coalesce(n.read_at, timezone('utc', now())),
        seen_at = coalesce(n.seen_at, timezone('utc', now())),
        payload = jsonb_set(
          jsonb_set(
            coalesce(n.payload, '{}'::jsonb),
            '{decisionState}',
            '"treated"'::jsonb
          ),
          '{decision}',
          to_jsonb(case when new.registration_status = 'confirmed' then 'accept' else 'reject' end),
          true
        )
    where n.user_id <> new.user_id
      and n.type = 'action_event'
      and n.payload ->> 'subtype' = 'registration_request'
      and n.payload ->> 'requestKind' = 'registration_request'
      and n.payload ->> 'registrationId' = new.id::text;
  end if;

  return new;
end;
$$;

drop trigger if exists action_registrations_review_notification_state on public.action_registrations;
create trigger action_registrations_review_notification_state
after update of registration_status, registration_source on public.action_registrations
for each row execute function public.sync_action_registration_review_notification_state();

revoke all on function public.sync_action_registration_review_notification_state()
  from public, anon, authenticated;
grant execute on function public.sync_action_registration_review_notification_state()
  to service_role;
