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

  it.each([
    ["pending", "pre_action", "pending"],
    ["approved", "pre_action", "pending"],
    ["rejected", "pre_action", "pending"],
    ["cancelled", "pre_action", "pending"],
    ["pending", "post_action_complete", "pending"],
    ["rejected", "post_action_complete", "pending"],
    ["cancelled", "post_action_draft", "cancelled"],
    ["approved", "post_action_draft", "approved"],
    ["pending", undefined, "pending"],
  ] as const)("resolves %s + %s without using role as a status override", (currentStatus, actionPhase, expected) => {
    expect(resolveNextActionStatus({ currentStatus, actionPhase })).toBe(expected);
  });
});
