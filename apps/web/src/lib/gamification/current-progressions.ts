import {
  CURRENT_GAMIFICATION_RULES_REVISION,
  CURRENT_GAMIFICATION_RULES_VERSION,
} from "./progression-types";
import type {
  GamificationProgressionDefinition,
  GamificationVisibility,
} from "./progression-types";

type CurrentProgressionInput = Omit<
  GamificationProgressionDefinition,
  | "category"
  | "progressionId"
  | "xpPolicy"
  | "badgeId"
  | "milestoneId"
  | "visibility"
  | "rulesVersion"
  | "introducedInRulesRevision"
> & { visibility?: GamificationVisibility; introducedInRulesRevision?: number };

function defineCurrentProgression(
  input: CurrentProgressionInput,
): GamificationProgressionDefinition {
  return {
    ...input,
    category: "XP_PROGRESSION",
    progressionId: input.id,
    xpPolicy: { kind: "progression_paliers", rule: "common_current_scale" },
    badgeId: input.badgeFamily,
    milestoneId: null,
    visibility: input.visibility ?? "current_user",
    rulesVersion: CURRENT_GAMIFICATION_RULES_VERSION,
    introducedInRulesRevision:
      input.introducedInRulesRevision ?? 1,
  };
}

export const CURRENT_INFINITE_PROGRESSIONS = [
  defineCurrentProgression({
    id: "participation",
    label: "Participation",
    description: "Participations finales confirmées à des actions.",
    metric: "participation_count",
    metricLabel: "Participations confirmées",
    sourceDomain: "action_participants.confirmed",
    badgeFamily: "participant",
    scale: "participant",
    infinite: true,
  }),
  defineCurrentProgression({
    id: "organisation",
    label: "Organisation",
    description: "Actions réellement organisées et validées.",
    metric: "validated_organized_actions_count",
    metricLabel: "Actions organisées validées",
    sourceDomain: "actions + action_organizers + validation post-action CURRENT",
    badgeFamily: "organisation",
    scale: "gem",
    infinite: true,
  }),
  defineCurrentProgression({
    id: "exploration",
    label: "Exploration",
    description: "Découverte de lieux distincts et couverture cartographique.",
    metric: "unique_places_visited",
    metricLabel: "Lieux distincts visités",
    sourceDomain: "user_visited_places",
    badgeFamily: "explorer",
    scale: "exploration",
    infinite: true,
  }),
  defineCurrentProgression({
    id: "clean_zones",
    label: "Zones propres",
    description: "Lieux propres validés ou nettoyés, dédoublonnés par zone.",
    metric: "eligible_clean_zones",
    metricLabel: "Zones propres éligibles",
    sourceDomain: "trash_spotter_spots / clean_zones",
    badgeFamily: "clean-zones",
    scale: "atmosphere",
    infinite: true,
  }),
  defineCurrentProgression({
    id: "regularity",
    label: "Régularité",
    description: "Participation utile sur des mois calendaires consécutifs.",
    metric: "consecutive_active_months",
    metricLabel: "Mois actifs consécutifs",
    sourceDomain: "actions par mois",
    badgeFamily: "regularity",
    scale: "gem",
    infinite: true,
  }),
  defineCurrentProgression({
    id: "versatility",
    label: "Polyvalence",
    description: "Diversité des contextes de contribution validés.",
    metric: "validated_context_cycles",
    metricLabel: "Cycles de contextes validés",
    sourceDomain: "actions et contextes de contribution",
    badgeFamily: "versatility",
    scale: "gem",
    infinite: true,
  }),
  defineCurrentProgression({
    id: "learning",
    label: "Apprentissage",
    description: "Réponses justes et progression des apprentissages utiles.",
    metric: "validated_learning_events",
    metricLabel: "Réponses justes validées",
    sourceDomain: "quiz_type_progress et contenus d'apprentissage",
    badgeFamily: "learning",
    scale: "learning",
    infinite: true,
  }),
  defineCurrentProgression({
    id: "moderation",
    label: "Modération",
    description: "Dossiers de modération uniques réellement résolus.",
    metric: "resolvedModerationCases",
    metricLabel: "Dossiers résolus",
    sourceDomain: "admin_operations_audit (moderation/success)",
    badgeFamily: "moderation",
    scale: "gem",
    infinite: true,
    visibility: "authorized_moderation",
    introducedInRulesRevision: CURRENT_GAMIFICATION_RULES_REVISION,
  }),
] as const satisfies readonly GamificationProgressionDefinition[];
