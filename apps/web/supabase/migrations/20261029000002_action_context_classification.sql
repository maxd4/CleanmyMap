-- Persist the independent business context of an action.
-- NULL is intentional for historical or otherwise unclassified rows; this
-- migration does not infer a context from organizer_type or registrations.
alter table public.actions
  add column if not exists action_context text,
  add column if not exists action_context_source text,
  add column if not exists school_context_confirmed boolean,
  add column if not exists school_context_confirmed_at timestamptz,
  add column if not exists school_context_confirmed_by_clerk_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'actions_action_context_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_action_context_check
      check (
        action_context is null
        or action_context in ('citizen', 'company', 'school')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'actions_action_context_source_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_action_context_source_check
      check (
        action_context_source is null
        or action_context_source in ('explicit', 'automatic_children_ratio')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'actions_action_context_pair_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_action_context_pair_check
      check ((action_context is null) = (action_context_source is null));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'actions_action_context_confirmation_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_action_context_confirmation_check
      check (
        school_context_confirmed is null
        or action_context = 'school'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'actions_action_context_confirmation_trace_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_action_context_confirmation_trace_check
      check (
        (
          school_context_confirmed is null
          and school_context_confirmed_at is null
          and school_context_confirmed_by_clerk_id is null
        )
        or (
          school_context_confirmed is not null
          and school_context_confirmed_at is not null
          and school_context_confirmed_by_clerk_id is not null
          and length(trim(school_context_confirmed_by_clerk_id)) > 0
        )
      );
  end if;
end;
$$;

comment on column public.actions.action_context is
  'Independent business context: citizen, company or school; NULL means historical or unresolved.';
comment on column public.actions.action_context_source is
  'Provenance of the context: explicit organizer choice or automatic final children ratio.';
comment on column public.actions.school_context_confirmed is
  'Explicit school confirmation flag; it is not inferred proof and contains no children identity.';

create index if not exists idx_actions_action_context
  on public.actions (action_context)
  where action_context is not null;
