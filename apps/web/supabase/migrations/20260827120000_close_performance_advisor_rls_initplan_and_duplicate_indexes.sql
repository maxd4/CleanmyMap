-- PERF-01: evaluate auth helpers once per statement without changing RLS
-- roles, commands, grants, or the ownership/service-only predicates.

alter policy signalement_media_owner_read on public.signalement_media
using (
  created_by_clerk_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
);

alter policy chat_dm_read_states_select_own on public.chat_dm_read_states
using (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
);

alter policy chat_dm_read_states_insert_own on public.chat_dm_read_states
with check (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and user_id <> peer_id
);

alter policy chat_dm_read_states_update_own on public.chat_dm_read_states
using (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
)
with check (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and user_id <> peer_id
);

alter policy chat_poll_options_select_visible on public.chat_poll_options
using (
  exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_options.message_id
      and m.message_kind = 'poll'
      and m.channel_type = 'community'
  )
  and (select auth.role()) in ('authenticated', 'service_role')
);

alter policy chat_poll_options_insert_own_poll on public.chat_poll_options
with check (
  (select auth.role()) in ('authenticated', 'service_role')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_options.message_id
      and m.sender_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
      and m.message_kind = 'poll'
      and m.channel_type = 'community'
  )
);

alter policy quiz_pedagogical_metrics_service_role on public.quiz_pedagogical_metrics
using ((select auth.role()) = 'service_role');

alter policy public_surface_snapshots_service_only on public.public_surface_snapshots
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

alter policy report_generations_service_only on public.report_generations
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

alter policy forms_service_select on public.forms
using ((select auth.role()) = 'service_role');

alter policy legacy_spot_migrations_service_select on public.legacy_spot_migrations
using ((select auth.role()) = 'service_role');

alter policy spots_service_select on public.spots
using ((select auth.role()) = 'service_role');

alter policy action_pollution_prediction_evaluations_service_read
on public.action_pollution_prediction_evaluations
using ((select auth.role()) = 'service_role');

alter policy action_pollution_prediction_evaluations_service_insert
on public.action_pollution_prediction_evaluations
with check ((select auth.role()) = 'service_role');

-- Keep the original indexes created by the canonical migrations and remove
-- only the later exact duplicates reported by the Performance Advisor.
drop index if exists public.idx_actions_status_action_date_desc;
drop index if exists public.idx_trash_spotter_spots_created_at_desc;
