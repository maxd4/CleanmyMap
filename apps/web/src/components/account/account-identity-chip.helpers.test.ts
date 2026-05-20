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
  it("keeps the display mode locked to exhaustive", () => {
    expect(cycleDisplayMode("exhaustif")).toBe("exhaustif");
    expect(cycleDisplayMode("minimaliste")).toBe("exhaustif");
    expect(cycleDisplayMode("sobre")).toBe("exhaustif");
  });
});
