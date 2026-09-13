import { describe, expect, it } from "vitest";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import { buildRecyclingBreakdown } from "./breakdown";

function buildContract(overrides: Partial<ActionDataContract>): ActionDataContract {
  const metadata: ActionDataContract["metadata"] = {
    actorName: "Maxence",
    associationName: "CleanMyMap",
    organizerType: null,
    groupJoinEnabled: false,
    placeType: null,
    departureLocationLabel: null,
    arrivalLocationLabel: null,
    routeStyle: null,
    routeAdjustmentMessage: null,
    notes: null,
    notesPlain: null,
    submissionMode: "quick",
    actionPhase: "post_action_complete",
    preparationData: null,
    wasteBreakdown: null,
    photos: null,
    visionEstimate: null,
    wasteKg: 5,
    cigaretteButts: 10,
    volunteersCount: 3,
    durationMinutes: 45,
    manualDrawing: null,
    ...(overrides.metadata ?? {}),
  };

  return {
    id: "action-1",
    type: "action",
    status: "approved",
    source: "actions",
    location: { label: "Paris 11e", latitude: 48.85, longitude: 2.37 },
    geometry: {
      kind: "point",
      coordinates: [[2.37, 48.85]],
      geojson: null,
      confidence: 0.8,
      geometrySource: "manual",
      origin: "manual",
    },
    dates: {
      observedAt: "2026-06-01",
      createdAt: "2026-06-01T10:00:00.000Z",
      importedAt: null,
      validatedAt: null,
    },
    ...overrides,
    metadata,
  } as ActionDataContract;
}

describe("buildRecyclingBreakdown", () => {
  it("aggregates the canonical breakdown and keeps legacy data unmapped", () => {
    const breakdown = buildRecyclingBreakdown([
      buildContract({
        metadata: {
          wasteKg: 8,
          wasteBreakdown: {
            recyclablesKg: 3,
            glassKg: 0,
            householdWasteKg: 1,
            otherWasteKg: 2,
            triQuality: "elevee",
          },
        } as ActionDataContract["metadata"],
      }),
      buildContract({
        metadata: {
          wasteKg: 4,
          wasteBreakdown: null,
        } as ActionDataContract["metadata"],
      }),
      buildContract({
        metadata: {
          wasteKg: null,
          wasteBreakdown: null,
        } as ActionDataContract["metadata"],
      }),
    ]);

    expect(breakdown.totalKg).toBe(6);
    expect(breakdown.wasteKnownActions).toBe(2);
    expect(breakdown.wasteCoverageRate).toBeCloseTo(66.7, 1);
    expect(breakdown.lines.find((line) => line.category === "recyclables")?.kg).toBe(3);
    expect(breakdown.lines.find((line) => line.category === "glass")?.kg).toBe(0);
    expect(breakdown.lines.find((line) => line.category === "household")?.kg).toBe(1);
    expect(breakdown.lines.find((line) => line.category === "other")?.kg).toBe(2);
    expect(breakdown.triQuality.elevee).toBe(1);
    expect(breakdown.triQuality.moyenne).toBe(0);
    expect(breakdown.triQuality.faible).toBe(0);
  });
});
