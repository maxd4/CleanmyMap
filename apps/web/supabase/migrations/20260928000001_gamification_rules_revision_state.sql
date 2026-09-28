alter table public.progression_profiles
  add column if not exists current_applied_rules_revision integer not null default 0,
  add column if not exists last_acknowledged_rules_revision integer not null default 0;

alter table public.progression_profiles
  add constraint progression_profiles_current_applied_rules_revision_nonnegative
    check (current_applied_rules_revision >= 0),
  add constraint progression_profiles_last_acknowledged_rules_revision_nonnegative
    check (last_acknowledged_rules_revision >= 0);

comment on column public.progression_profiles.current_applied_rules_revision is
  'Dernière révision numérique des règles Gamification appliquée à la projection CURRENT.';

comment on column public.progression_profiles.last_acknowledged_rules_revision is
  'Dernière révision des nouveautés Gamification explicitement acquittée par le compte.';
