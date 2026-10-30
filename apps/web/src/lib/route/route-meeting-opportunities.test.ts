import { describe, expect, it } from "vitest";
import type { MeetingPointProjection } from "./route-response-contract";
import type { RoutePlannerCandidate } from "./route-planner";
import {
  buildMeetingOpportunities,
  MEETING_OPPORTUNITY_MAX_COUNT,
  MEETING_OPPORTUNITY_MAX_RADIUS_METERS,
} from "./route-meeting-opportunities";

const meetingPoint: MeetingPointProjection = {
  coordinates: [48.8566, 2.3522],
  cumulativeDistanceKm: 2,
  progress: 0.5,
  estimatedDurationMinutes: 27,
  provenance: "final_geometry_midpoint",
};

function candidate(
  id: string,
  latitude: number,
  longitude: number,
  options: {
    family?: "observed" | "predicted";
    safetyStatus?: "safe" | "unknown" | "excluded";
    specializationReason?: "trained_only" | "no_pickup" | null;
    score?: number;
  } = {},
): RoutePlannerCandidate {
  const family = options.family ?? "observed";
  const safety = {
    status: options.safetyStatus ?? "safe",
    suitability: options.safetyStatus === "unknown" ? null : 1,
    confidence: options.safetyStatus === "safe" ? 1 : 0,
  } as const;
  const base = {
    id,
    label: `Candidat ${id}`,
    latitude,
    longitude,
    score: options.score ?? 50,
    reason: "test",
    volunteerSafety: safety,
  };
  if (family === "predicted") {
    return {
      ...base,
      family,
      evidence: {
        family,
        source: "urban-pressure-model",
        modelVersion: "test-v1",
      },
    } as unknown as RoutePlannerCandidate;
  }
  return {
    ...base,
    family,
    safety: {
      volunteerEligibility: options.specializationReason
        ? "specialized_required"
        : "eligible",
      specializationReason: options.specializationReason ?? null,
    },
    evidence: {
      family,
      source: "trash_spotter_spots",
      proof: "validated",
      observedAt: "2026-10-30T00:00:00.000Z",
    },
  } as unknown as RoutePlannerCandidate;
}

function coordinatesAtMeters(meters: number): [number, number] {
  const [latitude, longitude] = meetingPoint.coordinates;
  const longitudeDelta = meters / (111_320 * Math.cos((latitude * Math.PI) / 180));
  return [latitude, longitude + longitudeDelta];
}

describe("buildMeetingOpportunities", () => {
  it("returns no recommendation when the meeting point is unavailable", () => {
    const result = buildMeetingOpportunities({
      meetingPoint: null,
      candidates: [candidate("near", ...coordinatesAtMeters(20))],
    });

    expect(result.opportunities).toEqual([]);
    expect(result.trace.skippedReason).toBe("meeting_point_unavailable");
  });

  it("accepts the boundary just inside 150 m and excludes the value just outside", () => {
    const inside = candidate("boundary-inside", ...coordinatesAtMeters(MEETING_OPPORTUNITY_MAX_RADIUS_METERS - 0.2));
    const outside = candidate("boundary-outside", ...coordinatesAtMeters(MEETING_OPPORTUNITY_MAX_RADIUS_METERS + 0.2));
    const result = buildMeetingOpportunities({ meetingPoint, candidates: [inside, outside] });

    expect(result.opportunities.map(({ candidateId }) => candidateId)).toEqual(["boundary-inside"]);
    expect(result.opportunities[0]?.distanceMeters).toBeLessThanOrEqual(MEETING_OPPORTUNITY_MAX_RADIUS_METERS);
    expect(result.trace.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ candidateId: "boundary-outside", reason: "outside_radius" }),
    ]));
  });

  it("enforces the named radius policy, safety and main-stop exclusions", () => {
    const inside = candidate("inside", ...coordinatesAtMeters(MEETING_OPPORTUNITY_MAX_RADIUS_METERS - 1));
    const outside = candidate("outside", ...coordinatesAtMeters(MEETING_OPPORTUNITY_MAX_RADIUS_METERS + 1));
    const unknown = candidate("unknown", ...coordinatesAtMeters(20), { safetyStatus: "unknown" });
    const trained = candidate("trained", ...coordinatesAtMeters(25), { specializationReason: "trained_only" });
    const noPickup = candidate("no-pickup", ...coordinatesAtMeters(30), { specializationReason: "no_pickup" });
    const result = buildMeetingOpportunities({
      meetingPoint,
      candidates: [inside, outside, unknown, trained, noPickup],
      mainStopIds: new Set(["inside"]),
    });

    expect(result.opportunities).toEqual([]);
    expect(result.trace.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ candidateId: "inside", reason: "already_a_main_stop" }),
      expect.objectContaining({ candidateId: "outside", reason: "outside_radius" }),
      expect.objectContaining({ candidateId: "unknown", reason: "safety_or_accessibility_unknown" }),
      expect.objectContaining({ candidateId: "trained", reason: "trained_only" }),
      expect.objectContaining({ candidateId: "no-pickup", reason: "no_pickup" }),
    ]));
  });

  it("keeps observed and predicted provenance, bounds the result, and is deterministic", () => {
    const first = candidate("b-observed", ...coordinatesAtMeters(80), { score: 10 });
    const second = candidate("a-predicted", ...coordinatesAtMeters(85), { family: "predicted", score: 90 });
    const duplicate = candidate("z-duplicate", ...coordinatesAtMeters(90), { score: 10 });
    const otherCandidates = [
      candidate("c-observed", ...coordinatesAtMeters(90)),
      candidate("d-observed", ...coordinatesAtMeters(100)),
      candidate("e-observed", ...coordinatesAtMeters(110)),
    ];
    const forward = buildMeetingOpportunities({
      meetingPoint,
      candidates: [first, second, duplicate, ...otherCandidates],
    });
    const reversed = buildMeetingOpportunities({
      meetingPoint,
      candidates: [...otherCandidates.reverse(), duplicate, second, first],
    });

    expect(forward.opportunities).toHaveLength(MEETING_OPPORTUNITY_MAX_COUNT);
    expect(forward.opportunities).toEqual(reversed.opportunities);
    expect(forward.opportunities.map(({ provenance }) => provenance)).toEqual([
      "observed",
      "predicted",
      "observed",
    ]);
    expect(forward.trace.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ candidateId: "b-observed", reason: "selected_by_deterministic_rank" }),
      expect.objectContaining({ candidateId: "z-duplicate", reason: "duplicate_coordinate" }),
      expect.objectContaining({ candidateId: "e-observed", reason: "rank_limit" }),
    ]));
    expect(forward.opportunities.every(({ distanceMeters }) => distanceMeters <= MEETING_OPPORTUNITY_MAX_RADIUS_METERS)).toBe(true);
  });

  it("reuses an inadmissible planner evaluation without changing the route inputs", () => {
    const local = candidate("local", ...coordinatesAtMeters(40));
    const result = buildMeetingOpportunities({
      meetingPoint,
      candidates: [local],
      evaluations: [{ candidateId: "local", feasible: false }],
    });

    expect(result.opportunities).toEqual([]);
    expect(result.trace.entries[0]).toMatchObject({
      candidateId: "local",
      reason: "not_admissible",
    });
    expect(local.latitude).toBe(meetingPoint.coordinates[0]);
  });
});
