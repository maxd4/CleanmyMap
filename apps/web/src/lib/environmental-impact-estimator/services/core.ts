import {
  ENVIRONMENTAL_IMPACT_ESTIMATOR_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_ESTIMATOR_LIMITATIONS,
  ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
  ENVIRONMENTAL_IMPACT_CO2E_COMPOSITION_NOTE,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_PROJECT_ANCHORS,
} from "../constants";
import { ENVIRONMENTAL_IMPACT_CANONICAL_ACCOUNTING } from "../canonical-accounting";
import type {
  EnvironmentalImpactEstimateInput,
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactEstimatorMethodology,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { buildElectricityEstimate, calculateElectricityCo2e } from "./electricity";
import { buildWaterEstimate } from "./water";
import { normalizeEnvironmentalImpactEstimateInput } from "../validation";
import { buildInfrastructureEstimate, buildInfrastructureMissingDataNotes } from "./infrastructure";
import { buildLifecycleEstimate } from "./lifecycle";
import { buildScopeCurveEstimate, buildScopeEstimate, buildScopeMissingDataNotes } from "./scope";

export function buildEnvironmentalImpactEstimatorMethodology(
  generatedAt: string,
  usageProfile?: Pick<
    EnvironmentalImpactUsageProfileEstimate,
    | "monthlyElectricityKwh"
    | "monthlyDirectWaterConsumptionLiters"
    | "monthlyEvaporatedWaterLiters"
  >,
): EnvironmentalImpactEstimatorMethodology {
  const safeUsageProfile = usageProfile ?? {
    monthlyElectricityKwh: null,
    monthlyDirectWaterConsumptionLiters: null,
    monthlyEvaporatedWaterLiters: null,
  };
  const electricity = buildElectricityEstimate(safeUsageProfile, null);
  const water = buildWaterEstimate(safeUsageProfile);
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
    accounting: ENVIRONMENTAL_IMPACT_CANONICAL_ACCOUNTING,
    notes: [
      "Le moteur expose chaque poste de consommation et son facteur plutôt que de masquer l'approximation dans un score unique.",
      "Les totaux ne sont calculés que sur les postes branchés, afin de ne jamais confondre absence de données et valeur nulle.",
      "Le graphique présente deux courbes cumulées distinctes: le total du site et le total attribué à l'utilisateur, chacune recalculée semaine par semaine.",
      "La courbe temporelle ne présente un total physique que lorsqu'un facteur ou une mesure audité est disponible; les activités SaaS observées restent séparées et NA physiquement.",
      "Le modèle central retient 35 Md token-équivalent (DECLARED + ASSUMPTION), 10,5 MWh, 3,675 tCO2e électrique, 47,5 m³ d'eau indirecte et 4,8 tCO2e d'ACV partielle; les valeurs physiques sont des PROXY.",
      "L'usage exact ChatGPT hors Codex est NA: aucune durée ni aucun token ne sont reconstruits.",
      "Le journal Codex expose une activité observée ou dérivée; son impact physique est NA sans facteur audité.",
      "Environ 130 générations ou modifications d'images sont DECLARED; énergie, CO2e et eau restent NA.",
      "Fenêtre projet: mi-février → septembre 2026; fenêtre des services: 18 mars → 18 septembre 2026; avant le 18 mars: UNKNOWN / NOT AUDITED.",
      "Le deuxième ordre détaille la composition interne de l'impact en familles environnementales lisibles.",
      ENVIRONMENTAL_IMPACT_CO2E_COMPOSITION_NOTE,
      "L'eau estimée distingue la consommation directe du site et l'eau indirecte liée à l'électricité. Ces valeurs restent des ordres de grandeur.",
      "L'eau directe et l'évaporation ne sont affichées que lorsqu'un signal est fourni; le total reste à compléter si une composante nécessaire manque.",
      "L'eau reste dans le cycle hydrologique global, mais l'eau évaporée est consommée localement car elle n'est plus immédiatement disponible dans le même bassin. Retrait et consommation ne sont pas interchangeables; l'eau retournée dépend du lieu, du moment, de la température et de la qualité. La pression dépend aussi du stress et des conflits locaux, pas seulement des litres.",
      "Les ordres de grandeur fournis par le projet servent d'ancrage spécifique à CleanMyMap pour l'assistance IA, le développement de la première moitié du site et l'usage annuel bénévole.",
      `Le facteur électrique configuré est de ${electricity.factorKgCo2ePerKwh} kgCO2e/kWh pour ${electricity.source === "input" ? "un calcul kWh × facteur" : "un équivalent électrique proxy tant qu'aucun kWh réel n'est branché"}.`,
      "Le refroidissement varie fortement selon les data centers: environ 7 % dans certains hyperscalers efficaces à plus de 30 % dans des installations moins efficaces; aucune part fixe n'est attribuée à CleanMyMap.",
      "Les serveurs accélérés, principalement associés à l'adoption de l'IA, constituent un moteur important de la croissance prévue de la consommation des data centers; aucune part du trafic de CleanMyMap n'est attribuée à l'IA.",
    ],
    electricity,
    water,
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
    infrastructure.totalKgCo2eProxy ??
      calculateElectricityCo2e(infrastructure.usage.monthlyElectricityKwh),
  );

  return {
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
    generatedAt,
    validation: normalized.validation,
    methodology: buildEnvironmentalImpactEstimatorMethodology(generatedAt, infrastructure.usage),
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
