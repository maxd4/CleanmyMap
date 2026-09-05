import { describe, expect, it } from "vitest";
import {
  cycleDisplayMode,
  cycleRoleForSelfService,
  getAccountEvolutionLabel,
  getRoleMenuGroups,
} from "./account-identity-chip.helpers";

describe("cycleRoleForSelfService", () => {
  it("cycles only through the self-service roles", () => {
    expect(cycleRoleForSelfService("benevole")).toBe("coordinateur");
    expect(cycleRoleForSelfService("coordinateur")).toBe("scientifique");
    expect(cycleRoleForSelfService("scientifique")).toBe("entreprise");
    expect(cycleRoleForSelfService("entreprise")).toBe("benevole");
  });
});

describe("cycleDisplayMode", () => {
  it("keeps the display mode locked to exhaustive", () => {
    expect(cycleDisplayMode("exhaustif")).toBe("exhaustif");
    expect(cycleDisplayMode("minimaliste")).toBe("exhaustif");
    expect(cycleDisplayMode("sobre")).toBe("exhaustif");
  });
});

describe("getRoleMenuGroups", () => {
  it("keeps an open role from seeing obtained roles as switch targets", () => {
    expect(getRoleMenuGroups("benevole")).toEqual({
      openProfiles: ["benevole", "coordinateur", "scientifique", "entreprise"],
      obtainedProfiles: [],
    });
  });

  it("exposes only already granted privileged profiles as obtained targets", () => {
    expect(getRoleMenuGroups("admin").obtainedProfiles).toEqual(["elu", "admin"]);
    expect(getRoleMenuGroups("max").obtainedProfiles).toEqual(["elu", "admin", "max"]);
  });
});

describe("getAccountEvolutionLabel", () => {
  it("labels a pending request without exposing a role as directly selectable", () => {
    expect(getAccountEvolutionLabel("fr", false)).toBe("Évolution du compte");
    expect(getAccountEvolutionLabel("fr", true)).toBe("Évolution du compte · En attente");
  });
});
