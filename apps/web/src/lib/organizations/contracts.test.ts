import { describe, expect, it } from "vitest";
import { organizationCommandSchema, organizationReportScopeSchema } from "./contracts";
const organizationId = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
const base = { organizationId, requestId };
describe("organization command boundary", () => {
  it("cannot supply the actor in client JSON", () => {
    expect(organizationCommandSchema.safeParse({ ...base, operation: "invite", targetEmail: "person@example.test", role: "member", siteId: null, actor: "user_other" }).success).toBe(false);
  });
  it("does not invite an owner or a local manager without a site", () => {
    for (const role of ["owner", "site_manager"]) expect(organizationCommandSchema.safeParse({ ...base, operation: "invite", targetEmail: "person@example.test", role, siteId: null }).success).toBe(false);
  });

  it("accepts a normalized email invitation and rejects browser supplied Clerk IDs", () => {
    const parsed = organizationCommandSchema.safeParse({ ...base, operation: "invite", targetEmail: " Person@Example.Test ", role: "member", siteId: null });
    expect(parsed.success && parsed.data.operation === "invite" ? parsed.data.targetEmail : null).toBe("person@example.test");
    expect(organizationCommandSchema.safeParse({ ...base, operation: "invite", targetId: "user_raw_clerk_id", role: "member", siteId: null }).success).toBe(false);
  });
  it("permits an email-addressed member invitation", () => {
    expect(organizationCommandSchema.safeParse({ ...base, operation: "invite", targetEmail: "person@example.test", role: "member", siteId: null }).success).toBe(true);
  });
  it("accepts a transfer only by naming a membership inside the organization", () => {
    expect(organizationCommandSchema.safeParse({ ...base, operation: "transfer_owner", membershipId: "00000000-0000-4000-8000-000000000003" }).success).toBe(true);
    expect(organizationCommandSchema.safeParse({ ...base, operation: "transfer_owner", membershipId: "not-a-membership" }).success).toBe(false);
  });
  it("accepts an organization detach command only with a scoped action and site", () => {
    expect(organizationCommandSchema.safeParse({ ...base, operation: "unlink_action", actionId: "00000000-0000-4000-8000-000000000003", siteId: null }).success).toBe(true);
    expect(organizationCommandSchema.safeParse({ ...base, operation: "unlink_action", actionId: "bad", siteId: null }).success).toBe(false);
  });
  it("rejects impossible dates and inverted periods", () => {
    const scope = { organizationId, siteId: null, campaignId: null, from: "2026-02-30", to: "2026-03-05" };
    expect(organizationReportScopeSchema.safeParse(scope).success).toBe(false);
    expect(organizationReportScopeSchema.safeParse({ ...scope, from: "2026-03-07" }).success).toBe(false);
  });
  it("rejects a global fallback and arbitrary scope", () => {
    expect(organizationReportScopeSchema.safeParse({ organizationId: null, from: "2026-01-01", to: "2026-12-31" }).success).toBe(false);
  });
});
