import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildPedestrianNetwork } from "../src/lib/route/pedestrian-network.ts";
import {
  buildPedestrianRiskProjection,
  PEDESTRIAN_RISK_PROJECTION_KEY,
} from "../src/lib/geo/pedestrian-risk-projection.ts";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const DEFAULT_NETWORK_SOURCE = join(APP_DIR, "data/geospatial/paris-pedestrian-network-pilot-osm-source.json");
const DEFAULT_PRESSURE_SOURCE = join(APP_DIR, "data/geospatial/paris-pressure-snapshot.json");
const DEFAULT_SERVICEABILITY_SOURCE = join(APP_DIR, "data/geospatial/paris-municipal-cleaning-serviceability-snapshot.json");

function parseArgs(argv) {
  const values = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply" || argument === "--help") {
      values.set(argument, true);
      continue;
    }
    if (!["--network-source", "--pressure-source", "--serviceability-source", "--output", "--generated-at"].includes(argument)) {
      throw new Error(`Argument inconnu: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`Valeur manquante pour ${argument}`);
    values.set(argument, value);
    index += 1;
  }
  return {
    apply: values.has("--apply"),
    help: values.has("--help"),
    networkSource: values.get("--network-source") ?? DEFAULT_NETWORK_SOURCE,
    pressureSource: values.get("--pressure-source") ?? DEFAULT_PRESSURE_SOURCE,
    serviceabilitySource: values.get("--serviceability-source") ?? DEFAULT_SERVICEABILITY_SOURCE,
    output: values.get("--output"),
    generatedAt: values.get("--generated-at"),
  };
}

function usage() {
  return [
    "node --experimental-strip-types scripts/build-pedestrian-risk-projection.mjs",
    "  [--network-source path] [--pressure-source path] [--serviceability-source path]",
    "  [--generated-at RFC3339] [--output path] [--apply]",
  ].join("\n");
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), "utf8"));
}

export function buildDocument(networkSource, pressureSnapshot, serviceabilitySnapshot, generatedAt) {
  const graph = buildPedestrianNetwork({
    ways: networkSource.ways,
    bounds: networkSource.bounds,
    sourceSha256: networkSource.sha256,
    sourceRetrievedAt: networkSource.retrievedAt,
  });
  const projection = buildPedestrianRiskProjection({
    graph,
    pressureSnapshot,
    serviceabilitySnapshot,
    generatedAt,
  });
  return { projection };
}

function geoJsonLine(coordinates) {
  return {
    type: "LineString",
    coordinates: coordinates.map(([latitude, longitude]) => [longitude, latitude]),
  };
}

function geoJsonPoint([latitude, longitude]) {
  return { type: "Point", coordinates: [longitude, latitude] };
}

export function serializeProjectionDocument(document) {
  const projection = document.projection;
  const segmentSource = projection.segments.map((segment) => ({
    ...segment,
    geometry: geoJsonLine(segment.coordinates),
    midpoint: geoJsonPoint(segment.midpoint),
  }));
  const provenance = [...new Map(
    projection.segments
      .flatMap((segment) => segment.provenance)
      .map((source) => [
        `${source.publisher}:${source.dataset}:${source.datasetVersion}`,
        source,
      ]),
  ).values()];
  return {
    schemaVersion: projection.schemaVersion,
    projectionKey: projection.projectionKey,
    policyVersion: projection.policyVersion,
    networkVersionId: projection.networkVersionId,
    sourceVersions: projection.sourceVersions,
    generatedAt: projection.generatedAt,
    counts: projection.counts,
    provenance,
    segments: segmentSource,
  };
}

async function loadDotEnv() {
  const values = {};
  if (!existsSync(ENV_LOCAL_PATH)) return values;
  const content = await readFile(ENV_LOCAL_PATH, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[trimmed.slice(0, separator).trim()] = value;
  }
  return values;
}

export async function publishProjection(client, serializedProjection) {
  const { data, error } = await client.rpc(
    "publish_pedestrian_risk_projection",
    { p_projection: serializedProjection },
  );
  if (error || typeof data !== "string") {
    throw new Error(`publish_pedestrian_risk_projection: ${error?.message ?? "identifiant absent"}`);
  }
  return data;
}

async function applyProjection(serializedProjection) {
  const env = await loadDotEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis avec --apply.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return publishProjection(client, serializedProjection);
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return null;
  }
  const networkSource = await readJson(args.networkSource);
  const pressureSnapshot = await readJson(args.pressureSource);
  const serviceabilitySnapshot = await readJson(args.serviceabilitySource);
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(generatedAt))) throw new Error("--generated-at doit être RFC3339.");
  const document = buildDocument(networkSource, pressureSnapshot, serviceabilitySnapshot, new Date(generatedAt).toISOString());
  const serialized = serializeProjectionDocument(document);
  if (serialized.projectionKey !== PEDESTRIAN_RISK_PROJECTION_KEY) throw new Error("Clé de projection pilote inattendue.");
  if (args.output) {
    await writeFile(resolve(args.output), `${JSON.stringify(serialized, null, 2)}\n`, "utf8");
  }
  const publishedVersionId = args.apply ? await applyProjection(serialized) : null;
  console.log(JSON.stringify({
    projectionKey: serialized.projectionKey,
    counts: serialized.counts,
    generatedAt: serialized.generatedAt,
    output: args.output ? resolve(args.output) : null,
    publishedVersionId,
  }));
  return serialized;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
