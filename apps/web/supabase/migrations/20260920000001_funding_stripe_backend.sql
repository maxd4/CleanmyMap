-- Funding contributions are server-owned payment facts. Stripe webhook handlers
-- are the only writers; public routes expose aggregate counters without PII.

create table if not exists public.funding_contributions (
  stripe_checkout_session_id text primary key,
  stripe_payment_intent_id text not null unique,
  category text not null check (category in ('equipment', 'development')),
  amount_total_cents bigint not null check (amount_total_cents > 0),
  amount_refunded_cents bigint not null default 0 check (amount_refunded_cents >= 0),
  currency text not null check (currency = 'eur'),
  status text not null default 'paid' check (status in ('paid', 'partially_refunded', 'refunded')),
  paid_at timestamptz not null,
  updated_at timestamptz not null default now(),
  check (amount_refunded_cents <= amount_total_cents)
);

create table if not exists public.funding_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  stripe_object_id text,
  processed_at timestamptz not null default now()
);

create table if not exists public.funding_public_aggregates (
  category text primary key check (category in ('equipment', 'development')),
  gross_amount_cents bigint not null default 0 check (gross_amount_cents >= 0),
  refunded_amount_cents bigint not null default 0 check (refunded_amount_cents >= 0),
  net_amount_cents bigint not null default 0 check (net_amount_cents >= 0),
  currency text not null default 'eur' check (currency = 'eur'),
  updated_at timestamptz not null default now()
);

insert into public.funding_public_aggregates (category)
values ('equipment'), ('development')
on conflict (category) do nothing;

alter table public.funding_contributions enable row level security;
alter table public.funding_webhook_events enable row level security;
alter table public.funding_public_aggregates enable row level security;

drop policy if exists funding_contributions_service_only on public.funding_contributions;
create policy funding_contributions_service_only on public.funding_contributions
  for all to service_role using (true) with check (true);
drop policy if exists funding_webhook_events_service_only on public.funding_webhook_events;
create policy funding_webhook_events_service_only on public.funding_webhook_events
  for all to service_role using (true) with check (true);
drop policy if exists funding_public_aggregates_service_only on public.funding_public_aggregates;
create policy funding_public_aggregates_service_only on public.funding_public_aggregates
  for all to service_role using (true) with check (true);

revoke all on table public.funding_contributions from public, anon, authenticated;
revoke all on table public.funding_webhook_events from public, anon, authenticated;
revoke all on table public.funding_public_aggregates from public, anon, authenticated;
grant all on table public.funding_contributions to service_role;
grant all on table public.funding_webhook_events to service_role;
grant all on table public.funding_public_aggregates to service_role;

create or replace function public.refresh_funding_public_aggregate(p_category text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.funding_public_aggregates (
    category, gross_amount_cents, refunded_amount_cents, net_amount_cents, currency, updated_at
  )
  select p_category, coalesce(sum(amount_total_cents), 0), coalesce(sum(amount_refunded_cents), 0),
    coalesce(sum(amount_total_cents - amount_refunded_cents), 0), 'eur', now()
  from public.funding_contributions where category = p_category
  on conflict (category) do update set
    gross_amount_cents = excluded.gross_amount_cents,
    refunded_amount_cents = excluded.refunded_amount_cents,
    net_amount_cents = excluded.net_amount_cents,
    currency = excluded.currency,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.apply_funding_checkout(
  p_event_id text, p_session_id text, p_payment_intent_id text, p_category text,
  p_amount_total_cents bigint, p_currency text, p_paid_at timestamptz
)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_inserted bigint;
begin
  if p_category not in ('equipment', 'development') or p_currency <> 'eur'
     or p_amount_total_cents <= 0 or p_event_id is null or p_session_id is null
     or p_payment_intent_id is null then raise exception 'Invalid funding checkout payload'; end if;

  insert into public.funding_webhook_events (stripe_event_id, event_type, stripe_object_id)
  values (p_event_id, 'checkout.session.completed', p_session_id)
  on conflict (stripe_event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;

  insert into public.funding_contributions (
    stripe_checkout_session_id, stripe_payment_intent_id, category, amount_total_cents,
    amount_refunded_cents, currency, status, paid_at, updated_at
  ) values (p_session_id, p_payment_intent_id, p_category, p_amount_total_cents, 0,
    p_currency, 'paid', p_paid_at, now())
  on conflict (stripe_checkout_session_id) do update set
    stripe_payment_intent_id = excluded.stripe_payment_intent_id,
    category = excluded.category, amount_total_cents = excluded.amount_total_cents,
    currency = excluded.currency, paid_at = excluded.paid_at,
    status = case
      when public.funding_contributions.amount_refunded_cents >= excluded.amount_total_cents then 'refunded'
      when public.funding_contributions.amount_refunded_cents > 0 then 'partially_refunded'
      else 'paid' end,
    updated_at = now();
  perform public.refresh_funding_public_aggregate(p_category);
  return true;
end;
$$;

create or replace function public.apply_funding_refund(
  p_event_id text, p_payment_intent_id text, p_amount_refunded_cents bigint,
  p_currency text, p_refunded_at timestamptz
)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_inserted bigint; v_category text; v_amount_total_cents bigint;
begin
  if p_currency <> 'eur' or p_amount_refunded_cents < 0
     or p_event_id is null or p_payment_intent_id is null then raise exception 'Invalid funding refund payload'; end if;

  insert into public.funding_webhook_events (stripe_event_id, event_type, stripe_object_id)
  values (p_event_id, 'charge.refunded', p_payment_intent_id)
  on conflict (stripe_event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;

  select category, amount_total_cents into v_category, v_amount_total_cents
  from public.funding_contributions where stripe_payment_intent_id = p_payment_intent_id for update;
  if not found then raise exception 'Funding contribution not found for refund'; end if;

  update public.funding_contributions
  set amount_refunded_cents = greatest(amount_refunded_cents, least(p_amount_refunded_cents, v_amount_total_cents)),
      status = case
        when greatest(amount_refunded_cents, least(p_amount_refunded_cents, v_amount_total_cents)) >= v_amount_total_cents then 'refunded'
        when greatest(amount_refunded_cents, least(p_amount_refunded_cents, v_amount_total_cents)) > 0 then 'partially_refunded'
        else 'paid' end,
      updated_at = greatest(updated_at, p_refunded_at)
  where stripe_payment_intent_id = p_payment_intent_id;
  perform public.refresh_funding_public_aggregate(v_category);
  return true;
end;
$$;

revoke all on function public.refresh_funding_public_aggregate(text) from public, anon, authenticated;
revoke all on function public.apply_funding_checkout(text, text, text, text, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.apply_funding_refund(text, text, bigint, text, timestamptz) from public, anon, authenticated;
grant execute on function public.refresh_funding_public_aggregate(text) to service_role;
grant execute on function public.apply_funding_checkout(text, text, text, text, bigint, text, timestamptz) to service_role;
grant execute on function public.apply_funding_refund(text, text, bigint, text, timestamptz) to service_role;
