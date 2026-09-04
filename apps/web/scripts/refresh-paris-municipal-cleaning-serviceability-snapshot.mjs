#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT = path.resolve("data/geospatial/paris-municipal-cleaning-serviceability-snapshot.json");

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function uniqueById(items) {
  const byId = new Map();
  for (const item of items) {
    if (item?.id && !byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sourcesFrom(value) {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.sources) ? value.sources : [];
}

function mergeRows(baseZone, rows, sourceById) {
  const surfaceFeatureCounts = {};
  const sourceEvidence = [];
  let obstacleCount = null;
  let mechanizedCleaningAccessibility = null;
  let documentedCleaningFrequency = null;
  let documentedManualCleaning = null;
  let observedAt = null;

  for (const row of rows) {
    const surfaceClass = row.surfaceClass;
    const featureCount = finiteOrNull(row.featureCount);
    if (surfaceClass && featureCount !== null && featureCount > 0) {
      surfaceFeatureCounts[surfaceClass] =
        (surfaceFeatureCounts[surfaceClass] ?? 0) + featureCount;
    }
    if (obstacleCount === null && finiteOrNull(row.obstacleCount) !== null) {
      obstacleCount = Math.max(0, finiteOrNull(row.obstacleCount));
    }
    if (
      mechanizedCleaningAccessibility === null &&
      finiteOrNull(row.mechanizedCleaningAccessibility) !== null
    ) {
      mechanizedCleaningAccessibility = finiteOrNull(row.mechanizedCleaningAccessibility);
    }
    if (documentedCleaningFrequency === null && row.documentedCleaningFrequency) {
      documentedCleaningFrequency = row.documentedCleaningFrequency;
    }
    if (documentedManualCleaning === null && typeof row.documentedManualCleaning === "boolean") {
      documentedManualCleaning = row.documentedManualCleaning;
    }
    if (observedAt === null && row.observedAt) observedAt = row.observedAt;
    for (const evidence of row.sourceEvidence ?? []) sourceEvidence.push(evidence);
    for (const id of row.sourceEvidenceIds ?? []) {
      const evidence = sourceById.get(id);
      if (evidence) sourceEvidence.push(evidence);
    }
  }

  const evidence = uniqueById(sourceEvidence);
  return {
    ...baseZone,
    surfaceFeatureCounts,
    obstacleCount,
    mechanizedCleaningAccessibility,
    documentedCleaningFrequency,
    documentedManualCleaning,
    documentedManualCleaningEvidenceIds: evidence
      .filter((item) => item.evidenceType === "municipal_coverage")
      .map((item) => item.id),
    observedAt,
    sourceEvidence: evidence,
  };
}

export function buildRefreshInput({ baseSnapshot, featureRows, sources }) {
  const baseZones = (baseSnapshot.zones ?? []).map((zone) => ({
    id: zone.id,
    label: zone.label,
    geographicLevel: zone.geographicLevel,
    centroid: zone.centroid,
    areaKm2: zone.areaKm2 ?? null,
  }));
  const sourceById = new Map(sourcesFrom(sources).map((source) => [source.id, source]));
  const rowsByZone = new Map();
  for (const row of featureRows) {
    if (!row?.zoneId) continue;
    const rows = rowsByZone.get(row.zoneId) ?? [];
    rows.push(row);
    rowsByZone.set(row.zoneId, rows);
  }
  return {
    baseZones,
    rawZones: baseZones
      .filter((zone) => rowsByZone.has(zone.id))
      .map((zone) => mergeRows(zone, rowsByZone.get(zone.id), sourceById)),
    sources: sourcesFrom(sources),
  };
}

async function main() {
  const zonesFile = argument("--zones-json");
  const featuresFile = argument("--features-json");
  const sourcesFile = argument("--sources-json");
  const output = argument("--output", DEFAULT_OUTPUT);
  if (!zonesFile || !featuresFile || !sourcesFile) {
    console.error("Usage: refresh-paris-municipal-cleaning-serviceability-snapshot.mjs --zones-json <pressure-snapshot> --features-json <pre-aggregated-features> --sources-json <source-evidence> [--output <file>] [--snapshot-id <id>] [--refreshed-at <iso>]");
    process.exitCode = 2;
    return;
  }
  const refreshedAt = argument("--refreshed-at") ?? new Date().toISOString();
  const baseSnapshot = readJson(zonesFile);
  const input = buildRefreshInput({
    baseSnapshot,
    featureRows: readJson(featuresFile),
    sources: readJson(sourcesFile),
  });
  const { buildMunicipalCleaningServiceabilitySnapshot } = await import(
    "../src/lib/geo/municipal-cleaning-serviceability.ts"
  );
  const snapshot = buildMunicipalCleaningServiceabilitySnapshot({
    snapshotId: argument("--snapshot-id", "paris-iris-municipal-cleaning-serviceability-r1"),
    generatedAt: refreshedAt,
    refreshedAt,
    ...input,
    coverageNotes: [
      "Snapshot produit hors requête route à partir de zones IRIS et de features pré-agrégées.",
      "Les objets Paris Data et PVP restent des proxies géométriques sauf preuve municipale explicite jointe à la zone.",
    ],
  });
  const outputPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Municipal cleaning serviceability snapshot written: ${outputPath} (${snapshot.coverage.zoneCount} zones, ${snapshot.coverage.status})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
