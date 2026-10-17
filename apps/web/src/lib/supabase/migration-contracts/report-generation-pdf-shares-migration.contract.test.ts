import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261018000002_report_generation_pdf_shares.sql", import.meta.url),
  "utf8",
);

// STATIC_CONTRACT: SQL shape only; RLS and revocation semantics require an
// executed PostgreSQL integration proof.
describe("report PDF shares migration STATIC_CONTRACT", () => {
  it("keeps bearer links hashed, variant-bound, expiring and service-only", () => {
    expect(migration).toContain("artifact_id uuid not null references public.report_generation_pdf_artifacts(id)");
    expect(migration).toContain("token_hash text not null unique");
    expect(migration).toContain("token_hash ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain("expires_at timestamptz not null");
    expect(migration).toContain("revoked_at timestamptz");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("using (auth.role() = 'service_role')");
    expect(migration).toContain("revoke all on table public.report_generation_pdf_shares from public, anon, authenticated;");
    expect(migration).not.toContain("token text");
  });
});
