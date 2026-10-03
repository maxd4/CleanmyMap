import { parseDrawingFromNotes } from "@/lib/actions/geometry/drawing";
import { parseDrawingFromGeoJson } from "@/lib/actions/geometry/derived-geometry";
import { evaluateActionQuality, type ActionQualityGrade } from "@/lib/actions/quality/quality";
import type { ActionDrawing, ActionListItem } from "@/lib/actions/types";
import { CURRENT_MILESTONES } from "./current-milestones";
import { CURRENT_INFINITE_PROGRESSIONS } from "./current-progressions";
import { CURRENT_GAMIFICATION_RULES_VERSION } from "./progression-types";
import type {
  ActionRow,
  GamificationProgressionDefinition,
  GamificationEventRegistration,
  GamificationMechanicDefinition,
  CurrentInfiniteProgressionId,
  MilestoneDefinition,
  ProgressionEventType,
} from "./progression-types";
export { CURRENT_MILESTONES } from "./current-milestones";
export { CURRENT_INFINITE_PROGRESSIONS } from "./current-progressions";

const NON_GAMIFIED_SIGNAL_REASONS = {
  antiFarming: "Exclu pour éviter le farming et distinguer preuve métier et activité gamifiée.",
  dataIntegrity: "Exclu pour ne pas créer d’incitation à sur-déclarer ou à embellir une donnée.",
  sensitiveData: "Exclu pour ne pas récompenser une donnée sensible ou démographique.",
  freeText: "Exclu car un texte libre est facilement manipulable et ne constitue pas une preuve métier stable.",
  trustAuthz: "Exclu : la confiance et l’AuthZ restent des garde-fous hors de l’économie XP.",
  utility: "Exclu : usage utilitaire ou intention future, sans accomplissement métier final.",
} as const;

function defineNonGamifiedSignal(
  input: Pick<GamificationMechanicDefinition, "id" | "sourceDomain" | "description">,
): GamificationMechanicDefinition {
  return {
    ...input,
    category: "NON_GAMIFIED",
    progressionId: null,
    xpPolicy: { kind: "none", reason: NON_GAMIFIED_SIGNAL_REASONS.antiFarming },
    badgeId: null,
    milestoneId: null,
    visibility: "not_exposed",
    rulesVersion: CURRENT_GAMIFICATION_RULES_VERSION,
    introducedInRulesRevision: 1,
  };
}

export const NON_GAMIFIED_SIGNALS = [
  defineNonGamifiedSignal({ id: "signal:waste-total-direct-xp", sourceDomain: "actions.waste_kg", description: `Poids total de déchets comme conversion directe en XP. ${NON_GAMIFIED_SIGNAL_REASONS.dataIntegrity}` }),
  defineNonGamifiedSignal({ id: "signal:cigarette-butts-direct-xp", sourceDomain: "actions.cigarette_butts", description: `Nombre de mégots comme conversion directe en XP. ${NON_GAMIFIED_SIGNAL_REASONS.dataIntegrity}` }),
  defineNonGamifiedSignal({ id: "signal:waste-and-butts-current-progression", sourceDomain: "actions.waste_kg + actions.cigarette_butts", description: `Kg ou mégots comme progression CURRENT. ${NON_GAMIFIED_SIGNAL_REASONS.antiFarming}` }),
  defineNonGamifiedSignal({ id: "signal:demographic-breakdown", sourceDomain: "action participant demographic fields", description: `Répartition enfants/adultes/retraités. ${NON_GAMIFIED_SIGNAL_REASONS.sensitiveData}` }),
  defineNonGamifiedSignal({ id: "signal:demographic-fields-reward", sourceDomain: "profil et données démographiques", description: `Champs démographiques comme source de récompense. ${NON_GAMIFIED_SIGNAL_REASONS.sensitiveData}` }),
  defineNonGamifiedSignal({ id: "signal:action-difficulty", sourceDomain: "action qualification", description: `Difficulté déclarée de l’action. ${NON_GAMIFIED_SIGNAL_REASONS.dataIntegrity}` }),
  defineNonGamifiedSignal({ id: "signal:action-accessibility", sourceDomain: "action accessibility metadata", description: `Accessibilité d’une action. ${NON_GAMIFIED_SIGNAL_REASONS.dataIntegrity}` }),
  defineNonGamifiedSignal({ id: "signal:safety-instructions-text", sourceDomain: "actions.safetyInstructions", description: `Contenu libre de safetyInstructions. ${NON_GAMIFIED_SIGNAL_REASONS.freeText}` }),
  defineNonGamifiedSignal({ id: "signal:recommended-materials-text", sourceDomain: "actions.recommendedMaterials", description: `Contenu libre de recommendedMaterials. ${NON_GAMIFIED_SIGNAL_REASONS.freeText}` }),
  defineNonGamifiedSignal({ id: "signal:logistics-notes-text", sourceDomain: "actions.logisticsNotes", description: `Contenu libre de logisticsNotes. ${NON_GAMIFIED_SIGNAL_REASONS.freeText}` }),
  defineNonGamifiedSignal({ id: "signal:departure-checklist-text", sourceDomain: "actions.checklistBeforeDeparture", description: `Contenu libre de checklistBeforeDeparture. ${NON_GAMIFIED_SIGNAL_REASONS.freeText}` }),
  defineNonGamifiedSignal({ id: "signal:group-join-enabled", sourceDomain: "actions.groupJoinEnabled", description: `Simple activation de groupJoinEnabled. ${NON_GAMIFIED_SIGNAL_REASONS.utility}` }),
  defineNonGamifiedSignal({ id: "signal:future-action-registration", sourceDomain: "action_registrations", description: `Simple inscription future à une action. ${NON_GAMIFIED_SIGNAL_REASONS.utility}` }),
  defineNonGamifiedSignal({ id: "signal:future-registration-acceptance", sourceDomain: "action_registrations.status", description: `Simple acceptation d’une inscription future. ${NON_GAMIFIED_SIGNAL_REASONS.utility}` }),
  defineNonGamifiedSignal({ id: "signal:join-click", sourceDomain: "join action UI", description: `Clic sur rejoindre. ${NON_GAMIFIED_SIGNAL_REASONS.utility}` }),
  defineNonGamifiedSignal({ id: "signal:registration-cancellation-or-queue", sourceDomain: "action_registrations workflow", description: `Annulation d’inscription, ajout à une file ou acceptation préalable. ${NON_GAMIFIED_SIGNAL_REASONS.utility}` }),
  defineNonGamifiedSignal({ id: "signal:referral-link-generation", sourceDomain: "referral link creation", description: `Simple génération d’un lien de parrainage. ${NON_GAMIFIED_SIGNAL_REASONS.utility}` }),
  defineNonGamifiedSignal({ id: "signal:donation-amount", sourceDomain: "donation amount", description: `Montant d’un don : aucune XP, aucun badge de mérite et aucune influence sur un futur tirage. ${NON_GAMIFIED_SIGNAL_REASONS.dataIntegrity}` }),
  defineNonGamifiedSignal({ id: "signal:user-role", sourceDomain: "AuthZ role", description: `Rôle utilisateur. ${NON_GAMIFIED_SIGNAL_REASONS.trustAuthz}` }),
  defineNonGamifiedSignal({ id: "signal:trust-level", sourceDomain: "derived trust level", description: `Niveau de confiance comme monnaie ou progression XP. ${NON_GAMIFIED_SIGNAL_REASONS.trustAuthz}` }),
  defineNonGamifiedSignal({ id: "signal:quality-score", sourceDomain: "action quality score", description: `Score qualité comme progression infinie. La qualité peut conditionner un niveau ou déclencher Donnée exemplaire, mais ne constitue pas une monnaie.` }),
  defineNonGamifiedSignal({ id: "signal:form-completion", sourceDomain: "Forms completion", description: `Remplissage de formulaire pour lui-même. Forms reste une preuve de workflow, pas une activité gamifiée.` }),
  defineNonGamifiedSignal({ id: "signal:photos-upload", sourceDomain: "action photos upload", description: `Upload d’une photo en soi. Une photo peut fournir une preuve à une autre règle sans créer une mécanique autonome.` }),
  defineNonGamifiedSignal({ id: "signal:vision-estimate", sourceDomain: "visionEstimate", description: `Estimation produite par l’IA. C’est une donnée auxiliaire, pas un accomplissement récompensé.` }),
  defineNonGamifiedSignal({ id: "signal:place-type", sourceDomain: "action placeType", description: `Type de lieu. Il peut alimenter Exploration ou la diversité descriptive, sans coefficient de mérite.` }),
  defineNonGamifiedSignal({ id: "signal:difficulty-duration-distance", sourceDomain: "estimatedDifficulty + duration + distance", description: `Difficulté, durée ou distance comme multiplicateur XP direct. Une action facile ou accessible n’a pas moins de valeur civique.` }),
  defineNonGamifiedSignal({ id: "signal:formalities-free-text", sourceDomain: "formalities free-text fields", description: `Remplissage des champs libres de formalités. Seul le milestone déterministe Formalités préparées peut reconnaître le workflow.` }),
] as const satisfies readonly GamificationMechanicDefinition[];

export const GAMIFICATION_REGISTRY = [
  ...CURRENT_INFINITE_PROGRESSIONS,
  ...CURRENT_MILESTONES,
  ...NON_GAMIFIED_SIGNALS,
] as const satisfies readonly GamificationMechanicDefinition[];

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
  verified_geometry_contribution: {
    classification: "progression",
    progressionId: "cartography",
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
    reason: "Usage utilitaire d'itinéraire, à traiter hors des neuf progressions.",
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
    reason: "Événement Forms historique COMPATIBILITY, hors des neuf progressions CURRENT.",
  },
  form_bonus: {
    classification: "non_progression",
    reason: "Bonus Forms historique COMPATIBILITY, hors des neuf progressions CURRENT.",
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
