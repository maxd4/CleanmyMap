-- PURPOSE: reconcile the legacy action-reference check with official announcements.
-- CALLER: the service-side association action announcement publisher.
-- AUTHORIZATION_BOUNDARY: the existing service-only publication path and RLS
--                         policy remain unchanged.
-- IDEMPOTENCY: the official publication marker remains the durable exception;
--              ordinary action references keep the legacy shape.
-- ATOMICITY: the constraint replacement is transactional DDL.
-- FAILURE_BEHAVIOR: the dedicated official-publication constraint continues to
--                    validate the announcement fields and action identity.
-- SEARCH_PATH: no function or search-path change is introduced.
-- GRANTS: no grants are changed.

alter table public.app_messages
  drop constraint if exists app_messages_action_message_reference_check;

alter table public.app_messages
  add constraint app_messages_action_message_reference_check
  check (
    action_id is null
    or official_action_publication_id is not null
    or (
      channel_type in ('community', 'territory', 'dm')
      and message_kind = 'message'
      and conversation_id is null
      and topic_id is null
      and related_event_id is null
      and attachment_url is null
      and attachment_type is null
    )
  );
