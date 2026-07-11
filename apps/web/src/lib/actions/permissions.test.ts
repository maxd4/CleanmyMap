import { describe, expect, it } from "vitest";
import {
  canAutoApproveOwnAction,
  canModerateAnyAction,
  canReviewActionParticipants,
  canUseAdminOverride,
  isActionModerationRole,
} from "./permissions";

describe("action permissions", () => {
  it("recognizes moderation roles", () => {
    expect(isActionModerationRole("admin")).toBe(true);
    expect(isActionModerationRole("elu")).toBe(true);
    expect(isActionModerationRole("max")).toBe(true);
    expect(isActionModerationRole("benevole")).toBe(false);
  });

  it("allows admin-like users to auto-approve their own actions", () => {
    expect(
      canAutoApproveOwnAction(
        {
          userId: "user-1",
          role: "admin",
        },
        {
          createdByClerkId: "user-1",
        },
      ),
    ).toBe(true);

    expect(
      canAutoApproveOwnAction(
        {
          userId: "user-1",
          role: "admin",
        },
        {
          createdByClerkId: "user-2",
        },
      ),
    ).toBe(false);
  });

  it("lets admin-like users review action participants", () => {
    expect(canUseAdminOverride({ role: "elu" })).toBe(true);
    expect(canModerateAnyAction({ role: "max" })).toBe(true);
    expect(
      canReviewActionParticipants(
        {
          userId: "user-2",
          role: "benevole",
        },
        {
          createdByClerkId: "user-1",
        },
        ["user-2"],
      ),
    ).toBe(true);
    expect(
      canReviewActionParticipants(
        {
          userId: "user-3",
          role: "benevole",
        },
        {
          createdByClerkId: "user-1",
        },
        ["user-2"],
      ),
    ).toBe(false);
  });

  it("rejects non moderation roles for global moderation", () => {
    expect(canModerateAnyAction({ role: "benevole" })).toBe(false);
  });
});
