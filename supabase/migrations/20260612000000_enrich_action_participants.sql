alter table public.action_participants
  add column if not exists joined_at timestamptz not null default timezone('utc', now()),
  add column if not exists participation_status text not null default 'confirmed',
  add column if not exists participation_source text not null default 'group_form';

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'action_participants'
      and constraint_name = 'action_participants_participation_status_check'
  ) then
    alter table public.action_participants
      add constraint action_participants_participation_status_check
      check (participation_status in ('confirmed', 'cancelled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'action_participants'
      and constraint_name = 'action_participants_participation_source_check'
  ) then
    alter table public.action_participants
      add constraint action_participants_participation_source_check
      check (participation_source in ('group_form', 'admin', 'import'));
  end if;
end $$;

create or replace function public.update_action_participants_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists action_participants_updated_at on public.action_participants;
create trigger action_participants_updated_at
before update on public.action_participants
for each row execute function public.update_action_participants_updated_at();
