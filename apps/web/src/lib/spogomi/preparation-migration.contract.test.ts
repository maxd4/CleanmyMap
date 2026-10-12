import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261012000002_spogomi_preparation.sql", import.meta.url), "utf8");
const correctiveMigration = readFileSync(new URL("../../../supabase/migrations/20261012000004_spogomi_idempotence_import_reliability.sql", import.meta.url), "utf8");
const conflictTargetMigration = readFileSync(new URL("../../../supabase/migrations/20261012000005_spogomi_import_conflict_target.sql", import.meta.url), "utf8");
const lot11Migration = readFileSync(new URL("../../../supabase/migrations/20261012000022_spogomi_ticket_roster_and_team_composition.sql", import.meta.url), "utf8");

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
    expect(lot11Migration).toMatch(/grant execute on function public\.spogomi_confirm_team_composition[\s\S]+to service_role/i);
    expect(lot11Migration).not.toMatch(/delete from public\.spogomi_teams/i);
  });
});
