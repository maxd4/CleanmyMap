import { describe, expect, it } from "vitest";
import {
  cycleDisplayMode,
  cycleRoleForSelfService,
} from "./account-identity-chip.helpers";

describe("account identity chip helpers", () => {
  it("locks the display mode to exhaustive", () => {
    expect(cycleDisplayMode("exhaustif")).toBe("exhaustif");
    expect(cycleDisplayMode("minimaliste")).toBe("exhaustif");
    expect(cycleDisplayMode("sobre")).toBe("exhaustif");
  });

  it("cycles only the self-service profiles", () => {
    expect(cycleRoleForSelfService("benevole")).toBe("coordinateur");
    expect(cycleRoleForSelfService("coordinateur")).toBe("scientifique");
    expect(cycleRoleForSelfService("scientifique")).toBe("entreprise");
    expect(cycleRoleForSelfService("entreprise")).toBe("benevole");
  });
});
