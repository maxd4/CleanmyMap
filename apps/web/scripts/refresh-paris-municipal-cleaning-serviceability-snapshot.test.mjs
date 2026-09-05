import test from "node:test";
import assert from "node:assert/strict";
import { buildRefreshInput } from "./refresh-paris-municipal-cleaning-serviceability-snapshot.mjs";

const baseSnapshot = {
  zones: [{
    id: "iris-a",
    label: "A",
    geographicLevel: "iris",
    centroid: { latitude: 48.86, longitude: 2.35 },
    areaKm2: 0.04,
  }],
};

const sources = [
  { id: "geometry", evidenceType: "geometry_proxy", status: "available" },
  { id: "freq-a", evidenceType: "cleaning_frequency", status: "available" },
  { id: "freq-b", evidenceType: "cleaning_frequency", status: "available" },
  { id: "manual-a", evidenceType: "manual_cleaning", status: "available" },
  { id: "manual-b", evidenceType: "manual_cleaning", status: "available" },
];

const rows = [
  {
    zoneId: "iris-a",
    objectId: "stairs-1",
    surfaceClass: "stairs",
    featureCount: 1,
    obstacleCount: 2,
    aggregationMode: "additive",
    sourceEvidenceIds: ["geometry"],
    observedAt: "2026-09-01",
  },
  {
    zoneId: "iris-a",
    objectId: "stairs-2",
    surfaceClass: "stairs",
    featureCount: 2,
    obstacleCount: 3,
    aggregationMode: "additive",
    sourceEvidenceIds: ["geometry"],
    observedAt: "2026-09-03",
  },
  {
    zoneId: "iris-a",
    objectId: "stairs-2",
    surfaceClass: "stairs",
    featureCount: 2,
    obstacleCount: 3,
    aggregationMode: "additive",
    sourceEvidenceIds: ["geometry"],
    observedAt: "2026-09-03",
  },
  {
    zoneId: "iris-a",
    objectId: "frequency-a",
    documentedCleaningFrequency: { visitsPerWeek: 2, label: "A", sourceEvidenceIds: ["freq-a"] },
    sourceEvidenceIds: ["freq-a"],
  },
  {
    zoneId: "iris-a",
    objectId: "frequency-b",
    documentedCleaningFrequency: { visitsPerWeek: 4, label: "B", sourceEvidenceIds: ["freq-b"] },
    sourceEvidenceIds: ["freq-b"],
  },
  {
    zoneId: "iris-a",
    objectId: "manual-a",
    documentedManualCleaning: true,
    documentedManualCleaningEvidenceIds: ["manual-a"],
    sourceEvidenceIds: ["manual-a"],
  },
  {
    zoneId: "iris-a",
    objectId: "manual-b",
    documentedManualCleaning: false,
    documentedManualCleaningEvidenceIds: ["manual-b"],
    sourceEvidenceIds: ["manual-b"],
  },
];

test("l'agrégation est indépendante de l'ordre et protège les doublons", () => {
  const forward = buildRefreshInput({ baseSnapshot, featureRows: rows, sources });
  const reverse = buildRefreshInput({ baseSnapshot, featureRows: [...rows].reverse(), sources });
  assert.deepEqual(forward, reverse);
  const raw = forward.rawZones[0];
  assert.deepEqual(raw.surfaceFeatureCounts, { stairs: 3 });
  assert.equal(raw.obstacleCount, 5);
  assert.equal(raw.obstacleCountResolution, "resolved");
  assert.equal(raw.observedAt, "2026-09-03");
  assert.equal(raw.documentedCleaningFrequency, null);
  assert.equal(raw.documentedCleaningFrequencyResolution, "conflict");
  assert.equal(raw.documentedManualCleaning, null);
  assert.equal(raw.documentedManualCleaningResolution, "conflict");
});

test("un inventaire concurrent non marqué additif devient conflictuel", () => {
  const input = buildRefreshInput({
    baseSnapshot,
    sources,
    featureRows: [
      { zoneId: "iris-a", objectId: "x", obstacleCount: 2, sourceEvidenceIds: ["geometry"] },
      { zoneId: "iris-a", objectId: "y", obstacleCount: 5, sourceEvidenceIds: ["geometry"] },
    ],
  });
  assert.equal(input.rawZones[0]?.obstacleCount, null);
  assert.equal(input.rawZones[0]?.obstacleCountResolution, "conflict");
});
