import "server-only";
import snapshot from "@/../data/geospatial/paris-pressure-snapshot.json";
import type { ParisPressureSnapshot } from "./paris-pressure-contract";
import { PARIS_PRESSURE_SNAPSHOT_SCHEMA_VERSION } from "./paris-pressure-contract";

function isSnapshot(value: unknown): value is ParisPressureSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ParisPressureSnapshot>;
  return (
    candidate.schemaVersion === PARIS_PRESSURE_SNAPSHOT_SCHEMA_VERSION &&
    Array.isArray(candidate.zones) &&
    candidate.coverage?.department === "75" &&
    candidate.coverage?.commune === "75056" &&
    Array.isArray(candidate.sources)
  );
}
export function loadParisPressureSnapshot(): ParisPressureSnapshot | null {
  return isSnapshot(snapshot) ? snapshot : null;
}
