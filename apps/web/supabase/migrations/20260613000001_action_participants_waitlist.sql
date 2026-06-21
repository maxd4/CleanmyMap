alter table public.action_participants
  alter column participation_status set default 'pending';

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'action_participants'
      and constraint_name = 'action_participants_participation_status_check'
  ) then
    alter table public.action_participants
      drop constraint action_participants_participation_status_check;
  end if;
end $$;

alter table public.action_participants
  add constraint action_participants_participation_status_check
  check (participation_status in ('pending', 'confirmed', 'cancelled'));
