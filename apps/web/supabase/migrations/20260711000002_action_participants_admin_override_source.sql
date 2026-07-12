do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'action_participants'
      and constraint_name = 'action_participants_participation_source_check'
  ) then
    alter table public.action_participants
      drop constraint action_participants_participation_source_check;
  end if;
end $$;

alter table public.action_participants
  add constraint action_participants_participation_source_check
  check (participation_source in ('group_form', 'manual_add', 'admin', 'admin_override', 'import'));
