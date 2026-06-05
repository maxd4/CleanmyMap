import {
  ENVIRONMENTAL_IMPACT_ESTIMATOR_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_ESTIMATOR_LIMITATIONS,
  ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_PROJECT_ANCHORS,
} from "../constants";
import type {
  EnvironmentalImpactEstimateInput,
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactEstimatorMethodology,
} from "../types";
import { normalizeEnvironmentalImpactEstimateInput } from "../validation";
import { buildInfrastructureEstimate, buildInfrastructureMissingDataNotes } from "./infrastructure";
import { buildLifecycleEstimate } from "./lifecycle";
import { buildScopeCurveEstimate, buildScopeEstimate, buildScopeMissingDataNotes } from "./scope";

export function buildEnvironmentalImpactEstimatorMethodology(
  generatedAt: string,
): EnvironmentalImpactEstimatorMethodology {
  return {
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
    generatedAt,
    hypotheses: [
      ...ENVIRONMENTAL_IMPACT_ESTIMATOR_HYPOTHESES,
      ...ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_HYPOTHESES,
      ...ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES,
    ],
    limitations: [...ENVIRONMENTAL_IMPACT_ESTIMATOR_LIMITATIONS],
    projectAnchors: [...ENVIRONMENTAL_IMPACT_PROJECT_ANCHORS],
    notes: [
      "Le moteur expose chaque poste de consommation et son facteur plutôt que de masquer l'approximation dans un score unique.",
      "Les totaux ne sont calculés que sur les postes branchés, afin de ne jamais confondre absence de données et valeur nulle.",
      "Le graphique présente deux courbes cumulées distinctes: le total du site et le total attribué à l'utilisateur, chacune recalculée semaine par semaine.",
      "La courbe temporelle est un cumul mensuel proxy pour les services d'infrastructure et le domaine.",
      "GPT-5.4 mini — développement du site est distingué des sessions Codex et peut être ancré à 2h hebdomadaires tant qu'aucun journal plus fin n'est branché.",
      "Le poste Codex — développement du site repose sur un journal hebdomadaire spécifique au projet; sans semaine enregistrée, il reste explicitement à zéro et signalé comme non branché.",
      "Le deuxième ordre détaille la composition interne de l'impact en familles environnementales lisibles.",
      "Les ordres de grandeur fournis par le projet servent d'ancrage spécifique à CleanMyMap pour l'assistance IA, le développement de la première moitié du site et l'usage annuel bénévole.",
    ],
  };
}

export function computeEnvironmentalImpactEstimate(
  input?: EnvironmentalImpactEstimateInput | null,
): EnvironmentalImpactEstimateModel {
  const normalized = normalizeEnvironmentalImpactEstimateInput(input);
  const generatedAt = normalized.input.generatedAt ?? new Date().toISOString();
  const infrastructure = buildInfrastructureEstimate(
    normalized.input.infrastructure,
    generatedAt,
    normalized.input.site,
    normalized.input.user,
  );
  const siteEstimate = buildScopeEstimate("site", normalized.input.site);
  const userEstimate = buildScopeEstimate("user", normalized.input.user);
  const site = {
    ...siteEstimate,
    curve: buildScopeCurveEstimate({
      scope: siteEstimate,
      usageProfile: infrastructure.usage,
      referencePeriodMonths: infrastructure.referencePeriodMonths,
      anchorDate:
        normalized.input.site?.measuredAt ??
        infrastructure.launchedAt ??
        generatedAt,
    }),
  };
  const user = {
    ...userEstimate,
    curve: buildScopeCurveEstimate({
      scope: userEstimate,
      usageProfile: infrastructure.usage,
      referencePeriodMonths: infrastructure.referencePeriodMonths,
      anchorDate:
        normalized.input.user?.accountCreatedAt ??
        normalized.input.user?.measuredAt ??
        infrastructure.launchedAt ??
        generatedAt,
    }),
  };
  const lifecycle = buildLifecycleEstimate(
    infrastructure.usage,
    infrastructure.services,
    infrastructure.totalKgCo2eProxy,
  );

  return {
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
    generatedAt,
    validation: normalized.validation,
    methodology: buildEnvironmentalImpactEstimatorMethodology(generatedAt),
    dataGaps: [
      ...buildScopeMissingDataNotes(site),
      ...buildScopeMissingDataNotes(user),
      ...buildInfrastructureMissingDataNotes(infrastructure),
    ],
    site,
    user,
    infrastructure,
    lifecycle,
  };
}
