-- Cleanup remaining Supabase advisories:
-- - remove legacy neighborhood RPCs no longer used by the current chat model
-- - keep trigger helpers explicit about their search_path

drop policy if exists "Allow neighborhood visibility" on public.app_messages;
drop function if exists public.prune_old_messages();
drop function if exists public.can_view_neighborhood_message(integer);
