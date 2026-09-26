import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadConfirmedParticipantImpactAttributions,
  type ConfirmedParticipantImpactAttribution,
} from "@/lib/actions/participation/group-participation-read";
import { insertProgressionEvent } from "./progression-data";
import {
  buildMohsThresholdAwards,
  MOHS_EVENT_TYPE_BY_FAMILY,
  MOHS_IMPACT_FAMILIES,
  MOHS_PROGRESSION_VERSION,
  MOHS_SOURCE_TABLE,
  type MohsImpactRecord,
} from "./mohs-progression";
import type { ProgressionEventType } from "./progression-types";

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
  removed: number;
};

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

export async function loadPersonalMohsImpactTotals(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalMohsImpactTotals> {
  const rows = await loadConfirmedParticipantImpactAttributions(supabase, userId);
  return summarizePersonalMohsRows(rows);
}

async function loadParticipantMohsRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConfirmedParticipantImpactAttribution[]> {
  return loadConfirmedParticipantImpactAttributions(supabase, userId);
}

export async function reconcileMohsImpactProgression(
  supabase: SupabaseClient,
  userId: string,
): Promise<MohsReconciliationResult> {
  const rows = await loadParticipantMohsRows(supabase, userId);
  const totals = summarizePersonalMohsRows(rows);

  const records = rows.map(toMohsRecord);
  const desired = buildMohsThresholdAwards(records);
  const desiredBySourceId = new Map(desired.map((award) => [award.sourceId, award] as const));
  const eventTypes = MOHS_IMPACT_FAMILIES.map((family) => MOHS_EVENT_TYPE_BY_FAMILY[family]);
  const existingResult = await supabase
    .from("progression_events")
    .select("id, event_type, source_id, status_phase")
    .eq("user_id", userId)
    .eq("source_table", MOHS_SOURCE_TABLE)
    .in("event_type", eventTypes)
    .limit(1000);
  if (existingResult.error) throw new Error(existingResult.error.message);

  const existingRows = (existingResult.data ?? []) as Array<{
    id: string;
    event_type: ProgressionEventType;
    source_id: string;
    status_phase: string;
  }>;
  const removableIds = existingRows
    .filter((row) => !desiredBySourceId.has(row.source_id))
    .map((row) => row.id)
    .filter(Boolean);
  let removed = 0;
  if (removableIds.length > 0) {
    const removal = await supabase.from("progression_events").delete().in("id", removableIds);
    if (removal.error) throw new Error(removal.error.message);
    removed = removableIds.length;
  }

  const existingDesired = new Set(
    existingRows
      .filter((row) => desiredBySourceId.has(row.source_id))
      .map((row) => row.source_id),
  );
  let inserted = 0;
  for (const award of desired) {
    if (existingDesired.has(award.sourceId)) continue;
    const eventType = MOHS_EVENT_TYPE_BY_FAMILY[award.family] as ProgressionEventType;
    inserted += Number(await insertProgressionEvent(supabase, {
      userId,
      eventType,
      sourceTable: MOHS_SOURCE_TABLE,
      sourceId: award.sourceId,
      statusPhase: "validated",
      weight: 1,
      xpBase: award.xp,
      xpAwarded: award.xp,
      occurredOn: award.occurredOn,
      metadata: {
        classification: "impact_badge",
        impactBadge: `mohs_${award.family}`,
        grade: award.grade,
        threshold: award.threshold,
        xpPerGrade: award.xp,
        mohsVersion: MOHS_PROGRESSION_VERSION,
        sourceContract: "confirmed_action_participants",
      },
    }));
  }

  return { totals, inserted, removed };
}
