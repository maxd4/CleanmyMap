import { describe, expect, it } from "vitest";
import { getEffectiveAccessForSessionRole } from "./domain-language";

describe("effective capability inheritance", () => {
  it.each([
    ["benevole", false, false, false],
    ["coordinateur", false, false, true],
    ["scientifique", false, false, false],
    ["entreprise", false, false, false],
    ["elu", false, true, false],
    ["admin", true, true, true],
    ["max", true, true, true],
  ] as const)(
    "resolves %s from the canonical capability matrix",
    (role, canAccessAdminPage, canModerate, canAccessPilotage) => {
      const access = getEffectiveAccessForSessionRole(role);

      expect(access.canAccessAdminPage).toBe(canAccessAdminPage);
      expect(access.canModerate).toBe(canModerate);
      expect(access.canAccessPilotage).toBe(canAccessPilotage);
    },
  );

  it("does not grant privileged capabilities to anonymous sessions", () => {
    const access = getEffectiveAccessForSessionRole("anonymous");

    expect(access.canAccessAdminPage).toBe(false);
    expect(access.canModerate).toBe(false);
    expect(access.canAccessPilotage).toBe(false);
  });
});
