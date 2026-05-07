-- 20260507000026_chat_zone_name.sql
-- Support des zones Grand Paris pour les messages du chat.

alter table public.app_messages
  add column if not exists zone_name text;
