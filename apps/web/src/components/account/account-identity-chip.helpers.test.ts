import { describe, expect, it } from "vitest";
import { cycleDisplayMode, cycleRoleForSelfService } from "./account-identity-chip.helpers";

describe("cycleRoleForSelfService", () => {
  it("cycles only through the self-service roles", () => {
    expect(cycleRoleForSelfService("benevole")).toBe("coordinateur");
    expect(cycleRoleForSelfService("coordinateur")).toBe("scientifique");
    expect(cycleRoleForSelfService("scientifique")).toBe("benevole");
  });
});

describe("cycleDisplayMode", () => {
  it("keeps display modes cycling", () => {
    expect(cycleDisplayMode("exhaustif")).toBe("sobre");
  });
});
