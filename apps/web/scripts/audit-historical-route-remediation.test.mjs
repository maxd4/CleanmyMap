import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHistoricalRouteAudit,
  fetchNetworkRoute,
  isHistoricalSyntheticRouteCandidate,
  resolveHistoricalRouteStops,
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
