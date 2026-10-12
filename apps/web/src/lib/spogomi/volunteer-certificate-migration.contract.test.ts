import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261012000019_spogomi_volunteer_certificates.sql"), "utf8");

describe("SPOGOMI volunteer certificate migration contract", () => {
  it("extends the existing attestation owner and keeps certificate history private", () => {
    expect(migration).toContain("alter table public.spogomi_recognition_attestations");
    expect(migration).toContain("finish_control");
    expect(migration).toContain("spogomi_recognition_attestation_history_kind_check");
    expect(migration).toContain("set_spogomi_recognition_attestation");
    expect(migration).toContain("spogomi_volunteer_certificates");
    expect(migration).toContain("spogomi_volunteer_certificate_history");
    expect(migration).toContain("issue_spogomi_volunteer_certificate");
    expect(migration).toContain("revoke_spogomi_volunteer_certificate");
    expect(migration).toMatch(/revoke all on table public\.spogomi_volunteer_certificates from public, anon, authenticated/i);
    expect(migration).toContain("source_fingerprint");
  });
});
