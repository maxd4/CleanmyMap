-- The Supabase project may grant EXECUTE to anon by default. DM inbox RPCs
-- must be callable only by authenticated sessions or server-side service role.

revoke all on function public.list_my_dm_conversations() from public, anon;
grant execute on function public.list_my_dm_conversations() to authenticated, service_role;

revoke all on function public.mark_my_dm_conversation_read(text) from public, anon;
grant execute on function public.mark_my_dm_conversation_read(text) to authenticated, service_role;
