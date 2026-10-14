-- SPOGOMI division audit correction: one lock history row per division.

alter table public.spogomi_team_composition_mutation_audit
  drop constraint if exists spogomi_team_composition_mutation_audit_event_id_revision_key;

create unique index spogomi_team_composition_mutation_audit_event_division_revision_unique
  on public.spogomi_team_composition_mutation_audit(event_id, division_id, revision);
