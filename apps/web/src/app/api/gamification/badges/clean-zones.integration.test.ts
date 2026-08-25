import { describe, expect, it } from "vitest";
import {
  collectEligibleCleanZoneSources,
  countEligibleCleanZones,
} from "@/lib/gamification/clean-zones";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const EXPIRED_VALIDATION = "2026-05-30T10:00:00.000Z";

function canonicalRow(id: string, latitude: number, longitude: number) {
  return {
    id,
    status: "validated" as const,
    latitude,
    longitude,
    notes: `Canonical clean place ${id}`,
    validated_at: EXPIRED_VALIDATION,
  };
}

describe("Clean Zones Badge rules", () => {
  it("counts only canonical rows with an expired validation cooldown", () => {
    const sources = collectEligibleCleanZoneSources({
      cleanPlaces: [
        { ...canonicalRow("recent", 48.856, 2.352), validated_at: "2026-06-01T11:15:00.000Z" },
        canonicalRow("old", 48.8566, 2.3522),
        { ...canonicalRow("missing-geo", 48.857, 2.353), latitude: null, longitude: null },
        { ...canonicalRow("missing-notes", 48.8567, 2.3523), notes: null },
        { ...canonicalRow("pending", 48.8568, 2.3524), status: "new" },
      ],
      now: NOW,
    });

    expect(countEligibleCleanZones({ cleanPlaces: [canonicalRow("old", 48.8566, 2.3522)], now: NOW })).toBe(1);
    expect(sources).toEqual([
      {
        key: "clean-zone:coordinates:48.85660:2.35220",
        canonicalPlaceKey: "coordinates:48.85660:2.35220",
        sourceTable: "trash_spotter_spots",
        sourceId: "old",
        provenance: [{ sourceTable: "trash_spotter_spots", sourceId: "old" }],
        progressionSourceTable: "clean_zones",
        progressionSourceId: "clean-zone:coordinates:48.85660:2.35220",
        progressionEventRecorded: false,
      },
    ]);
  });

  it("does not infer validation from created_at when the canonical timestamp is absent", () => {
    expect(
      collectEligibleCleanZoneSources({
        cleanPlaces: [
          {
            id: "unproven",
            status: "validated",
            latitude: 48.85,
            longitude: 2.35,
            notes: "canonical",
          },
        ],
        now: NOW,
      }),
    ).toEqual([]);
  });

  it("recognizes historical spots XP events after canonical migration", () => {
    const sources = collectEligibleCleanZoneSources({
      cleanPlaces: [canonicalRow("migrated-id", 48.85, 2.35)],
      progressionEvents: [
        { sourceTable: "spots", sourceId: "spot-id:migrated-id" },
      ],
      now: NOW,
    });

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      sourceTable: "trash_spotter_spots",
      sourceId: "migrated-id",
      provenance: [{ sourceTable: "trash_spotter_spots", sourceId: "migrated-id" }],
      progressionEventRecorded: true,
    });
  });

  it("deduplicates the same canonical place and keeps canonical provenance", () => {
    const sources = collectEligibleCleanZoneSources({
      cleanPlaces: [
        canonicalRow("canonical-id", 48.85, 2.35),
        canonicalRow("migrated-id", 48.850004, 2.350004),
      ],
      now: NOW,
    });

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      key: "clean-zone:coordinates:48.85000:2.35000",
      sourceTable: "trash_spotter_spots",
      sourceId: "canonical-id",
      progressionSourceTable: "clean_zones",
      progressionSourceId: "clean-zone:coordinates:48.85000:2.35000",
      progressionEventRecorded: false,
    });
    expect(sources[0]?.provenance).toEqual([
      { sourceTable: "trash_spotter_spots", sourceId: "canonical-id" },
      { sourceTable: "trash_spotter_spots", sourceId: "migrated-id" },
    ]);
  });

  it("does not create a second XP candidate when a migrated canonical row has an old XP event", () => {
    const sources = collectEligibleCleanZoneSources({
      cleanPlaces: [canonicalRow("migrated-id", 48.85, 2.35)],
      progressionEvents: [
        { sourceTable: "spots", sourceId: "spot-id:migrated-id" },
      ],
      now: NOW,
    });

    expect(sources).toHaveLength(1);
    expect(sources[0]?.progressionEventRecorded).toBe(true);
  });

  it("keeps distinct canonical places as distinct candidates", () => {
    const sources = collectEligibleCleanZoneSources({
      cleanPlaces: [
        canonicalRow("canonical-one", 48.85, 2.35),
        canonicalRow("canonical-two", 48.86, 2.36),
      ],
      now: NOW,
    });

    expect(sources).toHaveLength(2);
    expect(sources.map((source) => source.canonicalPlaceKey)).toEqual([
      "coordinates:48.85000:2.35000",
      "coordinates:48.86000:2.36000",
    ]);
  });
});
