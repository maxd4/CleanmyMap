-- Keep the app_messages RLS contract aligned with canAccessChatChannel.
-- The max role is already authorized for the admin_elu channel by the
-- application boundary; this migration removes the accidental RLS mismatch.

alter policy app_messages_select_channels
on public.app_messages
using (
  (
    channel_type = 'community'
    and (select auth.role()) in ('authenticated', 'service_role')
  )
  or (
    channel_type = 'dm'
    and (
      sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      or recipient_id = coalesce((select auth.jwt()) ->> 'sub', '')
    )
  )
  or (
    channel_type = 'admin_elu'
    and public.current_profile_role_label() in ('admin', 'elu', 'max')
  )
  or (
    channel_type = 'territory'
    and public.can_view_territory_message(arrondissement_id)
  )
  or (
    channel_type = 'bug_report'
    and (
      sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      or recipient_id = coalesce((select auth.jwt()) ->> 'sub', '')
    )
  )
);
