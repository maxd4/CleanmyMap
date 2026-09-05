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
  });

  it("lets creators, organizers and coorganizers review their action participants", () => {
    expect(
      canReviewActionParticipants(
        {
          userId: "creator-1",
          role: "benevole",
        },
        {
          createdByClerkId: "creator-1",
        },
        [],
      ),
    ).toBe(true);

    expect(
      canReviewActionParticipants(
        {
          userId: "organizer-1",
          role: "benevole",
        },
        {
          createdByClerkId: "creator-1",
        },
        ["organizer-1", "coorganizer-1"],
      ),
    ).toBe(true);

    expect(
      canReviewActionParticipants(
        {
          userId: "coorganizer-1",
          role: "benevole",
        },
        {
          createdByClerkId: "creator-1",
        },
        ["organizer-1", "coorganizer-1"],
      ),
    ).toBe(true);
  });

  it("rejects outside users from action participant review", () => {
    expect(
      canReviewActionParticipants(
        {
          userId: "outside-1",
          role: "benevole",
        },
        {
          createdByClerkId: "creator-1",
        },
        ["organizer-1", "coorganizer-1"],
      ),
    ).toBe(false);
  });

  it("rejects non moderation roles for global moderation", () => {
    expect(canModerateAnyAction({ role: "benevole" })).toBe(false);
  });
});
