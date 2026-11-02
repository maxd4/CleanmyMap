import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import {
  loadConfirmedParticipantImpactAttributions,
  type ConfirmedParticipantImpactAttribution,
} from "@/lib/actions/participation/group-participation-read";
import type { IndividualImpactReadOptions } from "@/lib/actions/participation/individual-impact";
import {
  buildMohsThresholdAwards,
  MOHS_EVENT_TYPE_BY_FAMILY,
  MOHS_IMPACT_FAMILIES,
  MOHS_PROGRESSION_VERSION,
  MOHS_SOURCE_TABLE,
  type MohsImpactRecord,
} from "./mohs-progression";
import type { ProgressionEventType } from "./progression-types";
import {
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
} from "@/lib/impact/impact-terrain-2026";
import { CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION } from "@/lib/waste/cigarette-butts";
import { WASTE_MOISTURE_NORMALIZATION_VERSION } from "@/lib/actions/participation/individual-impact";
import type { ScientificImpactReceiptIntent } from "./gamification-reconciliation-receipt";

export const MOHS_IMPACT_CALCULATION_VERSION = [
  MOHS_PROGRESSION_VERSION,
  CIGARETTE_BUTTS_MASS_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  WASTE_MOISTURE_NORMALIZATION_VERSION,
].join("|");

export function buildMohsScientificReconciliationId(
  userId: string,
  methodVersion: string,
  sourceFingerprint: string,
): string {
  const canonicalIdentity = JSON.stringify({
    userId,
    methodVersion,
    sourceFingerprint: sourceFingerprint || "empty",
  });
  const digest = createHash("sha256").update(canonicalIdentity, "utf8").digest("hex");
  return `scientific-impact-reconciliation-v2|${digest}`;
}

/** Compatibility identity for pending receipts emitted before the bounded ID. */
export function buildLegacyMohsScientificReconciliationId(
  userId: string,
  methodVersion: string,
  sourceFingerprint: string,
): string {
  return [
    "scientific-impact-reconciliation",
    userId,
    methodVersion,
    sourceFingerprint || "empty",
  ].join("|");
}

export type PersonalMohsImpactTotals = {
  wasteRawKg: number;
  wasteEquivalentSecKg: number;
  wasteMohsKg: number;
  wasteQuotePartRawKg: number;
  wasteUnknownConditionCount: number;
  butts: number;
  buttsCounted: number;
  buttsDerived: number;
};

export type MohsReconciliationResult = {
  totals: PersonalMohsImpactTotals;
  inserted: number;
  updated: number;
  removed: number;
  eligibleSourceRows: number;
  methodVersion: string;
  sourceFingerprint: string;
};

export type MohsImpactReconciliationPreview = {
  totals: PersonalMohsImpactTotals;
  methodVersion: string;
  eligibleSourceRows: number;
  eventsToAdd: number;
  eventsToUpdate: number;
  eventsToRemove: number;
  sourceFingerprint: string;
};

type ExistingMohsEvent = {
  id: string;
  event_type: ProgressionEventType;
  source_id: string;
  status_phase: string;
  weight?: number | string | null;
  xp_base?: number | string | null;
  xp_awarded?: number | string | null;
  occurred_on?: string | null;
  metadata?: unknown;
};

class MohsReconciliationConflictError extends Error {
  constructor() {
    super("La réconciliation Mohs a rencontré une révision concurrente et doit être rejouée.");
    this.name = "MohsReconciliationConflictError";
  }
}

function emptyTotals(): PersonalMohsImpactTotals {
  return {
    wasteRawKg: 0,
    wasteEquivalentSecKg: 0,
    wasteMohsKg: 0,
    wasteQuotePartRawKg: 0,
    wasteUnknownConditionCount: 0,
    butts: 0,
    buttsCounted: 0,
    buttsDerived: 0,
  };
}

function summarizePersonalMohsRows(
  rows: readonly ConfirmedParticipantImpactAttribution[],
): PersonalMohsImpactTotals {
  const totals = emptyTotals();
  for (const row of rows) {
    addWasteTotals(totals, row.attribution);
    addButtsTotals(totals, row.attribution);
  }
  return totals;
}

function addWasteTotals(
  totals: PersonalMohsImpactTotals,
  attribution: ConfirmedParticipantImpactAttribution["attribution"],
): void {
  if (attribution.wasteKg !== null && !attribution.wasteInconsistent) totals.wasteRawKg += attribution.wasteKg;
  if (attribution.wasteEquivalentSecKg !== null) totals.wasteEquivalentSecKg += attribution.wasteEquivalentSecKg;
  if (attribution.wasteMohsEligible && attribution.wasteMohsValue !== null) {
    totals.wasteMohsKg += attribution.wasteMohsValue;
    if (attribution.wasteMohsSource === "quote_part_collective_raw") totals.wasteQuotePartRawKg += attribution.wasteMohsValue;
  }
  if (attribution.wasteKind === "individual" && attribution.wasteKg !== null && attribution.wasteEquivalentSecKg === null) {
    totals.wasteUnknownConditionCount += 1;
  }
}

function addButtsTotals(
  totals: PersonalMohsImpactTotals,
  attribution: ConfirmedParticipantImpactAttribution["attribution"],
): void {
  if (attribution.cigaretteButts !== null && !attribution.cigaretteButtsInconsistent) totals.butts += attribution.cigaretteButts;
  if (attribution.cigaretteButtsKind !== "individual") return;
  if (attribution.cigaretteButtsProvenance === "counted") totals.buttsCounted += attribution.cigaretteButts ?? 0;
  if (attribution.cigaretteButtsProvenance === "derived") totals.buttsDerived += attribution.cigaretteButts ?? 0;
}

function toMohsRecord(
  row: ConfirmedParticipantImpactAttribution,
): MohsImpactRecord {
  return {
    occurredOn: row.actionDate.slice(0, 10),
    wasteValue: row.attribution.wasteMohsEligible
      ? row.attribution.wasteMohsValue
      : null,
    buttsValue: row.attribution.cigaretteButtsMohsEligible
      ? row.attribution.cigaretteButts
      : null,
  };
}

function isCurrentMohsMetadata(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).mohsVersion === MOHS_PROGRESSION_VERSION,
  );
}

async function loadExistingMohsEvents(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExistingMohsEvent[]> {
  const eventTypes = MOHS_IMPACT_FAMILIES.map((family) => MOHS_EVENT_TYPE_BY_FAMILY[family]);
  const existingResult = await supabase
    .from("progression_events")
    .select("id, event_type, source_id, status_phase, weight, xp_base, xp_awarded, occurred_on, metadata")
    .eq("user_id", userId)
    .eq("source_table", MOHS_SOURCE_TABLE)
    .in("event_type", eventTypes)
    .limit(1000);
  if (existingResult.error) throw new Error(existingResult.error.message);
  return (existingResult.data ?? []) as ExistingMohsEvent[];
}

function buildMohsPreview(
  rows: readonly ConfirmedParticipantImpactAttribution[],
  existingRows: readonly ExistingMohsEvent[],
): MohsImpactReconciliationPreview {
  const totals = summarizePersonalMohsRows(rows);
  const desired = buildMohsThresholdAwards(rows.map(toMohsRecord));
  const desiredBySourceId = new Map(desired.map((award) => [award.sourceId, award] as const));
  const existingBySourceId = new Map(existingRows.map((row) => [row.source_id, row] as const));
  let eventsToUpdate = 0;
  for (const award of desired) {
    const existing = existingBySourceId.get(award.sourceId);
    if (!existing || !isCurrentMohsMetadata(existing.metadata)) continue;
    const metadata = existing.metadata as Record<string, unknown>;
    if (existing.occurred_on !== award.occurredOn || metadata.impactCalculationVersion !== MOHS_IMPACT_CALCULATION_VERSION) {
      eventsToUpdate += 1;
    }
  }
  const eventsToRemove = existingRows.filter((row) =>
    isCurrentMohsMetadata(row.metadata) && !desiredBySourceId.has(row.source_id),
  ).length;
  return {
    totals,
    methodVersion: MOHS_IMPACT_CALCULATION_VERSION,
    eligibleSourceRows: rows.length,
    eventsToAdd: desired.filter((award) => !existingBySourceId.has(award.sourceId)).length,
    eventsToUpdate,
    eventsToRemove,
    sourceFingerprint: buildMohsSourceFingerprint(rows),
  };
}

export function buildMohsSourceFingerprint(
  rows: readonly ConfirmedParticipantImpactAttribution[],
): string {
  return rows
    .map((row) => [
      row.actionId,
      row.actionDate.slice(0, 10),
      row.attribution.wasteMohsValue ?? "null",
      row.attribution.cigaretteButts ?? "null",
      row.attribution.wasteMohsSource ?? "null",
      row.attribution.cigaretteButtsProvenance ?? "null",
    ].join(":"))
    .sort()
    .join("|");
}

export async function loadPersonalMohsImpactTotals(
  supabase: SupabaseClient,
  userId: string,
  options: IndividualImpactReadOptions = {},
): Promise<PersonalMohsImpactTotals> {
  const rows = await loadConfirmedParticipantImpactAttributions(supabase, userId, 6000, options);
  return summarizePersonalMohsRows(rows);
}

export async function previewMohsImpactProgression(
  supabase: SupabaseClient,
  userId: string,
): Promise<MohsImpactReconciliationPreview> {
  const [rows, existingRows] = await Promise.all([
    loadParticipantMohsRows(supabase, userId),
    loadExistingMohsEvents(supabase, userId),
  ]);
  return buildMohsPreview(rows, existingRows);
}

async function loadParticipantMohsRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConfirmedParticipantImpactAttribution[]> {
  return loadConfirmedParticipantImpactAttributions(supabase, userId, 6000, {
    recalculateDerived: true,
  });
}

export async function reconcileMohsImpactProgression(
  supabase: SupabaseClient,
  userId: string,
  options: { persistScientificReceiptIntent?: boolean } = {},
): Promise<MohsReconciliationResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rows = await loadParticipantMohsRows(supabase, userId);
    const totals = summarizePersonalMohsRows(rows);
    const desired = buildMohsThresholdAwards(rows.map(toMohsRecord));
    const desiredBySourceId = new Map(desired.map((award) => [award.sourceId, award] as const));
    const existingRows = await loadExistingMohsEvents(supabase, userId);
    const existingBySourceId = new Map(existingRows.map((row) => [row.source_id, row] as const));
    const eventsToRemove = existingRows
      .filter((row) => isCurrentMohsMetadata(row.metadata) && !desiredBySourceId.has(row.source_id))
      .map((row) => Number(row.id))
      .filter((id) => Number.isSafeInteger(id));
    const eventsToAdd = desired
      .filter((award) => !existingBySourceId.has(award.sourceId))
      .map((award) => buildMohsEventPayload(userId, award));
    const eventsToUpdate = desired.flatMap((award) => {
      const existing = existingBySourceId.get(award.sourceId);
      const existingMetadata = isCurrentMohsMetadata(existing?.metadata)
        ? existing.metadata
        : null;
      // Rows written by the current reconciler carry mohsVersion. Legacy rows
      // without method metadata remain untouched rather than being rewritten
      // under a new scientific method.
      if (!existing || !existingMetadata ||
        (existing.occurred_on === award.occurredOn && existingMetadata.impactCalculationVersion === MOHS_IMPACT_CALCULATION_VERSION)) {
        return [];
      }
      return [{ id: Number(existing.id), ...buildMohsEventPayload(userId, award) }];
    });
    const sourceFingerprint = buildMohsSourceFingerprint(rows);
    const receiptIntent = options.persistScientificReceiptIntent &&
      (eventsToAdd.length > 0 || eventsToUpdate.length > 0 || eventsToRemove.length > 0)
      ? {
          kind: "scientific_impact_reconciliation_pending" as const,
          schemaVersion: 1 as const,
          reconciliationId: buildMohsScientificReconciliationId(
            userId,
            MOHS_IMPACT_CALCULATION_VERSION,
            sourceFingerprint,
          ),
          userId,
          scientificImpact: {
            methodVersion: MOHS_IMPACT_CALCULATION_VERSION,
            sourceFingerprint,
            eventsAdded: eventsToAdd.length,
            eventsUpdated: eventsToUpdate.length,
            eventsRemoved: eventsToRemove.length,
          },
        } satisfies ScientificImpactReceiptIntent
      : undefined;
    const applied = await applyMohsReconciliationTransaction(supabase, {
      userId,
      expectedEvents: existingRows,
      eventsToAdd,
      eventsToUpdate,
      eventsToRemove,
      receiptIntent,
    });
    if (applied.status === "conflict") {
      if (attempt === 2) throw new MohsReconciliationConflictError();
      continue;
    }
    return {
      totals,
      inserted: applied.inserted,
      updated: applied.updated,
      removed: applied.removed,
      eligibleSourceRows: rows.length,
      methodVersion: MOHS_IMPACT_CALCULATION_VERSION,
      sourceFingerprint,
    };
  }
  throw new MohsReconciliationConflictError();
}

function buildMohsEventPayload(
  userId: string,
  award: ReturnType<typeof buildMohsThresholdAwards>[number],
) {
  return {
    user_id: userId,
    event_type: MOHS_EVENT_TYPE_BY_FAMILY[award.family] as ProgressionEventType,
    source_table: MOHS_SOURCE_TABLE,
    source_id: award.sourceId,
    status_phase: "validated" as const,
    weight: 1,
    xp_base: award.xp,
    xp_awarded: award.xp,
    occurred_on: award.occurredOn,
    metadata: {
      classification: "impact_badge",
      impactBadge: `mohs_${award.family}`,
      badgeId: `mohs_${award.family}`,
      grade: award.grade,
      threshold: award.threshold,
      xpPerGrade: award.xp,
      mohsVersion: MOHS_PROGRESSION_VERSION,
      impactCalculationVersion: MOHS_IMPACT_CALCULATION_VERSION,
      sourceContract: "confirmed_action_participants",
    },
  };
}

function eventSnapshot(events: readonly ExistingMohsEvent[]) {
  return [...events]
    .sort((left, right) => Number(left.id) - Number(right.id))
    .map((event) => ({
      id: Number(event.id),
      event_type: event.event_type,
      source_table: MOHS_SOURCE_TABLE,
      source_id: event.source_id,
      status_phase: event.status_phase,
      weight: event.weight === null || event.weight === undefined ? null : Number(event.weight),
      xp_base: event.xp_base === null || event.xp_base === undefined ? null : Number(event.xp_base),
      xp_awarded: event.xp_awarded === null || event.xp_awarded === undefined ? null : Number(event.xp_awarded),
      occurred_on: event.occurred_on ?? null,
      metadata: event.metadata ?? {},
    }));
}

async function applyMohsReconciliationTransaction(
  supabase: SupabaseClient,
  params: {
    userId: string;
    expectedEvents: readonly ExistingMohsEvent[];
    eventsToAdd: readonly Record<string, unknown>[];
    eventsToUpdate: readonly Record<string, unknown>[];
    eventsToRemove: readonly number[];
    receiptIntent?: ScientificImpactReceiptIntent;
  },
): Promise<{ status: "applied" | "conflict"; inserted: number; updated: number; removed: number }> {
  const response = await supabase.rpc(
    params.receiptIntent
      ? "apply_mohs_impact_reconciliation_with_receipt"
      : "apply_mohs_impact_reconciliation",
    {
      p_user_id: params.userId,
      p_expected_events: eventSnapshot(params.expectedEvents),
      p_events_to_add: params.eventsToAdd,
      p_events_to_update: params.eventsToUpdate,
      p_events_to_remove: params.eventsToRemove,
      ...(params.receiptIntent ? { p_scientific_receipt_intent: params.receiptIntent } : {}),
    },
  );
  if (response.error) throw new Error(response.error.message);
  const result = response.data as { status?: string; inserted?: number; updated?: number; removed?: number } | null;
  if (result?.status === "conflict") {
    return { status: "conflict", inserted: 0, updated: 0, removed: 0 };
  }
  if (result?.status !== "applied") throw new Error("La RPC de réconciliation Mohs a renvoyé une réponse invalide.");
  return {
    status: "applied",
    inserted: Number(result.inserted ?? 0),
    updated: Number(result.updated ?? 0),
    removed: Number(result.removed ?? 0),
  };
}
