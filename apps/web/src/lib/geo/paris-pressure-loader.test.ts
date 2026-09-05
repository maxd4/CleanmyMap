import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadParisPressureSnapshot } from "./paris-pressure-loader";
import { findNearestParisPressureZone } from "./paris-pressure-lookup";

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
    expect(snapshot?.zones.every((zone) => zone.geometry !== null)).toBe(true);
    expect(snapshot?.zones.every((zone) => (zone.areaKm2 ?? 0) > 0)).toBe(true);
    expect(snapshot?.snapshotId).toBe("paris-iris-2024-pop-2021-r2-polygon");
    expect(snapshot?.sources.find((source) => source.family === "resident_population")?.status).toBe("available");
    expect(snapshot?.sources.find((source) => source.family === "tourism")).toMatchObject({
      publisher: "OpenStreetMap contributors",
      license: "ODbL",
      status: "partial",
    });
    expect(snapshot?.zones.some((zone) => zone.signals.tourism.tourismPresenceProxy !== null)).toBe(true);
    expect(snapshot?.zones.every((zone) => zone.signals.tourism.visitorAttendance === null)).toBe(true);
    const firstZone = snapshot?.zones[0];
    expect(firstZone).toBeDefined();
    expect(findNearestParisPressureZone(firstZone!.centroid, snapshot!)).toMatchObject({
      zoneId: firstZone!.id,
      matchMethod: "point-in-polygon",
    });
  });
});
