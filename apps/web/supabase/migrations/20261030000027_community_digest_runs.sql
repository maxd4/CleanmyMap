-- PURPOSE: persist one atomic in-app digest attempt per user/cadence/Paris period.
-- CALLER: server-only refresh route after resolving the Clerk identity.
-- AUTHORIZATION_BOUNDARY: only service_role may execute the RPC; the route supplies the session user id.
-- IDEMPOTENCY: the logical key and transaction advisory lock make retries a no-op.
-- ATOMICITY: notification creation and run registration are one SECURITY DEFINER transaction.
-- FAILURE_BEHAVIOR: any validation, notification or run error rolls back the full RPC transaction.
-- SEARCH_PATH: the SECURITY DEFINER RPC pins search_path to pg_catalog, public.
-- GRANTS: browser roles have no table or RPC privilege; service_role is the only producer.

create table if not exists public.community_digest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  cadence text not null,
  period_key text not null,
  generated_at timestamptz not null default timezone('utc'::text, now()),
  item_count integer not null,
  notification_id uuid null references public.app_notifications(id),
  constraint community_digest_runs_user_id_check
    check (nullif(btrim(user_id), '') is not null),
  constraint community_digest_runs_cadence_check
    check (cadence in ('daily', 'weekly')),
  constraint community_digest_runs_period_key_check
    check (
      (cadence = 'daily' and period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
      or
      (cadence = 'weekly' and period_key ~ '^[0-9]{4}-W[0-9]{2}$')
    ),
  constraint community_digest_runs_item_count_check
    check (item_count between 0 and 10),
  constraint community_digest_runs_notification_consistency_check
    check (
      (item_count = 0 and notification_id is null)
      or
      (item_count > 0 and notification_id is not null)
    ),
  constraint community_digest_runs_user_cadence_period_key_key
    unique (user_id, cadence, period_key)
);

alter table public.community_digest_runs enable row level security;

revoke all on table public.community_digest_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.community_digest_runs to service_role;

create or replace function public.commit_community_digest_run(
  p_user_id text,
  p_cadence text,
  p_period_key text,
  p_items jsonb
)
returns table (
  status text,
  run_id uuid,
  notification_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.community_digest_runs%rowtype;
  v_run_id uuid;
  v_notification_id uuid;
  v_item_count integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'community_digest_server_only' using errcode = '42501';
  end if;

  if nullif(btrim(p_user_id), '') is null then
    raise exception 'community_digest_user_required' using errcode = '22023';
  end if;

  if p_cadence not in ('daily', 'weekly') then
    raise exception 'community_digest_invalid_cadence' using errcode = '23514';
  end if;

  if (
    p_cadence = 'daily'
    and p_period_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ) or (
    p_cadence = 'weekly'
    and p_period_key !~ '^[0-9]{4}-W[0-9]{2}$'
  ) then
    raise exception 'community_digest_invalid_period_key' using errcode = '23514';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'community_digest_items_must_be_array' using errcode = '22023';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count > 10 then
    raise exception 'community_digest_items_limit_exceeded' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item(value)
    where jsonb_typeof(item.value) <> 'object'
      or item.value ->> 'type' not in ('future_actions', 'needs', 'results')
      or nullif(btrim(item.value ->> 'id'), '') is null
  ) then
    raise exception 'community_digest_invalid_item' using errcode = '23514';
  end if;

  if exists (
    select item.value ->> 'type', item.value ->> 'id'
    from jsonb_array_elements(p_items) as item(value)
    group by item.value ->> 'type', item.value ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'community_digest_duplicate_item' using errcode = '23505';
  end if;

  -- The unique constraint is the final guard; the advisory lock makes retries
  -- deterministic and prevents two notifications for the same logical period.
  perform pg_advisory_xact_lock(
    hashtextextended(format('%s:%s:%s', p_user_id, p_cadence, p_period_key), 0)
  );

  select *
  into v_existing
  from public.community_digest_runs
  where user_id = p_user_id
    and cadence = p_cadence
    and period_key = p_period_key;

  if found then
    return query select 'already_processed'::text, v_existing.id, v_existing.notification_id;
    return;
  end if;

  if v_item_count = 0 then
    insert into public.community_digest_runs (
      user_id, cadence, period_key, item_count, notification_id
    )
    values (p_user_id, p_cadence, p_period_key, 0, null)
    returning id into v_run_id;

    return query select 'generated'::text, v_run_id, null::uuid;
    return;
  end if;

  insert into public.app_notifications (user_id, type, title, content, payload)
  values (
    p_user_id,
    'community',
    'Nouveautés de la communauté',
    format('%s nouveauté(s) correspondant à vos abonnements.', v_item_count),
    jsonb_build_object(
      'kind', 'community_digest',
      'cadence', p_cadence,
      'periodKey', p_period_key,
      'references', p_items
    )
  )
  returning id into v_notification_id;

  insert into public.community_digest_runs (
    user_id, cadence, period_key, item_count, notification_id
  )
  values (p_user_id, p_cadence, p_period_key, v_item_count, v_notification_id)
  returning id into v_run_id;

  return query select 'generated'::text, v_run_id, v_notification_id;
end;
$$;

revoke all on function public.commit_community_digest_run(text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.commit_community_digest_run(text, text, text, jsonb)
  to service_role;
