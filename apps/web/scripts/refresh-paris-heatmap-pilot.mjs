#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isValidParisPressureGeometry,
  pointInParisPressureGeometry,
} from "../src/lib/geo/paris-pressure-geometry-core.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PILOT = path.resolve(SCRIPT_DIR, "../data/geospatial/paris-heatmap-pilot-osm-source.json");
const DEFAULT_PRESSURE = path.resolve(SCRIPT_DIR, "../data/geospatial/paris-pressure-snapshot.json");
const DEFAULT_OUTPUT = path.resolve(SCRIPT_DIR, "../data/geospatial/paris-heatmap-pilot.json");
const PILOT_ARRONDISSEMENT_CODES = ["75105", "75106"];
const GEOMETRY_VERSION = "iris-clipped-v1";
const IDENTIFIER_VERSION = "iris-clipped-v1";
const REFERENCE_GEOMETRY_SNAPSHOT_ID = "paris-iris-2024-pop-2021-r2-polygon";
const MAX_EDGE_LENGTH_KM = 0.042;
const MIN_EDGE_LENGTH_KM = 1e-7;
const EPSILON = 1e-11;

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(path.resolve(file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function distanceKm(left, right) {
  const latitudeFactor = Math.PI / 180;
  const dLat = (right[0] - left[0]) * latitudeFactor;
  const dLon = (right[1] - left[1]) * latitudeFactor;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(left[0] * latitudeFactor) *
      Math.cos(right[0] * latitudeFactor) *
      Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cross(left, right) {
  return left[0] * right[1] - left[1] * right[0];
}

function subtract(left, right) {
  return [left[0] - right[0], left[1] - right[1]];
}

function lerp(left, right, ratio) {
  return [
    left[0] + (right[0] - left[0]) * ratio,
    left[1] + (right[1] - left[1]) * ratio,
  ];
}

function samePoint(left, right) {
  return Math.abs(left[0] - right[0]) <= EPSILON && Math.abs(left[1] - right[1]) <= EPSILON;
}

function uniqueSorted(values) {
  return [...values]
    .filter((value) => value >= -EPSILON && value <= 1 + EPSILON)
    .map((value) => Math.min(1, Math.max(0, value)))
    .sort((left, right) => left - right)
    .filter((value, index, sorted) => index === 0 || Math.abs(value - sorted[index - 1]) > EPSILON);
}

function geometryRings(geometry) {
  if (!geometry) return [];
  return geometry.type === "Polygon"
    ? geometry.coordinates
    : geometry.coordinates.flatMap((polygon) => polygon);
}

function lineBoundaryIntersections(start, end, geometry) {
  const direction = subtract(end, start);
  const parameters = [];
  for (const ring of geometryRings(geometry)) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const boundaryStart = ring[index];
      const boundaryEnd = ring[index + 1];
      const boundary = subtract(boundaryEnd, boundaryStart);
      const denominator = cross(direction, boundary);
      const offset = subtract(boundaryStart, start);
      if (Math.abs(denominator) <= EPSILON) {
        if (Math.abs(cross(offset, direction)) > EPSILON) continue;
        const directionLength = direction[0] ** 2 + direction[1] ** 2;
        if (directionLength <= EPSILON) continue;
        parameters.push(
          ((boundaryStart[0] - start[0]) * direction[0] + (boundaryStart[1] - start[1]) * direction[1]) / directionLength,
          ((boundaryEnd[0] - start[0]) * direction[0] + (boundaryEnd[1] - start[1]) * direction[1]) / directionLength,
        );
        continue;
      }
      const lineParameter = cross(offset, boundary) / denominator;
      const boundaryParameter = cross(offset, direction) / denominator;
      if (lineParameter >= -EPSILON && lineParameter <= 1 + EPSILON &&
          boundaryParameter >= -EPSILON && boundaryParameter <= 1 + EPSILON) {
        parameters.push(lineParameter);
      }
    }
  }
  return parameters;
}

function zoneIdsAtPoint(point, zones) {
  return zones
    .filter((zone) => pointInParisPressureGeometry({ latitude: point[0], longitude: point[1] }, zone.geometry))
    .map((zone) => zone.id)
    .sort();
}

export function splitLineByPilotIris(start, end, zones) {
  const parameters = uniqueSorted([
    0,
    1,
    ...zones.flatMap((zone) => lineBoundaryIntersections([start[1], start[0]], [end[1], end[0]], zone.geometry)),
  ]);
  const parts = [];
  for (let index = 0; index < parameters.length - 1; index += 1) {
    const firstRatio = parameters[index];
    const lastRatio = parameters[index + 1];
    if (lastRatio - firstRatio <= EPSILON) continue;
    const middle = lerp(start, end, (firstRatio + lastRatio) / 2);
    const first = lerp(start, end, firstRatio);
    const last = lerp(start, end, lastRatio);
    if (distanceKm(first, last) <= MIN_EDGE_LENGTH_KM) continue;
    const ids = zoneIdsAtPoint(middle, zones);
    if (ids.length !== 1) continue;
    parts.push({
      start: first,
      end: last,
      zoneId: ids[0],
    });
  }
  return parts;
}

function splitPartByLength(part) {
  const parts = Math.max(1, Math.ceil(distanceKm(part.start, part.end) / MAX_EDGE_LENGTH_KM));
  return Array.from({ length: parts }, (_, index) => ({
    start: lerp(part.start, part.end, index / parts),
    end: lerp(part.start, part.end, (index + 1) / parts),
    zoneId: part.zoneId,
  }));
}

function buildPilotWayRuns(way, zones) {
  const runs = [];
  let current = null;
  const closeRun = () => {
    if (current && current.geometry.length > 1) runs.push(current);
    current = null;
  };
  const append = (part) => {
    if (!current) current = { geometry: [part.start, part.end], referenceZoneIds: [part.zoneId] };
    else {
      if (!samePoint(current.geometry.at(-1), part.start)) {
        closeRun();
        current = { geometry: [part.start, part.end], referenceZoneIds: [part.zoneId] };
        return;
      }
      current.geometry.push(part.end);
      current.referenceZoneIds.push(part.zoneId);
    }
  };
  for (let edgeIndex = 0; edgeIndex < way.geometry.length - 1; edgeIndex += 1) {
    const start = way.geometry[edgeIndex];
    const end = way.geometry[edgeIndex + 1];
    const parts = splitLineByPilotIris(start, end, zones).flatMap(splitPartByLength);
    if (parts.length === 0) closeRun();
    else parts.forEach(append);
  }
  closeRun();
  return runs;
}

function normaliseWay(way, run, runIndex) {
  const sourceWayId = way.sourceWayId ?? way.id;
  return {
    id: `${sourceWayId}__${IDENTIFIER_VERSION}__${runIndex + 1}`,
    sourceWayId,
    highway: way.highway,
    name: way.name,
    footAccess: way.footAccess,
    sourceUrl: way.sourceUrl,
    geometry: run.geometry,
    referenceZoneIds: run.referenceZoneIds,
  };
}

function buildPilotWays(ways, zones) {
  return ways.flatMap((way) => buildPilotWayRuns(way, zones).map((run, index) => normaliseWay(way, run, index)));
}

function buildPilotPois(pois, zones) {
  return pois.filter((poi) => zoneIdsAtPoint([poi.lat, poi.lon], zones).length === 1);
}

function stripGeometry(zone) {
  const reference = { ...zone };
  delete reference.geometry;
  return reference;
}

export function buildPilotSnapshot({ pilot, pressure }) {
  if (!pressure.snapshotId || !pressure.generatedAt || !pressure.refreshedAt || !Array.isArray(pressure.sources)) {
    throw new Error("Le snapshot IRIS canonique doit fournir son identité, ses dates et ses sources");
  }
  const zones = pressure.zones.filter((zone) =>
    PILOT_ARRONDISSEMENT_CODES.includes(zone.arrondissementCode) && isValidParisPressureGeometry(zone.geometry),
  );
  if (zones.length === 0) throw new Error("Aucun polygone IRIS exploitable pour le périmètre 5e/6e");
  const retrievedAt = pilot.retrievedAt;
  const ways = buildPilotWays(pilot.ways, zones);
  const usedZoneIds = new Set(ways.flatMap((way) => way.referenceZoneIds));
  const zoneReferences = zones
    .filter((zone) => usedZoneIds.has(zone.id))
    .map(stripGeometry)
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    schemaVersion: 2,
    snapshotId: `paris-5e-6e-osm-pilot-${retrievedAt.slice(0, 10)}-${GEOMETRY_VERSION}`,
    retrievedAt,
    license: pilot.license,
    geometryVersion: GEOMETRY_VERSION,
    identifierVersion: IDENTIFIER_VERSION,
    referenceGeometrySnapshotId: REFERENCE_GEOMETRY_SNAPSHOT_ID,
    pressureSnapshotId: pressure.snapshotId,
    pressureGeneratedAt: pressure.generatedAt,
    pressureRefreshedAt: pressure.refreshedAt,
    pressureSources: pressure.sources,
    pilotBoundary: {
      type: "iris-arrondissement-union",
      arrondissementCodes: PILOT_ARRONDISSEMENT_CODES,
      sourceSnapshotId: REFERENCE_GEOMETRY_SNAPSHOT_ID,
      coverage: "partielle : le réseau OSM retenu ne prétend pas couvrir intégralement les 5e et 6e arrondissements",
    },
    source: {
      ...pilot.source,
      selection: "Voies et micro-lieux OSM issus des emprises source historiques, puis écrêtés par l'union des polygones IRIS réels des 5e et 6e arrondissements ; aucune emprise rectangulaire n'est publiée.",
      geometry: "Découpe linéaire aux frontières IRIS du snapshot paris-iris-2024-pop-2021-r2-polygon ; rattachement unique démontrable uniquement.",
      sourceTiles: pilot.tiles,
    },
    tiles: [],
    ways,
    pois: buildPilotPois(pilot.pois, zones),
    zoneReferences,
  };
}

function main() {
  if (process.argv.includes("--retrieved-at")) {
    throw new Error("--retrieved-at est interdit : retrievedAt doit provenir de l'acquisition OSM canonique");
  }
  const pilot = readJson(argument("--pilot", DEFAULT_PILOT));
  const pressure = readJson(argument("--pressure", DEFAULT_PRESSURE));
  const output = argument("--output", DEFAULT_OUTPUT);
  const snapshot = buildPilotSnapshot({ pilot, pressure });
  writeJson(output, snapshot);
  console.log(JSON.stringify({
    output,
    snapshotId: snapshot.snapshotId,
    ways: snapshot.ways.length,
    pois: snapshot.pois.length,
    segments: snapshot.ways.reduce((sum, way) => sum + way.referenceZoneIds.length, 0),
    iris: snapshot.zoneReferences.length,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
