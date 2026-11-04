import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  buildPedestrianNetwork,
  PEDESTRIAN_NETWORK_IMPORTER_VERSION,
  PEDESTRIAN_NETWORK_KEY,
} from "../src/lib/route/pedestrian-network.ts";

export const PILOT_BOUNDS = Object.freeze({
  south: 48.838,
  west: 2.338,
  north: 48.851,
  east: 2.365,
});

export const OSM_MAP_ENDPOINT = "https://api.openstreetmap.org/api/0.6/map";
const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const BATCH_SIZE = 500;

function decodeXml(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function parseAttributes(fragment) {
  const attributes = {};
  const pattern = /([:\w-]+)\s*=\s*(["'])(.*?)\2/g;
  for (const match of fragment.matchAll(pattern)) {
    attributes[match[1]] = decodeXml(match[3]);
  }
  return attributes;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

export function parseOsmXml(xml) {
  const nodes = new Map();
  for (const match of xml.matchAll(/<node\b([^>]*?)(?:\/>|>)/g)) {
    const attributes = parseAttributes(match[1]);
    if (!attributes.id) continue;
    nodes.set(attributes.id, {
      id: attributes.id,
      latitude: finiteNumber(attributes.lat),
      longitude: finiteNumber(attributes.lon),
    });
  }

  const ways = [];
  for (const match of xml.matchAll(/<way\b([^>]*?)>([\s\S]*?)<\/way>/g)) {
    const attributes = parseAttributes(match[1]);
    if (!attributes.id) continue;
    const tags = {};
    for (const tagMatch of match[2].matchAll(/<tag\b([^>]*?)(?:\/>|>)/g)) {
      const tag = parseAttributes(tagMatch[1]);
      if (tag.k && tag.v !== undefined) {
        const containsCredentialLikeQuery = /[?&](?:pKey|token|secret|key|signature|sig|auth)=/i.test(tag.v);
        tags[tag.k] = containsCredentialLikeQuery ? tag.v.split("?", 1)[0] : tag.v;
      }
    }
    if (!tags.highway) continue;
    const wayNodes = [];
    for (const nodeMatch of match[2].matchAll(/<nd\b([^>]*?)(?:\/>|>)/g)) {
      const ref = parseAttributes(nodeMatch[1]).ref;
      if (!ref) continue;
      wayNodes.push(nodes.get(ref) ?? {
        id: ref,
        latitude: Number.NaN,
        longitude: Number.NaN,
      });
    }
    ways.push({ id: attributes.id, tags, nodes: wayNodes });
  }

  const uniqueWays = new Map();
  for (const way of ways.sort((left, right) => left.id.localeCompare(right.id))) {
    if (!uniqueWays.has(way.id)) uniqueWays.set(way.id, way);
  }
  return [...uniqueWays.values()];
}

function parseArgs(argv) {
  const values = new Map();
  const inputs = [];
  const urls = [];
  const bboxes = [];
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply" || argument === "--help") {
      values.set(argument, true);
      continue;
    }
    if (!["--input", "--source-url", "--bbox", "--source-output", "--source-json", "--output", "--retrieved-at"].includes(argument)) {
      throw new Error(`Argument inconnu: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`Valeur manquante pour ${argument}`);
    index += 1;
    if (argument === "--input") inputs.push(value);
    else if (argument === "--source-url") urls.push(value);
    else if (argument === "--bbox") bboxes.push(value);
    else values.set(argument, value);
  }
  return {
    apply: values.has("--apply"),
    help: values.has("--help"),
    inputs,
    urls,
    bboxes,
    sourceOutput: values.get("--source-output"),
    sourceJson: values.get("--source-json"),
    output: values.get("--output"),
    retrievedAt: values.get("--retrieved-at"),
  };
}

function parseBbox(value) {
  const values = value.split(",").map(Number);
  if (values.length !== 4 || values.some((part) => !Number.isFinite(part))) {
    throw new Error(`BBox invalide: ${value} (attendu south,west,north,east)`);
  }
  return { south: values[0], west: values[1], north: values[2], east: values[3] };
}

function mergeBounds(bounds) {
  return bounds.reduce((merged, current) => ({
    south: Math.min(merged.south, current.south),
    west: Math.min(merged.west, current.west),
    north: Math.max(merged.north, current.north),
    east: Math.max(merged.east, current.east),
  }));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sourceFromXml(args) {
  if (args.inputs.length === 0) throw new Error("Au moins un --input est requis.");
  if (!args.retrievedAt || Number.isNaN(Date.parse(args.retrievedAt))) {
    throw new Error("--retrieved-at RFC3339 est requis pour une source XML.");
  }
  if (args.urls.length !== 0 && args.urls.length !== args.inputs.length) {
    throw new Error("Le nombre de --source-url doit correspondre au nombre de --input.");
  }
  if (args.bboxes.length !== 0 && args.bboxes.length !== args.inputs.length) {
    throw new Error("Le nombre de --bbox doit correspondre au nombre de --input.");
  }
  const files = [];
  const waysById = new Map();
  for (let index = 0; index < args.inputs.length; index += 1) {
    const path = args.inputs[index];
    const bytes = await readFile(path);
    const parsedWays = parseOsmXml(bytes.toString("utf8"));
    const tileSha256 = sha256(bytes);
    files.push({
      name: basename(path),
      url: args.urls[index] ?? null,
      bbox: args.bboxes[index] ? parseBbox(args.bboxes[index]) : null,
      bytes: bytes.byteLength,
      sha256: tileSha256,
    });
    for (const way of parsedWays) if (!waysById.has(way.id)) waysById.set(way.id, way);
  }
  const sourceSha256 = sha256(files.map((file, index) => `${file.sha256}:${file.url ?? index}:${JSON.stringify(file.bbox)}`).join("\n"));
  return {
    schemaVersion: 1,
    networkKey: PEDESTRIAN_NETWORK_KEY,
    importerVersion: PEDESTRIAN_NETWORK_IMPORTER_VERSION,
    retrievedAt: new Date(args.retrievedAt).toISOString(),
    endpoint: OSM_MAP_ENDPOINT,
    sha256: sourceSha256,
    tiles: files,
    bounds: files.every((file) => file.bbox) ? mergeBounds(files.map((file) => file.bbox)) : PILOT_BOUNDS,
    ways: [...waysById.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

async function readSourceDocument(path) {
  const document = JSON.parse(await readFile(path, "utf8"));
  if (!document || document.schemaVersion !== 1 || !Array.isArray(document.ways)) {
    throw new Error("Document source piéton invalide.");
  }
  return document;
}

export function buildGraphDocument(source) {
  const graph = buildPedestrianNetwork({
    ways: source.ways,
    bounds: source.bounds,
    sourceSha256: source.sha256,
    sourceRetrievedAt: source.retrievedAt,
  });
  return {
    schemaVersion: 1,
    networkKey: PEDESTRIAN_NETWORK_KEY,
    importerVersion: PEDESTRIAN_NETWORK_IMPORTER_VERSION,
    source: {
      endpoint: source.endpoint,
      retrievedAt: source.retrievedAt,
      sha256: source.sha256,
      tiles: source.tiles,
    },
    bounds: source.bounds,
    graph,
  };
}

async function insertChunks(client, table, rows) {
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const { error } = await client.from(table).upsert(rows.slice(index, index + BATCH_SIZE));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

function geoJsonPoint([latitude, longitude]) {
  return { type: "Point", coordinates: [longitude, latitude] };
}

function geoJsonLine(coordinates) {
  return {
    type: "LineString",
    coordinates: coordinates.map(([latitude, longitude]) => [longitude, latitude]),
  };
}

function geoJsonBounds(bounds) {
  return {
    type: "Polygon",
    coordinates: [[
      [bounds.west, bounds.south],
      [bounds.east, bounds.south],
      [bounds.east, bounds.north],
      [bounds.west, bounds.north],
      [bounds.west, bounds.south],
    ]],
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[trimmed.slice(0, separator).trim()] = value;
  }
  return values;
}

async function applyPedestrianNetwork(document) {
  const env = await loadDotEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis avec --apply.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const graph = document.graph;
  const source = document.source;
  const versionPayload = {
    network_key: document.networkKey,
    importer_version: document.importerVersion,
    source_sha256: source.sha256,
    source_retrieved_at: source.retrievedAt,
    source_endpoint: source.endpoint,
    source_tiles: source.tiles,
    bounds: geoJsonBounds(document.bounds),
    status: "superseded",
    counts: graph.counts,
  };
  const { data: version, error: versionError } = await client
    .from("pedestrian_network_versions")
    .upsert(versionPayload, { onConflict: "network_key,importer_version,source_sha256" })
    .select("id")
    .single();
  if (versionError || !version?.id) throw new Error(`pedestrian_network_versions: ${versionError?.message ?? "id absent"}`);
  const versionId = version.id;
  await insertChunks(client, "pedestrian_network_nodes", graph.nodes.map((node) => ({
    network_version_id: versionId,
    osm_node_id: node.id,
    latitude: node.latitude,
    longitude: node.longitude,
    component_id: node.componentId,
    geom: geoJsonPoint([node.latitude, node.longitude]),
  })));
  await insertChunks(client, "pedestrian_network_edges", graph.edges.map((edge) => ({
    network_version_id: versionId,
    edge_key: edge.edgeKey,
    osm_way_id: edge.osmWayId,
    segment_index: edge.segmentIndex,
    direction: edge.direction,
    from_osm_node_id: edge.fromNodeId,
    to_osm_node_id: edge.toNodeId,
    highway: edge.highway,
    name: edge.name,
    pedestrian_access_status: edge.accessStatus,
    length_m: edge.lengthM,
    geom: geoJsonLine(edge.coordinates),
    tags: edge.tags,
  })));
  await insertChunks(client, "pedestrian_network_connections", graph.connections.map((connection) => ({
    network_version_id: versionId,
    from_osm_node_id: connection.fromNodeId,
    to_osm_node_id: connection.toNodeId,
    edge_key: connection.edgeKey,
  })));
  await insertChunks(client, "pedestrian_network_diagnostics", graph.diagnostics.map((diagnostic) => ({
    network_version_id: versionId,
    entity_type: diagnostic.entityType,
    osm_way_id: diagnostic.osmWayId,
    segment_index: diagnostic.segmentIndex,
    reason_code: diagnostic.reasonCode,
    message: diagnostic.message,
    metadata: diagnostic.metadata,
  })));
  const { error: supersedeError } = await client
    .from("pedestrian_network_versions")
    .update({ status: "superseded" })
    .eq("network_key", document.networkKey)
    .neq("id", versionId)
    .eq("status", "active");
  if (supersedeError) throw new Error(`pedestrian_network_versions supersede: ${supersedeError.message}`);
  const { error: activateError } = await client
    .from("pedestrian_network_versions")
    .update({ status: "active" })
    .eq("id", versionId);
  if (activateError) throw new Error(`pedestrian_network_versions activate: ${activateError.message}`);
  return { versionId, counts: graph.counts };
}

export async function buildImportFromSource(sourcePath, outputPath, sourceOutputPath) {
  const source = await readSourceDocument(sourcePath);
  const document = buildGraphDocument(source);
  await writeFile(outputPath, `${JSON.stringify(document)}\n`, "utf8");
  if (sourceOutputPath) await writeFile(sourceOutputPath, `${JSON.stringify(source, null, 2)}\n`, "utf8");
  return document;
}

function showHelp() {
  console.log("Usage: node --experimental-strip-types scripts/import-pedestrian-network.mjs --input TILE.osm [--input TILE2.osm] --source-url URL --bbox south,west,north,east --retrieved-at RFC3339 --source-output SOURCE.json --output GRAPH.json [--apply]");
  console.log("       node --experimental-strip-types scripts/import-pedestrian-network.mjs --source-json SOURCE.json --output GRAPH.json [--apply]");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) return showHelp();
  if (!args.output) throw new Error("--output est requis.");
  let source;
  if (args.inputs.length > 0) {
    source = await sourceFromXml(args);
    if (args.sourceOutput) await writeFile(args.sourceOutput, `${JSON.stringify(source, null, 2)}\n`, "utf8");
  } else if (args.sourceJson) {
    source = await readSourceDocument(args.sourceJson);
  } else {
    throw new Error("--input ou --source-json est requis.");
  }
  const document = buildGraphDocument(source);
  await writeFile(args.output, `${JSON.stringify(document)}\n`, "utf8");
  if (args.apply) {
    const result = await applyPedestrianNetwork(document);
    console.log(JSON.stringify({ applied: true, ...result }));
  } else {
    console.log(JSON.stringify({ applied: false, counts: document.graph.counts }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
