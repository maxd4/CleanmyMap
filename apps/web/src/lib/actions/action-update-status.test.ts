import { describe, expect, it } from "vitest";
import { resolveNextActionStatus } from "./action-update-status";

describe("resolveNextActionStatus", () => {
  it("preserves the current status when the phase is unchanged", () => {
    expect(
      resolveNextActionStatus({
        currentStatus: "approved",
      }),
    ).toBe("approved");

    expect(
      resolveNextActionStatus({
        currentStatus: "approved",
        actionPhase: "post_action_draft",
      }),
    ).toBe("approved");
  });

  it("moves a pre-action to pending", () => {
    expect(
      resolveNextActionStatus({
        currentStatus: "approved",
        actionPhase: "pre_action",
      }),
    ).toBe("pending");
  });

  it("keeps a completed action pending for every creator", () => {
    expect(
      resolveNextActionStatus({
        currentStatus: "approved",
        actionPhase: "post_action_complete",
      }),
    ).toBe("pending");
  });
});
