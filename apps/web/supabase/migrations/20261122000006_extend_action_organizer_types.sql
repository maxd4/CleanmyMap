-- Add declarative school and local-authority organizer types without
-- reclassifying historical rows or changing directory permissions.
alter table public.actions
  drop constraint if exists actions_organizer_type_check;
alter table public.actions
  add constraint actions_organizer_type_check
  check (organizer_type is null or organizer_type in (
    'spontaneous', 'company', 'association', 'student_association',
    'collective', 'other', 'school', 'local_authority'
  ));

alter table public.organizer_directory_entries
  drop constraint if exists organizer_directory_entries_organizer_type_check;
alter table public.organizer_directory_entries
  add constraint organizer_directory_entries_organizer_type_check
  check (organizer_type in (
    'company', 'association', 'student_association', 'collective', 'other',
    'school', 'local_authority'
  ));

comment on column public.actions.organizer_type is
  'Canonical organizer type; school and local_authority names may be declarative with no directory id. NULL remains valid for legacy rows.';
