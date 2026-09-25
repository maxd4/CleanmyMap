import { parseDrawingFromNotes } from "@/lib/actions/geometry/drawing";
import { parseDrawingFromGeoJson } from "@/lib/actions/geometry/derived-geometry";
import { evaluateActionQuality, type ActionQualityGrade } from "@/lib/actions/quality/quality";
import type { ActionDrawing, ActionListItem } from "@/lib/actions/types";
import type {
  ActionRow,
  CurrentInfiniteProgressionId,
  GamificationEventRegistration,
  GamificationProgressionDefinition,
  ProgressionEventType,
} from "./progression-types";

export const CURRENT_INFINITE_PROGRESSIONS = [
  {
    id: "participation",
    label: "Participation",
    description: "Contributions et participations métier confirmées.",
    metric: "participation_count",
    sourceDomain: "actions, participations et signalements utiles",
    badgeFamily: "participant",
    scale: "participant",
    infinite: true,
  },
  {
    id: "organisation",
    label: "Organisation",
    description: "Organisation d'actions et opérations collectives utiles.",
    metric: "organised_operations_count",
    sourceDomain: "organisateurs d'actions et opérations collectives",
    badgeFamily: "organisation",
    scale: "gem",
    infinite: true,
  },
  {
    id: "exploration",
    label: "Exploration",
    description: "Découverte de lieux distincts et couverture cartographique.",
    metric: "unique_places_visited",
    sourceDomain: "user_visited_places",
    badgeFamily: "explorer",
    scale: "exploration",
    infinite: true,
  },
  {
    id: "clean_zones",
    label: "Zones propres",
    description: "Lieux propres validés ou nettoyés, dédoublonnés par zone.",
    metric: "eligible_clean_zones",
    sourceDomain: "trash_spotter_spots / clean_zones",
    badgeFamily: "clean-zones",
    scale: "atmosphere",
    infinite: true,
  },
  {
    id: "regularity",
    label: "Régularité",
    description: "Participation utile sur des mois calendaires consécutifs.",
    metric: "consecutive_active_months",
    sourceDomain: "actions par mois",
    badgeFamily: "regularity",
    scale: "gem",
    infinite: true,
  },
  {
    id: "versatility",
    label: "Polyvalence",
    description: "Diversité des contextes de contribution validés.",
    metric: "validated_context_cycles",
    sourceDomain: "actions et contextes de contribution",
    badgeFamily: "versatility",
    scale: "gem",
    infinite: true,
  },
  {
    id: "learning",
    label: "Apprentissage",
    description: "Réponses justes et progression des apprentissages utiles.",
    metric: "validated_learning_events",
    sourceDomain: "quiz_type_progress et contenus d'apprentissage",
    badgeFamily: "learning",
    scale: "learning",
    infinite: true,
  },
] as const satisfies readonly GamificationProgressionDefinition[];

const GAMIFICATION_EVENT_REGISTRY: Record<
  ProgressionEventType,
  GamificationEventRegistration
> = {
  action_declare_pending: {
    classification: "progression",
    progressionId: "participation",
  },
  action_declare_validation: {
    classification: "progression",
    progressionId: "participation",
  },
  action_monthly_regularity: {
    classification: "progression",
    progressionId: "regularity",
  },
  collective_rsvp_yes_pending: {
    classification: "progression",
    progressionId: "participation",
  },
  collective_attendance_confirmed: {
    classification: "progression",
    progressionId: "participation",
  },
  spot_create_pending: {
    classification: "progression",
    progressionId: "participation",
  },
  spot_validation_bonus: {
    classification: "progression",
    progressionId: "participation",
  },
  community_ops_update: {
    classification: "progression",
    progressionId: "organisation",
  },
  community_referral_invite: {
    classification: "milestone",
    milestoneId: "parrainage_utile",
  },
  route_recommend_use: {
    classification: "non_progression",
    reason: "Usage utilitaire d'itinéraire, à traiter hors des sept progressions.",
  },
  infinite_waste_milestone: {
    classification: "non_progression",
    reason: "Métrique d'impact historique, conservée hors de la taxonomie CURRENT.",
  },
  infinite_butts_milestone: {
    classification: "non_progression",
    reason: "Métrique d'impact historique, conservée hors de la taxonomie CURRENT.",
  },
  new_place_discovered: {
    classification: "progression",
    progressionId: "exploration",
  },
  new_place_milestone: {
    classification: "progression",
    progressionId: "exploration",
  },
  quiz_question_type_milestone: {
    classification: "progression",
    progressionId: "learning",
  },
  quiz_question_type_balance_milestone: {
    classification: "progression",
    progressionId: "learning",
  },
  clean_zone_task: {
    classification: "progression",
    progressionId: "clean_zones",
  },
  form_tier_unlock: {
    classification: "non_progression",
    reason: "Badge de compatibilité Forms, hors des sept progressions CURRENT.",
  },
  form_bonus: {
    classification: "non_progression",
    reason: "Bonus historique Forms, hors des sept progressions CURRENT.",
  },
  participant_tier_unlock: {
    classification: "progression",
    progressionId: "participation",
  },
  explorer_tier_unlock: {
    classification: "progression",
    progressionId: "exploration",
  },
};

export function currentInfiniteProgressions(): readonly GamificationProgressionDefinition[] {
  return CURRENT_INFINITE_PROGRESSIONS;
}

export function gamificationEventRegistry(): Readonly<
  Record<ProgressionEventType, GamificationEventRegistration>
> {
  return GAMIFICATION_EVENT_REGISTRY;
}

const EVENT_FAMILY_MAP: Readonly<
  Record<ProgressionEventType, CurrentInfiniteProgressionId | null>
> = Object.fromEntries(
  Object.entries(GAMIFICATION_EVENT_REGISTRY).map(([eventType, registration]) => [
    eventType,
    registration.classification === "progression"
      ? registration.progressionId
      : null,
  ]),
) as Record<ProgressionEventType, CurrentInfiniteProgressionId | null>;

export function eventFamilyMap(): Readonly<
  Record<ProgressionEventType, CurrentInfiniteProgressionId | null>
> {
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

export function toNullableFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
    waste_kg: toNullableFloat(row.waste_kg),
    cigarette_butts: toInt(row.cigarette_butts, 0),
    volunteers_count: toInt(row.volunteers_count, 1),
    duration_minutes: toInt(row.duration_minutes, 0),
    notes: row.notes,
    status: row.status,
  };
}

export function actionRowToDrawing(row: ActionRow): ActionDrawing | null {
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
  // XP is awarded only once a real action has been validated through an issued form.
  // The base reward is 1 XP, then split equally across all organizers.
  void weight;
  void qualityGrade;
  const safeOrganizerCount = Math.max(1, Math.trunc(organizerCount));
  return {
    xpBase: 1,
    xpAwarded: 1 / safeOrganizerCount,
  };
}

export function evaluateActionQualityScore(row: ActionRow): {
  score: number;
  grade: ActionQualityGrade;
} {
  return evaluateActionQuality(actionRowToListItem(row));
}
