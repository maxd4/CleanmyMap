import {
  CURRENT_GAMIFICATION_RULES_REVISION,
  CURRENT_GAMIFICATION_RULES_VERSION,
  type GamificationVisibility,
  type MilestoneDefinition,
} from "./progression-types";

type CurrentMilestoneInput = Omit<
  MilestoneDefinition,
  | "category"
  | "progressionId"
  | "xpPolicy"
  | "badgeId"
  | "milestoneId"
  | "visibility"
  | "rulesVersion"
  | "introducedInRulesRevision"
> & { visibility?: GamificationVisibility; introducedInRulesRevision?: number };

function defineCurrentMilestone(input: CurrentMilestoneInput): MilestoneDefinition {
  const hasXp = input.xpAwarded > 0;
  return {
    ...input,
    category: hasXp ? "XP_MILESTONE" : "BADGE_ONLY",
    progressionId: null,
    xpPolicy: hasXp
      ? { kind: "fixed_one_shot", amount: input.xpAwarded }
      : {
          kind: "none",
          reason: "Jalon one-shot CURRENT sans XP supplémentaire.",
        },
    badgeId: input.id,
    milestoneId: input.id,
    visibility: input.visibility ?? "current_user",
    rulesVersion: CURRENT_GAMIFICATION_RULES_VERSION,
    introducedInRulesRevision:
      input.introducedInRulesRevision ?? 1,
  };
}

export const CURRENT_MILESTONES = [
  defineCurrentMilestone({ id: "premiere_trace_utile", legacyId: "first_trace_utile", label: "Première trace utile", description: "Jalon historique conservé pour les preuves déjà enregistrées.", sourceDomain: "compatibilité historique des événements de validation", factKey: "legacy_first_trace", xpAwarded: 1, oneShot: true }),
  defineCurrentMilestone({ id: "trace_fondatrice", label: "Trace fondatrice", description: "Badge compagnon d’une première boucle de terrain démontrée.", sourceDomain: "parcours de préparation et post-action validé", factKey: "boucle_bouclee", xpAwarded: 0, oneShot: true }),
  defineCurrentMilestone({ id: "boucle_bouclee", label: "Boucle bouclée", description: "Première action préparée, réalisée après le parcours de préparation puis validée.", sourceDomain: "actions + préparation démontrée + post-action validée", factKey: "boucle_bouclee", xpAwarded: 1, oneShot: true, introducedInRulesRevision: CURRENT_GAMIFICATION_RULES_REVISION }),
  defineCurrentMilestone({ id: "mobilisateur", label: "Mobilisateur", description: "Première action ouverte aux inscriptions de groupe avec un autre participant confirmé.", sourceDomain: "actions + publication de groupe + action_participants.confirmed", factKey: "mobilisateur", xpAwarded: 1, oneShot: true }),
  defineCurrentMilestone({ id: "donnee_exemplaire", label: "Donnée exemplaire", description: "Première action validée avec un grade qualité A au moment de la validation.", sourceDomain: "snapshot qualité de validation des actions", factKey: "donnee_exemplaire", xpAwarded: 1, oneShot: true }),
  defineCurrentMilestone({ id: "parcours_documente", label: "Parcours documenté", description: "Première action validée avec une géométrie exploitable et une provenance vérifiable.", sourceDomain: "géométrie d’action et provenance canonique", factKey: "parcours_documente", xpAwarded: 0, oneShot: true }),
  defineCurrentMilestone({ id: "mesure_tracable", label: "Mesure traçable", description: "Première action validée avec une mesure environnementale et une provenance conformes.", sourceDomain: "mesures déchets et mégots selon le contrat CURRENT", factKey: "mesure_tracable", xpAwarded: 0, oneShot: true }),
  defineCurrentMilestone({ id: "tri_documente", label: "Tri documenté", description: "Première action validée avec une ventilation canonique multi-flux réelle.", sourceDomain: "ventilation canonique des déchets", factKey: "tri_documente", xpAwarded: 0, oneShot: true }),
  defineCurrentMilestone({ id: "formalites_preparees", label: "Formalités préparées", description: "Première action dont les formalités requises sont préparées et finalisées dans le workflow.", sourceDomain: "qualification applicable + workflow des formalités", factKey: "formalites_preparees", xpAwarded: 0, oneShot: true }),
  defineCurrentMilestone({ id: "participation_retrouvee", label: "Participation retrouvée", description: "Première réclamation post-action finalement confirmée selon le workflow CURRENT.", sourceDomain: "action_participants.confirmed + participation_source=post_action_claim", factKey: "participation_retrouvee", xpAwarded: 0, oneShot: true }),
  defineCurrentMilestone({ id: "parrainage_utile", label: "Parrainage utile", description: "Première contribution utile confirmée d’un invité issu d’une filiation valide.", sourceDomain: "filiation + referral_contributions validées", factKey: "first_invitee_contribution", xpAwarded: 2, oneShot: true }),
  defineCurrentMilestone({ id: "premiere_moderation", label: "Première modération", description: "Premier dossier de modération éligible réellement résolu.", sourceDomain: "admin_operations_audit / dossiers de modération uniques", factKey: "premiere_moderation", xpAwarded: 0, oneShot: true, visibility: "authorized_moderation", introducedInRulesRevision: CURRENT_GAMIFICATION_RULES_REVISION }),
  defineCurrentMilestone({ id: "premiere_validation_participation", label: "Première validation de participation", description: "Première décision réussie sur une participation ou une réclamation.", sourceDomain: "admin_operations_audit / action_participants", factKey: "premiere_validation_participation", xpAwarded: 0, oneShot: true, visibility: "authorized_moderation", introducedInRulesRevision: CURRENT_GAMIFICATION_RULES_REVISION }),
  defineCurrentMilestone({ id: "premiere_correction_impact_justifiee", label: "Première correction d’impact justifiée", description: "Première correction d’impact réussie et motivée selon le contrat de modération.", sourceDomain: "admin_operations_audit / correct_impact", factKey: "premiere_correction_impact_justifiee", xpAwarded: 0, oneShot: true, visibility: "authorized_moderation", introducedInRulesRevision: CURRENT_GAMIFICATION_RULES_REVISION }),
  defineCurrentMilestone({ id: "moderateur_polyvalent", label: "Modérateur polyvalent", description: "Dossiers résolus dans les familles action, participation et clean place.", sourceDomain: "admin_operations_audit / familles de dossiers résolus", factKey: "moderateur_polyvalent", xpAwarded: 1, oneShot: true, visibility: "authorized_moderation", introducedInRulesRevision: CURRENT_GAMIFICATION_RULES_REVISION }),
] as const satisfies readonly MilestoneDefinition[];
