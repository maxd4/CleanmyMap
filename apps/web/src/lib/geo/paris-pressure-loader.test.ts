import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadParisPressureSnapshot } from "./paris-pressure-loader";

describe("Paris pressure snapshot loader", () => {
  it("serves the versioned local snapshot without network access", () => {
    const snapshot = loadParisPressureSnapshot();
    expect(snapshot?.schemaVersion).toBe("paris-pressure-v1");
    expect(snapshot?.coverage).toMatchObject({
      department: "75",
      commune: "75056",
      zoneCount: 992,
    });
    expect(snapshot?.zones).toHaveLength(992);
    expect(snapshot?.zones.every((zone) => Number.isFinite(zone.centroid.latitude))).toBe(true);
    expect(snapshot?.sources.find((source) => source.family === "resident_population")?.status).toBe("available");
    expect(snapshot?.sources.find((source) => source.family === "tourism")).toMatchObject({
      publisher: "OpenStreetMap contributors",
      license: "ODbL",
      status: "partial",
    });
    expect(snapshot?.zones.some((zone) => zone.signals.tourism.tourismPresenceProxy !== null)).toBe(true);
    expect(snapshot?.zones.every((zone) => zone.signals.tourism.visitorAttendance === null)).toBe(true);
  });
});
