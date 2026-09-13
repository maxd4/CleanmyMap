-- Add the nullable real event window. action_date remains the canonical event date;
-- event durations and organization time are derived by the application contract.
alter table public.actions
  add column if not exists event_start_time time without time zone,
  add column if not exists event_end_time time without time zone;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.actions'::regclass
      and conname = 'actions_event_window_order_check'
  ) then
    alter table public.actions
      add constraint actions_event_window_order_check
      check (
        event_start_time is null
        or event_end_time is null
        or event_end_time >= event_start_time
      );
  end if;
end;
$$;

comment on column public.actions.event_start_time is
  'Nullable real start clock time on action_date for the total event window.';
comment on column public.actions.event_end_time is
  'Nullable real end clock time on action_date for the total event window.';

-- Preserve the existing column-scoped author update model for the new fields.
grant update (event_start_time, event_end_time)
  on table public.actions to authenticated;
