import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadMunicipalCleaningServiceabilitySnapshot } from "./municipal-cleaning-serviceability-loader";

describe("municipal cleaning serviceability snapshot loader", () => {
  it("loads the local snapshot and preserves partial coverage state", () => {
    const snapshot = loadMunicipalCleaningServiceabilitySnapshot();
    expect(snapshot?.schemaVersion).toBe("paris-municipal-cleaning-serviceability-v1");
    expect(snapshot?.predictionModelVersion).toBe("municipal-cleaning-serviceability-v1");
    expect(snapshot?.coverage).toMatchObject({
      department: "75",
      commune: "75056",
      status: "partial",
      complete: false,
    });
    expect(snapshot?.zones).toHaveLength(992);
    expect(snapshot?.zones.some((zone) => zone.municipalCleaningServiceability !== null)).toBe(true);
    expect(snapshot?.zones.some((zone) => zone.municipalCleaningServiceability === null)).toBe(true);
    expect(snapshot?.sources.some((source) => source.evidenceType === "geometry_proxy")).toBe(true);
    expect(snapshot?.sources.some((source) => source.evidenceType === "cleaning_frequency")).toBe(false);
  });
});
