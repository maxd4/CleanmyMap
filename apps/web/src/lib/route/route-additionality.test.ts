import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  isVolunteerRouteEligible,
  toTrashSpotterActionableCandidate,
} from "@/lib/actions/trash-spotter-actionable-candidates";
import type { ParisPressureSnapshot } from "@/lib/geo/paris-pressure-contract";
import type { WasteCategorySlug } from "@/lib/waste";
import {
  observedCandidateContribution,
  safetyForObservedCandidate,
} from "./route-additionality";

function candidate(wasteCategories: readonly WasteCategorySlug[] = ["plastic"]) {
  const contract = buildActionDataContract({
    id: "spot-1",
    type: "spot",
    status: "approved",
    source: "trash_spotter_spots",
    sourceStatus: "validated",
    observedAt: "2026-08-20T10:00:00.000Z",
    locationLabel: "Quai de test",
    latitude: 48.8566,
    longitude: 2.3522,
    wasteCategories: [...wasteCategories],
  });
  const result = toTrashSpotterActionableCandidate(contract);
  if (!result) throw new Error("test candidate should be actionable");
  return result;
}

const pressureSnapshot: ParisPressureSnapshot = {
  schemaVersion: "paris-pressure-v1",
  snapshotId: "route-additionality-test",
  generatedAt: "2026-09-01T00:00:00.000Z",
  refreshedAt: "2026-09-01T00:00:00.000Z",
  geographicLevel: "iris",
  coverage: {
    country: "FR",
    department: "75",
    commune: "75056",
    zoneCount: 1,
    complete: true,
    notes: [],
  },
  sources: [],
  zones: [{
    id: "zone-1",
    label: "Zone test",
    geographicLevel: "iris",
    arrondissementCode: "75101",
    centroid: { latitude: 48.8566, longitude: 2.3522 },
    areaKm2: 0.1,
    signals: {
      residentPopulation: { population: 100, densityPerKm2: 100, normalized: 0.8 },
      transport: { stationCount: 4, annualEntrants: 1000, normalized: 0.8 },
      tourism: { visitorAttendance: 1000, tourismPresenceProxy: 0.8, normalized: 0.8 },
      publicActivity: { authorisedTerraces: 10, openAirMarkets: 2, otherPlaces: 4, normalized: 0.8 },
      cleanlinessPrior: { normalized: 0.5, rawObservations: 10, resolution: "iris", measuredAt: "2026-09-01" },
    },
    humanPressure: 0.8,
  }],
};

describe("route additionality observed safety", () => {
  it("keeps an eligible observed spot while geographic safety is unknown", () => {
    const observed = candidate();
    const first = observedCandidateContribution({
      candidate: { ...observed, score: 82 },
      pressureSnapshot: null,
      municipalCleaningSnapshot: null,
    });
    const second = observedCandidateContribution({
      candidate: { ...observed, score: 82 },
      pressureSnapshot: null,
      municipalCleaningSnapshot: null,
    });

    expect(isVolunteerRouteEligible(observed)).toBe(true);
    expect(safetyForObservedCandidate(observed)).toMatchObject({
      status: "unknown",
      suitability: null,
      confidence: 0,
    });
    expect(first.volunteerAdditionality).toBeNull();
    expect(first.finalPlannerContribution).toBe(82);
    expect(first).toEqual(second);
  });

  it.each([
    ["trained_only", ["broken_glass"] as const],
    ["no_pickup", ["sharps"] as const],
  ] as const)("keeps %s excluded", (_reason, categories) => {
    const observed = candidate(categories);

    expect(isVolunteerRouteEligible(observed)).toBe(false);
    expect(safetyForObservedCandidate(observed)).toMatchObject({
      status: "excluded",
      suitability: 0,
    });
  });

  it("keeps an explicit geographic exclusion as a hard exclusion", () => {
    const observed = candidate();

    expect(
      safetyForObservedCandidate(observed, {
        status: "excluded",
        suitability: 0,
        confidence: 1,
        exclusionReasons: ["active_roadway"],
      }),
    ).toMatchObject({ status: "excluded", suitability: 0 });
  });

  it("allows a future independent geographic safe assessment", () => {
    const observed = candidate();
    const geographicSafety = {
      status: "safe" as const,
      suitability: 1,
      confidence: 1,
      evidenceIds: ["future-geographic-safety-source"],
    };

    expect(safetyForObservedCandidate(observed, geographicSafety)).toMatchObject({
      status: "safe",
      suitability: 1,
    });
    const contribution = observedCandidateContribution({
      candidate: { ...observed, score: 82 },
      pressureSnapshot,
      municipalCleaningSnapshot: null,
      geographicSafety,
    });
    expect(contribution.volunteerAdditionality).toEqual(expect.any(Number));
    expect(contribution.additionality?.eligible).toBe(true);
  });
});
