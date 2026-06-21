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
