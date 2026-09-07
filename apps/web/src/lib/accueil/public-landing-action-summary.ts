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
