import { describe, expect, it } from "vitest";
import { buildTerritorialLegendAttribution, parseTerritorialLegendAttribution } from "./attribution";

const resolved = {
  source: "geo.api.gouv.fr" as const,
  region: { code: "11", name: "Île-de-France" },
  department: { code: "75", name: "Paris" },
  commune: { code: "75056", name: "Paris" },
  arrondissement: { code: "75105", name: "Paris 5e arrondissement" },
  specialTerritory: null,
};

describe("territorial legend persisted attribution", () => {
  it("keeps an official arrondissement and rejects a stale action date", () => {
    const attribution = buildTerritorialLegendAttribution({
      actionId: "action-1",
      actionDate: "2026-11-03",
      resolved,
      resolvedAt: new Date("2026-11-03T10:00:00.000Z"),
    });

    expect(parseTerritorialLegendAttribution(attribution, {
      actionId: "action-1",
      actionDate: "2026-11-03",
    })).toEqual(expect.objectContaining({
      commune: { code: "75056", name: "Paris" },
      arrondissement: { code: "75105", name: "Paris 5e arrondissement" },
    }));
    expect(parseTerritorialLegendAttribution(attribution, {
      actionId: "action-1",
      actionDate: "2026-11-04",
    })).toBeNull();
  });

  it("does not promote a department-only or non-official result", () => {
    expect(buildTerritorialLegendAttribution({
      actionId: "action-2",
      actionDate: "2026-11-03",
      resolved: {
        source: "persisted_department",
        region: null,
        department: { code: "75", name: "Paris" },
        commune: null,
        arrondissement: null,
        specialTerritory: null,
      },
    })).toBeNull();
  });
});
