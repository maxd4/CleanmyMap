import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const FOSSGIS_BASE_URL = "https://routing.openstreetmap.de/routed-foot";
const FOSSGIS_PROVIDER = "fossgis-osrm";
const FOSSGIS_TIMEOUT_MS = 5_000;
const FOSSGIS_MIN_INTERVAL_MS = 1_000;
const FOSSGIS_USER_AGENT = "CleanMyMap historical route audit (https://cleanmymap.fr/sections/route)";
const ROUTED_CONFIDENCE = 0.78;
const SYNTHETIC_ROUTE_POINT_COUNT = 3;
const MAX_ENDPOINT_DISTANCE_KM = 0.25;
const HYPOTHETICAL_WALKING_SPEED_KM_PER_HOUR = 3;
const MAX_HYPOTHESES_PER_GROUP = 8;
const OVERLAP_CORRIDOR_KM = 0.05;

export const HISTORICAL_RECONSTRUCTION_TARGETS = Object.freeze([
  Object.freeze({ id: "da367653-530f-4554-9e9b-164519336f52", volunteers: 10, durationMinutes: 60 }),
  Object.freeze({ id: "b1f71234-21e2-4954-8526-f45f238249ae", volunteers: 15, durationMinutes: 90 }),
  Object.freeze({ id: "f92499c2-aa14-4a51-8b56-c835a7d436f6", volunteers: 10, durationMinutes: 60 }),
  Object.freeze({ id: "e168fb7a-034c-4b22-9b5f-b138188bf1e2", volunteers: 20, durationMinutes: 90 }),
  Object.freeze({ id: "15ee0be8-3747-48c8-9de0-c12b40e79eb9", volunteers: 10, durationMinutes: 90 }),
]);

export const HISTORICAL_ACTION_SELECT = [
  "id",
  "action_date",
  "status",
  "action_phase",
  "location_label",
  "latitude",
  "longitude",
  "notes",
  "preparation_data",
  "derived_geometry_kind",
  "derived_geometry_geojson",
  "geometry_confidence",
  "geometry_source",
  "volunteers_count",
  "duration_minutes",
].join(", ");

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadEnv() {
  if (!existsSync(ENV_LOCAL_PATH)) return {};
  return parseDotEnv(await readFile(ENV_LOCAL_PATH, "utf8"));
}

function envValue(key, fileEnv) {
  const value = process.env[key] ?? fileEnv[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function coordinate(value) {
  if (Array.isArray(value) && value.length >= 2) {
    const latitude = asNumber(value[0]);
    const longitude = asNumber(value[1]);
    if (latitude !== null && longitude !== null && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return [latitude, longitude];
    }
  }
  if (value && typeof value === "object") {
    const latitude = asNumber(value.latitude);
    const longitude = asNumber(value.longitude);
    if (latitude !== null && longitude !== null && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return [latitude, longitude];
    }
  }
  return null;
}

function parsePreparationData(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseStoredDrawing(row) {
  if (row.derived_geometry_kind !== "polyline" || typeof row.derived_geometry_geojson !== "string") return null;
  try {
    const parsed = JSON.parse(row.derived_geometry_geojson);
    if (parsed?.type !== "LineString" || !Array.isArray(parsed.coordinates)) return null;
    const coordinates = parsed.coordinates.map((point) => coordinate([point?.[1], point?.[0]]));
    return coordinates.every(Boolean) ? { kind: "polyline", coordinates } : null;
  } catch {
    return null;
  }
}

function hasObservedEvidence(row, preparationData) {
  const gpx = preparationData.gpxImport;
  return row.geometry_source === "gps_tracking" ||
    row.geometry_source === "gpx_import" ||
    preparationData.observedCoverage !== undefined ||
    preparationData.gpsPoints !== undefined ||
    gpx?.intent === "observed" ||
    gpx?.provenance === "observed" ||
    gpx?.files?.some?.((file) => file?.provenance === "observed") === true;
}

export function isHistoricalSyntheticRouteCandidate(row) {
  const preparationData = parsePreparationData(row.preparation_data);
  const drawing = parseStoredDrawing(row);
  return row.status === "approved" &&
    row.action_phase === "post_action_complete" &&
    row.geometry_source === "routed" &&
    drawing?.kind === "polyline" &&
    drawing.coordinates.length === SYNTHETIC_ROUTE_POINT_COUNT &&
    !hasObservedEvidence(row, preparationData);
}

function routeTopology(preparationData) {
  return preparationData.routeTopology === "loop" ? "loop" : "open";
}

function historicalEndpointLabels(value) {
  if (typeof value !== "string") return { departure: null, arrival: null };
  const [departure, arrival] = value.split(/\s+→\s+/u, 2);
  return {
    departure: departure?.trim() || null,
    arrival: arrival?.trim() || null,
  };
}

export function resolveHistoricalRouteStops(row) {
  const preparationData = parsePreparationData(row.preparation_data);
  const drawing = parseStoredDrawing(row);
  const syntheticEndpoints = drawing?.coordinates.length === SYNTHETIC_ROUTE_POINT_COUNT
    ? [drawing.coordinates[0], drawing.coordinates.at(-1)]
    : null;
  const origin = coordinate(preparationData.departureCoordinates) ??
    syntheticEndpoints?.[0] ??
    coordinate([row.latitude, row.longitude]);
  const midpoint = coordinate(preparationData.midRouteCoordinates);
  const arrival = coordinate(preparationData.arrivalCoordinates) ?? syntheticEndpoints?.[1] ?? null;
  if (!origin) return { coordinates: null, reason: "missing_departure_coordinates" };

  if (routeTopology(preparationData) === "loop") {
    if (!midpoint) return { coordinates: null, reason: "missing_verified_midpoint_coordinates" };
    return { coordinates: [origin, midpoint, origin], reason: null };
  }

  if (!arrival) return { coordinates: null, reason: "missing_arrival_coordinates" };
  return { coordinates: [origin, ...(midpoint ? [midpoint] : []), arrival], reason: null };
}

/**
 * Historical audit boundary: old three-point drawings may contain a synthetic
 * midpoint. Only persisted departure/arrival endpoints are allowed here.
 */
export function resolveHistoricalEndpointStops(row) {
  const preparationData = parsePreparationData(row.preparation_data);
  const drawing = parseStoredDrawing(row);
  const syntheticEndpoints = drawing?.coordinates.length === SYNTHETIC_ROUTE_POINT_COUNT
    ? [drawing.coordinates[0], drawing.coordinates.at(-1)]
    : null;
  const origin = coordinate(preparationData.departureCoordinates) ??
    syntheticEndpoints?.[0] ??
    coordinate([row.latitude, row.longitude]);
  const arrival = coordinate(preparationData.arrivalCoordinates) ?? syntheticEndpoints?.[1] ?? null;
  if (!origin) return { coordinates: null, reason: "missing_departure_coordinates", ignoredMidpoint: null };
  if (!arrival) return { coordinates: null, reason: "missing_arrival_coordinates", ignoredMidpoint: null };
  return {
    coordinates: [origin, arrival],
    reason: null,
    ignoredMidpoint: coordinate(preparationData.midRouteCoordinates) ?? drawing?.coordinates?.[1] ?? null,
    endpointSource: preparationData.departureCoordinates || preparationData.arrivalCoordinates
      ? "persisted_endpoint_coordinates"
      : "original_persisted_geometry_endpoints",
  };
}

function haversineDistanceKm(from, to) {
  const radians = Math.PI / 180;
  const latitudeFrom = from[0] * radians;
  const latitudeTo = to[0] * radians;
  const latitudeDelta = (to[0] - from[0]) * radians;
  const longitudeDelta = (to[1] - from[1]) * radians;
  const value = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeFrom) * Math.cos(latitudeTo) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function directDistanceKm(coordinates) {
  return coordinates.slice(1).reduce((total, point, index) => total + haversineDistanceKm(coordinates[index], point), 0);
}

function routeUrl(coordinates) {
  const path = coordinates.map(([latitude, longitude]) => `${longitude.toFixed(6)},${latitude.toFixed(6)}`).join(";");
  return `${FOSSGIS_BASE_URL}/route/v1/driving/${path}?geometries=geojson&overview=full&steps=true`;
}

function parseNetworkRoutePayload(payload, requestedCoordinates) {
  const route = payload?.code === "Ok" && Array.isArray(payload.routes) ? payload.routes[0] : null;
  const rawCoordinates = route?.geometry?.coordinates;
  if (!route || !Array.isArray(rawCoordinates)) return { candidate: null, reason: "provider_invalid_response" };
  const coordinates = rawCoordinates.map((point) => coordinate([point?.[1], point?.[0]]));
  if (coordinates.length < 2 || coordinates.some((point) => point === null)) return { candidate: null, reason: "provider_invalid_geometry" };
  const distanceKm = asNumber(route.distance) === null ? null : Number((Number(route.distance) / 1000).toFixed(3));
  const durationMinutes = asNumber(route.duration) === null ? null : Math.max(0, Math.round(Number(route.duration) / 60));
  if (distanceKm === null || durationMinutes === null) return { candidate: null, reason: "provider_missing_metrics" };
  const endpointDistances = [
    haversineDistanceKm(requestedCoordinates[0], coordinates[0]),
    haversineDistanceKm(requestedCoordinates.at(-1), coordinates.at(-1)),
  ];
  if (endpointDistances.some((distance) => distance > MAX_ENDPOINT_DISTANCE_KM)) {
    return { candidate: null, reason: "endpoint_mismatch", endpointDistances };
  }
  const directKm = directDistanceKm(requestedCoordinates);
  const maximumPlausibleKm = Math.max(directKm * 4, directKm + 5);
  if (distanceKm > maximumPlausibleKm) {
    return { candidate: null, reason: "implausible_network_distance", directKm, maximumPlausibleKm, distanceKm };
  }
  return {
    candidate: {
      kind: "polyline",
      coordinates,
      geometrySource: "routed",
      provider: FOSSGIS_PROVIDER,
      mode: "network",
      estimated: false,
      confidence: ROUTED_CONFIDENCE,
      distanceKm,
      durationMinutes,
      endpointDistances,
    },
    reason: null,
  };
}

export async function fetchNetworkRoute(coordinates, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FOSSGIS_TIMEOUT_MS);
  try {
    const response = await fetchImpl(routeUrl(coordinates), {
      headers: { Accept: "application/json", "User-Agent": FOSSGIS_USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) return { candidate: null, reason: `provider_http_${response.status}` };
    return parseNetworkRoutePayload(await response.json(), coordinates);
  } catch (error) {
    return { candidate: null, reason: error?.name === "AbortError" ? "provider_timeout" : "provider_request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveHypotheticalGroupCounts(participants) {
  if (!Number.isInteger(participants) || participants < 5) return null;
  if (participants === 9) return { counts: [5, 4], policy: "explicit_exception" };
  for (let groupCount = 1; groupCount <= 12; groupCount += 1) {
    const base = Math.floor(participants / groupCount);
    const remainder = participants % groupCount;
    const counts = Array.from({ length: groupCount }, (_, index) =>
      base + (index < remainder ? 1 : 0),
    );
    if (counts.every((count) => count >= 5 && count <= 8)) {
      return { counts, policy: "preferred_5_to_8" };
    }
  }
  return null;
}

function targetDistanceKm(durationMinutes) {
  return Number(((durationMinutes / 60) * HYPOTHETICAL_WALKING_SPEED_KM_PER_HOUR).toFixed(3));
}

function interpolatePoint(start, end, ratio) {
  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
}

function offsetPoint(point, northMeters, eastMeters) {
  return [
    point[0] + northMeters / 111_320,
    point[1] + eastMeters / (111_320 * Math.max(0.1, Math.cos((point[0] * Math.PI) / 180))),
  ];
}

function buildOpenRouteHypotheses(endpoints, targetKm, groupIndex) {
  const [origin, arrival] = endpoints;
  const directKm = Math.max(directDistanceKm(endpoints), 0.1);
  const excessMeters = Math.max(100, (targetKm - directKm) * 300);
  const latitudeMeters = (arrival[0] - origin[0]) * 111_320;
  const longitudeMeters = (arrival[1] - origin[1]) * 111_320 * Math.cos((origin[0] * Math.PI) / 180);
  const lengthMeters = Math.max(1, Math.hypot(latitudeMeters, longitudeMeters));
  const normalNorth = -longitudeMeters / lengthMeters;
  const normalEast = latitudeMeters / lengthMeters;
  const patterns = [[1, -1], [-1, 1], [1, 1], [-1, -1]];
  const [firstSign, secondSign] = patterns[groupIndex % patterns.length];
  return [0.25, 0.4, 0.55, 0.7, 0.85, 1, 1.15, 1.3]
    .slice(0, MAX_HYPOTHESES_PER_GROUP)
    .map((factor) => {
    const radius = Math.min(2_500, excessMeters * factor);
    const first = offsetPoint(
      interpolatePoint(origin, arrival, 1 / 3),
      normalNorth * radius * firstSign,
      normalEast * radius * firstSign,
    );
    const second = offsetPoint(
      interpolatePoint(origin, arrival, 2 / 3),
      normalNorth * radius * secondSign,
      normalEast * radius * secondSign,
    );
    return [origin, first, second, arrival];
  });
}

function routeSegments(coordinates) {
  return coordinates.slice(0, -1).map((start, index) => {
    const end = coordinates[index + 1];
    return {
      midpoint: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2],
      distanceKm: haversineDistanceKm(start, end),
    };
  });
}

function sharedCorridorDistanceKm(left, right) {
  const rightSegments = routeSegments(right);
  return routeSegments(left).reduce((total, segment) =>
    rightSegments.some((other) => haversineDistanceKm(segment.midpoint, other.midpoint) <= OVERLAP_CORRIDOR_KM)
      ? total + segment.distanceKm
      : total,
  0);
}

function pairwiseOverlap(left, right) {
  const sharedKm = Math.max(
    sharedCorridorDistanceKm(left.coordinates, right.coordinates),
    sharedCorridorDistanceKm(right.coordinates, left.coordinates),
  );
  return {
    sharedCorridorDistanceKm: Number(sharedKm.toFixed(3)),
    ratio: Number((sharedKm / Math.max(0.001, Math.min(left.distanceKm, right.distanceKm))).toFixed(3)),
  };
}

function multiRouteOverlap(routes) {
  const pairs = [];
  for (let left = 0; left < routes.length; left += 1) {
    for (let right = left + 1; right < routes.length; right += 1) {
      const overlap = pairwiseOverlap(routes[left], routes[right]);
      pairs.push({
        leftGroupIndex: routes[left].groupIndex,
        rightGroupIndex: routes[right].groupIndex,
        ...overlap,
      });
    }
  }
  return {
    pairs,
    maxPairwiseOverlapRatio: pairs.length > 0 ? Math.max(...pairs.map(({ ratio }) => ratio)) : 0,
    sharedCorridorDistanceKm: Number(pairs.reduce((total, pair) => total + pair.sharedCorridorDistanceKm, 0).toFixed(3)),
    sharedNetworkDistanceKm: null,
    sharedNetworkDistanceReason: "FOSSGIS ne fournit pas d'identité stable de segments ; la longueur réseau dédoublonnée reste inconnue.",
  };
}

async function selectHypotheticalGroupRoute(endpoints, targetKm, groupIndex, selectedRoutes, options) {
  const hypotheses = buildOpenRouteHypotheses(endpoints, targetKm, groupIndex);
  const candidates = [];
  const failures = [];
  for (const [hypothesisIndex, hypothesis] of hypotheses.entries()) {
    await options.beforeRequest?.();
    const result = await options.routeFetcher(hypothesis, options.fetchImpl ?? fetch);
    if (!result.candidate) {
      failures.push({ hypothesisIndex, reason: result.reason });
      continue;
    }
    const candidate = result.candidate;
    if (candidate.mode !== "network" || candidate.provider !== FOSSGIS_PROVIDER || candidate.estimated !== false) {
      failures.push({ hypothesisIndex, reason: "provider_result_not_verified_network" });
      continue;
    }
    const pairwise = selectedRoutes.map((route) => pairwiseOverlap(candidate, route));
    const maxOverlap = pairwise.length > 0 ? Math.max(...pairwise.map(({ ratio }) => ratio)) : 0;
    if (maxOverlap > 0.75) {
      failures.push({ hypothesisIndex, reason: "route_overlap_above_75_percent", maxOverlap });
      continue;
    }
    const distanceErrorKm = Number((candidate.distanceKm - targetKm).toFixed(3));
    candidates.push({
      ...candidate,
      groupIndex,
      hypothesisIndex,
      targetDistanceKm: targetKm,
      distanceErrorKm,
      absoluteDistanceErrorKm: Math.abs(distanceErrorKm),
      maxPairwiseOverlapRatio: maxOverlap,
      pairwiseOverlap: pairwise,
      providerEvidence: { mode: candidate.mode, provider: candidate.provider, estimated: candidate.estimated },
      geometrySource: "estimated_route",
      provenance: "estimated",
      status: "hypothetical",
    });
  }
  if (candidates.length === 0) {
    return { route: null, reason: "no_coherent_network_hypothesis", failures };
  }
  candidates.sort((left, right) =>
    (left.absoluteDistanceErrorKm / Math.max(targetKm, 0.1) + left.maxPairwiseOverlapRatio * 4) -
    (right.absoluteDistanceErrorKm / Math.max(targetKm, 0.1) + right.maxPairwiseOverlapRatio * 4) ||
    left.hypothesisIndex - right.hypothesisIndex,
  );
  return { route: candidates[0], reason: null, failures };
}

function historicalTargetVerification(row, target) {
  const volunteers = asNumber(row.volunteers_count);
  const durationMinutes = asNumber(row.duration_minutes);
  return {
    volunteersMatch: volunteers === target.volunteers,
    durationMatch: durationMinutes === target.durationMinutes,
    volunteers,
    durationMinutes,
  };
}

function historicalMapFeature(actionId, route) {
  return {
    type: "Feature",
    id: `${actionId}-group-${route.groupIndex}`,
    geometry: {
      type: "LineString",
      coordinates: route.coordinates.map(([latitude, longitude]) => [longitude, latitude]),
    },
    properties: {
      actionId,
      groupIndex: route.groupIndex,
      groupParticipantCount: route.groupParticipantCount,
      targetDistanceKm: route.targetDistanceKm,
      simulatedDistanceKm: route.distanceKm,
      distanceErrorKm: route.distanceErrorKm,
      geometrySource: "estimated_route",
      provenance: "estimated",
      status: "hypothetical",
      observed: false,
    },
  };
}

export async function buildHistoricalMultigroupAudit(rows, options = {}) {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const reports = [];
  const mapFeatures = [];
  let providerRequests = 0;
  let lastRequestAt = 0;
  const routeFetcher = options.routeFetcher ?? fetchNetworkRoute;
  for (const target of HISTORICAL_RECONSTRUCTION_TARGETS) {
    const row = rowsById.get(target.id);
    if (!row) {
      reports.push({ actionId: target.id, status: "MISSING_CURRENT_ROW", target, reasons: ["action_not_returned_by_current_read"] });
      continue;
    }
    const verification = historicalTargetVerification(row, target);
    const preparationData = parsePreparationData(row.preparation_data);
    const drawing = parseStoredDrawing(row);
    const observed = hasObservedEvidence(row, preparationData);
    const endpointStops = resolveHistoricalEndpointStops(row);
    const groupPlan = resolveHypotheticalGroupCounts(target.volunteers);
    const reasons = [];
    if (!verification.volunteersMatch || !verification.durationMatch) reasons.push("current_row_does_not_match_requested_target");
    if (!isHistoricalSyntheticRouteCandidate(row)) reasons.push("current_row_is_not_an_unobserved_three_point_routed_candidate");
    if (observed) reasons.push("observed_gps_or_gpx_evidence_preserved");
    if (!endpointStops.coordinates) reasons.push(endpointStops.reason);
    if (!groupPlan) reasons.push("participant_count_has_no_valid_hypothetical_partition");
    const selectedRoutes = [];
    const groupReports = [];
    if (reasons.length === 0) {
      const targetKm = targetDistanceKm(target.durationMinutes);
      for (const [groupOffset, groupParticipantCount] of groupPlan.counts.entries()) {
        const selection = await selectHypotheticalGroupRoute(
          endpointStops.coordinates,
          targetKm,
          groupOffset + 1,
          selectedRoutes,
          {
            routeFetcher: async (hypothesis, fetchImpl) => {
              providerRequests += 1;
              const result = await routeFetcher(hypothesis, fetchImpl);
              if (result.candidate) result.candidate.groupParticipantCount = groupParticipantCount;
              return result;
            },
            fetchImpl: options.fetchImpl,
            beforeRequest: async () => {
              const waitMs = Math.max(0, FOSSGIS_MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
              if (waitMs > 0 && options.sleep !== false) await new Promise((resolve) => setTimeout(resolve, waitMs));
              lastRequestAt = Date.now();
            },
          },
        );
        if (!selection.route) {
          groupReports.push({
            groupIndex: groupOffset + 1,
            groupParticipantCount,
            targetDistanceKm: targetKm,
            status: "UNAVAILABLE",
            reason: selection.reason,
            failures: selection.failures,
          });
          continue;
        }
        selectedRoutes.push(selection.route);
        groupReports.push({
          groupIndex: selection.route.groupIndex,
          groupParticipantCount,
          targetDistanceKm: targetKm,
          simulatedDistanceKm: selection.route.distanceKm,
          distanceErrorKm: selection.route.distanceErrorKm,
          endpointDistancesKm: selection.route.endpointDistances,
          maxPairwiseOverlapRatio: selection.route.maxPairwiseOverlapRatio,
          hypothesisIndex: selection.route.hypothesisIndex,
          geometrySource: selection.route.geometrySource,
          provenance: selection.route.provenance,
          status: selection.route.status,
          providerEvidence: selection.route.providerEvidence,
          coordinates: selection.route.coordinates,
        });
        mapFeatures.push(historicalMapFeature(row.id, selection.route));
      }
    }
    const overlap = multiRouteOverlap(selectedRoutes);
    const totalSimulatedDistanceKm = Number(selectedRoutes.reduce((total, route) => total + route.distanceKm, 0).toFixed(3));
    const status = reasons.length > 0
      ? "NOT_CALCULATED"
      : selectedRoutes.length === groupPlan.counts.length
        ? "NETWORK_CANDIDATES_NOT_APPLIED"
        : "PARTIAL_NETWORK_CANDIDATES_NOT_APPLIED";
    reports.push({
      actionId: row.id,
      actionDate: row.action_date,
      status,
      target: {
        ...target,
        groupParticipantCounts: groupPlan?.counts ?? null,
        groupSizePolicy: groupPlan?.policy ?? null,
        targetDistanceKm: targetDistanceKm(target.durationMinutes),
      },
      currentVerification: {
        ...verification,
        candidateStatus: isHistoricalSyntheticRouteCandidate(row),
        observedEvidence: observed,
        originalGeometryPreserved: true,
        originalGeometry: drawing,
      },
      endpointAudit: {
        requestedCoordinates: endpointStops.coordinates,
        endpointSource: endpointStops.endpointSource ?? null,
        ignoredHistoricalMidpoint: endpointStops.ignoredMidpoint,
        syntheticIntermediateUsed: false,
        departureLabel: historicalEndpointLabels(row.location_label).departure,
        arrivalLabel: historicalEndpointLabels(row.location_label).arrival,
      },
      groups: groupReports,
      metrics: {
        targetDistancePerGroupKm: targetDistanceKm(target.durationMinutes),
        totalSimulatedDistanceKm,
        uniqueNetworkDistanceKm: null,
        observedDistanceKm: null,
        distanceErrorsKm: groupReports
          .filter((group) => typeof group.distanceErrorKm === "number")
          .map(({ groupIndex, distanceErrorKm }) => ({ groupIndex, distanceErrorKm })),
        ...overlap,
        endpointDeviationMaxKm: Number(Math.max(0, ...selectedRoutes.flatMap((route) => route.endpointDistances)).toFixed(3)),
      },
      provenance: {
        geometrySource: "estimated_route",
        provenance: "estimated",
        status: "hypothetical",
        providerNetworkResultsRemainHypothetical: true,
        noObservationPromotion: true,
      },
      proposedUpdate: null,
      reasons,
    });
  }
  return {
    dryRun: true,
    writesApplied: 0,
    targetCount: HISTORICAL_RECONSTRUCTION_TARGETS.length,
    routeCount: mapFeatures.length,
    providerRequests,
    speedKmPerHour: HYPOTHETICAL_WALKING_SPEED_KM_PER_HOUR,
    provider: { name: FOSSGIS_PROVIDER, mode: "network", estimated: false, minIntervalMs: FOSSGIS_MIN_INTERVAL_MS },
    reports,
    mapPreview: {
      type: "FeatureCollection",
      features: mapFeatures,
      properties: { geometrySource: "estimated_route", provenance: "estimated", status: "hypothetical" },
    },
  };
}

function geoJson(candidate) {
  return JSON.stringify({
    type: "LineString",
    coordinates: candidate.coordinates.map(([latitude, longitude]) => [longitude, latitude]),
  });
}

function actionReport(row, routeResult) {
  const preparationData = parsePreparationData(row.preparation_data);
  const drawing = parseStoredDrawing(row);
  const stops = resolveHistoricalRouteStops(row);
  const observed = hasObservedEvidence(row, preparationData);
  const endpointLabels = historicalEndpointLabels(row.location_label);
  const reasons = [];
  if (observed) reasons.push("observed_gps_or_gpx_evidence_preserved");
  if (!drawing) reasons.push("missing_or_invalid_original_polyline");
  if (drawing && drawing.coordinates.length !== SYNTHETIC_ROUTE_POINT_COUNT) reasons.push("historical_polyline_not_three_points");
  if (!stops.coordinates) reasons.push(stops.reason);
  if (routeResult?.reason) reasons.push(routeResult.reason);
  const candidate = routeResult?.candidate ?? null;
  const proposedPreparationData = candidate
    ? {
        ...preparationData,
        routeGeometryMode: "network",
        routeGeometryProvider: candidate.provider,
        routeNetworkDistanceKm: candidate.distanceKm,
      }
    : null;
  const status = observed
    ? "PRESERVE_OBSERVED"
    : candidate
      ? "NETWORK_CANDIDATE_NOT_APPLIED"
      : "REJECTED_NO_NETWORK_CANDIDATE";
  return {
    actionId: row.id,
    actionDate: row.action_date,
    status,
    current: {
      actionStatus: row.status,
      actionPhase: row.action_phase,
      locationLabel: row.location_label,
      geometrySource: row.geometry_source,
      geometryConfidence: row.geometry_confidence,
      geometry: drawing,
    },
    provenanceAudit: {
      observedEvidence: observed,
      routeTopology: routeTopology(preparationData),
      locationCoordinates: coordinate([row.latitude, row.longitude]),
      departureCoordinates: stops.coordinates?.[0] ?? null,
      arrivalCoordinates: stops.coordinates?.at(-1) ?? null,
      midpointCoordinates: coordinate(preparationData.midRouteCoordinates),
      departureLabel: preparationData.pointDeRendezVous ?? endpointLabels.departure,
      arrivalLabel: preparationData.zoneCiblePrevue ?? endpointLabels.arrival,
      preparationRouteMode: preparationData.routeGeometryMode ?? null,
      preparationRouteProvider: preparationData.routeGeometryProvider ?? null,
      hasOperationalRoute: Array.isArray(preparationData.operationalRoute?.routes),
      notes: {
        present: typeof row.notes === "string" && row.notes.trim().length > 0,
        hasDrawingMarker: typeof row.notes === "string" && row.notes.includes("[DRAWING_GEOJSON]"),
        hasMetadataMarker: typeof row.notes === "string" && row.notes.includes("[cmm-meta]"),
      },
    },
    originalGeometry: drawing,
    requestedRouteCoordinates: stops.coordinates,
    candidateGeometry: candidate
      ? { ...candidate, geojson: geoJson(candidate) }
      : null,
    proposedUpdate: candidate
      ? {
          derived_geometry_kind: "polyline",
          derived_geometry_geojson: geoJson(candidate),
          geometry_confidence: ROUTED_CONFIDENCE,
          geometry_source: "routed",
          preparation_data: proposedPreparationData
            ? JSON.stringify(proposedPreparationData)
            : null,
        }
      : null,
    reasons: reasons.filter(Boolean),
  };
}

export async function buildHistoricalRouteAudit(rows, options = {}) {
  const candidates = rows.filter(isHistoricalSyntheticRouteCandidate);
  const reports = [];
  let lastRequestAt = 0;
  for (const row of candidates) {
    const stops = resolveHistoricalRouteStops(row);
    let routeResult = null;
    if (stops.coordinates && !hasObservedEvidence(row, parsePreparationData(row.preparation_data))) {
      const waitMs = Math.max(0, FOSSGIS_MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
      if (waitMs > 0 && options.sleep !== false) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastRequestAt = Date.now();
      routeResult = await (options.routeFetcher ?? fetchNetworkRoute)(stops.coordinates, options.fetchImpl ?? fetch);
    }
    reports.push(actionReport(row, routeResult));
  }
  return {
    dryRun: true,
    writesApplied: 0,
    targetCount: candidates.length,
    provider: { name: FOSSGIS_PROVIDER, mode: "network", estimated: false, minIntervalMs: FOSSGIS_MIN_INTERVAL_MS },
    reports,
  };
}

async function fetchHistoricalReconstructionActions(supabase) {
  const result = await supabase
    .from("actions")
    .select(HISTORICAL_ACTION_SELECT)
    .in("id", HISTORICAL_RECONSTRUCTION_TARGETS.map(({ id }) => id));
  if (result.error) throw new Error(`target actions select failed: ${result.error.message}`);
  return result.data ?? [];
}

async function main() {
  if (process.argv.includes("--apply")) {
    throw new Error("This audit is dry-run only; historical writes require a separately approved remediation.");
  }
  const fileEnv = await loadEnv();
  const supabaseUrl = envValue("NEXT_PUBLIC_SUPABASE_URL", fileEnv);
  const serviceRoleKey = envValue("SUPABASE_SERVICE_ROLE_KEY", fileEnv);
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials.");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows = await fetchHistoricalReconstructionActions(supabase);
  const report = await buildHistoricalMultigroupAudit(rows);
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error("audit-historical-route-remediation failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
