import { describe, expect, it } from "vitest";
import { getEffectiveAccessForSessionRole } from "./domain-language";

describe("effective capability inheritance", () => {
  it.each([
    ["benevole", false, false],
    ["coordinateur", false, true],
    ["scientifique", false, false],
    ["entreprise", false, false],
    ["elu", false, false],
    ["admin", true, false],
    ["max", true, false],
  ] as const)(
    "resolves %s from the canonical capability matrix",
    (role, canAccessAdminPage, canAccessPilotage) => {
      const access = getEffectiveAccessForSessionRole(role);

      expect(access.canAccessAdminPage).toBe(canAccessAdminPage);
      expect(access.canAccessPilotage).toBe(canAccessPilotage);
    },
  );

  it("does not grant privileged capabilities to anonymous sessions", () => {
    const access = getEffectiveAccessForSessionRole("anonymous");

    expect(access.canAccessAdminPage).toBe(false);
    expect(access.canAccessPilotage).toBe(false);
  });
});
