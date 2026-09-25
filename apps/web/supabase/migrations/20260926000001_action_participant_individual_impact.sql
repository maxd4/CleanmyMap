-- Individual impact measurements remain attributes of the canonical final
-- participation rows. No second participation or impact source is created.
alter table public.action_participants
  add column if not exists individual_waste_kg numeric,
  add column if not exists individual_waste_condition text,
  add column if not exists individual_waste_measurement_method text,
  add column if not exists individual_waste_normalization_version text,
  add column if not exists individual_cigarette_butts_count integer,
  add column if not exists individual_cigarette_butts_mass_kg numeric,
  add column if not exists individual_cigarette_butts_condition text,
  add column if not exists individual_cigarette_butts_provenance text,
  add column if not exists individual_cigarette_butts_conversion_version text,
  add column if not exists individual_impact_measured_by text,
  add column if not exists individual_impact_measured_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_participants_individual_waste_kg_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_individual_waste_kg_check
      check (individual_waste_kg is null or individual_waste_kg >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_participants_individual_waste_condition_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_individual_waste_condition_check
      check (
        individual_waste_condition is null
        or individual_waste_condition in ('sec', 'humide', 'mouille')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_participants_individual_butts_count_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_individual_butts_count_check
      check (
        individual_cigarette_butts_count is null
        or individual_cigarette_butts_count between 0 and 5000000
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_participants_individual_butts_mass_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_individual_butts_mass_check
      check (
        individual_cigarette_butts_mass_kg is null
        or individual_cigarette_butts_mass_kg >= 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_participants_individual_butts_condition_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_individual_butts_condition_check
      check (
        individual_cigarette_butts_condition is null
        or individual_cigarette_butts_condition in ('propre', 'humide', 'mouille')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_participants_individual_butts_provenance_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_individual_butts_provenance_check
      check (
        individual_cigarette_butts_provenance is null
        or individual_cigarette_butts_provenance in ('counted', 'measured', 'derived')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_participants_individual_waste_completeness_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_individual_waste_completeness_check
      check (
        individual_waste_kg is null
        or (
          individual_waste_condition is not null
          and individual_waste_measurement_method is not null
          and individual_waste_normalization_version is not null
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_participants_individual_butts_completeness_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_individual_butts_completeness_check
      check (
        (individual_cigarette_butts_count is null and individual_cigarette_butts_mass_kg is null)
        or (
          individual_cigarette_butts_condition is not null
          and individual_cigarette_butts_provenance is not null
          and (
            individual_cigarette_butts_count is not null
            or individual_cigarette_butts_conversion_version is not null
          )
        )
      );
  end if;
end;
$$;

create index if not exists idx_action_participants_confirmed_individual_impact
  on public.action_participants(action_id, participation_status)
  where participation_status = 'confirmed';

comment on column public.action_participants.individual_waste_kg is
  'Raw individual waste mass in kg; NULL means not measured and 0 means explicitly observed zero.';
comment on column public.action_participants.individual_cigarette_butts_count is
  'Raw individually counted butts; never replaced by a mass-derived value.';
