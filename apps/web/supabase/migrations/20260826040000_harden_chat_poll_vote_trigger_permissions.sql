-- The validation trigger is an internal database callback, not a client RPC.
-- Keep its execute privilege limited to roles that can write chat votes.
revoke all on function public.validate_chat_poll_vote_parent() from public, anon;
grant execute on function public.validate_chat_poll_vote_parent() to authenticated, service_role;
