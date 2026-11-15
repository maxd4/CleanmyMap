import assert from "node:assert/strict";
import test from "node:test";

import {
  HISTORICAL_RECONSTRUCTION_TARGETS,
  buildHistoricalMultigroupAudit,
  buildHistoricalRouteAudit,
  fetchNetworkRoute,
  isHistoricalSyntheticRouteCandidate,
  pairwiseOverlap,
  resolveHistoricalEndpointStops,
  resolveHistoricalRouteStops,
  sharedCorridorDistanceKm,
  targetDistanceKm,
} from "./audit-historical-route-remediation.mjs";

const originalGeometry = JSON.stringify({
  type: "LineString",
  coordinates: [
    [2.35, 48.85],
    [2.351, 48.851],
    [2.36, 48.86],
  ],
});

function buildRow(overrides = {}) {
  return {
    id: "action-historical",
    action_date: "2026-04-22",
    status: "approved",
    action_phase: "post_action_complete",
    location_label: "Départ démontré → Arrivée démontrée",
    latitude: 48.851,
    longitude: 2.351,
    notes: "historical import",
    preparation_data: {},
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: originalGeometry,
    geometry_confidence: 0.58,
    geometry_source: "routed",
    ...overrides,
  };
}

test("recognizes only completed routed three-point drawings without observed evidence", () => {
  assert.equal(isHistoricalSyntheticRouteCandidate(buildRow()), true);
  assert.equal(isHistoricalSyntheticRouteCandidate(buildRow({ status: "draft" })), false);
  assert.equal(isHistoricalSyntheticRouteCandidate(buildRow({ action_phase: "pre_action" })), false);
  assert.equal(isHistoricalSyntheticRouteCandidate(buildRow({ geometry_source: "estimated_route" })), false);
  assert.equal(isHistoricalSyntheticRouteCandidate(buildRow({ preparation_data: { observedCoverage: { traceCount: 1 } } })), false);
});

test("uses demonstrated historical endpoints without treating the middle point as a street stop", () => {
  assert.deepEqual(resolveHistoricalRouteStops(buildRow()), {
    coordinates: [[48.85, 2.35], [48.86, 2.36]],
    reason: null,
  });
});

test("excludes the old synthetic midpoint from the multigroup audit request", () => {
  const result = resolveHistoricalEndpointStops(buildRow());
  assert.deepEqual(result.coordinates, [[48.85, 2.35], [48.86, 2.36]]);
  assert.deepEqual(result.ignoredMidpoint, [48.851, 2.351]);
  assert.equal(result.endpointSource, "original_persisted_geometry_endpoints");
});

test("builds the five-action multigroup dry-run with explicit hypothetical provenance", async () => {
  const rows = HISTORICAL_RECONSTRUCTION_TARGETS.map((target, index) => buildRow({
    id: target.id,
    action_date: `2026-04-${String(index + 10).padStart(2, "0")}`,
    location_label: `Départ ${index} → Arrivée ${index}`,
    latitude: 48.85 + index * 0.01,
    longitude: 2.35,
    volunteers_count: target.volunteers,
    duration_minutes: target.durationMinutes,
  }));
  const requests = [];
  const report = await buildHistoricalMultigroupAudit(rows, {
    sleep: false,
    routeFetcher: async (coordinates) => {
      requests.push(coordinates);
      return {
        candidate: {
          kind: "polyline",
          coordinates,
          geometrySource: "routed",
          provider: "fossgis-osrm",
          mode: "network",
          estimated: false,
          confidence: 0.78,
          distanceKm: 3,
          durationMinutes: 60,
          endpointDistances: [0, 0],
        },
        reason: null,
      };
    },
  });

  assert.equal(report.dryRun, true);
  assert.equal(report.writesApplied, 0);
  assert.equal(report.targetCount, 5);
  assert.equal(report.routeCount, report.reports.reduce((total, item) => total + item.groups.filter(({ coordinates }) => Array.isArray(coordinates)).length, 0));
  assert.equal(report.reports.length, 5);
  assert.deepEqual(report.reports.map(({ target }) => target.groupParticipantCounts), [
    [5, 5], [8, 7], [5, 5], [7, 7, 6], [5, 5],
  ]);
  assert.deepEqual(report.reports.map(({ metrics }) => metrics.targetDistancePerGroupKm), [1, 1.5, 1, 1.5, 1.5]);
  assert.equal(report.mapPreview.features.length, 11);
  assert.equal(report.reports.every(({ proposedUpdate }) => proposedUpdate === null), true);
  assert.equal(report.reports.every(({ provenance }) =>
    provenance.geometrySource === "estimated_route" &&
    provenance.provenance === "estimated" &&
    provenance.status === "hypothetical" &&
    provenance.providerNetworkResultsRemainHypothetical,
  ), true);
  assert.equal(report.reports.every(({ metrics }) => metrics.uniqueNetworkDistanceKm === null && metrics.observedDistanceKm === null), true);
  assert.deepEqual(report.persistenceCandidate.allowedActionIds, HISTORICAL_RECONSTRUCTION_TARGETS.map(({ id }) => id));
  assert.equal(report.persistenceCandidate.status, "NOT_APPLIED");
  assert.equal(report.persistenceCandidate.updates.every(({ observedDistanceKm }) => observedDistanceKm === null), true);
  assert.equal(requests.some((coordinates) => coordinates.length === 2), true);
  assert.equal(requests.every((coordinates) => !coordinates.some(([latitude, longitude]) => latitude === 48.851 && longitude === 2.351)), true);
  assert.equal(report.reports.every(({ metrics }) => metrics.speedKmPerHour === 1 && metrics.routeTargetDistancePolicyVersion === "route-distance-v3"), true);
});

test("derives v3 targets without changing the planner policy", () => {
  assert.equal(targetDistanceKm(60), 1);
  assert.equal(targetDistanceKm(90), 1.5);
});

test("measures shared route portions independently of vertex density", () => {
  const dense = { coordinates: [[48.85, 2.35], [48.855, 2.355], [48.86, 2.36]], distanceKm: 1.331 };
  const sparse = { coordinates: [[48.85, 2.35], [48.86, 2.36]], distanceKm: 1.331 };
  const crossing = { coordinates: [[48.85, 2.36], [48.86, 2.35]], distanceKm: 1.331 };
  const partial = { coordinates: [[48.855, 2.355], [48.865, 2.365]], distanceKm: 1.331 };

  assert.ok(sharedCorridorDistanceKm(dense.coordinates, sparse.coordinates) > 1.2);
  assert.ok(pairwiseOverlap(dense, sparse).ratio > 0.95);
  assert.equal(pairwiseOverlap(dense, crossing).ratio, 0);
  assert.ok(pairwiseOverlap(dense, partial).ratio > 0 && pairwiseOverlap(dense, partial).ratio < 1);
  for (const route of [sparse, crossing, partial]) {
    assert.ok(pairwiseOverlap(dense, route).ratio >= 0 && pairwiseOverlap(dense, route).ratio <= 1);
  }
});

test("stops the target audit when current participant or duration data drift", async () => {
  const target = HISTORICAL_RECONSTRUCTION_TARGETS[0];
  let called = false;
  const report = await buildHistoricalMultigroupAudit([buildRow({
    id: target.id,
    volunteers_count: 12,
    duration_minutes: 90,
  })], {
    sleep: false,
    routeFetcher: async () => {
      called = true;
      return { candidate: null, reason: "should_not_be_called" };
    },
  });

  assert.equal(called, false);
  assert.equal(report.reports[0].status, "NOT_CALCULATED");
  assert.ok(report.reports[0].reasons.includes("current_row_does_not_match_requested_target"));
});

test("returns a verified network candidate in a read-only audit", async () => {
  const report = await buildHistoricalRouteAudit([buildRow()], {
    sleep: false,
    routeFetcher: async () => ({
      candidate: {
        kind: "polyline",
        coordinates: [[48.85, 2.35], [48.855, 2.355], [48.86, 2.36]],
        geometrySource: "routed",
        provider: "fossgis-osrm",
        mode: "network",
        estimated: false,
        confidence: 0.78,
        distanceKm: 1.6,
        durationMinutes: 20,
        endpointDistances: [0, 0],
      },
      reason: null,
    }),
  });

  assert.equal(report.dryRun, true);
  assert.equal(report.writesApplied, 0);
  assert.equal(report.reports[0].status, "NETWORK_CANDIDATE_NOT_APPLIED");
  assert.equal(report.reports[0].proposedUpdate.geometry_source, "routed");
  assert.deepEqual(JSON.parse(report.reports[0].proposedUpdate.preparation_data), {
    routeGeometryMode: "network",
    routeGeometryProvider: "fossgis-osrm",
    routeNetworkDistanceKm: 1.6,
  });
  assert.equal(report.reports[0].candidateGeometry.estimated, false);
  assert.deepEqual(report.reports[0].originalGeometry.coordinates, [
    [48.85, 2.35],
    [48.851, 2.351],
    [48.86, 2.36],
  ]);
});

test("rejects provider failure without producing a fallback success or write", async () => {
  const report = await buildHistoricalRouteAudit([buildRow()], {
    sleep: false,
    routeFetcher: async () => ({ candidate: null, reason: "provider_timeout" }),
  });

  assert.equal(report.writesApplied, 0);
  assert.equal(report.reports[0].status, "REJECTED_NO_NETWORK_CANDIDATE");
  assert.equal(report.reports[0].candidateGeometry, null);
  assert.equal(report.reports[0].proposedUpdate, null);
  assert.ok(report.reports[0].reasons.includes("provider_timeout"));
});

test("accepts only a measured network response from FOSSGIS", async () => {
  const response = await fetchNetworkRoute(
    [[48.85, 2.35], [48.86, 2.36]],
    async () => new Response(JSON.stringify({
      code: "Ok",
      routes: [{
        distance: 1600,
        duration: 1200,
        geometry: {
          coordinates: [[2.35, 48.85], [2.355, 48.855], [2.36, 48.86]],
        },
      }],
    }), { status: 200 }),
  );

  assert.equal(response.reason, null);
  assert.equal(response.candidate.geometrySource, "routed");
  assert.equal(response.candidate.provider, "fossgis-osrm");
  assert.equal(response.candidate.mode, "network");
  assert.equal(response.candidate.estimated, false);

  const invalid = await fetchNetworkRoute(
    [[48.85, 2.35], [48.86, 2.36]],
    async () => new Response(JSON.stringify({ code: "NoRoute", routes: [] }), { status: 200 }),
  );
  assert.equal(invalid.candidate, null);
  assert.equal(invalid.reason, "provider_invalid_response");
});
