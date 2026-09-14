import { createHash } from "node:crypto";
import type { RoutePlannerSnapshot } from "./route-calibration";

/**
 * Stable hash shared by planner proof creation and historical verification.
 * Object key ordering is normalized; array ordering remains meaningful.
 */
export function hashRoutePlannerSnapshot(snapshot: RoutePlannerSnapshot): string {
  return createHash("sha256")
    .update(JSON.stringify(stableNormalize(snapshot)))
    .digest("hex");
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stableNormalize(nested)]),
  );
}
