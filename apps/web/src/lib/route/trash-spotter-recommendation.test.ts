import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import {
  buildTrashSpotterActionableCandidates,
  type TrashSpotterActionableCandidate,
} from "@/lib/actions/trash-spotter-actionable-candidates";
import {
  buildTrashSpotterRouteCandidates,
  distanceKm,
  freshnessScore,
} from "./trash-spotter-recommendation";

function buildCandidate(
  overrides: Partial<Parameters<typeof buildActionDataContract>[0]> = {},
): TrashSpotterActionableCandidate {
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
    wasteCategories: ["plastic"],
    ...overrides,
  });
  const candidate = buildTrashSpotterActionableCandidates([contract])[0];
  if (!candidate) {
    throw new Error("Expected a valid candidate");
  }
  return candidate;
}

const constraints = {
  accessibility: "standard" as const,
  security: "standard" as const,
  weather: "ok" as const,
};

describe("Trash Spotter route recommendation", () => {
  it("uses only canonical validated spots, never actions or clean places", () => {
    const candidates = buildTrashSpotterActionableCandidates([
      buildActionDataContract({
        id: "action-1",
        type: "action",
        status: "approved",
        source: "actions",
        sourceStatus: "approved",
        observedAt: "2026-08-20",
        locationLabel: "Action historique",
        latitude: 48.85,
        longitude: 2.35,
      }),
      buildActionDataContract({
        id: "clean-place-1",
        type: "clean_place",
        status: "approved",
        source: "trash_spotter_spots",
        sourceStatus: "validated",
        observedAt: "2026-08-20",
        locationLabel: "Lieu propre",
        latitude: 48.85,
        longitude: 2.35,
      }),
      buildCandidate().contract,
    ]);

    expect(candidates.map((candidate) => candidate.id)).toEqual(["spot-1"]);
    expect(
      buildTrashSpotterRouteCandidates(candidates, constraints, new Date("2026-08-25")),
    ).toHaveLength(1);
  });

  it("excludes specialized and unknown-category points from ordinary volunteer routes", () => {
    const candidates = [
      buildCandidate({ id: "safe", wasteCategories: ["plastic"] }),
      buildCandidate({ id: "trained", wasteCategories: ["broken_glass"] }),
      buildCandidate({ id: "no-pickup", wasteCategories: ["sharps"] }),
      buildCandidate({ id: "missing", wasteCategories: null }),
    ];

    const routeCandidates = buildTrashSpotterRouteCandidates(
      candidates,
      constraints,
      new Date("2026-08-25"),
    );

    expect(routeCandidates.map((candidate) => candidate.id)).toEqual(["safe"]);
  });

  it("scores freshness and leaves distance as a separate operational factor", () => {
    const now = new Date("2026-08-25T00:00:00.000Z");
    expect(freshnessScore("2026-08-25T00:00:00.000Z", now)).toBe(100);
    expect(freshnessScore("2026-04-27T00:00:00.000Z", now)).toBe(0);
    expect(distanceKm({ latitude: 48.85, longitude: 2.35 }, { latitude: 48.86, longitude: 2.36 })).toBeGreaterThan(0);
  });
});
