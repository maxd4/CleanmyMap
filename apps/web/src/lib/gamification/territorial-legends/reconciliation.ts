import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTerritorialLegendWinnerSnapshots,
  loadTerritorialLegendFacts,
} from "./engine";
import { refreshMissingTerritorialLegendAttributions } from "./attribution-refresh";
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
  refreshedAttributions: number;
  unverifiableAttributions: number;
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
  options: { refreshMissingAttributions?: boolean } = {},
): Promise<TerritorialLegendReconciliationResult> {
  const effectiveOn = parisCivilDate(now);
  const attributionRefresh = options.refreshMissingAttributions === true
    ? await refreshMissingTerritorialLegendAttributions(supabase, now)
    : { refreshed: 0, unverifiable: 0 };
  let revisionBefore = await readFactRevision(supabase);
  let facts = await loadTerritorialLegendFacts(supabase, { now });
  if (facts.clerkEligibilityUnavailableUserIds?.length) {
    throw new Error("La réconciliation territoriale est interrompue : l’éligibilité Clerk est indisponible.");
  }
  let revokedByEligibility = facts.consents.filter((consent) =>
    consent.enabled && consent.ageEligible === false,
  );
  if (revokedByEligibility.length > 0) {
    // Re-check before mutating the durable consent projection. A transient
    // Clerk outage must never turn an incomplete read into a revocation.
    facts = await loadTerritorialLegendFacts(supabase, { now });
    if (facts.clerkEligibilityUnavailableUserIds?.length) {
      throw new Error("La réconciliation territoriale est interrompue : l’éligibilité Clerk est indisponible.");
    }
    revokedByEligibility = facts.consents.filter((consent) =>
      consent.enabled && consent.ageEligible === false,
    );
    for (const consent of revokedByEligibility) {
      const sync = await supabase.rpc("set_territorial_legend_consent", {
        p_user_id: consent.userId,
        p_enabled: false,
        p_age_band: consent.ageBand ?? "unknown",
        p_now: now.toISOString(),
      });
      if (sync.error) throw new Error(sync.error.message);
    }
    if (revokedByEligibility.length > 0) {
      const revokedUserIds = new Set(revokedByEligibility.map((consent) => consent.userId));
      facts = {
        ...facts,
        consents: facts.consents.map((consent) => revokedUserIds.has(consent.userId)
          ? { ...consent, enabled: false, revokedAt: now.toISOString(), ageEligible: false }
          : consent),
      };
      revisionBefore = await readFactRevision(supabase);
    }
  }
  const winners = buildTerritorialLegendWinnerSnapshots({ ...facts, now });
  const revisionAfter = await readFactRevision(supabase);
  if (revisionBefore !== revisionAfter) {
    throw new Error("La réconciliation territoriale a été invalidée par une modification des faits sources.");
  }
  const result = await supabase.rpc("reconcile_territorial_legend_snapshot", {
    p_effective_on: effectiveOn,
    p_winners: serializeWinnerSnapshots(winners),
    p_fact_revision: revisionAfter,
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
    refreshedAttributions: attributionRefresh.refreshed,
    unverifiableAttributions: attributionRefresh.unverifiable,
  };
}

async function readFactRevision(supabase: SupabaseClient): Promise<string> {
  const result = await supabase.rpc("get_territorial_legend_fact_revision");
  if (result.error || typeof result.data !== "string") {
    throw new Error(result.error?.message ?? "La révision des faits territoriaux est invalide.");
  }
  return result.data;
}
