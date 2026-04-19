import { evaluateActionQuality, type ActionQualityGrade } from "@/lib/actions/quality";
import type { ActionListItem } from "@/lib/actions/types";
import type { ActionRow, ProgressionEventType } from "./progression-types";

const EVENT_FAMILY_MAP: Record<ProgressionEventType, string> = {
  action_declare_pending: "action",
  action_declare_validation: "action",
  collective_rsvp_yes_pending: "collectif",
  collective_attendance_confirmed: "collectif",
  spot_create_pending: "spotter",
  spot_validation_bonus: "spotter",
  community_ops_update: "communaute",
  route_recommend_use: "itineraire",
};

export function eventFamilyMap(): Readonly<Record<ProgressionEventType, string>> {
  return EVENT_FAMILY_MAP;
}

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

export function actionRowToListItem(row: ActionRow): ActionListItem {
  return {
    id: row.id,
    created_at: row.created_at,
    actor_name: row.actor_name,
    action_date: row.action_date,
    location_label: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    waste_kg: toFloat(row.waste_kg, 0),
    cigarette_butts: toInt(row.cigarette_butts, 0),
    volunteers_count: toInt(row.volunteers_count, 1),
    duration_minutes: toInt(row.duration_minutes, 0),
    notes: row.notes,
    status: row.status,
  };
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

export function qualityBonusRate(grade: ActionQualityGrade): number {
  if (grade === "A") {
    return 0.2;
  }
  if (grade === "B") {
    return 0.1;
  }
  return 0;
}

export function computeActionPendingAward(weight: number): {
  xpBase: number;
  xpAwarded: number;
} {
  const xpBase = clampWeight(weight) * 10;
  return {
    xpBase,
    xpAwarded: Math.round(xpBase * 0.4),
  };
}

export function computeActionValidationAward(
  weight: number,
  qualityGrade: ActionQualityGrade,
): {
  xpBase: number;
  xpAwarded: number;
} {
  const xpBase = clampWeight(weight) * 10;
  const bonus = xpBase * qualityBonusRate(qualityGrade);
  return {
    xpBase,
    xpAwarded: Math.round(xpBase * 0.6 + bonus),
  };
}

export function evaluateActionQualityScore(row: ActionRow): {
  score: number;
  grade: ActionQualityGrade;
} {
  return evaluateActionQuality(actionRowToListItem(row));
}
