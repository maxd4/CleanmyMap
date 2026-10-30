-- PURPOSE: persist the first effective public visibility of actions and results
-- so community digests do not use the initial pre-action publication for
-- completed results.
-- CALLERS: action writes already governed by the existing actions policies and
-- moderation/review RPCs; this trigger is the single persistence owner.
-- AUTHORIZATION_BOUNDARY: no browser role gains a new table or function grant;
-- existing action RLS and service-role server boundaries remain authoritative.
-- ATOMICITY: each timestamp is assigned in the same row write that creates the
-- public transition.
-- IDEMPOTENCY: once assigned, each timestamp is copied from OLD and never reset
-- by later edits, hides, or moderation updates.
-- FAILURE_BEHAVIOR: invalid action writes keep their existing validation errors;
-- no historical result timestamp is inferred from published_at or updated_at.
-- SEARCH_PATH: explicitly restricted in the trigger function.
-- GRANTS: no new grants; trigger functions are not executable by browser roles.

alter table public.actions
  add column if not exists public_visibility_started_at timestamptz,
  add column if not exists results_published_at timestamptz;

create index if not exists idx_actions_results_published_at
  on public.actions(results_published_at)
  where results_published_at is not null;

create or replace function public.capture_action_public_visibility_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_old_public boolean := false;
  v_new_public boolean := false;
  v_old_result_public boolean := false;
  v_new_result_public boolean := false;
begin
  if tg_op = 'UPDATE' then
    new.public_visibility_started_at := old.public_visibility_started_at;
    new.results_published_at := old.results_published_at;

    v_old_public :=
      coalesce(old.access_mode, 'public') <> 'invite_link'
      and old.published_at is not null
      and coalesce(old.moderation_visibility, 'visible') = 'visible'
      and coalesce(old.review_state, 'not_required') in ('not_required', 'approved')
      and (
        public.is_public_future_pre_action_reviewed(
          coalesce(old.action_phase, 'post_action_complete'),
          old.published_at,
          coalesce(old.moderation_visibility, 'visible'),
          old.status,
          coalesce(old.review_state, 'not_required'),
          old.action_date,
          old.event_start_time
        )
      );

    v_old_result_public :=
      coalesce(old.access_mode, 'public') <> 'invite_link'
      and old.published_at is not null
      and coalesce(old.moderation_visibility, 'visible') = 'visible'
      and coalesce(old.review_state, 'not_required') in ('not_required', 'approved')
      and coalesce(old.action_phase, 'post_action_complete') = 'post_action_complete'
      and old.status = 'approved';
  end if;

  v_new_public :=
    coalesce(new.access_mode, 'public') <> 'invite_link'
    and new.published_at is not null
    and coalesce(new.moderation_visibility, 'visible') = 'visible'
    and coalesce(new.review_state, 'not_required') in ('not_required', 'approved')
    and (
      public.is_public_future_pre_action_reviewed(
        coalesce(new.action_phase, 'post_action_complete'),
        new.published_at,
        coalesce(new.moderation_visibility, 'visible'),
        new.status,
        coalesce(new.review_state, 'not_required'),
        new.action_date,
        new.event_start_time
      )
    );

  v_new_result_public :=
    coalesce(new.access_mode, 'public') <> 'invite_link'
    and new.published_at is not null
    and coalesce(new.moderation_visibility, 'visible') = 'visible'
    and coalesce(new.review_state, 'not_required') in ('not_required', 'approved')
    and coalesce(new.action_phase, 'post_action_complete') = 'post_action_complete'
    and new.status = 'approved';

  if new.public_visibility_started_at is null
     and v_new_public
     and (tg_op = 'INSERT' or not v_old_public) then
    new.public_visibility_started_at := now();
  end if;

  if new.results_published_at is null
     and v_new_result_public
     and (tg_op = 'INSERT' or not v_old_result_public) then
    new.results_published_at := now();
  end if;

  return new;
end;
$$;

revoke all on function public.capture_action_public_visibility_timestamps() from public, anon, authenticated;
grant execute on function public.capture_action_public_visibility_timestamps() to service_role;

drop trigger if exists zz_capture_action_public_visibility_timestamps on public.actions;
create trigger zz_capture_action_public_visibility_timestamps
before insert or update of
  action_phase,
  status,
  published_at,
  moderation_visibility,
  review_state,
  access_mode,
  public_visibility_started_at,
  results_published_at
on public.actions
for each row execute function public.capture_action_public_visibility_timestamps();
