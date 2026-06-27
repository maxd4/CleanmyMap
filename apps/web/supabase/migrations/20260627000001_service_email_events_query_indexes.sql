create index if not exists idx_service_email_events_actor_created_status
  on public.service_email_events(actor_user_id, created_at desc, status);

create or replace function public.sum_service_email_recipients_for_actor_since(
  p_actor_user_id text,
  p_since timestamptz,
  p_statuses text[] default array['sent']
)
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(recipient_count), 0)::bigint
  from public.service_email_events
  where actor_user_id = p_actor_user_id
    and created_at >= p_since
    and status = any (p_statuses);
$$;

revoke all on function public.sum_service_email_recipients_for_actor_since(text, timestamptz, text[])
  from public, anon, authenticated;

grant execute on function public.sum_service_email_recipients_for_actor_since(text, timestamptz, text[])
  to service_role;
