import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261012000020_spogomi_certificate_reissue.sql"), "utf8");

describe("SPOGOMI certificate reissue migration contract", () => {
  it("keeps revoked references invalid while allowing a new version", () => {
    expect(migration).toContain("drop constraint if exists spogomi_volunteer_certificates_user_id_event_id_source_fingerprint_key");
    expect(migration).toContain("spogomi_volunteer_certificates_source_idx");
  });
});
