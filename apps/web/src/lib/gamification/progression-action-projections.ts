import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { evaluateActionQuality } from "@/lib/actions/quality/quality";
import type { ActionRow } from "./progression-types";
import {
  actionRowToListItem,
  evaluateActionQualityScore,
  toFloat,
  toInt,
} from "./progression-utils";

const SPONTANEOUS_ASSOCIATION_KEY = "action spontanee";

function normalizeAssociationName(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isSpontaneousActionAssociationName(
  associationName: string | null | undefined,
): boolean {
  return normalizeAssociationName(associationName) === SPONTANEOUS_ASSOCIATION_KEY;
}

export function isSpontaneousActionNotes(notes: string | null | undefined): boolean {
  return isSpontaneousActionAssociationName(
    extractActionMetadataFromNotes(notes).associationName,
  );
}

export function aggregateUserImpactStats(rows: readonly ActionRow[]) {
  const grouped = new Map<string, {
    qualitySum: number;
    validatedActions: number;
    wasteKg: number;
    wasteKnownActions: number;
    totalButts: number;
  }>();

  for (const row of rows) {
    if (!isSpontaneousActionNotes(row.notes)) continue;
    const quality = evaluateActionQualityScore(row).score;
    const previous = grouped.get(row.created_by_clerk_id) ?? {
      qualitySum: 0,
      validatedActions: 0,
      wasteKg: 0,
      wasteKnownActions: 0,
      totalButts: 0,
    };
    previous.qualitySum += quality;
    previous.validatedActions += 1;
    if (row.waste_kg !== null && Number.isFinite(Number(row.waste_kg)) && Number(row.waste_kg) >= 0) {
      previous.wasteKg += toFloat(row.waste_kg, 0);
      previous.wasteKnownActions += 1;
    }
    previous.totalButts += toInt(row.cigarette_butts, 0);
    grouped.set(row.created_by_clerk_id, previous);
  }

  return new Map(Array.from(grouped.entries(), ([userId, value]) => [userId, {
    qualityAverage:
      value.validatedActions > 0
        ? Math.round((value.qualitySum / value.validatedActions) * 10) / 10
        : 0,
    validatedActions: value.validatedActions,
    wasteKg: Math.round(value.wasteKg * 10) / 10,
    wasteCoverageRate:
      value.validatedActions > 0
        ? (value.wasteKnownActions / value.validatedActions) * 100
        : 0,
    totalButts: value.totalButts,
  }]));
}

export function actionQualityScoreFromRow(row: ActionRow): number {
  return evaluateActionQualityScore(row).score;
}

export function parseAssociationNameFromActionNotes(notes: string | null): string {
  const metadata = extractActionMetadataFromNotes(notes);
  return metadata.associationName?.trim() || "Sans association";
}

export function actionListItemFromRow(row: ActionRow) {
  return actionRowToListItem(row);
}

export function completeActionCount(
  rows: readonly ActionRow[],
  validatedActionIds: ReadonlySet<string>,
): number {
  let count = 0;
  for (const row of rows) {
    if (!validatedActionIds.has(row.id)) continue;
    const quality = evaluateActionQuality(actionRowToListItem(row));
    if (quality.breakdown.completeness >= 100) count += 1;
  }
  return count;
}
