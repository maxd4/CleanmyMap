import { describe, expect, it } from "vitest";
import { resolveNextActionStatus } from "./action-update-status";

describe("resolveNextActionStatus", () => {
  it("preserves the current status when the phase is unchanged", () => {
    expect(
      resolveNextActionStatus({
        currentStatus: "approved",
        permissionIdentity: null,
      }),
    ).toBe("approved");

    expect(
      resolveNextActionStatus({
        currentStatus: "approved",
        actionPhase: "post_action_draft",
        permissionIdentity: null,
      }),
    ).toBe("approved");
  });

  it("moves a pre-action to pending", () => {
    expect(
      resolveNextActionStatus({
        currentStatus: "approved",
        actionPhase: "pre_action",
        permissionIdentity: null,
      }),
    ).toBe("pending");
  });

  it("auto-approves a completed action for an eligible creator", () => {
    expect(
      resolveNextActionStatus({
        currentStatus: "pending",
        actionPhase: "post_action_complete",
        permissionIdentity: {
          userId: "user-1",
          role: "admin",
          activeRole: "admin",
        },
        createdByClerkId: "user-1",
      }),
    ).toBe("approved");
  });

  it("keeps a completed action pending when auto-approval is unavailable", () => {
    expect(
      resolveNextActionStatus({
        currentStatus: "approved",
        actionPhase: "post_action_complete",
        permissionIdentity: {
          userId: "user-1",
          role: "benevole",
          activeRole: "benevole",
        },
        createdByClerkId: "user-1",
      }),
    ).toBe("pending");
  });
});
