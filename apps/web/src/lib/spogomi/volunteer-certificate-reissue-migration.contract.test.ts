import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261012000020_spogomi_certificate_reissue.sql"), "utf8");
const correctionMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261012000021_spogomi_certificate_reissue_concurrency.sql"), "utf8");

describe("SPOGOMI certificate reissue migration contract", () => {
  it("keeps revoked references invalid while allowing a new version", () => {
    expect(migration).toContain("drop constraint if exists spogomi_volunteer_certificates_user_id_event_id_source_fingerprint_key");
    expect(migration).toContain("spogomi_volunteer_certificates_source_idx");
  });

  it("removes the actual generated constraint and serializes one active certificate", () => {
    expect(correctionMigration).toContain("drop constraint if exists spogomi_volunteer_certificate_user_id_event_id_source_finge_key");
    expect(correctionMigration).toContain("create unique index if not exists spogomi_volunteer_certificates_active_user_event_key");
    expect(correctionMigration).toContain("where status = 'active'");
    expect(correctionMigration).toContain("pg_advisory_xact_lock");
    expect(correctionMigration).toMatch(/from public\.spogomi_volunteer_certificates[\s\S]*for update/);
    expect(correctionMigration).not.toContain("spogomi_volunteer_certificates_user_id_event_id_source_fingerprint_key");
  });
});
