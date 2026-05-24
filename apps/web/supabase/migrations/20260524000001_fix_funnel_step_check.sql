-- 20260524000001_fix_funnel_step_check.sql
-- Ensure 'page_view' is included in the funnel_events.step check constraint for existing databases.

alter table public.funnel_events drop constraint if exists funnel_events_step_check;

alter table public.funnel_events add constraint funnel_events_step_check check (
  step in ('view_new', 'page_view', 'start_form', 'submit_success')
);
