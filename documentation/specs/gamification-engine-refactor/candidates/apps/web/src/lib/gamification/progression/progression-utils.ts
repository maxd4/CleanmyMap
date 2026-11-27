import { parseDrawingFromNotes } from "@/lib/actions/geometry/drawing";
import { parseDrawingFromGeoJson } from "@/lib/actions/geometry/derived-geometry";
import { evaluateActionQuality, type ActionQualityGrade } from "@/lib/actions/quality/quality";
import type { ActionDrawing, ActionListItem } from "@/lib/actions/types";
import { toNullableFiniteNumber } from "@/lib/data/number-normalization";
import type { ActionRow, ActionTimelineRow } from "./progression-types";

// Historical import surface; registry consumers should use the canonical module.
export {
  CURRENT_MILESTONES,
  CURRENT_INFINITE_PROGRESSIONS,
  NON_GAMIFIED_SIGNALS,
  CURRENT_TERRITORIAL_LEGEND_MECHANICS,
  GAMIFICATION_REGISTRY,
  currentInfiniteProgressions,
  currentMilestones,
  gamificationEventRegistry,
  eventFamilyMap,
} from "./gamification-registry";

export function toIsoDate(raw: string | null | undefined): string {
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }
  return raw.slice(0, 10);
}
export function clampWeight(weight: number): number {
  return Math.min(5, Math.max(1, Math.round(weight)));
}

export function toInt(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}
export function toFloat(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
export const toNullableFloat = toNullableFiniteNumber;

export function actionRowToListItem(row: ActionTimelineRow): ActionListItem {
  return {
    id: row.id,
    created_at: row.created_at,
    actor_name: row.actor_name,
    action_date: row.action_date,
    location_label: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    waste_kg: toNullableFloat(row.waste_kg),
    cigarette_butts: toInt(row.cigarette_butts, 0),
    volunteers_count: toInt(row.volunteers_count, 1),
    duration_minutes: toInt(row.duration_minutes, 0),
    notes: row.notes,
    status: row.status,
  };
}

export function actionRowToDrawing(row: ActionTimelineRow): ActionDrawing | null {
  return (
    parseDrawingFromGeoJson(
      row.derived_geometry_geojson,
      row.derived_geometry_kind ?? null,
    ) ?? parseDrawingFromNotes(row.notes).manualDrawing
  );
}

export function inferActionWeight(row: ActionRow): number {
  const hasDuration = toInt(row.duration_minutes, 0) > 0;
  const hasWaste = toFloat(row.waste_kg, 0) > 0;
  const hasLocation = (row.location_label ?? "").trim().length >= 3;
  const hasGeo = row.latitude !== null && row.longitude !== null;
  const notesLength = (row.notes ?? "").trim().length;

  if (hasDuration && hasWaste && hasLocation && hasGeo && notesLength >= 20) {
    return 5;
  }
  if (hasDuration && hasWaste && hasLocation) {
    return 3;
  }
  return 1;
}

export function computeActionPendingAward(weight: number): {
  xpBase: number;
  xpAwarded: number;
} {
  void weight;
  // No XP for non-validated (pending) contributions.
  const xpBase = 0;
  return {
    xpBase,
    xpAwarded: 0,
  };
}

export function computeActionValidationAward(
  weight: number,
  qualityGrade: ActionQualityGrade,
  organizerCount = 1,
): {
  xpBase: number;
  xpAwarded: number;
} {
  // XP is awarded only once a real action has been validated by the CURRENT
  // post-action contract. The dedicated one-shot facts are written separately.
  // The base reward is 1 XP, then split equally across all organizers.
  void weight;
  void qualityGrade;
  const safeOrganizerCount = Math.max(1, Math.trunc(organizerCount));
  return {
    xpBase: 1,
    xpAwarded: 1 / safeOrganizerCount,
  };
}

export function evaluateActionQualityScore(row: ActionTimelineRow): {
  score: number;
  grade: ActionQualityGrade;
} {
  return evaluateActionQuality(actionRowToListItem(row));
}
