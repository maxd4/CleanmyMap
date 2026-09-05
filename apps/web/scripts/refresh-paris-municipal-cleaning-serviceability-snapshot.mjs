#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT = path.resolve(
  "data/geospatial/paris-municipal-cleaning-serviceability-snapshot.json",
);

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sourcesFrom(value) {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.sources) ? value.sources : [];
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableKey(value) {
  return JSON.stringify(stableValue(value));
}

function rowIdentity(row) {
  const explicitId = row.sourceObjectId ?? row.objectId ?? row.featureId;
  if (explicitId !== null && explicitId !== undefined && String(explicitId).length > 0) {
    return `object:${String(explicitId)}`;
  }
  return `value:${stableKey({
    zoneId: row.zoneId,
    surfaceClass: row.surfaceClass,
    featureCount: row.featureCount,
    obstacleCount: row.obstacleCount,
    aggregationMode: row.aggregationMode,
    mechanizedCleaningAccessibility: row.mechanizedCleaningAccessibility,
    mechanizedCleaningAccessibilityEvidenceIds: row.mechanizedCleaningAccessibilityEvidenceIds,
    documentedMunicipalCleaningServiceLevel: row.documentedMunicipalCleaningServiceLevel,
    documentedMunicipalCleaningServiceLevelEvidenceIds: row.documentedMunicipalCleaningServiceLevelEvidenceIds,
    documentedCleaningFrequency: row.documentedCleaningFrequency,
    documentedManualCleaning: row.documentedManualCleaning,
    documentedManualCleaningEvidenceIds: row.documentedManualCleaningEvidenceIds,
    observedAt: row.observedAt,
    sourceEvidenceIds: [...(row.sourceEvidenceIds ?? [])].sort(),
  })}`;
}

function deduplicateRows(rows) {
  const byIdentity = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const identity = rowIdentity(row);
    if (!byIdentity.has(identity)) byIdentity.set(identity, row);
  }
  return [...byIdentity.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, row]) => row);
}

function uniqueIds(ids) {
  return [...new Set(ids.filter((id) => typeof id === "string"))].sort((left, right) => left.localeCompare(right));
}

function knownEvidence(row, sourceById) {
  const evidence = [...(row.sourceEvidence ?? [])];
  for (const id of row.sourceEvidenceIds ?? []) {
    const source = sourceById.get(id);
    if (source) evidence.push(source);
  }
  return evidence;
}

function mergeEvidence(rows, sourceById) {
  const byId = new Map();
  for (const row of rows) {
    for (const item of knownEvidence(row, sourceById)) {
      if (item?.id && !byId.has(item.id)) byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function scalarResolution(candidates, valueKey = (value) => value) {
  const valid = candidates.filter((candidate) => candidate !== null && candidate !== undefined);
  if (valid.length === 0) return { value: null, resolution: "unknown" };
  const distinct = new Map(valid.map((candidate) => [stableKey(valueKey(candidate)), candidate]));
  if (distinct.size > 1) return { value: null, resolution: "conflict" };
  return { value: [...distinct.values()][0], resolution: "resolved" };
}

function latestObservedAt(rows) {
  const dates = rows
    .map((row) => row.observedAt)
    .filter((value) => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left));
  return dates[0] ?? null;
}

function mergeRows(baseZone, rows, sourceById) {
  const deduplicatedRows = deduplicateRows(rows);
  const surfaceFeatureCounts = {};
  for (const row of deduplicatedRows) {
    const surfaceClass = row.surfaceClass;
    const featureCount = finiteOrNull(row.featureCount);
    if (surfaceClass && featureCount !== null && featureCount > 0) {
      surfaceFeatureCounts[surfaceClass] =
        (surfaceFeatureCounts[surfaceClass] ?? 0) + featureCount;
    }
  }

  const obstacleRows = deduplicatedRows.filter(
    (row) => finiteOrNull(row.obstacleCount) !== null,
  );
  const obstacleValues = obstacleRows.map((row) => Math.max(0, finiteOrNull(row.obstacleCount)));
  const obstaclesAreAdditive = obstacleRows.length > 0 && obstacleRows.every(
    (row) => row.aggregationMode === "additive",
  );
  const obstacleResolution = obstaclesAreAdditive
    ? { value: obstacleValues.reduce((sum, value) => sum + value, 0), resolution: "resolved" }
    : scalarResolution(obstacleValues);

  const accessCandidates = deduplicatedRows
    .map((row) => finiteOrNull(row.mechanizedCleaningAccessibility))
    .filter((value) => value !== null)
    .map((value) => Math.min(1, Math.max(0, value)));
  const accessResolution = scalarResolution(accessCandidates, (value) => Number(value.toFixed(6)));

  const directLevelCandidates = deduplicatedRows
    .map((row) => finiteOrNull(row.documentedMunicipalCleaningServiceLevel))
    .filter((value) => value !== null)
    .map((value) => Math.min(100, Math.max(0, value)));
  const directLevelResolution = scalarResolution(directLevelCandidates, (value) => Number(value.toFixed(6)));

  const frequencyCandidates = deduplicatedRows
    .map((row) => row.documentedCleaningFrequency ?? null)
    .filter((value) => value !== null)
    .map((value) => ({ ...value, sourceEvidenceIds: uniqueIds(value.sourceEvidenceIds ?? []) }));
  const frequencyResolution = scalarResolution(
    frequencyCandidates,
    (value) => ({ visitsPerWeek: value.visitsPerWeek, label: value.label, sourceEvidenceIds: value.sourceEvidenceIds }),
  );

  const manualCandidates = deduplicatedRows
    .map((row) => (typeof row.documentedManualCleaning === "boolean" ? row.documentedManualCleaning : null))
    .filter((value) => value !== null);
  const manualResolution = scalarResolution(manualCandidates);
  const evidence = mergeEvidence(deduplicatedRows, sourceById);
  const manualEvidenceIds = uniqueIds(deduplicatedRows.flatMap((row) => row.documentedManualCleaningEvidenceIds ?? []));
  const accessEvidenceIds = uniqueIds(deduplicatedRows.flatMap((row) => row.mechanizedCleaningAccessibilityEvidenceIds ?? []));
  const directLevelEvidenceIds = uniqueIds(deduplicatedRows.flatMap((row) => row.documentedMunicipalCleaningServiceLevelEvidenceIds ?? []));

  return {
    ...baseZone,
    surfaceFeatureCounts,
    obstacleCount: obstacleResolution.value,
    obstacleCountResolution: obstacleResolution.resolution,
    mechanizedCleaningAccessibility: accessResolution.value,
    mechanizedCleaningAccessibilityResolution: accessResolution.resolution,
    mechanizedCleaningAccessibilityEvidenceIds: accessEvidenceIds,
    documentedMunicipalCleaningServiceLevel: directLevelResolution.value,
    documentedMunicipalCleaningServiceLevelResolution: directLevelResolution.resolution,
    documentedMunicipalCleaningServiceLevelEvidenceIds: directLevelEvidenceIds,
    documentedCleaningFrequency: frequencyResolution.value,
    documentedCleaningFrequencyResolution: frequencyResolution.resolution,
    documentedManualCleaning: manualResolution.value,
    documentedManualCleaningResolution: manualResolution.resolution,
    documentedManualCleaningEvidenceIds: manualEvidenceIds,
    observedAt: latestObservedAt(deduplicatedRows),
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
    snapshotId: argument("--snapshot-id", "paris-iris-municipal-cleaning-serviceability-r2"),
    generatedAt: refreshedAt,
    refreshedAt,
    ...input,
    coverageNotes: [
      "Snapshot produit hors requête route à partir de zones IRIS et de features pré-agrégées.",
      "Les objets Paris Data et PVP restent des proxies géométriques sauf preuve municipale explicite jointe au signal.",
      "Une faible accessibilité mécanisée ou un proxy géométrique ne permet jamais de déduire une faible couverture municipale.",
    ],
  });
  const outputPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Municipal cleaning serviceability snapshot written: ${outputPath} (${snapshot.coverage.zoneCount} zones, ${snapshot.coverage.status})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
