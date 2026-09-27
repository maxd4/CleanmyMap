import { CURRENT_MILESTONES } from "./current-milestones";
import { CURRENT_INFINITE_PROGRESSIONS } from "./current-progressions";
import type {
  GamificationBadgeDefinition,
  GamificationProgressionDefinition,
  MilestoneDefinition,
} from "./progression-types";

function progressionBadgeDefinition(
  progression: GamificationProgressionDefinition,
): GamificationBadgeDefinition {
  return {
    id: progression.badgeId ?? progression.badgeFamily,
    family: progression.badgeFamily,
    status: "CURRENT",
    label: progression.label,
    scale: progression.scale,
    metric: progression.metric,
    sourceDomain: progression.sourceDomain,
    visibility: progression.visibility,
    progressionId: progression.id,
    rule: { kind: "infinite_thresholds", description: progression.description },
    xpPolicy: progression.xpPolicy,
    aliases: [],
  };
}

function milestoneBadgeDefinition(
  milestone: MilestoneDefinition,
): GamificationBadgeDefinition {
  return {
    id: milestone.badgeId ?? milestone.id,
    family: `milestone:${milestone.id}`,
    status: "CURRENT",
    label: milestone.label,
    scale: "one_shot",
    metric: milestone.factKey,
    sourceDomain: milestone.sourceDomain,
    visibility: milestone.visibility,
    progressionId: null,
    rule: { kind: "one_shot", description: milestone.description },
    xpPolicy: milestone.xpPolicy,
    aliases: milestone.legacyId ? [milestone.legacyId] : [],
  };
}

/** Canonical badge identity catalog for every gamification surface. */
export const CURRENT_BADGE_DEFINITIONS = [
  ...CURRENT_INFINITE_PROGRESSIONS.map(progressionBadgeDefinition),
  ...CURRENT_MILESTONES.map(milestoneBadgeDefinition),
] as const satisfies readonly GamificationBadgeDefinition[];

const LEGACY_BADGE_DEFINITIONS = [
  {
    id: "legacy-level-recognition",
    family: "legacy-level-recognition",
    status: "LEGACY",
    label: "Reconnaissances de niveau historiques",
    scale: "legacy",
    metric: "current_level",
    sourceDomain: "progression-formulas.deriveBadges",
    visibility: "current_user",
    progressionId: null,
    rule: { kind: "legacy_compatibility", description: "Labels historiques conservés pour les anciens payloads de vitrine." },
    xpPolicy: { kind: "none", reason: "Le niveau et le statut ne sont pas des badges CURRENT." },
    aliases: [],
    legacyLabels: ["Contributeur regulier", "Contributeur confirme", "Pilier terrain", "Referent impact"],
    legacyThresholds: [
      { label: "Contributeur regulier", minimum: 3 },
      { label: "Contributeur confirme", minimum: 6 },
      { label: "Pilier terrain", minimum: 10 },
      { label: "Referent impact", minimum: 14 },
    ],
  },
  {
    id: "legacy-quality-recognition",
    family: "legacy-quality-recognition",
    status: "LEGACY",
    label: "Reconnaissances qualité historiques",
    scale: "legacy",
    metric: "quality_average",
    sourceDomain: "progression-formulas.deriveBadges",
    visibility: "current_user",
    progressionId: null,
    rule: { kind: "legacy_compatibility", description: "Labels historiques ; la qualité n'est pas une progression infinie." },
    xpPolicy: { kind: "none", reason: "La qualité ne constitue pas une monnaie XP." },
    aliases: [],
    legacyLabels: ["Sentinelle Exemplaire", "Données de Qualité"],
  },
  {
    id: "legacy-collective-recognition",
    family: "legacy-collective-recognition",
    status: "LEGACY",
    label: "Reconnaissances collectives historiques",
    scale: "legacy",
    metric: "collective_events",
    sourceDomain: "progression-formulas.deriveBadges",
    visibility: "current_user",
    progressionId: null,
    rule: { kind: "legacy_compatibility", description: "Labels historiques ; les progressions CURRENT portent les paliers utiles." },
    xpPolicy: { kind: "none", reason: "Aucun badge historique ne crée de XP supplémentaire." },
    aliases: [],
    legacyLabels: ["Pilier de Communauté", "Esprit d'Équipe"],
  },
  {
    id: "legacy-action-badges",
    family: "legacy-action-badges",
    status: "LEGACY",
    label: "Badges d'action historiques",
    scale: "legacy",
    metric: "validated_actions",
    sourceDomain: "badges/families.ts",
    visibility: "current_user",
    progressionId: null,
    rule: { kind: "legacy_compatibility", description: "Compatibilité des anciennes entrées de vitrine d'action." },
    xpPolicy: { kind: "none", reason: "L'organisation CURRENT utilise sa propre progression." },
    aliases: ["cleaner"],
    legacyLabels: ["Nettoyeur"],
  },
  {
    id: "forms",
    family: "forms",
    status: "LEGACY",
    label: "Forms",
    scale: "legacy",
    metric: "form_tier_unlock",
    sourceDomain: "form_tier_unlock / form_bonus",
    visibility: "not_exposed",
    progressionId: null,
    rule: { kind: "legacy_compatibility", description: "Forms reste une preuve de workflow et non une progression CURRENT." },
    xpPolicy: { kind: "none", reason: "Aucun badge Forms CURRENT." },
    aliases: ["form_tier_unlock", "form_bonus"],
  },
  {
    id: "mohs",
    family: "mohs",
    status: "LEGACY",
    label: "Mohs",
    scale: "mohs",
    metric: "wasteKg + cigaretteButts",
    sourceDomain: "mohs-impact-reconciliation",
    visibility: "current_user",
    progressionId: null,
    rule: { kind: "legacy_compatibility", description: "Lecture historique secondaire de l'impact, distincte des familles CURRENT." },
    xpPolicy: { kind: "none", reason: "Mohs ne crée pas une progression CURRENT concurrente." },
    aliases: ["mohs_waste", "mohs_butts"],
    legacyLabels: [
      "Expert Mégots (Or)", "Chasseur de Mégots (Argent)", "Ramasseur de Mégots (Bronze)",
      "Héros du Nettoyage (Or)", "Force de la Nature (Argent)", "Bras Armé (Bronze)",
    ],
  },
  {
    id: "sensitive-zone",
    family: "sensitive-zone",
    status: "LEGACY",
    label: "Zone sensible",
    scale: "gem",
    metric: "eligible_sensitive_zone_actions",
    sourceDomain: "sensitive_zone_progression proofs",
    visibility: "current_user",
    progressionId: null,
    rule: { kind: "legacy_compatibility", description: "Reconnaissance historique de qualification de zone, hors des huit progressions CURRENT." },
    xpPolicy: { kind: "none", reason: "La qualification ne crée pas de solde XP indépendant." },
    aliases: ["sensitive_zone_action", "sensitive_zone_milestone"],
  },
] as const satisfies readonly GamificationBadgeDefinition[];

export const BADGE_DEFINITIONS = [
  ...CURRENT_BADGE_DEFINITIONS,
  ...LEGACY_BADGE_DEFINITIONS,
] as const satisfies readonly GamificationBadgeDefinition[];

export function currentBadgeDefinitions(): readonly GamificationBadgeDefinition[] {
  return CURRENT_BADGE_DEFINITIONS;
}

export function findBadgeDefinition(idOrAlias: string): GamificationBadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((definition) =>
    definition.id === idOrAlias || (definition.aliases as readonly string[]).includes(idOrAlias),
  );
}

export function findBadgeDefinitionByFamily(family: string): GamificationBadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((definition) => definition.family === family);
}

export function findBadgeDefinitionByLabel(label: string): GamificationBadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((definition) => {
    const typedDefinition = definition as GamificationBadgeDefinition;
    return typedDefinition.label === label || typedDefinition.legacyLabels?.includes(label) === true;
  });
}
