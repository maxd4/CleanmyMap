import { describe, expect, it } from "vitest";
import {
  buildProvenStreetCleaningCorridor,
  buildStreetCleaningStreetPassesFromGeometry,
  buildUnknownStreetCleaningCorridor,
  buildUnknownStreetCleaningCorridorHandoff,
  planOperationalStreetCorridors,
  reverseStreetCleaningCorridorOrientation,
  type StreetCleaningCrossing,
} from "./street-cleaning-corridor";

const referenceSegment = {
  id: "way-42",
  label: "Rue du Test",
  geometry: [[48.85, 2.35], [48.851, 2.351]] as [number, number][],
};
const orientation = {
  from: [48.85, 2.35] as [number, number],
  to: [48.851, 2.351] as [number, number],
  bearingDegrees: 45,
};

function provenInput(side: "left" | "right") {
  return {
    referenceSegment,
    referenceOrientation: orientation,
    lengthMeters: 100,
    geometry: [[48.85, 2.3501], [48.851, 2.3511]],
    source: {
      id: "audited-sidewalk-v1",
      publisher: "source-test",
      dataset: "sidewalk geometry",
      datasetVersion: "2026-09-17",
      url: null,
      evidenceType: "sidewalk_geometry",
    },
    confidence: { score: 0.9, level: "high" },
    proof: {
      type: "sidewalk_geometry",
      side,
      evidenceIds: [`${side}-evidence`],
      note: "Géométrie latérale auditée.",
    },
  } as const;
}

function provenSide(side: "left" | "right") {
  return buildProvenStreetCleaningCorridor(provenInput(side));
}

describe("street cleaning corridor contract", () => {
  it("represents two genuinely proven sides without deriving them from a route line", () => {
    const left = provenSide("left");
    const right = provenSide("right");

    expect(left.side).toBe("left");
    expect(right.side).toBe("right");
    expect(left.referenceOrientation).toEqual(orientation);
    expect(left.geometry).toEqual([[48.85, 2.3501], [48.851, 2.3511]]);
    expect(left.geometry).not.toEqual(referenceSegment.geometry);
  });

  it("swaps left/right when the explicit reference orientation is inverted", () => {
    const inverted = reverseStreetCleaningCorridorOrientation(provenSide("left"));

    expect(inverted.side).toBe("right");
    expect(inverted.referenceOrientation).toEqual({
      from: orientation.to,
      to: orientation.from,
      bearingDegrees: 225,
    });
    expect(inverted.referenceSegment?.geometry).toEqual([...referenceSegment.geometry].reverse());
  });

  it("accepts a single corridor only with explicit single-corridor proof", () => {
    const single = buildProvenStreetCleaningCorridor({
      referenceSegment,
      referenceOrientation: orientation,
      lengthMeters: 70,
      geometry: [[48.85, 2.3502], [48.851, 2.3512]],
      source: {
        id: "median-survey-v1",
        publisher: "source-test",
        dataset: "terre-plein corridor survey",
        datasetVersion: "2026-09-17",
        url: null,
        evidenceType: "single_corridor_geometry",
      },
      confidence: { score: 0.8, level: "high" },
      proof: {
        type: "single_corridor_geometry",
        evidenceIds: ["median-evidence"],
        note: "Un seul corridor nettoyable est prouvé malgré le terre-plein.",
      },
    });

    expect(single.side).toBe("single");
    expect(single.provenance.status).toBe("proven");
  });

  it("records a proven same-side crossing and rejects side changes", () => {
    const crossing: StreetCleaningCrossing = {
      location: [48.8505, 2.3505],
      purpose: "same_side_continuation",
      safeCrossing: "proven",
      sourceId: "crossing-evidence",
    };
    const corridor = buildProvenStreetCleaningCorridor({
      ...provenInput("left"),
      proof: {
        type: "sidewalk_geometry",
        side: "left",
        evidenceIds: ["left-evidence"],
        note: "Géométrie latérale auditée.",
      },
      safeCrossings: [crossing],
    });

    expect(corridor.safeCrossingsStatus).toBe("proven");
    expect(corridor.safeCrossings).toEqual([crossing]);
    expect(() =>
      buildProvenStreetCleaningCorridor({
        ...provenInput("left"),
        proof: {
          type: "sidewalk_geometry",
          side: "left",
          evidenceIds: ["left-evidence"],
          note: "Géométrie latérale auditée.",
        },
        safeCrossings: [{
          ...crossing,
          purpose: "side_change",
        }],
      }),
    ).toThrow(/même côté/);
  });

  it("uses unknown for a small street or any insufficient proof", () => {
    const unknown = buildUnknownStreetCleaningCorridor("Petite rue sans preuve latérale.");
    const handoff = buildUnknownStreetCleaningCorridorHandoff();

    expect(unknown.side).toBe("unknown");
    expect(unknown.referenceOrientation).toBeNull();
    expect(unknown.safeCrossingsStatus).toBe("unknown");
    expect(handoff).toMatchObject({
      status: "unknown",
      sourceStatus: "unavailable",
      fallback: "unknown",
      corridors: [],
    });
  });

  it("does not create an artificial offset geometry", () => {
    const sourceGeometry = [[48.85, 2.3501], [48.851, 2.3511]] as [number, number][];
    const corridor = buildProvenStreetCleaningCorridor({
      ...provenInput("right"),
      geometry: sourceGeometry,
      proof: {
        type: "sidewalk_geometry",
        side: "right",
        evidenceIds: ["right-evidence"],
        note: "Géométrie latérale auditée.",
      },
    });

    expect(corridor.geometry).toEqual(sourceGeometry);
    expect(corridor.geometry).not.toEqual(
      sourceGeometry.map(([latitude, longitude]) => [latitude + 0.0001, longitude]),
    );
  });

  it("uses corridor A outbound and B on the return without counting cleaning overlap", () => {
    const plan = planOperationalStreetCorridors({
      passes: [
        {
          routeId: "loop",
          routeOrder: 0,
          passOrder: 1,
          streetKey: "boulevard test",
          label: "Boulevard Test",
          lengthMeters: 700,
          direction: "outbound",
        },
        {
          routeId: "loop",
          routeOrder: 0,
          passOrder: 2,
          streetKey: "boulevard test",
          label: "Boulevard Test",
          lengthMeters: 680,
          direction: "return",
        },
      ],
    });

    expect(plan.assignments.map(({ corridorId }) => corridorId)).toEqual(["A", "B"]);
    expect(plan.assignments.map(({ lengthMeters }) => lengthMeters)).toEqual([700, 680]);
    expect(plan.networkOverlap).toBe(1);
    expect(plan.cleaningCoverageOverlap).toBe(0);
    expect(plan.assignments.every(({ geographicSide, basis }) =>
      geographicSide === "unknown" && basis === "default_two_corridors",
    )).toBe(true);
  });

  it("assigns opposite operational corridors to two groups and keeps one pollution signal", () => {
    const pollution = {
      wasteRisk: 72,
      cigaretteButtRisk: 41,
      workload: null,
      durationMinutes: null,
    };
    const plan = planOperationalStreetCorridors({
      passes: [
        {
          routeId: "group-1",
          routeOrder: 0,
          passOrder: 1,
          streetKey: "rue commune",
          label: "Rue Commune",
          lengthMeters: 500,
          direction: "outbound",
          pollution,
        },
        {
          routeId: "group-2",
          routeOrder: 1,
          passOrder: 1,
          streetKey: "rue commune",
          label: "Rue Commune",
          lengthMeters: 510,
          direction: "outbound",
          pollution,
        },
      ],
    });

    expect(plan.assignments.map(({ corridorId }) => corridorId)).toEqual(["A", "B"]);
    expect(plan.networkOverlap).toBe(1);
    expect(plan.cleaningCoverageOverlap).toBe(0);
    expect(plan.assignments.map(({ pollution: signal }) => signal)).toEqual([pollution, pollution]);
  });

  it("counts a single-corridor exception as cleaning overlap", () => {
    const plan = planOperationalStreetCorridors({
      passes: [
        {
          routeId: "group-1",
          routeOrder: 0,
          passOrder: 1,
          streetKey: "quai unique",
          label: "Quai Unique",
          lengthMeters: 300,
          direction: "outbound",
        },
        {
          routeId: "group-2",
          routeOrder: 1,
          passOrder: 1,
          streetKey: "quai unique",
          label: "Quai Unique",
          lengthMeters: 300,
          direction: "outbound",
        },
      ],
      exceptions: {
        "quai unique": {
          corridorCount: 1,
          sourceId: "audited-median-v1",
          sourceVersion: "2026-09-17",
          note: "Un seul corridor prouvé.",
        },
      },
    });

    expect(plan.streets[0]).toMatchObject({
      corridorCount: 1,
      basis: "documented_exception",
    });
    expect(plan.assignments.map(({ corridorId }) => corridorId)).toEqual(["A", "A"]);
    expect(plan.cleaningCoverageOverlap).toBe(1);
  });

  it("does not force a dangerous crossing to reach the second corridor", () => {
    const plan = planOperationalStreetCorridors({
      passes: [
        {
          routeId: "loop",
          routeOrder: 0,
          passOrder: 1,
          streetKey: "avenue dangereuse",
          label: "Avenue Dangereuse",
          lengthMeters: 400,
          direction: "outbound",
        },
        {
          routeId: "loop",
          routeOrder: 0,
          passOrder: 2,
          streetKey: "avenue dangereuse",
          label: "Avenue Dangereuse",
          lengthMeters: 400,
          direction: "return",
          requiresCrossing: true,
          crossingStatus: "dangerous",
        },
      ],
    });

    expect(plan.assignments.map(({ corridorId }) => corridorId)).toEqual(["A", "A"]);
    expect(plan.assignments[1]).toMatchObject({
      crossingBlocked: true,
      crossingStatus: "dangerous",
    });
    expect(plan.cleaningCoverageOverlap).toBe(1);
  });

  it("keeps fallback geometry out of the operational corridor assignment", () => {
    const passes = buildStreetCleaningStreetPassesFromGeometry({
      routeId: "fallback",
      routeOrder: 0,
      routeGeometry: {
        mode: "fallback",
        legs: [{ distanceKm: 1, steps: [{ name: "Rue ignorée", distanceKm: 1 }] }],
      },
    });

    expect(passes).toEqual([]);
  });
});
