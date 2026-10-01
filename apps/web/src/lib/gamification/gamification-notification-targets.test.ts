import { describe, expect, it } from "vitest";
import { buildGamificationReconciliationHref } from "./gamification-notification-targets";

describe("buildGamificationReconciliationHref", () => {
  it("targets the receipt history entry with the canonical query parameter", () => {
    expect(buildGamificationReconciliationHref({
      kind: "gamification_reconciliation_receipt",
      reconciliationId: "reconciliation/1",
    })).toBe("/sections/gamification?receipt=reconciliation%2F1");
  });

  it("accepts the persisted nested receipt shape", () => {
    expect(buildGamificationReconciliationHref({
      kind: "gamification_reconciliation_receipt",
      receipt: { reconciliationId: "reconciliation-2" },
    })).toBe("/sections/gamification?receipt=reconciliation-2");
  });

  it("does not create a navigation target for unrelated or incomplete notifications", () => {
    expect(buildGamificationReconciliationHref({ kind: "system" })).toBeNull();
    expect(buildGamificationReconciliationHref({ kind: "gamification_reconciliation_receipt" })).toBeNull();
    expect(buildGamificationReconciliationHref(null)).toBeNull();
  });
});
