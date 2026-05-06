import { describe, expect, it } from"vitest";
import {
 cycleDisplayMode,
 cycleRoleForSelfService,
} from"./account-identity-chip.helpers";

describe("account identity chip helpers", () => {
  it("cycles display modes in order", () => {
    expect(cycleDisplayMode("exhaustif")).toBe("minimaliste");
    expect(cycleDisplayMode("minimaliste")).toBe("sobre");
    expect(cycleDisplayMode("sobre")).toBe("exhaustif");
  });

 it("cycles only the self-service profiles", () => {
 expect(cycleRoleForSelfService("benevole")).toBe("coordinateur");
 expect(cycleRoleForSelfService("coordinateur")).toBe("scientifique");
 expect(cycleRoleForSelfService("scientifique")).toBe("benevole");
 });
});
