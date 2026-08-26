-- The original notification table predates chat notifications. Keep the
-- existing read_at/RLS model, but make the persisted chat contract explicit.
alter table public.app_notifications
  drop constraint if exists app_notifications_type_check;

alter table public.app_notifications
  add constraint app_notifications_type_check
  check (type in ('validation', 'community', 'system', 'security', 'chat'));

revoke all on table public.app_notifications from public, anon;
grant select, update on table public.app_notifications to authenticated, service_role;

-- The fan-out is a server-only operation. Revoke direct role grants as well
-- as PUBLIC because older linked projects may have both ACL entries.
revoke all on function public.create_chat_notifications_for_message(uuid) from public, anon;
grant execute on function public.create_chat_notifications_for_message(uuid) to service_role;
