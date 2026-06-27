import { describe, expect, it } from "vitest";
import type { ActionDataContract } from "@/lib/actions/contract-model";
import { buildRecyclingBreakdown } from "./breakdown";

function buildContract(overrides: Partial<ActionDataContract>): ActionDataContract {
  const metadata: ActionDataContract["metadata"] = {
    actorName: "Maxence",
    associationName: "CleanMyMap",
    groupJoinEnabled: false,
    placeType: null,
    departureLocationLabel: null,
    arrivalLocationLabel: null,
    routeStyle: null,
    routeAdjustmentMessage: null,
    notes: null,
    notesPlain: null,
    submissionMode: "quick",
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
  it("aggregates category weights and tri quality counts", () => {
    const breakdown = buildRecyclingBreakdown([
      buildContract({
        metadata: {
          wasteKg: 8,
          wasteBreakdown: {
            megotsKg: 2,
            plastiqueKg: 3,
            verreKg: 0,
            metalKg: 1,
            mixteKg: 2,
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
    ]);

    expect(breakdown.totalKg).toBe(12);
    expect(breakdown.lines.find((line) => line.category === "megots")?.kg).toBe(2);
    expect(breakdown.lines.find((line) => line.category === "plastique")?.kg).toBe(3);
    expect(breakdown.lines.find((line) => line.category === "mixte")?.kg).toBe(6);
    expect(breakdown.triQuality.elevee).toBe(1);
    expect(breakdown.triQuality.moyenne).toBe(0);
    expect(breakdown.triQuality.faible).toBe(0);
  });
});
