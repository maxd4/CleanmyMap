-- Remove the legacy duplicate created_at index on app_messages.
-- Keep the newer, table-specific index name.

create index if not exists idx_app_messages_created_at
  on public.app_messages(created_at desc);

drop index if exists public.idx_messages_created_at;
