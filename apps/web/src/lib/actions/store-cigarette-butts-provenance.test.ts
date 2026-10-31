import { describe, expect, it } from "vitest";
import type { CreateActionPayload } from "@/lib/actions/types";
import { extractActionMetadataFromNotes } from "./metadata";
import { buildPersistedNotes } from "./store-notes";

function buildPayload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    actorName: "Test",
    actionDate: "2026-04-22",
    locationLabel: "Test lieu",
    wasteKg: null,
    cigaretteButts: 9_999,
    cigaretteButtsCount: 9_999,
    cigaretteButtsMassKg: 1,
    cigaretteButtsCondition: "humide",
    volunteersCount: 1,
    durationMinutes: 30,
    ...overrides,
  };
}

describe("server cigarette-butt source resolution", () => {
  it("uses the declared form source to ignore a stale derived field", () => {
    const notes = buildPersistedNotes(
      buildPayload({
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: 9_999,
          cigaretteButtsMassKg: 1,
          cigaretteButtsVolumeLiters: null,
          cigaretteButtsCondition: "humide",
          cigaretteButtsInputSource: "mass",
        },
      }),
    );
    const metadata = extractActionMetadataFromNotes(notes);

    expect(metadata.cigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 2_000,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
    });
  });

  it("persists distinct lots and a server-derived total in the metadata projection", () => {
    const notes = buildPersistedNotes(
      buildPayload({
        cigaretteButts: null,
        cigaretteButtsCount: null,
        cigaretteButtsMassKg: null,
        cigaretteButtsMeasurements: {
          cigaretteButtsLots: [
            { id: "counted", source: "count", value: 100, condition: "propre" },
            { id: "weighed", source: "mass_kg", value: 1, condition: "humide" },
            { id: "volume", source: "volume_l", value: 0.5, condition: "mouille" },
          ],
        },
      }),
    );
    const metadata = extractActionMetadataFromNotes(notes);

    expect(metadata.cigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 2_400,
      cigaretteButtsLotsSummary: {
        totalCount: 2_400,
        countedCount: 100,
        estimatedCount: 2_300,
      },
      cigaretteButtsLots: [
        { id: "counted", source: "count", value: 100 },
        { id: "weighed", source: "mass_kg", value: 1 },
        { id: "volume", source: "volume_l", value: 0.5 },
      ],
    });
  });
});
