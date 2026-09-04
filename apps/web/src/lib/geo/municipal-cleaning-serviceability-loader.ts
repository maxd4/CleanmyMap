import "server-only";
import snapshot from "@/../data/geospatial/paris-municipal-cleaning-serviceability-snapshot.json";
import {
  MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION,
  type MunicipalCleaningServiceabilitySnapshot,
} from "./municipal-cleaning-serviceability-contract";

function isSnapshot(value: unknown): value is MunicipalCleaningServiceabilitySnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MunicipalCleaningServiceabilitySnapshot>;
  return (
    candidate.schemaVersion === MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION &&
    Array.isArray(candidate.zones) &&
    candidate.coverage?.department === "75" &&
    candidate.coverage?.commune === "75056" &&
    Array.isArray(candidate.sources)
  );
}

/** Loads only the committed snapshot; it never calls Paris Data. */
export function loadMunicipalCleaningServiceabilitySnapshot(): MunicipalCleaningServiceabilitySnapshot | null {
  return isSnapshot(snapshot) ? snapshot : null;
}
