import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  GEOMETRY_CONFIDENCE,
  buildEllipsePolygon,
  hasPreciseLocationLabel,
  normalizeLabel,
} from "../src/lib/actions/geometry/geometry-core.ts";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const DRAWING_NOTE_PREFIX = "[DRAWING_GEOJSON]";
const META_PREFIX = "[cmm-meta]";
const BATCH_SIZE = 200;
const SAMPLE_SIZE = 5;

export const BACKFILL_TARGETS = [
  {
    table: "actions",
    select:
      "id, location_label, latitude, longitude, notes, preparation_data, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source",
    kind: "action",
  },
  {
    table: "trash_spotter_spots",
    select:
      "id, label, spot_type, latitude, longitude, notes, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source",
    kind: "signalement",
  },
];

const VALID_SOURCES = new Set([
  "manual",
  "gpx_import",
  "gps_tracking",
  "reference",
  "routed",
  "estimated_route",
  "estimated_area",
  "fallback_point",
]);

const SOURCE_CONFIDENCE = {
  manual: GEOMETRY_CONFIDENCE.MANUAL_DRAWING,
  gpx_import: GEOMETRY_CONFIDENCE.GPX_IMPORT,
  gps_tracking: null,
  reference: GEOMETRY_CONFIDENCE.REFERENCE_GEOMETRY,
  routed: GEOMETRY_CONFIDENCE.AUTO_ROUTE,
  estimated_route: GEOMETRY_CONFIDENCE.ESTIMATED_ROUTE,
  estimated_area: GEOMETRY_CONFIDENCE.LABEL_POLYGON,
  fallback_point: GEOMETRY_CONFIDENCE.POINT_FALLBACK,
};

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    apply: args.has("--apply"),
    recomputeAll: args.has("--recompute-all"),
    help: args.has("--help"),
  };
}

function showHelp() {
  console.log("Usage: node scripts/backfill-derived-geometry.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --apply          Apply SAFE_UPDATE rows in Supabase (default: dry-run)");
  console.log("  --recompute-all  Audit every row (kept for command compatibility)");
  console.log("  --help           Show this help");
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  return parseDotEnv(await readFile(path, "utf8"));
}

function resolveEnvValue(key, envFileMap) {
  const runtime = process.env[key];
  if (runtime && runtime.trim()) return runtime.trim();
  const fileValue = envFileMap[key];
  if (fileValue && fileValue.trim()) return fileValue.trim();
  return null;
}

function isFiniteCoordinatePair(point) {
  return (
    Array.isArray(point) &&
    point.length >= 2 &&
    Number.isFinite(Number(point[0])) &&
    Number.isFinite(Number(point[1])) &&
    Number(point[0]) >= -90 &&
    Number(point[0]) <= 90 &&
    Number(point[1]) >= -180 &&
    Number(point[1]) <= 180
  );
}

function isRenderableDrawing(drawing) {
  if (!drawing || !Array.isArray(drawing.coordinates)) return false;
  const minimumPoints = drawing.kind === "polygon" ? 3 : 2;
  return (
    (drawing.kind === "polyline" || drawing.kind === "polygon") &&
    drawing.coordinates.length >= minimumPoints &&
    drawing.coordinates.every(isFiniteCoordinatePair)
  );
}

function parseDrawingFromGeoJson(geojson, kindHint = null) {
  if (!geojson || typeof geojson !== "string") return null;
  try {
    const parsed = JSON.parse(geojson);
    if (!parsed || typeof parsed !== "object") return null;
    const isLine = parsed.type === "LineString" || kindHint === "polyline";
    const isPolygon = parsed.type === "Polygon" || kindHint === "polygon";
    if (!isLine && !isPolygon) return null;
    const points = isPolygon ? parsed.coordinates?.[0] : parsed.coordinates;
    if (!Array.isArray(points)) return null;
    const coordinates = points.map((point) =>
      Array.isArray(point) && point.length >= 2
        ? [Number(point[1]), Number(point[0])]
        : null,
    );
    if (coordinates.some((point) => !isFiniteCoordinatePair(point))) return null;
    const normalized =
      isPolygon &&
      coordinates.length >= 2 &&
      coordinates[0][0] === coordinates.at(-1)?.[0] &&
      coordinates[0][1] === coordinates.at(-1)?.[1]
        ? coordinates.slice(0, -1)
        : coordinates;
    const drawing = {
      kind: isPolygon ? "polygon" : "polyline",
      coordinates: normalized,
    };
    return isRenderableDrawing(drawing) ? drawing : null;
  } catch {
    return null;
  }
}

function parseDrawingFromNotes(notes) {
  const raw = normalizeLabel(notes);
  if (!raw) return null;
  const markerIndex = raw.lastIndexOf(DRAWING_NOTE_PREFIX);
  if (markerIndex < 0) return null;
  const drawingJson = raw.slice(markerIndex + DRAWING_NOTE_PREFIX.length).trim();
  if (!drawingJson) return null;
  try {
    const parsed = JSON.parse(drawingJson);
    return isRenderableDrawing(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractMetaFromNotes(notes) {
  const meta = {};
  for (const line of String(notes ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(META_PREFIX)) continue;
    try {
      const parsed = JSON.parse(trimmed.slice(META_PREFIX.length));
      if (parsed && typeof parsed === "object") Object.assign(meta, parsed);
    } catch {
      // A malformed legacy metadata line is not provenance evidence.
    }
  }
  return meta;
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

function readStoredGeometry(row) {
  const hasGeoJson = typeof row.derived_geometry_geojson === "string";
  const hasDrawingMarker = normalizeLabel(row.notes).includes(DRAWING_NOTE_PREFIX);
  const derived = parseDrawingFromGeoJson(
    row.derived_geometry_geojson,
    row.derived_geometry_kind ?? null,
  );
  const fromNotes = parseDrawingFromNotes(row.notes);
  return {
    drawing: derived ?? fromNotes,
    hasStoredGeometry: hasGeoJson || hasDrawingMarker,
    invalidStoredGeometry: (hasGeoJson || hasDrawingMarker) && !derived && !fromNotes,
    fromNotes: Boolean(fromNotes && !derived),
  };
}

function toGeoJsonString(drawing) {
  if (!drawing) return null;
  if (drawing.kind === "polyline") {
    return JSON.stringify({
      type: "LineString",
      coordinates: drawing.coordinates.map(([lat, lng]) => [lng, lat]),
    });
  }
  return JSON.stringify({
    type: "Polygon",
    coordinates: [drawing.coordinates.map(([lat, lng]) => [lng, lat])],
  });
}

function coordinatesEqual(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every(
      (point, index) =>
        point?.[0] === right[index]?.[0] && point?.[1] === right[index]?.[1],
    )
  );
}

function geometryMatchesRoute(drawing, preparationData) {
  if (!drawing || drawing.kind !== "polyline") return null;
  const routeContainer = preparationData.operationalRoute ?? preparationData.actualRoute;
  const routes = Array.isArray(routeContainer?.routes) ? routeContainer.routes : [];
  for (const route of routes) {
    const geometry = route?.geometry;
    if (!geometry || !Array.isArray(geometry.coordinates)) continue;
    if (coordinatesEqual(drawing.coordinates, geometry.coordinates)) return geometry;
  }
  if (
    preparationData.routeGeometryMode &&
    preparationData.routeGeometryProvider
  ) {
    return {
      mode: preparationData.routeGeometryMode,
      provider: preparationData.routeGeometryProvider,
      estimated: preparationData.routeGeometryMode === "fallback",
    };
  }
  return null;
}

function legacyEllipseRadii(row, meta) {
  if (!Number.isFinite(Number(row.latitude)) || !Number.isFinite(Number(row.longitude))) {
    return null;
  }
  const anchor =
    normalizeLabel(row.location_label) ||
    normalizeLabel(meta.departureLocationLabel) ||
    normalizeLabel(meta.arrivalLocationLabel);
  return hasPreciseLocationLabel(anchor) ? [85, 55] : [110, 72];
}

function isDemonstratedLegacyEllipse(row, drawing, meta) {
  if (!drawing || drawing.kind !== "polygon") return null;
  const radii = legacyEllipseRadii(row, meta);
  if (!radii) return null;
  const expected = buildEllipsePolygon(
    { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    radii[0],
    radii[1],
  );
  return coordinatesEqual(drawing.coordinates, expected.coordinates) ? radii : null;
}

function currentSource(row) {
  return typeof row.geometry_source === "string" && row.geometry_source.trim()
    ? row.geometry_source.trim()
    : null;
}

function sourceAcceptsKind(source, kind) {
  switch (source) {
    case "gpx_import":
    case "gps_tracking":
    case "routed":
    case "estimated_route":
      return kind === "polyline";
    case "estimated_area":
      return kind === "polygon";
    case "fallback_point":
      return kind === "point";
    case "manual":
      return kind === "polyline" || kind === "polygon";
    case "reference":
      return kind === "point" || kind === "polyline" || kind === "polygon";
    default:
      return false;
  }
}

function hasValidPointGeometry(row) {
  return (
    row.derived_geometry_kind === "point" &&
    isFiniteCoordinatePair([Number(row.latitude), Number(row.longitude)])
  );
}

function buildUpdate(drawing, source, { replaceDrawing = false } = {}) {
  const update = {
    geometry_source: source,
    geometry_confidence: SOURCE_CONFIDENCE[source],
  };
  if (replaceDrawing && drawing) {
    update.derived_geometry_kind = drawing.kind;
    update.derived_geometry_geojson = toGeoJsonString(drawing);
  }
  return update;
}

function decision(row, table, classification, correction = "none", update = null) {
  return {
    table,
    id: row.id,
    classification,
    currentSource: currentSource(row) ?? "missing",
    correction,
    update,
  };
}

function classifyAction(row) {
  const source = currentSource(row);
  const stored = readStoredGeometry(row);
  const drawing = stored.drawing;
  const meta = extractMetaFromNotes(row.notes);
  const preparationData = parsePreparationData(row.preparation_data);

  if (
    source &&
    hasValidPointGeometry(row) &&
    sourceAcceptsKind(source, "point")
  ) {
    return decision(row, "actions", "PRESERVE");
  }
  if (source && (!VALID_SOURCES.has(source) || stored.invalidStoredGeometry)) {
    return decision(row, "actions", stored.invalidStoredGeometry ? "INVALID" : "AMBIGUOUS");
  }
  if (source && drawing && sourceAcceptsKind(source, drawing.kind)) {
    return decision(row, "actions", "PRESERVE");
  }
  if (source && drawing) return decision(row, "actions", "INVALID");
  if (source) return decision(row, "actions", "INVALID");
  if (stored.invalidStoredGeometry) return decision(row, "actions", "INVALID");

  const gpx = preparationData.gpxImport;
  if (
    gpx?.source === "gpx_import" &&
    drawing?.kind === "polyline" &&
    Number.isInteger(gpx.pointCount) &&
    gpx.pointCount === drawing.coordinates.length
  ) {
    return decision(
      row,
      "actions",
      "SAFE_UPDATE",
      "restore_gpx_import_provenance",
      buildUpdate(drawing, "gpx_import", { replaceDrawing: stored.fromNotes }),
    );
  }

  if (stored.fromNotes && drawing) {
    return decision(
      row,
      "actions",
      "SAFE_UPDATE",
      "restore_manual_drawing_provenance",
      buildUpdate(drawing, "manual", { replaceDrawing: true }),
    );
  }

  const matchedRoute = geometryMatchesRoute(drawing, preparationData);
  if (matchedRoute) {
    const routeSource =
      matchedRoute.mode === "network" &&
      matchedRoute.provider !== "none" &&
      matchedRoute.estimated !== true
        ? "routed"
        : matchedRoute.mode === "fallback" && matchedRoute.provider === "none"
          ? "estimated_route"
          : matchedRoute.mode === "network" && matchedRoute.estimated === true
            ? "estimated_route"
          : null;
    if (routeSource) {
      return decision(
        row,
        "actions",
        "SAFE_UPDATE",
        routeSource === "routed"
          ? "restore_network_route_provenance"
          : matchedRoute.estimated === true
            ? "classify_synthetic_legacy_route_as_estimated_route"
            : "restore_geodesic_fallback_provenance",
        buildUpdate(drawing, routeSource),
      );
    }
  }

  const ellipseRadii = isDemonstratedLegacyEllipse(row, drawing, meta);
  if (ellipseRadii) {
    return decision(
      row,
      "actions",
      "SAFE_UPDATE",
      `classify_legacy_ellipse_${ellipseRadii[0]}x${ellipseRadii[1]}m_as_estimated_area`,
      buildUpdate(drawing, "estimated_area"),
    );
  }

  return decision(row, "actions", "AMBIGUOUS");
}

function classifySignalement(row) {
  const source = currentSource(row);
  const stored = readStoredGeometry(row);
  const drawing = stored.drawing;

  if (source && hasValidPointGeometry(row) && sourceAcceptsKind(source, "point")) {
    return decision(row, "trash_spotter_spots", "PRESERVE");
  }

  if (source && (!VALID_SOURCES.has(source) || stored.invalidStoredGeometry)) {
    return decision(
      row,
      "trash_spotter_spots",
      stored.invalidStoredGeometry ? "INVALID" : "AMBIGUOUS",
    );
  }
  if (source && drawing && sourceAcceptsKind(source, drawing.kind)) {
    return decision(row, "trash_spotter_spots", "PRESERVE");
  }
  if (source && drawing) return decision(row, "trash_spotter_spots", "INVALID");
  if (source) return decision(row, "trash_spotter_spots", "INVALID");
  if (stored.invalidStoredGeometry) return decision(row, "trash_spotter_spots", "INVALID");

  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  if (!stored.hasStoredGeometry && isFiniteCoordinatePair([latitude, longitude])) {
    return decision(
      row,
      "trash_spotter_spots",
      "SAFE_UPDATE",
      "restore_signalement_point",
      {
        derived_geometry_kind: "point",
        derived_geometry_geojson: null,
        geometry_confidence: SOURCE_CONFIDENCE.fallback_point,
        geometry_source: "fallback_point",
      },
    );
  }

  return decision(row, "trash_spotter_spots", "AMBIGUOUS");
}

export function classifyGeometryRow(row, kind = "action") {
  return kind === "signalement" ? classifySignalement(row) : classifyAction(row);
}

function buildReport(decisions, { dryRun, recomputeAll }) {
  const classifications = { PRESERVE: 0, SAFE_UPDATE: 0, AMBIGUOUS: 0, INVALID: 0 };
  const currentProvenance = {};
  const proposedCorrections = {};
  const samples = { PRESERVE: [], SAFE_UPDATE: [], AMBIGUOUS: [], INVALID: [] };

  for (const item of decisions) {
    classifications[item.classification] += 1;
    currentProvenance[item.currentSource] = (currentProvenance[item.currentSource] ?? 0) + 1;
    if (item.classification === "SAFE_UPDATE") {
      proposedCorrections[item.correction] = (proposedCorrections[item.correction] ?? 0) + 1;
    }
    if (samples[item.classification].length < SAMPLE_SIZE) {
      samples[item.classification].push({
        table: item.table,
        id: item.id,
        correction: item.correction,
      });
    }
  }

  return {
    dryRun,
    recomputeAll,
    totalInspected: decisions.length,
    currentProvenance,
    classifications,
    proposedCorrections,
    samples,
  };
}

export function buildBackfillPlan({ actions, signalements, recomputeAll = false }) {
  const decisions = [
    ...actions.map((row) => classifyGeometryRow(row, "action")),
    ...signalements.map((row) => classifyGeometryRow(row, "signalement")),
  ];
  const safeUpdates = decisions.filter((item) => item.classification === "SAFE_UPDATE");
  return {
    decisions,
    report: buildReport(decisions, { dryRun: true, recomputeAll }),
    actionUpdates: safeUpdates
      .filter((item) => item.table === "actions")
      .map((item) => ({ id: item.id, ...item.update })),
    signalementUpdates: safeUpdates
      .filter((item) => item.table === "trash_spotter_spots")
      .map((item) => ({ id: item.id, ...item.update })),
  };
}

async function fetchAllRows(supabase, table, select) {
  const rows = [];
  let from = 0;
  while (true) {
    const result = await supabase.from(table).select(select).range(from, from + 999);
    if (result.error) throw new Error(`${table} select failed: ${result.error.message}`);
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) return rows;
    from += 1000;
  }
}

async function assertDerivedGeometryColumnsExist(supabase, table) {
  const result = await supabase
    .from(table)
    .select("id, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source")
    .limit(1);
  if (result.error) {
    if (result.error.message.includes("does not exist")) {
      throw new Error(
        `Missing derived geometry columns on ${table}. Apply migration 20260424000017_persist_derived_geometry.sql and 20260424000018_persist_geometry_source.sql first.`,
      );
    }
    throw new Error(`${table} schema check failed: ${result.error.message}`);
  }
}

async function applyUpdates(supabase, table, updates) {
  for (let index = 0; index < updates.length; index += BATCH_SIZE) {
    for (const update of updates.slice(index, index + BATCH_SIZE)) {
      const { id, ...payload } = update;
      const result = await supabase.from(table).update(payload).eq("id", id);
      if (result.error) throw new Error(`${table} update failed for ${id}: ${result.error.message}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    showHelp();
    return;
  }

  const envFileMap = await loadEnvFile(ENV_LOCAL_PATH);
  const supabaseUrl = resolveEnvValue("NEXT_PUBLIC_SUPABASE_URL", envFileMap);
  const serviceRoleKey = resolveEnvValue("SUPABASE_SERVICE_ROLE_KEY", envFileMap);
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const target of BACKFILL_TARGETS) {
    await assertDerivedGeometryColumnsExist(supabase, target.table);
  }
  const [actions, signalements] = await Promise.all(
    BACKFILL_TARGETS.map((target) => fetchAllRows(supabase, target.table, target.select)),
  );
  const plan = buildBackfillPlan({ actions, signalements, recomputeAll: args.recomputeAll });

  if (args.apply) {
    await applyUpdates(supabase, "actions", plan.actionUpdates);
    await applyUpdates(supabase, "trash_spotter_spots", plan.signalementUpdates);
  }

  console.log(
    JSON.stringify(
      {
        ...plan.report,
        dryRun: !args.apply,
        appliedSafeUpdates: args.apply
          ? plan.actionUpdates.length + plan.signalementUpdates.length
          : 0,
      },
      null,
      2,
    ),
  );
}

const currentModuleUrl = pathToFileURL(process.argv[1] ?? "").href;
if (currentModuleUrl === import.meta.url) {
  main().catch((error) => {
    console.error(
      "backfill-derived-geometry failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
