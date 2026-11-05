import { describe, expect, it } from "vitest";
import type { PedestrianRiskProjectionSnapshot } from "@/lib/geo/pedestrian-risk-projection";
import type { RoutePlannerCandidate } from "./route-planner";
import {
  buildRoutePollutionPotential,
  buildRoutePollutionReferenceCatalog,
  isRoutePollutionPotential,
  ROUTE_POLLUTION_REFERENCE_COMPARISON_METHOD_VERSION,
  selectRoutePollutionReference,
  type RouteHistoricalPollutionReferenceInput,
} from "./route-pollution-potential";
import { evaluateRoutePollutionRelevance } from "./route-pollution-relevance";

function projection(overrides: {
  missingCigaretteButts?: boolean;
} = {}): PedestrianRiskProjectionSnapshot {
  const values = [
    ["s-1", 100, 20, 80],
    ["s-2", 300, 80, 40],
    ["s-3", 200, 100, 100],
    ["s-4", 200, 100, 100],
  ] as const;
  return {
    schemaVersion: "paris-pedestrian-risk-projection-v1",
    projectionKey: "paris-pantheon-jardin-des-plantes",
    policyVersion: "segment-zonal-neutral-v1",
    projectionVersionId: "projection-potential-test",
    networkVersionId: "network-potential-test",
    generatedAt: "2026-11-04T10:00:00.000Z",
    sourceVersions: {
      networkKey: "pilot",
      networkImporterVersion: "importer-v1",
      networkSourceSha256: "a".repeat(64),
      networkSourceRetrievedAt: "2026-11-04T09:00:00.000Z",
      pressureSnapshotId: "pressure-1",
      pressureSchemaVersion: "paris-pressure-v1",
      pressureGeneratedAt: "2026-11-04T08:00:00.000Z",
      pressureRefreshedAt: "2026-11-04T08:30:00.000Z",
      riskModelVersion: "paris-pressure-risk-v3-urban-morphology",
      serviceabilitySnapshotId: null,
      serviceabilitySchemaVersion: null,
      serviceabilityModelVersion: null,
      serviceabilityGeneratedAt: null,
      serviceabilityRefreshedAt: null,
    },
    counts: { sourceEdges: 4, projectedSegments: 4, predictedSegments: 4, unavailableSegments: 0, zonesIntersected: 4 },
    segments: values.map(([id, lengthM, wasteRisk, cigaretteButtRisk], index) => ({
      projectionSegmentId: id,
      edgeKey: `edge-${id}`,
      osmWayId: `way-${id}`,
      segmentIndex: index,
      direction: "forward" as const,
      fromNodeId: `node-${index}`,
      toNodeId: `node-${index + 1}`,
      lengthM,
      intersectionLengthM: lengthM,
      coordinates: [[48.85 + index * 0.001, 2.35], [48.851 + index * 0.001, 2.35]] as [[number, number], [number, number]],
      midpoint: [48.8505 + index * 0.001, 2.35],
      zoneId: `iris-${id}`,
      intersectedZoneIds: [`iris-${id}`],
      effectiveResolution: "iris" as const,
      riskStatus: "predicted" as const,
      wasteRisk,
      cigaretteButtRisk: overrides.missingCigaretteButts ? null : cigaretteButtRisk,
      mixedRisk: overrides.missingCigaretteButts ? null : (wasteRisk + cigaretteButtRisk) / 2,
      wasteConfidence: {} as never,
      cigaretteButtConfidence: overrides.missingCigaretteButts ? null : {} as never,
      wasteFactors: null,
      cigaretteButtFactors: null,
      availableFactors: { waste: ["test"], cigaretteButts: ["test"] },
      missingFactors: { waste: [], cigaretteButts: [] },
      serviceability: null,
      sourceVersions: {} as PedestrianRiskProjectionSnapshot["sourceVersions"],
      provenance: [],
      notes: [],
    })),
  };
}

function candidate(id: string, segmentId: string): RoutePlannerCandidate {
  return {
    family: "predicted",
    id,
    label: id,
    latitude: 48.85,
    longitude: 2.35,
    score: 50,
    reason: "test",
    evidence: { family: "predicted", segmentId } as RoutePlannerCandidate["evidence"],
  } as RoutePlannerCandidate;
}

function catalog(
  inputProjection = projection(),
  historicalReferences: readonly RouteHistoricalPollutionReferenceInput[] = [],
  geometryOverrides?: { coordinates: Array<[number, number]>; edgeKeys: string[] },
) {
  return buildRoutePollutionReferenceCatalog({
    projection: inputProjection,
    historicalReferences,
    theoreticalReferences: (["balanced", "waste", "cigarette_butts"] as const).map((pickupPreference) => ({
      id: `theoretical-strong-${pickupPreference}`,
      label: `Référence théorique forte ${pickupPreference}`,
      comparison: {
        pickupPreference,
        routeTopology: "loop" as const,
        travelBudgetMinutes: 60,
        usefulCollectionLengthM: 400,
      },
      geometry: {
        coordinates: geometryOverrides?.coordinates ?? [[48.852, 2.35], [48.853, 2.35], [48.853, 2.35], [48.854, 2.35]],
        edgeKeys: geometryOverrides?.edgeKeys ?? ["edge-s-3", "edge-s-4"],
        source: "planner_snapshot" as const,
        mode: "network" as const,
      },
      collectionSegmentIds: ["s-3", "s-4"],
      provenance: ["offline-network-reference:test"],
    })),
    generatedAt: "2026-11-04T11:00:00.000Z",
  });
}

function routeInput(overrides: Partial<Parameters<typeof buildRoutePollutionPotential>[0]> = {}) {
  return {
    projection: projection(),
    candidates: [candidate("candidate-1", "s-1"), candidate("candidate-2", "s-2")],
    groups: [
      { groupIndex: 1, candidateIds: ["candidate-1", "observed"], volunteerCount: 5, travelBudgetMinutes: 60 },
      { groupIndex: 2, candidateIds: ["candidate-1", "candidate-2"], volunteerCount: 5, travelBudgetMinutes: 60 },
    ],
    pickupPreference: "balanced" as const,
    routeTopology: "loop" as const,
    travelBudgetMinutes: 60,
    usefulCollectionLengthM: 400,
    referenceCatalog: catalog(),
    ...overrides,
  };
}

describe("route theoretical pollution potential", () => {
  it("weights unique collection segments by length and excludes repeated candidates", () => {
    const potential = buildRoutePollutionPotential(routeInput());

    expect(potential.global.categories.waste.rawProjectionIndex).toBe(65);
    expect(potential.global.categories.cigaretteButts.rawProjectionIndex).toBe(50);
    expect(potential.global.categories.mixed.rawProjectionIndex).toBe(57.5);
    expect(potential.global.value).toBe(57.5);
    expect(potential.coverage.uniqueSegmentCount).toBe(2);
    expect(potential.coverage.collectionLengthM).toBe(400);
    expect(potential.groups[1]?.index.uniqueSegmentCount).toBe(2);
  });

  it("keeps distinct IRIS portions on one OSM edge separate in coverage and risk weighting", () => {
    const current = projection();
    current.segments[0] = {
      ...current.segments[0]!,
      projectionSegmentId: "iris-west",
      edgeKey: "osm-edge-shared",
      lengthM: 100,
      intersectionLengthM: 100,
      wasteRisk: 20,
      cigaretteButtRisk: 40,
      mixedRisk: 30,
    };
    current.segments[1] = {
      ...current.segments[1]!,
      projectionSegmentId: "iris-east",
      edgeKey: "osm-edge-shared",
      lengthM: 300,
      intersectionLengthM: 300,
      wasteRisk: 80,
      cigaretteButtRisk: 100,
      mixedRisk: 90,
    };
    const potential = buildRoutePollutionPotential(routeInput({
      projection: current,
      candidates: [candidate("west", "iris-west"), candidate("east", "iris-east")],
      groups: [{ groupIndex: 1, candidateIds: ["west", "east"], volunteerCount: 5, travelBudgetMinutes: 60 }],
      referenceCatalog: null,
    }));

    expect(potential.coverage.uniqueSegmentCount).toBe(2);
    expect(potential.coverage.collectionLengthM).toBe(400);
    expect(potential.global.categories.waste.rawProjectionIndex).toBe(65);
    expect(potential.global.categories.cigaretteButts.rawProjectionIndex).toBe(85);
  });

  it("averages the two normalized category indices for mixed", () => {
    const referenceCatalog = catalog();
    const reference = referenceCatalog.references[0];
    if (!reference) throw new Error("test reference missing");
    reference.rawProjectionIndex = { waste: 100, cigaretteButts: 50, mixed: 75 };

    const potential = buildRoutePollutionPotential(routeInput({ referenceCatalog }));

    expect(potential.global.categories.waste.value).toBe(65);
    expect(potential.global.categories.cigaretteButts.value).toBe(100);
    expect(potential.global.categories.mixed.value).toBe(82.5);
  });

  it.each([
    ["waste", "waste"],
    ["cigarette_butts", "cigaretteButts"],
    ["balanced", "mixed"],
  ] as const)("selects the requested category for %s", (pickupPreference, selectedCategory) => {
    const potential = buildRoutePollutionPotential(routeInput({ pickupPreference }));

    expect(potential.status).toBe("available");
    expect(potential.selectedCategory).toBe(selectedCategory);
    expect(potential.value).toBe(potential.global.categories[selectedCategory].value);
    expect(potential.global.value).toBe(potential.value);
    expect(potential.groups.every((group) => group.index.value === group.index.categories[selectedCategory].value)).toBe(true);
    expect(potential.reference?.comparison.pickupPreference).toBe(pickupPreference);
  });

  it("classe les références selon la préférence demandée, pas selon la moyenne globale", () => {
    const current = projection();
    current.segments[0] = { ...current.segments[0]!, wasteRisk: 100, cigaretteButtRisk: 20 };
    current.segments[1] = { ...current.segments[1]!, wasteRisk: 80, cigaretteButtRisk: 10 };
    current.segments[2] = { ...current.segments[2]!, wasteRisk: 20, cigaretteButtRisk: 100 };
    current.segments[3] = { ...current.segments[3]!, wasteRisk: 20, cigaretteButtRisk: 100 };
    const references = buildRoutePollutionReferenceCatalog({
      projection: current,
      theoreticalReferences: [
        {
          id: "waste-strong",
          label: "Waste strong",
          comparison: { pickupPreference: "waste", routeTopology: "loop", travelBudgetMinutes: 60, usefulCollectionLengthM: 400 },
          geometry: { coordinates: [[48.85, 2.35], [48.851, 2.35], [48.851, 2.35], [48.852, 2.35]], edgeKeys: ["edge-s-1", "edge-s-2"], source: "planner_snapshot", mode: "network" },
          collectionSegmentIds: ["s-1", "s-2"],
          provenance: ["test"],
        },
        {
          id: "waste-weak",
          label: "Waste weak",
          comparison: { pickupPreference: "waste", routeTopology: "loop", travelBudgetMinutes: 60, usefulCollectionLengthM: 400 },
          geometry: { coordinates: [[48.852, 2.35], [48.853, 2.35], [48.853, 2.35], [48.854, 2.35]], edgeKeys: ["edge-s-3", "edge-s-4"], source: "planner_snapshot", mode: "network" },
          collectionSegmentIds: ["s-3", "s-4"],
          provenance: ["test"],
        },
      ],
      generatedAt: "2026-11-04T11:00:00.000Z",
    });

    expect(selectRoutePollutionReference(references, {
      pickupPreference: "waste",
      routeTopology: "loop",
      travelBudgetMinutes: 60,
      usefulCollectionLengthM: 400,
    })?.id).toBe("waste-strong");
  });

  it("propagate la confiance de la catégorie sélectionnée", () => {
    const current = projection();
    for (const segment of current.segments) {
      segment.wasteConfidence = null;
      segment.cigaretteButtConfidence = { level: "high", score: 0.9 } as never;
    }
    const waste = buildRoutePollutionPotential(routeInput({ projection: current, pickupPreference: "waste", referenceCatalog: catalog(current) }));
    const cigaretteButts = buildRoutePollutionPotential(routeInput({ projection: current, pickupPreference: "cigarette_butts", referenceCatalog: catalog(current) }));

    expect(waste.confidence).toMatchObject({ level: "unknown", score: null, source: "unavailable" });
    expect(cigaretteButts.confidence).toMatchObject({ level: "high", score: 0.9, source: "segment_projection" });
    expect(waste.groups[0]?.index.confidence.level).toBe("unknown");
    const relevance = evaluateRoutePollutionRelevance(waste);
    expect(relevance.status).toBe("unavailable");
    expect(relevance.reason).toBe("confidence_unknown");
    expect(relevance.groups[0]?.reason).toBe("confidence_unknown");
  });

  it("refuse une référence dont la géométrie ou la longueur ne prouvent pas les segments déclarés", () => {
    const current = projection();
    const invalid = buildRoutePollutionReferenceCatalog({
      projection: current,
      historicalReferences: [{
        id: "invalid-reference",
        label: "Invalid",
        historicalScore: 100,
        comparison: { pickupPreference: "balanced", routeTopology: "loop", travelBudgetMinutes: 60, usefulCollectionLengthM: 900 },
        geometry: { coordinates: [[1, 1], [1.1, 1.1]], edgeKeys: ["edge-s-3", "edge-s-4"], source: "planner_snapshot", mode: "network" },
        collectionSegmentIds: ["s-3", "s-4"],
        measurements: {
          waste: { value: 90, methodVersion: ROUTE_POLLUTION_REFERENCE_COMPARISON_METHOD_VERSION, provenance: "test" },
          cigaretteButts: { value: 90, methodVersion: ROUTE_POLLUTION_REFERENCE_COMPARISON_METHOD_VERSION, provenance: "test" },
        },
        provenance: ["test"],
      }],
      theoreticalReferences: [],
      generatedAt: "2026-11-04T11:00:00.000Z",
    });

    expect(invalid.diagnostics.historicalAdmitted).toBe(0);
    expect(invalid.diagnostics.historicalExcluded[0]?.reason).toBe("collection_geometry_not_mapped_to_network");
  });

  it("refuse les snapshots persistés incomplets ou contradictoires", () => {
    const potential = buildRoutePollutionPotential(routeInput());
    expect(isRoutePollutionPotential(potential)).toBe(true);
    expect(() => isRoutePollutionPotential(undefined)).not.toThrow();
    expect(isRoutePollutionPotential({ ...potential, coverage: undefined })).toBe(false);
    expect(isRoutePollutionPotential({ ...potential, groups: [null] })).toBe(false);
    expect(isRoutePollutionPotential({ ...potential, value: 12 })).toBe(false);
    expect(isRoutePollutionPotential({ ...potential, status: "unavailable" })).toBe(false);
    expect(isRoutePollutionPotential({ ...potential, coverage: { ...potential.coverage, coveredLengthM: 1 } })).toBe(false);
    expect(isRoutePollutionPotential({ ...potential, global: { ...potential.global, confidence: { level: "high", score: 1, source: "segment_projection" } } })).toBe(false);
    expect(isRoutePollutionPotential({ ...potential, global: { ...potential.global, categories: { waste: {} } } })).toBe(false);
    expect(isRoutePollutionPotential({ ...potential, confidence: { level: "high", score: null, source: "segment_projection" } })).toBe(false);
    expect(isRoutePollutionPotential({ ...potential, reference: { ...potential.reference!, comparison: {} } })).toBe(false);
  });

  it.each([
    [0.4996, 0.5, "medium"],
    [0.5, 0.5, "medium"],
    [0.5004, 0.5, "medium"],
    [0.7496, 0.75, "high"],
    [0.75, 0.75, "high"],
    [0.7504, 0.75, "high"],
  ] as const)("normalise la confiance %s avant son niveau", (rawScore, normalizedScore, level) => {
    const current = projection();
    for (const segment of current.segments) {
      segment.wasteConfidence = { level: "low", score: rawScore } as never;
      segment.cigaretteButtConfidence = { level: "low", score: rawScore } as never;
    }
    const potential = buildRoutePollutionPotential(routeInput({ projection: current, referenceCatalog: catalog(current) }));

    expect(potential.global.confidence).toMatchObject({ level, score: normalizedScore, source: "segment_projection" });
    expect(isRoutePollutionPotential(potential)).toBe(true);
  });

  it("refuse les références dont les sommets ou les arêtes ne prouvent pas un parcours dirigé", () => {
    const dispersed = catalog(projection(), [], {
      coordinates: [[48.852, 2.35], [48.854, 2.35], [48.852, 2.35], [48.854, 2.35]],
      edgeKeys: ["edge-s-3", "edge-s-4"],
    });
    const reverse = catalog(projection(), [], {
      coordinates: [[48.853, 2.35], [48.854, 2.35], [48.852, 2.35], [48.853, 2.35]],
      edgeKeys: ["edge-s-4", "edge-s-3"],
    });
    const fictitious = catalog(projection(), [], {
      coordinates: [[48.852, 2.35], [48.853, 2.35], [48.853, 2.35], [48.854, 2.35]],
      edgeKeys: ["edge-s-3", "fake-edge", "edge-s-4"],
    });
    expect(dispersed.references).toHaveLength(0);
    expect(reverse.references).toHaveLength(0);
    expect(fictitious.references).toHaveLength(0);
  });

  it("marks a missing category explicitly while averaging the available category for mixed", () => {
    const current = projection({ missingCigaretteButts: true });
    for (const segment of current.segments) {
      segment.wasteConfidence = { level: "high", score: 0.8 } as never;
    }
    const potential = buildRoutePollutionPotential(routeInput({ projection: current, referenceCatalog: catalog(current) }));

    expect(potential.global.categories.waste.value).toBe(65);
    expect(potential.global.categories.cigaretteButts.value).toBeNull();
    expect(potential.global.categories.mixed.status).toBe("partial");
    expect(potential.global.categories.mixed.confidence.source).toBe("segment_projection");
    expect(potential.global.missingCategories).toContain("cigaretteButts");
    expect(potential.global.categories.mixed.missingReasons).toContain("cigarette_butts_category_missing");
  });

  it("prefers a homogeneous score-100 historical reference without converting its measurements", () => {
    const historical: RouteHistoricalPollutionReferenceInput = {
      id: "action-100",
      label: "Action historique homogène",
      historicalScore: 100,
      comparison: {
        pickupPreference: "balanced" as const,
        routeTopology: "loop" as const,
        travelBudgetMinutes: 60,
        usefulCollectionLengthM: 400,
      },
      geometry: {
        coordinates: [[48.852, 2.35], [48.853, 2.35], [48.853, 2.35], [48.854, 2.35]],
        edgeKeys: ["edge-s-3", "edge-s-4"],
        source: "planner_snapshot" as const,
        mode: "network" as const,
      },
      collectionSegmentIds: ["s-3", "s-4"],
      measurements: {
        waste: { value: 99, methodVersion: ROUTE_POLLUTION_REFERENCE_COMPARISON_METHOD_VERSION, provenance: "measured" },
        cigaretteButts: { value: 777, methodVersion: ROUTE_POLLUTION_REFERENCE_COMPARISON_METHOD_VERSION, provenance: "counted" },
      },
      provenance: ["action:action-100"],
    };
    const references = catalog(projection(), [historical]);
    const selected = selectRoutePollutionReference(references, {
      pickupPreference: "balanced",
      routeTopology: "loop",
      travelBudgetMinutes: 60,
      usefulCollectionLengthM: 400,
    });

    expect(selected?.kind).toBe("historical_action_score_100");
    expect(selected?.rawProjectionIndex).toMatchObject({ waste: 100, cigaretteButts: 100, mixed: 100 });
    expect(selected?.limitations[0]).toContain("n'est pas converti");
  });

  it("rejects a score-100 historical reference with a non-homogeneous method and keeps theoretical fallback", () => {
    const references = catalog(projection(), [{
      id: "action-incompatible",
      label: "Action incompatible",
      historicalScore: 100,
      comparison: { pickupPreference: "balanced", routeTopology: "loop", travelBudgetMinutes: 60, usefulCollectionLengthM: 400 },
      geometry: { coordinates: [[48.852, 2.35], [48.853, 2.35], [48.853, 2.35], [48.854, 2.35]], edgeKeys: ["edge-s-3", "edge-s-4"], source: "planner_snapshot", mode: "network" },
      collectionSegmentIds: ["s-3", "s-4"],
      measurements: {
        waste: { value: 99, methodVersion: "legacy-unknown", provenance: "unknown" },
        cigaretteButts: { value: 777, methodVersion: "legacy-unknown", provenance: "unknown" },
      },
      provenance: ["action:action-incompatible"],
    } as RouteHistoricalPollutionReferenceInput]);

    expect(references.diagnostics.historicalAdmitted).toBe(0);
    expect(references.diagnostics.historicalExcluded[0]?.reason).toBe("measurement_method_not_homogeneous");
    expect(selectRoutePollutionReference(references, {
      pickupPreference: "balanced",
      routeTopology: "loop",
      travelBudgetMinutes: 60,
      usefulCollectionLengthM: 400,
    })?.kind).toBe("theoretical_network");
  });

  it("returns an explicit unavailable status when no offline reference catalog exists", () => {
    const potential = buildRoutePollutionPotential(routeInput({ referenceCatalog: null }));

    expect(potential.status).toBe("unavailable");
    expect(potential.value).toBeNull();
    expect(potential.reference).toBeNull();
    expect(potential.limitations).toContain("Catalogue de références pré-calculé absent.");
  });

  it("rejects a catalog generated from another projection snapshot", () => {
    const incompatibleCatalog = catalog();
    incompatibleCatalog.projection.projectionVersionId = "another-projection";

    const potential = buildRoutePollutionPotential(routeInput({ referenceCatalog: incompatibleCatalog }));

    expect(potential.status).toBe("unavailable");
    expect(potential.reference).toBeNull();
    expect(potential.limitations).toContain("Catalogue de références incompatible avec le snapshot de projection.");
  });
});
