import { describe, expect, it } from "vitest";
import { getReliabilityMetricLabels } from "./pilotage-overview-sections";

describe("Pilotage overview reliability labels", () => {
  it("keeps the French reliability labels", () => {
    expect(getReliabilityMetricLabels("fr")).toEqual({
      completeness: "Complétude",
      geoloc: "Géoloc",
      freshness: "Fraîcheur",
    });
  });

  it("uses the English reliability labels", () => {
    expect(getReliabilityMetricLabels("en")).toEqual({
      completeness: "Completeness",
      geoloc: "Geoloc",
      freshness: "Freshness",
    });
  });
});
