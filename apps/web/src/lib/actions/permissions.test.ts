import { describe, expect, it } from "vitest";
import {
  canManageAction,
  canManageActionsGlobally,
  canModerateActionsGlobally,
  canOverrideActionParticipants,
  canEditValidatedImpact,
  canReviewActionParticipants,
  canViewActionModerationAudit,
  canValidateActionAdministrativeRequirements,
} from "./permissions";

describe("action permissions", () => {
  it.each(["admin", "max", "elu"] as const)(
    "allows the privileged active role %s to validate administrative requirements",
    (activeRole) => {
      expect(
        canValidateActionAdministrativeRequirements(
          { userId: "privileged-1", activeRole },
          { createdByClerkId: "creator-1" },
          [],
        ),
      ).toBe(true);
    },
  );

  it.each(["benevole", "coordinateur", "scientifique", "entreprise"] as const)(
    "requires the canonical organizer relation for %s",
    (activeRole) => {
      const action = { createdByClerkId: "creator-1" };
      expect(
        canValidateActionAdministrativeRequirements(
          { userId: "creator-1", activeRole },
          action,
          [],
        ),
      ).toBe(false);
      expect(
        canValidateActionAdministrativeRequirements(
          { userId: "organizer-1", activeRole },
          action,
          ["organizer-1", "coorganizer-1"],
        ),
      ).toBe(true);
    },
  );

  it.each([
    ["benevole", false],
    ["coordinateur", false],
    ["scientifique", false],
    ["entreprise", false],
    ["elu", false],
    ["admin", true],
    ["max", true],
  ] as const)("limits global action capabilities to admin/max: %s", (activeRole, expected) => {
    const identity = {
      userId: "actor-user",
      role: activeRole,
      activeRole,
    };

    expect(canModerateActionsGlobally(identity)).toBe(expected);
    expect(canManageActionsGlobally(identity)).toBe(expected);
    expect(canOverrideActionParticipants(identity)).toBe(expected);
    expect(canViewActionModerationAudit(identity)).toBe(expected);
    expect(
      canEditValidatedImpact(identity),
    ).toBe(expected);
  });

  it("lets only admin/max override participant review", () => {
    expect(canOverrideActionParticipants({ activeRole: "admin" })).toBe(true);
    expect(canOverrideActionParticipants({ activeRole: "max" })).toBe(true);
    expect(canOverrideActionParticipants({ activeRole: "elu" })).toBe(false);
    expect(canModerateActionsGlobally({ activeRole: "elu" })).toBe(false);
  });

  it("does not treat a granted admin role as an organizer relation when the active role is benevole", () => {
    const identity = {
      userId: "admin-1",
      role: "admin" as const,
      activeRole: "benevole" as const,
    };
    const action = { createdByClerkId: "creator-1" };

    expect(canManageAction(identity, action, [])).toBe(false);
    expect(canReviewActionParticipants(identity, action, [])).toBe(false);
    expect(
      canValidateActionAdministrativeRequirements(identity, action, []),
    ).toBe(false);
  });

  it.each(["admin", "max"] as const)(
    "uses the privileged active role %s as the only global action capability",
    (activeRole) => {
      const identity = {
        userId: "privileged-1",
        role: "benevole" as const,
        activeRole,
      };
      expect(canManageAction(identity, { createdByClerkId: "creator-1" }, [])).toBe(true);
    },
  );

  it("keeps a real organizer relation and keeps creator access limited to the explicit creator contract", () => {
    const action = { createdByClerkId: "creator-1" };
    expect(
      canManageAction(
        { userId: "organizer-1", role: "benevole", activeRole: "benevole" },
        action,
        ["organizer-1"],
      ),
    ).toBe(true);
    expect(
      canManageAction(
        { userId: "creator-1", role: "benevole", activeRole: "benevole" },
        action,
        [],
      ),
    ).toBe(true);
    expect(
      canValidateActionAdministrativeRequirements(
        { userId: "creator-1", activeRole: "benevole" },
        action,
        [],
      ),
    ).toBe(false);
  });

  it("lets creators, organizers and coorganizers review their action participants", () => {
    expect(
      canReviewActionParticipants(
        {
          userId: "creator-1",
          role: "benevole",
          activeRole: "benevole",
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
          activeRole: "benevole",
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
          activeRole: "benevole",
        },
        {
          createdByClerkId: "creator-1",
        },
        ["organizer-1", "coorganizer-1"],
      ),
    ).toBe(true);
  });

  it("normalizes relational identifiers and rejects blank identities", () => {
    const action = { createdByClerkId: " creator-1 " };

    expect(
      canReviewActionParticipants(
        { userId: "creator-1", role: "benevole", activeRole: "benevole" },
        action,
        [],
      ),
    ).toBe(true);
    expect(
      canReviewActionParticipants(
        { userId: "organizer-1", role: "benevole", activeRole: "benevole" },
        { createdByClerkId: "creator-1" },
        [" organizer-1 "],
      ),
    ).toBe(true);
    expect(
      canReviewActionParticipants(
        { userId: " ", role: "benevole", activeRole: "benevole" },
        action,
        [],
      ),
    ).toBe(false);
  });

  it("rejects missing identities and blank identifiers even when targets are blank", () => {
    expect(
      canReviewActionParticipants(undefined, { createdByClerkId: "" }, [""]),
    ).toBe(false);
    expect(
      canReviewActionParticipants(
        { userId: undefined as never, role: "benevole", activeRole: "benevole" },
        { createdByClerkId: "" },
        [""],
      ),
    ).toBe(false);
    expect(
      canValidateActionAdministrativeRequirements(undefined, {}, []),
    ).toBe(false);
    expect(
      canReviewActionParticipants(
        { userId: " ", role: "benevole", activeRole: "benevole" },
        { createdByClerkId: " " },
        [" "],
      ),
    ).toBe(false);
    expect(
      canReviewActionParticipants(
        { userId: "", role: "benevole", activeRole: "benevole" },
        { createdByClerkId: "creator-1" },
        [" "],
      ),
    ).toBe(false);
    expect(
      canValidateActionAdministrativeRequirements(
        { userId: undefined as never, activeRole: "benevole" },
        {},
        [],
      ),
    ).toBe(false);
  });

  it("matches a sole organizer after trimming its identifier", () => {
    expect(
      canValidateActionAdministrativeRequirements(
        { userId: "organizer-1", activeRole: "benevole" },
        { createdByClerkId: "creator-1" },
        [" organizer-1 "],
      ),
    ).toBe(true);
    expect(
      canValidateActionAdministrativeRequirements(
        { userId: " organizer-1 ", activeRole: "benevole" },
        { createdByClerkId: "creator-1" },
        ["organizer-1"],
      ),
    ).toBe(true);
    expect(
      canValidateActionAdministrativeRequirements(
        { userId: "outsider-1", activeRole: "benevole" },
        { createdByClerkId: "creator-1" },
        ["organizer-1"],
      ),
    ).toBe(false);
  });

  it("rejects outside users from action participant review", () => {
    expect(
      canReviewActionParticipants(
        {
          userId: "outside-1",
          role: "benevole",
          activeRole: "benevole",
        },
        {
          createdByClerkId: "creator-1",
        },
        ["organizer-1", "coorganizer-1"],
      ),
    ).toBe(false);
  });

  it("keeps action management relational for an elected outsider", () => {
    const action = { createdByClerkId: "creator-1" };

    expect(
      canReviewActionParticipants(
        { userId: "outside-1", role: "elu", activeRole: "elu" },
        action,
        ["organizer-1"],
      ),
    ).toBe(false);
    expect(
      canReviewActionParticipants(
        { userId: "admin-1", role: "admin", activeRole: "admin" },
        action,
        [],
      ),
    ).toBe(true);
  });

  it("uses active admin capabilities only after an elected user explicitly switches", () => {
    const identity = {
      userId: "elu-1",
      role: "elu" as const,
      activeRole: "admin" as const,
    };

    expect(canManageActionsGlobally(identity)).toBe(true);
    expect(canModerateActionsGlobally(identity)).toBe(true);
    expect(canOverrideActionParticipants(identity)).toBe(true);
    expect(canEditValidatedImpact(identity)).toBe(true);

    expect(
      canManageActionsGlobally({ ...identity, activeRole: "elu" }),
    ).toBe(false);
    expect(
      canModerateActionsGlobally({ ...identity, activeRole: "elu" }),
    ).toBe(false);
    expect(
      canOverrideActionParticipants({ ...identity, activeRole: "elu" }),
    ).toBe(false);
    expect(canEditValidatedImpact({ ...identity, activeRole: "elu" })).toBe(false);
  });
});
