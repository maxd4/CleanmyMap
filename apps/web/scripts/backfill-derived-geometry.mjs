import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { resolveBestGeometry } from "../src/lib/actions/geometry-resolution.ts";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const DRAWING_NOTE_PREFIX = "[DRAWING_GEOJSON]";
const META_PREFIX = "[cmm-meta]";
const BATCH_SIZE = 200;

const GEOMETRY_CONFIDENCE = {
  MANUAL_DRAWING: 1,
  PERSISTED_IMPORTED: 0.92,
  REFERENCE_GEOMETRY: 0.72,
  SYNTHETIC_ROUTE: 0.58,
  LABEL_POLYGON: 0.52,
  COORDINATE_ELLIPSE: 0.44,
  POINT_FALLBACK: 0.24,
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
  console.log("  --apply          Apply updates in Supabase (default: dry-run)");
  console.log("  --recompute-all  Recompute even rows that already have derived geometry");
  console.log("  --help           Show this help");
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
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
  if (!existsSync(path)) {
    return {};
  }
  return parseDotEnv(await readFile(path, "utf8"));
}

function resolveEnvValue(key, envFileMap) {
  const runtime = process.env[key];
  if (runtime && runtime.trim()) {
    return runtime.trim();
  }
  const fileValue = envFileMap[key];
  if (fileValue && fileValue.trim()) {
    return fileValue.trim();
  }
  return null;
}

function normalizeLabel(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isRenderableDrawing(drawing) {
  if (!drawing || !Array.isArray(drawing.coordinates)) {
    return false;
  }
  const minimumPoints = drawing.kind === "polygon" ? 3 : 2;
  return (
    (drawing.kind === "polyline" || drawing.kind === "polygon") &&
    drawing.coordinates.length >= minimumPoints
  );
}

function parseDrawingFromGeoJson(geojson, kindHint = null) {
  if (!geojson || typeof geojson !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(geojson);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (parsed.type === "LineString" || kindHint === "polyline") {
      if (!Array.isArray(parsed.coordinates)) {
        return null;
      }
      const coordinates = parsed.coordinates
        .map((point) =>
          Array.isArray(point) && point.length >= 2
            ? [Number(point[1]), Number(point[0])]
            : null,
        )
        .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]));
      return isRenderableDrawing({ kind: "polyline", coordinates })
        ? { kind: "polyline", coordinates }
        : null;
    }
    if (parsed.type === "Polygon" || kindHint === "polygon") {
      if (!Array.isArray(parsed.coordinates) || !Array.isArray(parsed.coordinates[0])) {
        return null;
      }
      const coordinates = parsed.coordinates[0]
        .map((point) =>
          Array.isArray(point) && point.length >= 2
            ? [Number(point[1]), Number(point[0])]
            : null,
        )
        .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]));
      const normalized =
        coordinates.length >= 2 &&
        coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
        coordinates[0][1] === coordinates[coordinates.length - 1][1]
          ? coordinates.slice(0, -1)
          : coordinates;
      return isRenderableDrawing({ kind: "polygon", coordinates: normalized })
        ? { kind: "polygon", coordinates: normalized }
        : null;
    }
  } catch {
    return null;
  }
  return null;
}

function parseDrawingFromNotes(notes) {
  const raw = normalizeLabel(notes);
  if (!raw) {
    return null;
  }
  const markerIndex = raw.lastIndexOf(DRAWING_NOTE_PREFIX);
  if (markerIndex < 0) {
    return null;
  }
  const drawingJson = raw.slice(markerIndex + DRAWING_NOTE_PREFIX.length).trim();
  if (!drawingJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(drawingJson);
    return isRenderableDrawing(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractMetaFromNotes(notes) {
  const lines = String(notes ?? "").split(/\r?\n/);
  const meta = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(META_PREFIX)) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed.slice(META_PREFIX.length));
      if (parsed && typeof parsed === "object") {
        Object.assign(meta, parsed);
      }
    } catch {
      // ignore malformed meta
    }
  }
  return meta;
}

function toGeoJsonString(drawing) {
  if (!drawing) {
    return null;
  }
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

function metersToLatitudeDelta(meters) {
  return meters / 111_320;
}

function metersToLongitudeDelta(meters, latitude) {
  const radius = Math.max(0.1, Math.cos((latitude * Math.PI) / 180));
  return meters / (111_320 * radius);
}

function buildEllipsePolygon(latitude, longitude, radiusMetersX, radiusMetersY) {
  const coordinates = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    const latOffset = metersToLatitudeDelta(radiusMetersY * Math.sin(angle));
    const lngOffset = metersToLongitudeDelta(
      radiusMetersX * Math.cos(angle),
      latitude,
    );
    coordinates.push([
      Number((latitude + latOffset).toFixed(6)),
      Number((longitude + lngOffset).toFixed(6)),
    ]);
  }
  return { kind: "polygon", coordinates };
}

function buildSyntheticRoute(latitude, longitude, routeStyle) {
  const reachMeters = routeStyle === "direct" ? 120 : 180;
  const latDelta = metersToLatitudeDelta(routeStyle === "direct" ? 20 : 55);
  const lngDelta = metersToLongitudeDelta(reachMeters, latitude);
  return {
    kind: "polyline",
    coordinates: [
      [
        Number((latitude - latDelta).toFixed(6)),
        Number((longitude - lngDelta).toFixed(6)),
      ],
      [latitude, longitude],
      [
        Number((latitude + latDelta).toFixed(6)),
        Number((longitude + lngDelta).toFixed(6)),
      ],
    ],
  };
}

function hasPreciseLocationLabel(value) {
  const label = normalizeLabel(value);
  if (label.length < 10) {
    return false;
  }
  const lowered = label.toLowerCase();
  if (/\b\d{5}\b/.test(label) || /\b\d+[a-z]?\b/i.test(label)) {
    return true;
  }
  if (label.includes(",") || label.includes("→")) {
    return true;
  }
  return [
    "rue",
    "avenue",
    "av.",
    "boulevard",
    "bd",
    "place",
    "pl.",
    "quai",
    "impasse",
    "allée",
    "allee",
    "villa",
    "jardin",
    "parc",
    "école",
    "ecole",
    "mairie",
    "porte",
  ].some((token) => lowered.includes(token));
}

function deriveGeometryForAction(row) {
  const meta = extractMetaFromNotes(row.notes);
  const existing =
    parseDrawingFromGeoJson(
      row.derived_geometry_geojson,
      row.derived_geometry_kind ?? null,
    ) ||
    parseDrawingFromNotes(row.notes);
  const resolved = resolveBestGeometry({
    drawing: existing,
    geojson: existing ? toGeoJsonString(existing) : null,
    confidence: row.geometry_confidence ?? null,
    geometrySourceHint: row.geometry_source ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    locationLabel: row.location_label,
    departureLocationLabel: meta.departureLocationLabel,
    arrivalLocationLabel: meta.arrivalLocationLabel,
    routeStyle: meta.routeStyle,
  });
  return {
    derived_geometry_kind: resolved.kind,
    derived_geometry_geojson: resolved.geojson,
    geometry_confidence: resolved.confidence,
    geometry_source: resolved.geometrySource,
  };
}

function deriveGeometryForSpot(row) {
  const resolved = resolveBestGeometry({
    latitude: row.latitude,
    longitude: row.longitude,
    locationLabel: row.label,
    departureLocationLabel: null,
    arrivalLocationLabel: null,
    routeStyle: null,
  });
  return {
    derived_geometry_kind: resolved.kind,
    derived_geometry_geojson: resolved.geojson,
    geometry_confidence: resolved.confidence,
    geometry_source: resolved.geometrySource,
  };
}

function needsBackfill(row, recomputeAll) {
  if (recomputeAll) {
    return true;
  }
  return (
    !row.derived_geometry_kind ||
    !("geometry_confidence" in row) ||
    row.geometry_confidence === null ||
    !("geometry_source" in row) ||
    row.geometry_source === null
  );
}

async function fetchAllRows(supabase, table, select) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + 999;
    const result = await supabase
      .from(table)
      .select(select)
      .range(from, to);
    if (result.error) {
      throw new Error(`${table} select failed: ${result.error.message}`);
    }
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) {
      return rows;
    }
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
        `Missing derived geometry columns on ${table}. Apply migration 20260424_000017_persist_derived_geometry.sql and 20260424_000018_persist_geometry_source.sql first.`,
      );
    }
    throw new Error(`${table} schema check failed: ${result.error.message}`);
  }
}

async function applyUpdates(supabase, table, updates) {
  for (let index = 0; index < updates.length; index += BATCH_SIZE) {
    const chunk = updates.slice(index, index + BATCH_SIZE);
    for (const update of chunk) {
      const { id, ...payload } = update;
      const result = await supabase.from(table).update(payload).eq("id", id);
      if (result.error) {
        throw new Error(`${table} update failed for ${id}: ${result.error.message}`);
      }
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
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await assertDerivedGeometryColumnsExist(supabase, "actions");
  await assertDerivedGeometryColumnsExist(supabase, "spots");

  const [actions, spots] = await Promise.all([
    fetchAllRows(
      supabase,
      "actions",
      "id, location_label, latitude, longitude, notes, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source",
    ),
    fetchAllRows(
      supabase,
      "spots",
      "id, label, latitude, longitude, notes, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source",
    ),
  ]);

  const actionUpdates = actions
    .filter((row) => needsBackfill(row, args.recomputeAll))
    .map((row) => ({ id: row.id, ...deriveGeometryForAction(row) }));
  const spotUpdates = spots
    .filter((row) => needsBackfill(row, args.recomputeAll))
    .map((row) => ({ id: row.id, ...deriveGeometryForSpot(row) }));

  if (!args.apply) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          recomputeAll: args.recomputeAll,
          actionsToUpdate: actionUpdates.length,
          spotsToUpdate: spotUpdates.length,
          sampleActions: actionUpdates.slice(0, 5),
          sampleSpots: spotUpdates.slice(0, 5),
        },
        null,
        2,
      ),
    );
    return;
  }

  await applyUpdates(supabase, "actions", actionUpdates);
  await applyUpdates(supabase, "spots", spotUpdates);

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        recomputeAll: args.recomputeAll,
        actionsUpdated: actionUpdates.length,
        spotsUpdated: spotUpdates.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "backfill-derived-geometry failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
