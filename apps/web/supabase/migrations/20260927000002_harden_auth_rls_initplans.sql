alter policy gamification_user_visited_places_owner_select
  on public.user_visited_places
  to authenticated
  using (((select auth.jwt()) ->> 'sub') = user_id);

alter policy public_impact_action_contributions_service_only
  on public.public_impact_action_contributions
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy public_impact_action_aggregate_state_service_only
  on public.public_impact_action_aggregate_state
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy public_impact_action_location_counts_service_only
  on public.public_impact_action_location_counts
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy public_impact_action_distribution_counts_service_only
  on public.public_impact_action_distribution_counts
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy public_impact_action_warning_counts_service_only
  on public.public_impact_action_warning_counts
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy public_impact_action_butt_condition_counts_service_only
  on public.public_impact_action_butt_condition_counts
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
