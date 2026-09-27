import { parseDrawingFromNotes } from "@/lib/actions/geometry/drawing";
import { parseDrawingFromGeoJson } from "@/lib/actions/geometry/derived-geometry";
import { evaluateActionQuality, type ActionQualityGrade } from "@/lib/actions/quality/quality";
import type { ActionDrawing, ActionListItem } from "@/lib/actions/types";
import { CURRENT_MILESTONES } from "./current-milestones";
import type {
  ActionRow,
  CurrentInfiniteProgressionId,
  GamificationEventRegistration,
  MilestoneDefinition,
  GamificationProgressionDefinition,
  ProgressionEventType,
} from "./progression-types";
export const CURRENT_INFINITE_PROGRESSIONS = [
  {
    id: "participation",
    label: "Participation",
    description: "Participations finales confirmées à des actions.",
    metric: "participation_count",
    sourceDomain: "action_participants.confirmed",
    badgeFamily: "participant",
    scale: "participant",
    infinite: true,
  },
  {
    id: "organisation",
    label: "Organisation",
    description: "Actions réellement organisées et validées.",
    metric: "validated_organized_actions_count",
    sourceDomain: "actions + action_organizers + validation post-action CURRENT",
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
  { id: "moderation", label: "Modération", description: "Dossiers de modération uniques réellement résolus.", metric: "resolvedModerationCases", sourceDomain: "admin_operations_audit (moderation/success)", badgeFamily: "moderation", scale: "gem", infinite: true },
] as const satisfies readonly GamificationProgressionDefinition[];
export { CURRENT_MILESTONES } from "./current-milestones";
const GAMIFICATION_EVENT_REGISTRY: Record<
  ProgressionEventType,
  GamificationEventRegistration
> = {
  action_declare_pending: {
    classification: "non_progression",
    reason: "Une déclaration en attente ne constitue ni une participation confirmée ni une organisation validée.",
  },
  action_declare_validation: {
    classification: "progression",
    progressionId: "organisation",
  },
  first_trace_utile: {
    classification: "milestone",
    milestoneId: "premiere_trace_utile",
  },
  action_loop_completed: {
    classification: "milestone",
    milestoneId: "boucle_bouclee",
  },
  action_mobilizer: {
    classification: "milestone",
    milestoneId: "mobilisateur",
  },
  action_participation_recovered: {
    classification: "milestone",
    milestoneId: "participation_retrouvee",
  },
  action_exemplary_data: {
    classification: "milestone",
    milestoneId: "donnee_exemplaire",
  },
  action_documented_route: {
    classification: "milestone",
    milestoneId: "parcours_documente",
  },
  action_traceable_measurement: {
    classification: "milestone",
    milestoneId: "mesure_tracable",
  },
  action_documented_sorting: {
    classification: "milestone",
    milestoneId: "tri_documente",
  },
  action_formalities_prepared: {
    classification: "milestone",
    milestoneId: "formalites_preparees",
  },
  action_monthly_regularity: {
    classification: "progression",
    progressionId: "regularity",
  },
  action_balance_cycle: {
    classification: "progression",
    progressionId: "versatility",
  },
  collective_rsvp_yes_pending: {
    classification: "non_progression",
    reason: "Une inscription future ne constitue pas une participation confirmée.",
  },
  collective_attendance_confirmed: {
    classification: "non_progression",
    reason: "Une présence à un événement communautaire ne compte pas comme participation à une action.",
  },
  spot_create_pending: {
    classification: "non_progression",
    reason: "Un signalement en attente ne constitue pas une participation confirmée.",
  },
  spot_validation_bonus: {
    classification: "non_progression",
    reason: "Le bonus historique de validation de signalement n'est pas la source Clean Zones canonique.",
  },
  community_ops_update: {
    classification: "non_progression",
    reason: "Les opérations communautaires historiques ne sont pas une action organisée validée.",
  },
  community_referral_invite: {
    classification: "milestone",
    milestoneId: "parrainage_utile",
  },
  route_recommend_use: {
    classification: "non_progression",
    reason: "Usage utilitaire d'itinéraire, à traiter hors des huit progressions.",
  },
  infinite_waste_milestone: {
    classification: "impact_badge",
    impactBadgeId: "mohs_waste",
  },
  infinite_butts_milestone: {
    classification: "impact_badge",
    impactBadgeId: "mohs_butts",
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
    reason: "Événement Forms historique COMPATIBILITY, hors des huit progressions CURRENT.",
  },
  form_bonus: {
    classification: "non_progression",
    reason: "Bonus Forms historique COMPATIBILITY, hors des huit progressions CURRENT.",
  },
  participant_tier_unlock: {
    classification: "progression",
    progressionId: "participation",
  },
  explorer_tier_unlock: {
    classification: "progression",
    progressionId: "exploration",
  },
  sensitive_zone_action: {
    classification: "non_progression",
    reason:
      "Preuve historique de qualification de zone, sans balance XP indépendante.",
  },
  sensitive_zone_milestone: {
    classification: "non_progression",
    reason: "Jalon historique de zone sensible, hors des trois jalons CURRENT.",
  },
  moderation_case_resolved: {
    classification: "non_progression",
    reason: "Un dossier résolu alimente la métrique Modération; seul un palier peut attribuer de l’XP.",
  },
  moderation_tier_unlock: {
    classification: "progression",
    progressionId: "moderation",
  },
  moderation_first_case: {
    classification: "milestone",
    milestoneId: "premiere_moderation",
  },
  moderation_first_participation: {
    classification: "milestone",
    milestoneId: "premiere_validation_participation",
  },
  moderation_first_impact_correction: {
    classification: "milestone",
    milestoneId: "premiere_correction_impact_justifiee",
  },
  moderation_multi_family: {
    classification: "milestone",
    milestoneId: "moderateur_polyvalent",
  },
};
export function currentInfiniteProgressions(): readonly GamificationProgressionDefinition[] {
  return CURRENT_INFINITE_PROGRESSIONS;
}
export function currentMilestones(): readonly MilestoneDefinition[] {
  return CURRENT_MILESTONES;
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

export function evaluateActionQualityScore(row: ActionRow): {
  score: number;
  grade: ActionQualityGrade;
} {
  return evaluateActionQuality(actionRowToListItem(row));
}
