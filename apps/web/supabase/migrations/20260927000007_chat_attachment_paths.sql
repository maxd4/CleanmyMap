-- Persist a durable Storage identifier for new Chat attachments.
-- Signed URLs remain a read-time projection; legacy attachment_url rows stay readable.
alter table public.app_messages
  add column if not exists attachment_path text;

alter table public.app_messages
  drop constraint if exists app_messages_attachment_path_non_empty;

alter table public.app_messages
  add constraint app_messages_attachment_path_non_empty
  check (attachment_path is null or btrim(attachment_path) <> '');

alter table public.app_messages
  drop constraint if exists app_messages_poll_attachment_check;

alter table public.app_messages
  add constraint app_messages_poll_attachment_check
  check (
    message_kind <> 'poll'
    or (attachment_url is null and attachment_path is null and attachment_type is null and attachment_expires_at is null)
  );

comment on column public.app_messages.attachment_path is
  'Durable path in the private chat-attachments bucket for new messages; attachment_url is retained for legacy rows.';
