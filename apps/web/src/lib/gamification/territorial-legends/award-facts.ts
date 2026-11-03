import type { SupabaseClient } from "@supabase/supabase-js";
import { territorialLegendProofToFact } from "./rewards";
import { TERRITORIAL_LEGEND_LEVELS, type TerritorialLegendAwardProof, type TerritorialLegendLevel } from "./types";

export type TerritorialLegendAwardProofQuery = {
  campaignYear?: number;
  level?: TerritorialLegendLevel;
  territoryCode?: string;
  includeInvalidated?: boolean;
};

function parseProof(value: unknown): TerritorialLegendAwardProof | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Record<keyof TerritorialLegendAwardProof, unknown>> & {
    proof_id?: unknown;
    territory_code?: unknown;
    campaign_year?: unknown;
    award_kind?: unknown;
    threshold_days?: unknown;
    hold_started_on?: unknown;
    held_through_on?: unknown;
    awarded_on?: unknown;
    valid_from?: unknown;
    valid_until?: unknown;
    validity_status?: unknown;
    source_fingerprint?: unknown;
    user_id?: unknown;
  };
  const level = row.level;
  const campaignYear = Number(row.campaign_year);
  const validLevel = typeof level === "string" && TERRITORIAL_LEGEND_LEVELS.includes(level as TerritorialLegendLevel);
  return typeof row.proof_id === "string" &&
    typeof row.user_id === "string" &&
    row.campaign_year !== null && row.campaign_year !== undefined &&
    Number.isInteger(campaignYear) && campaignYear > 0 &&
    validLevel &&
    typeof row.territory_code === "string" &&
    (row.award_kind === "conquest" || row.award_kind === "longevity" || row.award_kind === "season_end") &&
    Number.isInteger(Number(row.threshold_days)) &&
    typeof row.hold_started_on === "string" &&
    typeof row.held_through_on === "string" &&
    typeof row.awarded_on === "string" &&
    typeof row.valid_from === "string" &&
    (row.valid_until === null || typeof row.valid_until === "string") &&
    (row.validity_status === "active" || row.validity_status === "invalidated") &&
    typeof row.source_fingerprint === "string"
    ? {
        proofId: row.proof_id,
        userId: row.user_id,
        campaignYear,
        level: level as TerritorialLegendLevel,
        territoryCode: row.territory_code,
        awardKind: row.award_kind,
        thresholdDays: Number(row.threshold_days),
        holdStartedOn: row.hold_started_on,
        heldThroughOn: row.held_through_on,
        awardedOn: row.awarded_on,
        validFrom: row.valid_from,
        validUntil: row.valid_until as string | null,
        validityStatus: row.validity_status,
        sourceFingerprint: row.source_fingerprint,
      }
    : null;
}

export async function loadTerritorialLegendAwardProofs(
  supabase: SupabaseClient,
  userId: string,
  query: TerritorialLegendAwardProofQuery = {},
): Promise<TerritorialLegendAwardProof[]> {
  let request = supabase
    .from("territorial_legend_award_proofs")
    .select("proof_id, user_id, campaign_year, level, territory_code, award_kind, threshold_days, hold_started_on, held_through_on, awarded_on, valid_from, valid_until, validity_status, source_fingerprint")
    .eq("user_id", userId);
  if (query.campaignYear !== undefined) request = request.eq("campaign_year", query.campaignYear);
  if (query.level !== undefined) request = request.eq("level", query.level);
  if (query.territoryCode !== undefined) request = request.eq("territory_code", query.territoryCode);
  if (!query.includeInvalidated) request = request.eq("validity_status", "active");
  const result = await request.limit(10000);
  if (result.error) throw new Error(result.error.message);
  return (Array.isArray(result.data) ? result.data : [])
    .map(parseProof)
    .filter((proof): proof is TerritorialLegendAwardProof => proof !== null)
    .sort((left, right) =>
      right.campaignYear - left.campaignYear ||
      left.awardedOn.localeCompare(right.awardedOn) ||
      left.proofId.localeCompare(right.proofId),
    );
}

export async function loadTerritorialLegendAwardHistory(
  supabase: SupabaseClient,
  userId: string,
  query: Omit<TerritorialLegendAwardProofQuery, "includeInvalidated"> & { campaignYear: number },
): Promise<TerritorialLegendAwardProof[]> {
  return loadTerritorialLegendAwardProofs(supabase, userId, { ...query, includeInvalidated: true });
}

export async function loadTerritorialLegendAwardFacts(
  supabase: SupabaseClient,
  userId: string,
) {
  const proofs = await loadTerritorialLegendAwardProofs(supabase, userId);
  return proofs.map(territorialLegendProofToFact);
}
