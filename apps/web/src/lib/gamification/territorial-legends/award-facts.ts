import type { SupabaseClient } from "@supabase/supabase-js";
import { territorialLegendProofToFact } from "./rewards";
import type { TerritorialLegendAwardProof, TerritorialLegendLevel } from "./types";

function parseProof(value: unknown): TerritorialLegendAwardProof | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Record<keyof TerritorialLegendAwardProof, unknown>> & {
    proof_id?: unknown;
    territory_code?: unknown;
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
  return typeof row.proof_id === "string" &&
    typeof row.user_id === "string" &&
    typeof level === "string" &&
    typeof row.territory_code === "string" &&
    (row.award_kind === "conquest" || row.award_kind === "longevity") &&
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
): Promise<TerritorialLegendAwardProof[]> {
  const result = await supabase
    .from("territorial_legend_award_proofs")
    .select("proof_id, user_id, level, territory_code, award_kind, threshold_days, hold_started_on, held_through_on, awarded_on, valid_from, valid_until, validity_status, source_fingerprint")
    .eq("user_id", userId)
    .eq("validity_status", "active")
    .limit(10000);
  if (result.error) throw new Error(result.error.message);
  return (Array.isArray(result.data) ? result.data : [])
    .map(parseProof)
    .filter((proof): proof is TerritorialLegendAwardProof => proof !== null);
}

export async function loadTerritorialLegendAwardFacts(
  supabase: SupabaseClient,
  userId: string,
) {
  const proofs = await loadTerritorialLegendAwardProofs(supabase, userId);
  return proofs.map(territorialLegendProofToFact);
}
