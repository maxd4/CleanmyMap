import type { ActionDataContract } from "@/lib/actions/data-contract";
import { buildZones } from "@/lib/pilotage/overview.zones";
import { buildDateFloor } from "@/lib/pilotage/overview.utils";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SENSITIVE_ZONE_RULE_VERSION =
  "build-zones-120d-critique-normalized-score-v1" as const;
const SENSITIVE_ZONE_SOURCE_WINDOW_DAYS = 240 as const;

export function deriveSensitiveAreasFromContracts(
  contracts: ActionDataContract[],
  now = new Date(),
): string[] {
  const criticalZones = buildZones(contracts, 120, now)
    .filter((zone) => zone.urgency === "critique")
    .map((zone) => zone.area);

  return [...new Set(criticalZones)];
}

export async function loadCurrentSensitiveZoneAreas(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<string[]> {
  const { fetchUnifiedActionContracts } = await import(
    "@/lib/actions/unified-source"
  );
  const zoneContractsResult = await fetchUnifiedActionContracts(supabase, {
    limit: 6000,
    status: "approved",
    floorDate: buildDateFloor(SENSITIVE_ZONE_SOURCE_WINDOW_DAYS),
    requireCoordinates: false,
    types: ["action"],
  });

  return deriveSensitiveAreasFromContracts(zoneContractsResult?.items ?? [], now);
}
