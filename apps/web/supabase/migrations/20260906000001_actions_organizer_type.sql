-- Store the selected structure type independently from the organizer label.
-- NULL remains valid for legacy actions so historical rows are not reclassified.
alter table public.actions
  add column if not exists organizer_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'actions_organizer_type_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_organizer_type_check
      check (
        organizer_type is null
        or organizer_type in (
          'spontaneous',
          'company',
          'association',
          'student_association',
          'collective',
          'other'
        )
      );
  end if;
end
$$;

comment on column public.actions.organizer_type is
  'Canonical structure type for new actions; NULL is retained for legacy rows.';

-- Preserve the existing column-scoped author permissions and add only the new
-- structured field. RLS and server-owned permissions remain unchanged.
revoke update on table public.actions from anon, authenticated;

grant update (
  action_phase,
  preparation_data,
  actor_name,
  organizer_type,
  action_date,
  location_label,
  latitude,
  longitude,
  waste_kg,
  cigarette_butts,
  volunteers_count,
  duration_minutes,
  notes
) on table public.actions to authenticated;

grant update on table public.actions to service_role;
