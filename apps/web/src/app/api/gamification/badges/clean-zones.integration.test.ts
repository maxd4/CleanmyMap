import { describe, expect, it } from "vitest";
import {
  collectEligibleCleanZoneSources,
  countEligibleCleanZones,
} from "@/lib/gamification/clean-zones";

describe("Clean Zones Badge rules", () => {
  it("counts only geolocalized, documented, validated clean zones and enforces 24h cooldown", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");

    const cleanPlaces = [
      {
        id: "recent-clean-zone",
        status: "validated" as const,
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "Recent clean park area",
        validated_at: "2026-06-01T11:15:00.000Z",
      },
      {
        id: "old-clean-zone",
        status: "validated" as const,
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "Old clean park area",
        validated_at: "2026-05-30T10:00:00.000Z",
      },
      {
        id: "missing-geo",
        status: "validated" as const,
        latitude: null,
        longitude: null,
        notes: "No geoloc",
        validated_at: "2026-05-30T10:00:00.000Z",
      },
      {
        id: "missing-notes",
        status: "validated" as const,
        latitude: 48.8566,
        longitude: 2.3522,
        notes: null,
        validated_at: "2026-05-30T10:00:00.000Z",
      },
      {
        id: "pending-zone",
        status: "pending" as const,
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "Pending validation",
        validated_at: "2026-05-30T10:00:00.000Z",
      },
    ];

    expect(countEligibleCleanZones({ cleanPlaces, now })).toBe(1);
    expect(collectEligibleCleanZoneSources({ cleanPlaces, now })).toEqual([
      {
        key: "clean:old-clean-zone",
        sourceTable: "trash_spotter_spots",
        sourceId: "clean-id:old-clean-zone",
      },
    ]);
  });

  it("includes eligible spots from both sources and keeps source-specific keys", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");

    const cleanPlaces = [
      {
        id: "alpha",
        status: "validated" as const,
        latitude: 48.85,
        longitude: 2.35,
        notes: "Validated clean place",
        cleaned_at: "2026-05-29T12:00:00.000Z",
      },
    ];

    const otherSpots = [
      {
        id: "beta",
        status: "cleaned" as const,
        latitude: 48.86,
        longitude: 2.36,
        notes: "Cleaned general spot",
        cleaned_at: "2026-05-29T12:00:00.000Z",
      },
    ];

    const sources = collectEligibleCleanZoneSources({ cleanPlaces, otherSpots, now });

    expect(sources).toHaveLength(2);
    expect(sources).toEqual([
      {
        key: "clean:alpha",
        sourceTable: "trash_spotter_spots",
        sourceId: "clean-id:alpha",
      },
      {
        key: "spot:beta",
        sourceTable: "spots",
        sourceId: "spot-id:beta",
      },
    ]);
  });
});
