import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PublicLandingActionAggregationRow } from "./action-participant-aggregation";

export type PublicLandingActionSummaryRow =
  PublicLandingActionAggregationRow & {
    visible_actions: number | string | null;
    distinct_locations: number | string | null;
    waste_kg: number | string | null;
    cigarette_butts: number | string | null;
    volunteers: number | string | null;
  };

export function buildLandingFloorDate(now = new Date()): string {
  const floor = new Date(now);
  floor.setUTCHours(0, 0, 0, 0);
  floor.setUTCDate(floor.getUTCDate() - 365);
  return floor.toISOString().slice(0, 10);
}

export async function loadPublicLandingActionSummary(
  floorDate: string,
): Promise<PublicLandingActionSummaryRow> {
  const result = await getSupabaseServerClient().rpc(
    "load_public_landing_action_summary",
    { p_floor_date: floorDate },
  );
  if (result.error) {
    throw result.error;
  }

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) {
    throw new Error("Landing action summary returned no row.");
  }
  return row as PublicLandingActionSummaryRow;
}

async function callImpactStateRpc(
  functionName:
  | "advance_public_impact_action_state"
  | "load_public_landing_action_summary_incremental"
  | "rebuild_public_impact_action_state",
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const result = await getSupabaseServerClient().rpc(functionName, args);
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
  });
}

export async function rebuildPublicImpactActionState(
  floorDate: string,
): Promise<void> {
  await callImpactStateRpc("rebuild_public_impact_action_state", {
    p_floor_date: floorDate,
  });
}

export async function loadIncrementalPublicLandingActionSummary(): Promise<PublicLandingActionSummaryRow> {
  const data = await callImpactStateRpc(
    "load_public_landing_action_summary_incremental",
  );
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("Incremental landing action summary returned no row.");
  }
  return row as PublicLandingActionSummaryRow;
}
