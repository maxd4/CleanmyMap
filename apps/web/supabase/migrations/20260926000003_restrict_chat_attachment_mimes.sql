-- New Chat uploads must not accept SVG user content.
-- Existing attachment rows remain readable through the legacy message contract.
update storage.buckets
set allowed_mime_types = array_remove(
  coalesce(allowed_mime_types, '{}'::text[]),
  'image/svg+xml'
)
where id = 'chat-attachments';
