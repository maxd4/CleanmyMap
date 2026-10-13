import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261012000002_spogomi_preparation.sql", import.meta.url), "utf8");
const correctiveMigration = readFileSync(new URL("../../../supabase/migrations/20261012000004_spogomi_idempotence_import_reliability.sql", import.meta.url), "utf8");
const conflictTargetMigration = readFileSync(new URL("../../../supabase/migrations/20261012000005_spogomi_import_conflict_target.sql", import.meta.url), "utf8");
const lot11Migration = readFileSync(new URL("../../../supabase/migrations/20261012000022_spogomi_ticket_roster_and_team_composition.sql", import.meta.url), "utf8");
const lot11aMigration = readFileSync(new URL("../../../supabase/migrations/20261013000001_spogomi_ticket_source_scope_and_safe_rebalance.sql", import.meta.url), "utf8");
const lot11CorrectiveMigration = readFileSync(new URL("../../../supabase/migrations/20261013000002_spogomi_import_history_and_safe_reconciliation.sql", import.meta.url), "utf8");
const compositionLockMigration = readFileSync(new URL("../../../supabase/migrations/20261013000003_spogomi_composition_lock_integrity.sql", import.meta.url), "utf8");
const ticketReconciliationMigration = readFileSync(new URL("../../../supabase/migrations/20261013000004_spogomi_ticket_reconciliation_atomicity.sql", import.meta.url), "utf8");
const strictTicketStatusMigration = readFileSync(new URL("../../../supabase/migrations/20261013000005_spogomi_strict_ticket_status.sql", import.meta.url), "utf8");
const ticketDecisionConsistencyMigration = readFileSync(new URL("../../../supabase/migrations/20261013000006_spogomi_ticket_decision_consistency.sql", import.meta.url), "utf8");
const postLockMutationMigration = readFileSync(new URL("../../../supabase/migrations/20261013000007_spogomi_post_lock_mutation_guards.sql", import.meta.url), "utf8");
const teamPublicNameMigration = readFileSync(new URL("../../../supabase/migrations/20261013000008_spogomi_team_public_name_rename.sql", import.meta.url), "utf8");
const preparationConcurrencyMigration = readFileSync(new URL("../../../supabase/migrations/20261013000009_spogomi_preparation_concurrency.sql", import.meta.url), "utf8");
const postLockReconciliationMigration = readFileSync(new URL("../../../supabase/migrations/20261013000011_spogomi_ticket_reconciliation_post_lock_history.sql", import.meta.url), "utf8");
const teamPublicNameUniquenessMigration = readFileSync(new URL("../../../supabase/migrations/20261013000012_spogomi_team_public_name_uniqueness.sql", import.meta.url), "utf8");

describe("SPOGOMI preparation migration STATIC_CONTRACT", () => {
  it("keeps recovery, private roster and official-route provenance explicit", () => {
    expect(migration).toContain("PARTIAL_ALLOWED");
    expect(migration).toContain("spogomi_event_creation_attempts");
    expect(migration).toContain("unique (event_id, content_sha256)");
    expect(migration).toContain("spogomi_event_routes");
    expect(migration).toContain("official_reference");
    expect(migration).toContain("reference_distance_km");
    expect(migration).toMatch(/revoke all on table public\.spogomi_roster_imports from public, anon, authenticated/i);
    expect(migration).not.toMatch(/grant select on table public\.spogomi_participants to authenticated/i);
  });

  it("declares server-owned intent fingerprints, recovery leases and resumable imports", () => {
    expect(correctiveMigration).toContain("intention_fingerprint");
    expect(correctiveMigration).toContain("processing_token");
    expect(correctiveMigration).toContain("status in ('previewed', 'processing', 'confirmed', 'failed', 'failed_recoverable')");
    expect(correctiveMigration).toContain("actions_spogomi_creation_key_unique");
    expect(correctiveMigration).toContain("where roster_import_id is not null");
  });

  it("makes the participant upsert conflict target inferable without a predicate", () => {
    expect(conflictTargetMigration).toContain("drop index public.spogomi_participants_import_row_unique");
    expect(conflictTargetMigration).toMatch(/create unique index spogomi_participants_import_row_unique\s+on public\.spogomi_participants\(event_id, roster_import_id, source_row_number\);/i);
    expect(conflictTargetMigration).not.toMatch(/\bwhere\b/i);
  });

  it("keeps ticket identity per place and confirms compositions through a locked server transaction", () => {
    expect(lot11Migration).toContain("source_system");
    expect(lot11Migration).toContain("order_reference");
    expect(lot11Migration).toContain("ticket_deleted");
    expect(lot11Migration).toContain("composition_revision");
    expect(lot11Migration).toContain("spogomi_roster_import_changes");
    expect(lot11Migration).toContain("spogomi_team_composition_history");
    expect(lot11Migration).toContain("for update");
    expect(lot11Migration).toContain("spogomi_confirm_team_composition");
    expect(lot11Migration).toMatch(/create unique index if not exists spogomi_participants_id_event_unique[\s\S]+foreign key \(participant_id, event_id\)[\s\S]+references public\.spogomi_participants\(id, event_id\)/i);
    expect(lot11Migration).toMatch(/grant execute on function public\.spogomi_confirm_team_composition[\s\S]+to service_role/i);
    expect(lot11Migration).not.toMatch(/delete from public\.spogomi_teams/i);
  });

  it("scopes ticket uniqueness by source and blocks automatic rebalance of dependent teams", () => {
    expect(lot11aMigration).toContain("order_alternative_reference");
    expect(lot11aMigration).toContain("event_id, source_system, external_reference");
    expect(lot11aMigration).toContain("spogomi_team_access_grants");
    expect(lot11aMigration).toContain("spogomi_result_submissions");
    expect(lot11aMigration).toContain("cannot be rebalanced");
    expect(lot11aMigration).toContain("spogomi_team_composition_history");
  });

  it("keeps confirmed import rows independently from current participant provenance", () => {
    expect(lot11CorrectiveMigration).toContain("spogomi_roster_import_rows");
    expect(lot11CorrectiveMigration).toContain("unique (roster_import_id, source_row_number)");
    expect(lot11CorrectiveMigration).toContain("source_snapshot jsonb");
    expect(lot11CorrectiveMigration).toContain("ticket_cancellation_conflict");
    expect(lot11CorrectiveMigration).toMatch(/revoke all on table public\.spogomi_roster_import_rows from public, anon, authenticated/i);
  });

  it("makes every composition mutation atomic, revision-controlled and protected", () => {
    expect(compositionLockMigration).toContain("spogomi_team_requires_composition_correction");
    expect(compositionLockMigration).toContain("spogomi_move_participant_to_team");
    expect(compositionLockMigration).toContain("spogomi_lock_team_composition");
    expect(compositionLockMigration).toContain("spogomi_team_composition_mutation_audit");
    expect(compositionLockMigration).toContain("current_setting('spogomi.composition_write_context'");
    expect(compositionLockMigration).toContain("before update of team_id");
    expect(compositionLockMigration).toContain("before update of composition_state");
    expect(compositionLockMigration).toContain("for update");
    expect(compositionLockMigration).toContain("spogomi_team_access_grants");
    expect(compositionLockMigration).toContain("spogomi_result_submissions");
    expect(compositionLockMigration).toContain("spogomi_team_composition_history");
    expect(compositionLockMigration).toContain("state not in ('draft', 'registration_open')");
    expect(compositionLockMigration).not.toContain("delete from public.spogomi_teams");
  });

  it("keeps historical proof transition and ticket reconciliation atomic", () => {
    expect(ticketReconciliationMigration).toContain("source_proof_status");
    expect(ticketReconciliationMigration).toContain("legacy_unavailable");
    expect(ticketReconciliationMigration).toContain("spogomi_reconcile_cachan_ticket_rows");
    expect(ticketReconciliationMigration).toContain("from public.spogomi_events");
    expect(ticketReconciliationMigration).toContain("for update");
    expect(ticketReconciliationMigration).toContain("spogomi_roster_import_changes");
    expect(ticketReconciliationMigration).toContain("spogomi_roster_import_rows");
    expect(ticketReconciliationMigration).toContain("grant execute on function public.spogomi_reconcile_cachan_ticket_rows");
    expect(ticketReconciliationMigration).toContain("A cancelled Cachan ticket requires explicit organizer arbitration");
    expect(ticketReconciliationMigration).toContain("SPOGOMI event locking requires an eligible, atomically prepared composition");
  });

  it("keeps SQL cancellation eligibility aligned with the strict import registry", () => {
    expect(strictTicketStatusMigration).toContain("spogomi_ticket_is_cancelled");
    expect(strictTicketStatusMigration).toContain("rembours");
    expect(strictTicketStatusMigration).toContain("spogomi_reconcile_cachan_ticket_rows_legacy");
    expect(strictTicketStatusMigration).toContain("ticket_cancellation_conflict");
    expect(strictTicketStatusMigration).toContain("grant execute on function public.spogomi_reconcile_cachan_ticket_rows");
    expect(strictTicketStatusMigration).toContain("create temporary table spogomi_ticket_status_prior");
  });

  it("keeps commercial references and human-decision protection coherent", () => {
    expect(ticketDecisionConsistencyMigration).toContain("order_reference, order_alternative_reference");
    expect(ticketDecisionConsistencyMigration).toContain("identity_status, registration_status");
    expect(ticketDecisionConsistencyMigration).toContain("'unknown',");
    expect(ticketDecisionConsistencyMigration).toContain("spogomi_participant_has_human_decision");
    expect(ticketDecisionConsistencyMigration).toContain("v_source_withdrawal_proven");
    expect(ticketDecisionConsistencyMigration).toContain("change_kind = 'ticket_cancelled'");
    expect(ticketDecisionConsistencyMigration).toContain("grant execute on function public.spogomi_reconcile_cachan_ticket_rows");
    expect(ticketDecisionConsistencyMigration).not.toContain("v_composition_protected");
    expect(ticketDecisionConsistencyMigration).not.toContain("alter table public.spogomi_participants drop column");
  });

  it("carries post-lock ticket history forward without rewriting 00006", () => {
    expect(postLockReconciliationMigration).toContain("v_composition_protected");
    expect(postLockReconciliationMigration).toContain("v_post_lock_conflict");
    expect(postLockReconciliationMigration).toContain("set_config('spogomi.composition_write_context', 'ticket_reconciliation', true)");
    expect(postLockReconciliationMigration).toContain("case when v_new_cancelled or v_composition_protected then 'withdrawn' else 'registered' end");
    expect(postLockReconciliationMigration).toContain("ticket_composition_lock_conflict");
    expect(postLockReconciliationMigration).toContain("v_registration_status := v_prior.registration_status");
    expect(postLockReconciliationMigration).toMatch(/revoke all on function public\.spogomi_reconcile_cachan_ticket_rows[\s\S]+grant execute on function public\.spogomi_reconcile_cachan_ticket_rows[\s\S]+to service_role/i);
    expect(postLockReconciliationMigration).not.toContain("create or replace function public.spogomi_participant_has_human_decision");
  });

  it("closes post-lock participant and team-rule mutation paths", () => {
    expect(postLockMutationMigration).toContain("before insert or update of registration_status, ticket_status, ticket_deleted, team_id");
    expect(postLockMutationMigration).toContain("ticket_reconciliation");
    expect(postLockMutationMigration).toContain("spogomi_team_requires_composition_correction");
    expect(postLockMutationMigration).toContain("New SPOGOMI places after composition lock");
    expect(postLockMutationMigration).toContain("ticket_composition_lock_conflict");
    expect(postLockMutationMigration).toContain("guard_spogomi_event_composition_rules");
    expect(postLockMutationMigration).toContain("spogomi_update_event_metadata");
    expect(postLockMutationMigration).toContain("p_expected_revision");
    expect(postLockMutationMigration).toContain("composition_revision = composition_revision + case when v_rules_changed then 1 else 0 end");
    expect(postLockMutationMigration).toContain("grant execute on function public.spogomi_update_event_metadata(uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text) to service_role;");
    expect(postLockMutationMigration).toContain("World Cup teams require exactly three members");
    expect(postLockMutationMigration).toContain("A Casual team is outside the event bounds");
    expect(postLockMutationMigration).toMatch(/grant execute on function public\.spogomi_update_event_metadata[\s\S]+to service_role/i);
    expect(postLockMutationMigration).not.toMatch(/drop table public\.spogomi_/i);
  });

  it("keeps public team-name edits canonical, audited and outside composition revisions", () => {
    expect(teamPublicNameMigration).toContain("spogomi_rename_team_public_name");
    expect(teamPublicNameMigration).toContain("admin_operations_audit");
    expect(teamPublicNameMigration).toContain("spogomi_team_name_rename");
    expect(teamPublicNameMigration).toContain("team_name_write_context");
    expect(teamPublicNameMigration).toContain("for update");
    expect(teamPublicNameMigration).toContain("serialization_failure");
    expect(teamPublicNameMigration).toContain("unique_violation");
    expect(teamPublicNameMigration).toMatch(/after insert or delete or update of event_id, team_number, composition_state, certified_submission_id/i);
    expect(teamPublicNameMigration).not.toMatch(/set\s+composition_revision\s*=/i);
    expect(teamPublicNameMigration).not.toMatch(/delete\s+from\s+public\.spogomi_(teams|participants|result_submissions)/i);
  });

  it("enforces normalized public-name uniqueness for creation and rename paths", () => {
    expect(teamPublicNameUniquenessMigration).toContain("existing normalized collisions require explicit resolution");
    expect(teamPublicNameUniquenessMigration).toContain("create unique index spogomi_teams_event_public_name_key_unique");
    expect(teamPublicNameUniquenessMigration).toContain("public.spogomi_team_public_name_key(public_name)");
    expect(teamPublicNameUniquenessMigration).toContain("create or replace function public.spogomi_confirm_team_composition");
    expect(teamPublicNameUniquenessMigration).toContain("A generated SPOGOMI team public name is already used in this event");
    expect(teamPublicNameUniquenessMigration).toContain("resolve the collision before confirming composition");
    expect(teamPublicNameUniquenessMigration).toMatch(/revoke all on function public\.spogomi_confirm_team_composition[\s\S]+grant execute on function public\.spogomi_confirm_team_composition[\s\S]+to service_role/i);
    expect(teamPublicNameUniquenessMigration).not.toMatch(/delete\s+from\s+public\.spogomi_teams/i);
    expect(teamPublicNameUniquenessMigration).not.toMatch(/set\s+public_name\s*=/i);
  });

  it("serializes participant lifecycle, composition and official GPX/Action writes", () => {
    expect(preparationConcurrencyMigration).toContain("spogomi_lock_event_for_mutation");
    expect(preparationConcurrencyMigration).toContain("select * into v_event");
    expect(preparationConcurrencyMigration).toContain("for update");
    expect(preparationConcurrencyMigration).toContain("spogomi_attach_official_gpx");
    expect(preparationConcurrencyMigration).toContain("jsonb_set");
    expect(preparationConcurrencyMigration).toContain("composition_revision = composition_revision + 1");
    expect(preparationConcurrencyMigration).toContain("New SPOGOMI places after composition lock");
    expect(preparationConcurrencyMigration).toMatch(/grant execute on function public\.spogomi_attach_official_gpx[\s\S]+to service_role/i);
  });

  it("keeps the post-lock reconciler ordered after the final lifecycle guard", () => {
    expect(postLockReconciliationMigration).toContain("SPOGOMI forward-only repair");
    expect(postLockReconciliationMigration).toContain("spogomi_team_requires_composition_correction");
    expect(postLockReconciliationMigration).toContain("spogomi.composition_write_context");
    expect(postLockReconciliationMigration).toContain("security invoker");
    expect(postLockReconciliationMigration).not.toMatch(/grant execute on function public\.spogomi_reconcile_cachan_ticket_rows[^;]+to (public|anon|authenticated)/i);
  });
});
