import { describe, expect, it } from "vitest";
import { buildSupportRequestLines, normalizeSupportNeeds, resolveLocalSupport } from "./accompaniment";
import { buildSupportActionSummary } from "./email-draft";
import type { FormalitiesTerritory } from "./qualification";

describe("optional support", () => {
  it("normalizes without duplicating needs", () => {
    expect(normalizeSupportNeeds(["pickup", "invalid", "equipment", "pickup"])).toEqual(["equipment", "pickup"]);
  });
  it("does not insert unselected requests", () => {
    const text = buildSupportRequestLines(["equipment"]).join(" ");
    expect(text).toContain("Matériel");
    expect(text).not.toContain("reprise");
    expect(buildSupportRequestLines([])).toEqual([]);
  });
  it("only matches the documented arrondissement for a single location", () => {
    const territory: FormalitiesTerritory = { countryCode: "FR", code: "FR-69", label: "Lyon", commune: { codeInsee: "69123", label: "Lyon" }, arrondissement: { code: "69388", label: "8e" } };
    expect(resolveLocalSupport(territory, "single_location", ["equipment"])[0]?.id).toBe("lyon-8-cleanup");
    expect(resolveLocalSupport(territory, "route_or_area", ["equipment"])).toEqual([]);
    expect(resolveLocalSupport(territory, "single_location", ["safety"])).toEqual([]);
    expect(resolveLocalSupport({ ...territory, arrondissement: { code: "69387", label: "7e" } }, "single_location", ["equipment"])).toEqual([]);
  });
  it("uses EPCI code for Nantes", () => {
    const territory: FormalitiesTerritory = { countryCode: "FR", code: "FR-44", label: "Nantes", epci: { code: "244400404", label: "Nantes Métropole" } };
    expect(resolveLocalSupport(territory, "single_location", ["equipment"])[0]?.id).toBe("nantes-metropole-cleanup");
    expect(resolveLocalSupport(territory, "single_location", ["pickup"])).toEqual([]);
  });
  it("copies known facts only", () => {
    expect(buildSupportActionSummary({ title: "Collecte", participantCount: 0 })).toBe("Titre : Collecte\nParticipants prévus : 0");
  });
});
