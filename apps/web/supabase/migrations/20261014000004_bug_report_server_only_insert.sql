-- SECURITY-03: bug_report routing is a server-owned Clerk decision.
--
-- PURPOSE: prevent a direct authenticated Supabase session from choosing or
-- inferring a bug-report recipient from the private profile projection.
-- CALLER: authenticated sessions keep the ordinary chat channels below;
--          the Next.js server persists bug_report after Clerk confirmation.
-- AUTHORIZATION_BOUNDARY: service_role is used only after the route has
--          authenticated the sender and resolved CLERK_IMU_OWNER_USER_ID as
--          the confirmed Clerk owner with publicMetadata.role = max.
-- FAILURE_BEHAVIOR: a direct authenticated bug_report insert is rejected by
--          the absence of a bug_report branch in this policy.

drop policy if exists app_messages_insert_channels on public.app_messages;
create policy app_messages_insert_channels
on public.app_messages
for insert
to authenticated
with check (
  (action_id is null or private.can_insert_action_message_reference(action_id))
  and (
    (
      channel_type = 'community'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and recipient_id is null
      and arrondissement_id is null
    )
    or (
      channel_type = 'dm'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and recipient_id is not null
      and arrondissement_id is null
    )
    or (
      channel_type = 'territory'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and arrondissement_id is not null
      and recipient_id is null
    )
    or (
      channel_type = 'action'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and conversation_id is not null
      and private.can_post_action_conversation(conversation_id)
    )
  )
);
