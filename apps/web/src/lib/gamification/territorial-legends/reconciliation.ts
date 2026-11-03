import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTerritorialLegendWinnerSnapshots,
  loadTerritorialLegendFacts,
} from "./engine";
import type { TerritorialLegendWinnerSnapshot } from "./types";

function parisCivilDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export type TerritorialLegendReconciliationResult = {
  effectiveOn: string;
  winners: TerritorialLegendWinnerSnapshot[];
  affectedUserIds: string[];
  insertedProofs: number;
  extendedPeriods: number;
  closedPeriods: number;
};

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function serializeWinnerSnapshots(winners: TerritorialLegendWinnerSnapshot[]) {
  return winners.map((winner) => ({
    user_id: winner.userId,
    campaign_year: winner.campaignYear,
    level: winner.level,
    territory_code: winner.territoryCode,
    territory_label: winner.territoryLabel,
    effective_on: winner.effectiveOn,
    score: winner.score,
    rank: winner.rank,
    tie_size: winner.tieSize,
    source_fingerprint: winner.sourceFingerprint,
  }));
}

export async function reconcileTerritorialLegendSnapshot(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<TerritorialLegendReconciliationResult> {
  const effectiveOn = parisCivilDate(now);
  const facts = await loadTerritorialLegendFacts(supabase, { now });
  const winners = buildTerritorialLegendWinnerSnapshots({ ...facts, now });
  const result = await supabase.rpc("reconcile_territorial_legend_snapshot", {
    p_effective_on: effectiveOn,
    p_winners: serializeWinnerSnapshots(winners),
  });
  if (result.error) throw new Error(result.error.message);
  const payload = result.data as {
    status?: unknown;
    affectedUserIds?: unknown;
    insertedProofs?: unknown;
    extendedPeriods?: unknown;
    closedPeriods?: unknown;
  } | null;
  if (payload?.status !== "applied") throw new Error("La réconciliation territoriale a renvoyé une réponse invalide.");
  const affectedUserIds = Array.isArray(payload.affectedUserIds)
    ? payload.affectedUserIds.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  return {
    effectiveOn,
    winners,
    affectedUserIds,
    insertedProofs: nonNegativeInteger(payload.insertedProofs),
    extendedPeriods: nonNegativeInteger(payload.extendedPeriods),
    closedPeriods: nonNegativeInteger(payload.closedPeriods),
  };
}
