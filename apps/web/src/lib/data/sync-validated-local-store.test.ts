import { describe, expect, it } from "vitest";

// The maintenance script is intentionally kept executable as plain Node ESM.
import {
  actionToRecord,
  normalizeValidatedRecords,
} from "../../../scripts/sync-validated-local-store.mjs";

const IMPORTED_AT = "2026-08-25T12:00:00.000Z";

function canonicalSpot(overrides: Record<string, unknown> = {}) {
  return {
    id: "canonical-spot-1",
    created_at: "2026-08-24T10:00:00.000Z",
    label: "Lieu canonique",
    spot_type: "clean_place",
    latitude: 48.85,
    longitude: 2.35,
    notes: "signalement canonique",
    status: "validated",
    validated_at: "2026-08-24T11:00:00.000Z",
    cleaned_at: null,
    ...overrides,
  };
}

function legacySpot(overrides: Record<string, unknown> = {}) {
  return {
    id: "legacy-spot-1",
    created_at: "2026-08-23T10:00:00.000Z",
    label: "Lieu historique",
    waste_type: "clean_place",
    latitude: 48.850001,
    longitude: 2.350001,
    notes: "ligne legacy",
    status: "validated",
    ...overrides,
  };
}

function action() {
  return {
    id: "action-1",
    created_at: "2026-08-24T09:00:00.000Z",
    action_date: "2026-08-24",
    actor_name: "Équipe locale",
    location_label: "Parc",
    latitude: 48.84,
    longitude: 2.34,
    waste_kg: 4,
    cigarette_butts: 3,
    volunteers_count: 2,
    duration_minutes: 45,
    notes: null,
    status: "approved",
  };
}

describe("sync-validated-local-store normalization", () => {
  it("maps canonical clean_place and spot to the historical local record contract", () => {
    const records = normalizeValidatedRecords({
      actions: [],
      canonicalSpots: [
        canonicalSpot(),
        canonicalSpot({ id: "canonical-spot-2", spot_type: "spot" }),
      ],
      legacySpots: [],
      importedAt: IMPORTED_AT,
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      recordType: "clean_place",
      trace: {
        externalId: "canonical-spot-1",
        originTable: "trash_spotter_spots",
        importedAt: IMPORTED_AT,
      },
    });
    expect(records[1]).toMatchObject({
      recordType: "other",
      trace: { externalId: "canonical-spot-2", originTable: "trash_spotter_spots" },
    });
  });

  it("projects a legacy row conservatively as other, regardless of waste_type", () => {
    const [record] = normalizeValidatedRecords({
      actions: [],
      canonicalSpots: [],
      legacySpots: [legacySpot({ waste_type: "clean_place" })],
      importedAt: IMPORTED_AT,
    });

    expect(record).toMatchObject({
      recordType: "other",
      trace: {
        externalId: "legacy-spot-1",
        originTable: "spots",
      },
    });
  });

  it("keeps only canonical data when canonical and legacy share a UUID", () => {
    const records = normalizeValidatedRecords({
      actions: [],
      canonicalSpots: [canonicalSpot({ id: "shared-uuid", spot_type: "spot" })],
      legacySpots: [legacySpot({ id: "shared-uuid" })],
      importedAt: IMPORTED_AT,
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      recordType: "other",
      trace: { externalId: "shared-uuid", originTable: "trash_spotter_spots" },
    });
  });

  it("keeps distinct IDs even when their coordinates are close", () => {
    const records = normalizeValidatedRecords({
      actions: [],
      canonicalSpots: [canonicalSpot({ id: "canonical-id" })],
      legacySpots: [legacySpot({ id: "legacy-id" })],
      importedAt: IMPORTED_AT,
    });

    expect(records.map((record) => record.trace?.externalId)).toEqual([
      "canonical-id",
      "legacy-id",
    ]);
  });

  it("leaves approved actions unchanged apart from the shared import timestamp", () => {
    const source = action();
    const records = normalizeValidatedRecords({
      actions: [source],
      canonicalSpots: [],
      legacySpots: [],
      importedAt: IMPORTED_AT,
    });

    expect(records).toEqual([actionToRecord(source, IMPORTED_AT)]);
  });
});
