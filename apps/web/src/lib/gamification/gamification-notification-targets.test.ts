import { describe, expect, it } from "vitest";
import { buildGamificationReconciliationHref } from "./gamification-notification-targets";

describe("buildGamificationReconciliationHref", () => {
  const notificationId = "11111111-1111-4111-8111-111111111111";

  it("uses only the opaque notification identity in the canonical query parameter", () => {
    expect(buildGamificationReconciliationHref({
      kind: "gamification_reconciliation_receipt",
      reconciliationId: "user-1|v1|xp=48|secret-change-identities",
    }, notificationId)).toBe(`/sections/gamification?receipt=${notificationId}`);
  });

  it("does not derive a target from the composite reconciliation id", () => {
    expect(buildGamificationReconciliationHref({
      kind: "gamification_reconciliation_receipt",
      receipt: { reconciliationId: "reconciliation-2" },
    }, undefined)).toBeNull();
  });

  it("does not create a navigation target for unrelated, malformed, or incomplete notifications", () => {
    expect(buildGamificationReconciliationHref({ kind: "system" })).toBeNull();
    expect(buildGamificationReconciliationHref({ kind: "gamification_reconciliation_receipt" }, "notification-1")).toBeNull();
    expect(buildGamificationReconciliationHref({ kind: "gamification_reconciliation_receipt" }, "user-1")).toBeNull();
    expect(buildGamificationReconciliationHref(null)).toBeNull();
  });
});
