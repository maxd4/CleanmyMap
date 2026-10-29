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
      cigaretteButtsCount: 1_750,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
    });
  });
});
