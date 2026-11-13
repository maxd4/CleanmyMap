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

async function fetchAllActions(supabase) {
  const result = await supabase.from("actions").select(HISTORICAL_ACTION_SELECT).eq("status", "approved").eq("action_phase", "post_action_complete");
  if (result.error) throw new Error(`actions select failed: ${result.error.message}`);
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
  const rows = await fetchAllActions(supabase);
  const report = await buildHistoricalRouteAudit(rows);
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error("audit-historical-route-remediation failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
