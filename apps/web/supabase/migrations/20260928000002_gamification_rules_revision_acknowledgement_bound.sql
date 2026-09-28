alter table public.progression_profiles
  add constraint progression_profiles_last_acknowledged_rules_revision_lte_current_check
    check (last_acknowledged_rules_revision <= current_applied_rules_revision);
