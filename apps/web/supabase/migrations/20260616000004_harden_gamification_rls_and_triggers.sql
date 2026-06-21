create or replace function public.update_action_participants_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.update_user_points_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_points_on_ledger_insert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  update public.user_points
  set
    total_points = case
      when new.transaction_type in ('earned', 'bonus') then total_points + new.amount
      when new.transaction_type in ('spent', 'refund') then total_points - new.amount
      else total_points
    end,
    earned_points = case
      when new.transaction_type in ('earned', 'bonus') then earned_points + new.amount
      else earned_points
    end,
    spent_points = case
      when new.transaction_type in ('spent', 'refund') then spent_points + new.amount
      else spent_points
    end,
    updated_at = now()
  where user_id = new.user_id;

  insert into public.user_points (user_id, total_points, earned_points, spent_points)
  values (
    new.user_id,
    case when new.transaction_type in ('earned', 'bonus') then new.amount else 0 end,
    case when new.transaction_type in ('earned', 'bonus') then new.amount else 0 end,
    case when new.transaction_type in ('spent', 'refund') then new.amount else 0 end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.update_badge_totals()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.update_places_count()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  update public.user_badge_totals
  set places_count = (
    select count(*) from public.user_visited_places where user_id = new.user_id
  )
  where user_id = new.user_id;
  return new;
end;
$$;

alter policy action_participants_service_only on public.action_participants
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy quiz_type_progress_owner_all on public.quiz_type_progress
  using (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  );

alter policy "Allow own access" on public.user_badge_totals
  using (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  );

alter policy "Allow own insert" on public.badge_events
  using (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  );

alter policy "Allow own access" on public.user_points
  using (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  );

alter policy "Allow own access" on public.points_ledger
  using (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  );

alter policy "Allow own access" on public.user_visited_places
  using (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  )
  with check (
    (select auth.role()) = 'service_role'
    or user_id = coalesce((select auth.jwt() ->> 'sub'), '')
  );
