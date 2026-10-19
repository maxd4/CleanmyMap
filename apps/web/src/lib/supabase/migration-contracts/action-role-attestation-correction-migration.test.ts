import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261019000008_action_role_attestation_correction_reason.sql"),
  "utf8",
);

describe("action role attestation correction migration contract", () => {
  it("requires rejection and non-idempotent terminal corrections to carry a reason after the current-row lock", () => {
    const currentLock = migration.indexOf("from public.action_role_attestations");
    const rejectionGuard = migration.indexOf("v_status = 'rejected' and v_reason is null");
    const correctionGuard = migration.indexOf("action_role_attestation_correction_reason_required");
    expect(currentLock).toBeGreaterThan(-1);
    expect(rejectionGuard).toBeGreaterThan(currentLock);
    expect(correctionGuard).toBeGreaterThan(currentLock);
    expect(migration).toContain("v_current.verification_status in ('confirmed', 'rejected')");
  });

  it("preserves idempotency, audit, notification and service-role-only grants", () => {
    expect(migration).toContain("and v_current.decision_reason is not distinct from v_reason");
    expect(migration).toContain("insert into public.action_role_attestation_audit");
    expect(migration).toContain("insert into public.app_notifications");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("revoke all on function public.review_action_role_attestation");
    expect(migration).toContain("grant execute on function public.review_action_role_attestation");
  });
});
