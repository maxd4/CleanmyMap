import type { SupabaseClient } from "@supabase/supabase-js";
import { TERRITORIAL_LEGEND_LEVELS, type TerritorialLegendLevel, type TerritorialLegendPage } from "./types";
import { buildTerritorialLegendPage, territoryPartForLevel, type BuildLeaderboardParams } from "./territorial-ranking";
import { loadTerritorialLegendFacts } from "./territorial-facts-loader";

export { TERRITORIAL_LEGEND_WINDOW_DAYS } from "./territorial-window";
export { TERRITORIAL_LEGEND_COG_YEAR } from "./attribution";
export { buildTerritorialLegendPage, buildTerritorialLegendWinnerSnapshots, type BuildLeaderboardParams } from "./territorial-ranking";
export { loadTerritorialLegendFacts, type TerritorialLegendLoadedFacts } from "./territorial-facts-loader";

export async function loadTerritorialLegendPage(
  supabase: SupabaseClient,
  params: Omit<BuildLeaderboardParams, "actions" | "participations" | "consents" | "profiles"> & { now?: Date },
): Promise<TerritorialLegendPage> {
  const now = params.now ?? new Date();
  const facts = await loadTerritorialLegendFacts(supabase, {
    now,
    ownerUserId: params.ownerUserId,
  });
  const resolvedTerritoryLabel = params.territoryLabel ?? facts.actions
    .map((action) => territoryPartForLevel(action, params.level))
    .find((part) => part?.code === params.territoryCode)?.name ?? null;
  return buildTerritorialLegendPage({
    ...params,
    territoryLabel: resolvedTerritoryLabel,
    now,
    ...facts,
  });
}

export function validateTerritorialLegendLevel(value: string): value is TerritorialLegendLevel {
  return (TERRITORIAL_LEGEND_LEVELS as readonly string[]).includes(value);
}

export function validateTerritorialLegendCode(
  level: TerritorialLegendLevel,
  value: string,
): boolean {
  if (level === "country") return value === "FR";
  if (level === "region") return /^\d{2}$/.test(value);
  if (level === "department") return /^(?:\d{2,3}|2A|2B)$/.test(value);
  return /^\d{5}$/.test(value);
}
