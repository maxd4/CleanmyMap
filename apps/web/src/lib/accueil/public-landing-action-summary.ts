import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PUBLIC_IMPACT_PROJECTION_VERSION } from "@/lib/impact/scientific-projection-versions";
import type { PublicLandingActionAggregationRow } from "./action-participant-aggregation";

export type PublicLandingActionSummaryRow =
  PublicLandingActionAggregationRow & {
    visible_actions: number | string | null;
    distinct_locations: number | string | null;
    waste_kg: number | string | null;
    waste_source_count?: number | string | null;
    cigarette_butts: number | string | null;
    volunteers: number | string | null;
    methodology_version: string;
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function readMetricField(
  record: Record<string, unknown>,
  key: string,
): number | string | null | undefined {
  const value = record[key];
  return value === undefined || value === null || typeof value === "number" || typeof value === "string"
    ? value
    : undefined;
}

function isMetricField(value: unknown): value is number | string | null | undefined {
  return value === undefined || value === null || typeof value === "number" || typeof value === "string";
}

function parsePublicLandingActionSummaryRow(value: unknown): PublicLandingActionSummaryRow | null {
  if (!isRecord(value)) return null;
  const metricKeys = [
    "visible_actions",
    "distinct_locations",
    "participants_total",
    "volunteers",
    "participants_known_actions",
    "participants_action_count",
    "total_duration_minutes",
    "waste_kg",
    "waste_source_count",
    "cigarette_butts",
  ];
  if (
    metricKeys.some((key) => !isMetricField(value[key])) ||
    value.methodology_version !== PUBLIC_IMPACT_PROJECTION_VERSION
  ) return null;
  return {
    visible_actions: readMetricField(value, "visible_actions") ?? null,
    distinct_locations: readMetricField(value, "distinct_locations") ?? null,
    participants_total: readMetricField(value, "participants_total") ?? null,
    volunteers: readMetricField(value, "volunteers") ?? null,
    participants_known_actions: readMetricField(value, "participants_known_actions") ?? null,
    participants_action_count: readMetricField(value, "participants_action_count") ?? null,
    total_duration_minutes: readMetricField(value, "total_duration_minutes") ?? null,
    action_distribution: value.action_distribution,
    classification_warnings: value.classification_warnings,
    waste_kg: readMetricField(value, "waste_kg") ?? null,
    waste_source_count: readMetricField(value, "waste_source_count") ?? null,
    cigarette_butts: readMetricField(value, "cigarette_butts") ?? null,
    butts_by_condition: value.butts_by_condition,
    methodology_version: value.methodology_version,
  };
}

export function buildLandingFloorDate(now = new Date()): string {
  const floor = new Date(now);
  floor.setUTCHours(0, 0, 0, 0);
  floor.setUTCDate(floor.getUTCDate() - 365);
  return floor.toISOString().slice(0, 10);
}

async function callImpactStateRpc(
  functionName:
  | "advance_public_impact_action_state"
  | "load_public_landing_action_summary_incremental"
  | "rebuild_public_impact_action_state",
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const result = await getSupabaseServerClient(true).rpc(functionName, args);
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export async function advancePublicImpactActionState(
  floorDate: string,
): Promise<void> {
  await callImpactStateRpc("advance_public_impact_action_state", {
    p_floor_date: floorDate,
    p_methodology_version: PUBLIC_IMPACT_PROJECTION_VERSION,
  });
}

export async function rebuildPublicImpactActionState(
  floorDate: string,
): Promise<void> {
  await callImpactStateRpc("rebuild_public_impact_action_state", {
    p_floor_date: floorDate,
    p_methodology_version: PUBLIC_IMPACT_PROJECTION_VERSION,
  });
}

export async function loadIncrementalPublicLandingActionSummary(): Promise<PublicLandingActionSummaryRow> {
  const data = await callImpactStateRpc(
    "load_public_landing_action_summary_incremental",
  );
  const candidate = isUnknownArray(data) ? data[0] : data;
  const row = parsePublicLandingActionSummaryRow(candidate);
  if (!row) {
    throw new Error("Incremental landing action summary returned no row.");
  }
  return row as PublicLandingActionSummaryRow;
}
