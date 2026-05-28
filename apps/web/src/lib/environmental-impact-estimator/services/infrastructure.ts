import { addMonths, addWeeks, differenceInCalendarMonths } from "date-fns";
import {
  ENVIRONMENTAL_IMPACT_GRAPH_CONSIDERATIONS,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_METRIC_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_NOTES,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_SERVICE_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_SECOND_ORDER_FACTOR_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_SECOND_ORDER_HYPOTHESES,
} from "../constants";
import type {
  EnvironmentalImpactDataGapNote,
  EnvironmentalImpactInfrastructureCurvePoint,
  EnvironmentalImpactInfrastructureEstimate,
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactInfrastructureMetricDefinition,
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureMetricsInput,
  EnvironmentalImpactInfrastructureServiceDefinition,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactSecondOrderEstimate,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { buildUsageProfileEstimate, projectUsageProfileAtWeek } from "./usage-profile";
import {
  WEEKS_PER_MONTH,
  clamp,
  formatWeekLabel,
  hasNumericInput,
  hasScopeSignalInput,
  hasUsageInput,
  parseDateOrNull,
  round6,
} from "./utils";

const METRIC_DEFINITION_BY_KEY = new Map(
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_METRIC_DEFINITIONS.map((definition) => [
    definition.key,
    definition,
  ]),
);

export function buildInfrastructureMetricEstimate(
  definition: EnvironmentalImpactInfrastructureMetricDefinition,
  quantityPerMonth: number,
  source: "input" | "derived" | "reference",
): EnvironmentalImpactInfrastructureMetricEstimate {
  return {
    ...definition,
    quantityPerMonth: round6(quantityPerMonth),
    estimatedKgCo2eProxy: round6(quantityPerMonth * definition.proxyKgCo2ePerUnit),
    source,
  };
}

export function buildInfrastructureMissingDataNotes(
  infrastructure: EnvironmentalImpactInfrastructureEstimate,
): EnvironmentalImpactDataGapNote[] {
  return infrastructure.services
    .filter((service) => service.metricEstimates.some((metric) => metric.source !== "input"))
    .map((service) => {
      if (
        service.key === "chatgpt" &&
        service.metricEstimates.every((metric) => metric.source === "derived")
      ) {
        return {
          key: "infrastructure.chatgpt",
          title: "ChatGPT 5.5 / LLM - ancrage de conversation non remplacé",
          detail:
            "Aucun journal LLM plus fin n'est branché. L'estimateur conserve l'ancrage CleanMyMap de 2h de conversation par semaine en mode ChatGPT 5.5 étendu, distinct du journal Codex, afin d'éviter une moyenne externe générique.",
          scope: "infrastructure" as const,
          severity: "info" as const,
        };
      }

      if (service.key === "codex" && service.metricEstimates.every((metric) => metric.source === "reference")) {
        return {
          key: "infrastructure.codex",
          title: "Codex / ChatGPT Plus - journal hebdomadaire non branché",
          detail:
            "Aucune semaine Codex n'a encore été enregistrée. L'estimateur garde ce poste à zéro tant qu'un journal hebdomadaire CleanMyMap n'est pas saisi, afin d'éviter une moyenne externe générique.",
          scope: "infrastructure" as const,
          severity: "info" as const,
        };
      }

      const missingMetricLabels = service.metricEstimates
        .filter((metric) => metric.source !== "input")
        .map((metric) => metric.label);
      const missingMetricText =
        missingMetricLabels.length > 0 ? missingMetricLabels.join(", ") : "aucune métrique";
      const basisText =
        service.referenceMetricCount > 0
          ? "une charge de référence documentée"
          : "les signaux d'usage CleanMyMap";

      return {
        key: `infrastructure.${service.key}`,
        title: `${service.label} - données directes non branchées`,
        detail: `Les métriques ${missingMetricText} ne sont pas encore lues depuis le fournisseur. L'estimation s'appuie sur ${basisText} pour rester spécifique au projet et éviter un proxy générique.`,
        scope: "infrastructure",
        severity: service.referenceMetricCount > 0 ? "warn" : "info",
      };
    });
}

export function deriveMetricQuantityFromUsage(
  metricKey: string,
  usage: EnvironmentalImpactUsageProfileEstimate,
): number | null {
  switch (metricKey) {
    case "vercelPageViews":
      return usage.monthlyPageViews;
    case "vercelFunctionInvocations":
      return round6(
        usage.monthlyApiRequests * 0.78 +
          usage.monthlyPdfExports * 2.8 +
          usage.monthlyAiCalls * 1.9 +
          usage.monthlyMapViews * 0.12,
      );
    case "vercelDeployments":
      return usage.monthlyDeployments;
    case "vercelBandwidthGb":
      return usage.monthlyBandwidthGb;
    case "supabaseDbRequests":
      return round6(usage.monthlyApiRequests * 1.18 + usage.monthlyPageViews * 0.04);
    case "supabaseAuthEvents":
      return usage.monthlyAuthEvents;
    case "supabaseStorageGbMonths":
      return usage.monthlyStorageGbMonths;
    case "supabaseRealtimeEvents":
      return usage.monthlyRealtimeEvents;
    case "supabaseEgressGb":
      return usage.monthlyEgressGb;
    case "resendEmailsSent":
      return usage.monthlyEmailsSent;
    case "resendBatchRequests":
      return Math.max(0, round6(usage.monthlyEmailsSent / 20));
    case "chatgptConversationHours":
      return usage.monthlyChatgptConversationHours;
    case "codexSessions":
      return usage.monthlyCodexSessions;
    case "codexConversationTurns":
      return usage.monthlyCodexConversationTurns;
    case "codexToolActions":
      return usage.monthlyCodexToolActions;
    case "codexShellCommands":
      return usage.monthlyCodexShellCommands;
    case "codexFilesTouched":
      return usage.monthlyCodexFilesTouched;
    case "codexTestsRun":
      return usage.monthlyCodexTestsRun;
    case "codexChangedLines":
      return usage.monthlyCodexChangedLines;
    case "codexActiveMinutes":
      return usage.monthlyCodexActiveMinutes;
    case "clerkAuthEvents":
      return usage.monthlyAuthEvents;
    case "clerkSessionRefreshes":
      return round6(usage.monthlySessions * 0.85);
    case "posthogEvents":
      return round6(
        usage.monthlyPageViews * 1.1 +
          usage.monthlySessions * 0.4 +
          usage.monthlyMapViews * 0.2,
      );
    case "sentryErrorEvents":
      return usage.monthlyErrorEvents;
    case "upstashOperations":
      return round6(
        usage.monthlyApiRequests * 0.42 +
          usage.monthlyRealtimeEvents * 0.08 +
          usage.monthlyEmailsSent * 0.05,
      );
    case "pineconeQueries":
      return round6(usage.monthlyAiCalls * 3.2 + usage.monthlyPageViews * 0.015);
    case "stripePaymentOperations":
      return Math.max(0, round6(usage.monthlyActiveUsers * 0.01));
    case "lwsDomainYears":
      return 1 / 12;
    case "lwsDnsQueries":
      return round6(
        Math.max(0, 20_000 + usage.monthlyPageViews * 0.03 + usage.monthlyEmailsSent * 0.02),
      );
    default:
      return null;
  }
}

export function getServiceMonthlyTotal(
  service: EnvironmentalImpactInfrastructureServiceDefinition,
  metricEstimates: EnvironmentalImpactInfrastructureMetricEstimate[],
): number {
  const total = metricEstimates.reduce(
    (acc, metric) => acc + (metric.estimatedKgCo2eProxy ?? 0),
    0,
  );

  return round6(total);
}

export function buildInfrastructureServiceEstimate(
  definition: EnvironmentalImpactInfrastructureServiceDefinition,
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  metricsInput: EnvironmentalImpactInfrastructureMetricsInput | null | undefined,
  periodScale = 1,
): EnvironmentalImpactInfrastructureServiceEstimate {
  const metricEstimates = definition.metricKeys.map((metricKey) => {
    const metricDefinition = METRIC_DEFINITION_BY_KEY.get(metricKey);

    if (!metricDefinition) {
      throw new Error(`Missing infrastructure metric definition for ${metricKey}`);
    }

    const directValue = metricsInput?.[metricKey];
    if (hasNumericInput(directValue)) {
      const normalizedDirectValue =
        metricKey === "lwsDomainYears" ? directValue / 12 : directValue;

      return buildInfrastructureMetricEstimate(
        metricDefinition,
        normalizedDirectValue * periodScale,
        "input",
      );
    }

    const derivedValue = deriveMetricQuantityFromUsage(metricKey, usageProfile);
    if (derivedValue !== null) {
      return buildInfrastructureMetricEstimate(metricDefinition, derivedValue, "derived");
    }

    return buildInfrastructureMetricEstimate(
      metricDefinition,
      metricDefinition.referenceMonthlyQuantity * periodScale,
      "reference",
    );
  });

  const metricCount = metricEstimates.length;
  const referenceMetricCount = metricEstimates.filter(
    (metric) => metric.source === "reference",
  ).length;
  const derivedMetricCount = metricEstimates.filter(
    (metric) => metric.source === "derived",
  ).length;
  const inputMetricCount = metricCount - referenceMetricCount - derivedMetricCount;
  const confidencePercent = clamp(
    round6(
      72 +
        (inputMetricCount / Math.max(1, metricCount)) * 16 +
        (derivedMetricCount / Math.max(1, metricCount)) * 8 -
        (referenceMetricCount / Math.max(1, metricCount)) * 10,
    ),
    55,
    96,
  );
  const uncertaintyPercent = round6(100 - confidencePercent);
  const monthlyKgCo2eProxy = getServiceMonthlyTotal(definition, metricEstimates);
  const annualKgCo2eProxy = round6(monthlyKgCo2eProxy * 12);

  return {
    key: definition.key,
    label: definition.label,
    description: definition.description,
    sourceNote: definition.sourceNote,
    basis: definition.basis,
    status:
      definition.key === "codex" && inputMetricCount === 0 && derivedMetricCount === 0 && referenceMetricCount > 0
        ? "partial"
        : inputMetricCount > 0 && derivedMetricCount === 0 && referenceMetricCount === 0
          ? "ready"
          : inputMetricCount === 0 && derivedMetricCount > 0 && referenceMetricCount === 0
            ? "derived"
            : inputMetricCount === 0 && derivedMetricCount === 0 && referenceMetricCount > 0
              ? "reference"
              : "partial",
    monthlyKgCo2eProxy,
    annualKgCo2eProxy,
    sharePercent: 0,
    confidencePercent,
    uncertaintyPercent,
    metricCount,
    referenceMetricCount,
    metricEstimates,
  };
}

export function buildSecondOrderScoreSignals(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
): Record<"grossCo2" | "electricity" | "otherGhgs" | "chemicals" | "water", number> {
  const serviceByKey = new Map(services.map((service) => [service.key, service]));
  const vercel = serviceByKey.get("vercel")?.monthlyKgCo2eProxy ?? 0;
  const supabase = serviceByKey.get("supabase")?.monthlyKgCo2eProxy ?? 0;
  const resend = serviceByKey.get("resend")?.monthlyKgCo2eProxy ?? 0;
  const chatgpt = serviceByKey.get("chatgpt")?.monthlyKgCo2eProxy ?? 0;
  const codex = serviceByKey.get("codex")?.monthlyKgCo2eProxy ?? 0;
  const clerk = serviceByKey.get("clerk")?.monthlyKgCo2eProxy ?? 0;
  const posthog = serviceByKey.get("posthog")?.monthlyKgCo2eProxy ?? 0;
  const sentry = serviceByKey.get("sentry")?.monthlyKgCo2eProxy ?? 0;
  const upstash = serviceByKey.get("upstash")?.monthlyKgCo2eProxy ?? 0;
  const pinecone = serviceByKey.get("pinecone")?.monthlyKgCo2eProxy ?? 0;
  const stripe = serviceByKey.get("stripe")?.monthlyKgCo2eProxy ?? 0;
  const lws = serviceByKey.get("lwsDomain")?.monthlyKgCo2eProxy ?? 0;

  return {
    grossCo2: round6(
      usageProfile.monthlyPageViews * 0.28 +
        usageProfile.monthlyApiRequests * 0.22 +
        usageProfile.monthlyEmailsSent * 0.14 +
        usageProfile.monthlyDeployments * 0.18 +
        vercel * 0.12 +
        lws * 0.06,
    ),
    electricity: round6(
      usageProfile.monthlyBandwidthGb * 0.26 +
        usageProfile.monthlyStorageGbMonths * 0.22 +
        usageProfile.monthlySessions * 0.12 +
        usageProfile.monthlyRealtimeEvents * 0.2 +
        chatgpt * 0.08 +
        vercel * 0.1 +
        supabase * 0.1,
    ),
    otherGhgs: round6(
      usageProfile.monthlyAiCalls * 0.38 +
        chatgpt * 0.12 +
        usageProfile.monthlyCodexActiveMinutes * 0.24 +
        usageProfile.monthlyCodexTestsRun * 0.14 +
        usageProfile.monthlyErrorEvents * 0.08 +
        codex * 0.1 +
        sentry * 0.06,
    ),
    chemicals: round6(
      usageProfile.monthlyStorageGbMonths * 0.28 +
        usageProfile.monthlyPdfExports * 0.26 +
        usageProfile.monthlyCodexFilesTouched * 0.16 +
        usageProfile.monthlyDeployments * 0.2 +
        resend * 0.05 +
        stripe * 0.05,
    ),
    water: round6(
      usageProfile.monthlyAiCalls * 0.32 +
        chatgpt * 0.14 +
        usageProfile.monthlyCodexSessions * 0.24 +
        usageProfile.monthlyBandwidthGb * 0.16 +
        usageProfile.monthlyStorageGbMonths * 0.12 +
        posthog * 0.06 +
        upstash * 0.04 +
        pinecone * 0.06,
    ),
  };
}

export function buildInfrastructureSecondOrderEstimate(
  infrastructureMode: EnvironmentalImpactInfrastructureEstimate["mode"],
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
  monthlyKgCo2eProxy: number,
): EnvironmentalImpactSecondOrderEstimate {
  const scoreSignals = buildSecondOrderScoreSignals(usageProfile, services);
  const scoreTotal = round6(
    Object.values(scoreSignals).reduce((acc, value) => acc + value, 0),
  );
  const definitionEntries = ENVIRONMENTAL_IMPACT_SECOND_ORDER_FACTOR_DEFINITIONS.map(
    (definition) => {
      const score = scoreSignals[definition.key];
      return {
        definition,
        score,
      };
    },
  );
  const source: EnvironmentalImpactSecondOrderEstimate["source"] =
    infrastructureMode === "reference" ? "reference" : "mixed";

  if (monthlyKgCo2eProxy <= 0) {
    return {
      totalKgCo2eProxy: 0,
      factorEstimates: definitionEntries.map(({ definition }) => ({
        ...definition,
        quantity: 0,
        estimatedKgCo2eProxy: 0,
        sharePercent: 0,
        source,
      })),
      notes: [
        "Le deuxième ordre reste à zéro tant que le premier ordre n'affiche aucune charge environnementale.",
      ],
      hypotheses: [...ENVIRONMENTAL_IMPACT_SECOND_ORDER_HYPOTHESES],
      source,
    };
  }

  const normalizer = scoreTotal > 0 ? scoreTotal : round6(
    ENVIRONMENTAL_IMPACT_SECOND_ORDER_FACTOR_DEFINITIONS.reduce(
      (acc, definition) => acc + definition.referenceWeight,
      0,
    ),
  );

  const factorEstimates = definitionEntries.map(({ definition, score }) => {
    const normalizedWeight =
      scoreTotal > 0
        ? score / normalizer
        : definition.referenceWeight /
          Math.max(
            1,
            ENVIRONMENTAL_IMPACT_SECOND_ORDER_FACTOR_DEFINITIONS.reduce(
              (acc, item) => acc + item.referenceWeight,
              0,
            ),
          );
    const estimatedKgCo2eProxy = round6(monthlyKgCo2eProxy * normalizedWeight);
    const quantity = round6(estimatedKgCo2eProxy / definition.proxyKgCo2ePerUnit);

    return {
      ...definition,
      quantity,
      estimatedKgCo2eProxy,
      sharePercent: round6(normalizedWeight * 100),
      source,
    };
  });

  const totalKgCo2eProxy = round6(
    factorEstimates.reduce((acc, item) => acc + (item.estimatedKgCo2eProxy ?? 0), 0),
  );

  return {
    totalKgCo2eProxy,
    factorEstimates,
    notes: [
      "Le deuxième ordre est une décomposition du total premier ordre, pas une couche additionnelle de double comptage.",
      "Les quantités affichées sont des proxys de lecture calculés à partir des signaux CleanMyMap.",
    ],
    hypotheses: [...ENVIRONMENTAL_IMPACT_SECOND_ORDER_HYPOTHESES],
    source,
  };
}

export function buildInfrastructureCurve(
  launchedAt: Date,
  referencePeriodMonths: number,
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  metricsInput: EnvironmentalImpactInfrastructureMetricsInput | null | undefined,
): EnvironmentalImpactInfrastructureCurvePoint[] {
  const curve: EnvironmentalImpactInfrastructureCurvePoint[] = [];
  let cumulativeKgCo2eProxy = 0;
  const referencePeriodWeeks = Math.max(1, Math.round(referencePeriodMonths * WEEKS_PER_MONTH));

  for (let index = 0; index <= referencePeriodWeeks; index += 1) {
    const pointDate = addWeeks(launchedAt, index);
    const serviceEstimates = ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_SERVICE_DEFINITIONS.map(
      (serviceDefinition) =>
        buildInfrastructureServiceEstimate(
          serviceDefinition,
          projectUsageProfileAtWeek(usageProfile, index),
          metricsInput,
          1 / WEEKS_PER_MONTH,
        ),
    );
    const weeklyContribution =
      index === 0
        ? 0
        : round6(
            serviceEstimates.reduce(
              (acc, service) => acc + (service.monthlyKgCo2eProxy ?? 0),
              0,
            ),
          );
    cumulativeKgCo2eProxy = round6(cumulativeKgCo2eProxy + weeklyContribution);
    const averageConfidence = round6(
      serviceEstimates.reduce((acc, service) => acc + service.confidencePercent, 0) /
        Math.max(1, serviceEstimates.length),
    );
    const forecastPenalty = Math.min(16, index * 0.15);
    const pointConfidence = clamp(round6(averageConfidence - forecastPenalty), 45, 96);
    const pointUncertainty = round6(100 - pointConfidence);
    const lowerKgCo2eProxy = round6(
      Math.max(0, cumulativeKgCo2eProxy * (1 - pointUncertainty / 100)),
    );
    const upperKgCo2eProxy = round6(
      cumulativeKgCo2eProxy * (1 + pointUncertainty / 100),
    );

    const breakdown: Partial<
      Record<EnvironmentalImpactInfrastructureServiceEstimate["key"], number>
    > = {};

    for (const service of serviceEstimates) {
      breakdown[service.key] = round6(index === 0 ? 0 : service.monthlyKgCo2eProxy ?? 0);
    }

    curve.push({
      index,
      monthLabel: formatWeekLabel(pointDate, index === 0),
      date: pointDate.toISOString(),
      weeklyKgCo2eProxy: round6(weeklyContribution),
      monthlyKgCo2eProxy: round6(weeklyContribution),
      cumulativeKgCo2eProxy,
      lowerKgCo2eProxy,
      upperKgCo2eProxy,
      confidencePercent: pointConfidence,
      breakdown,
    });
  }

  return curve;
}

export function buildInfrastructureEstimate(
  infrastructureInput: EnvironmentalImpactInfrastructureInput | null | undefined,
  generatedAtIso: string,
  siteInput: EnvironmentalImpactScopeInput | null | undefined,
  userInput: EnvironmentalImpactScopeInput | null | undefined,
): EnvironmentalImpactInfrastructureEstimate {
  const generatedAt = parseDateOrNull(generatedAtIso) ?? new Date(generatedAtIso);
  const launchedAtInput = parseDateOrNull(infrastructureInput?.launchedAt);
  const usageProfile = buildUsageProfileEstimate(
    infrastructureInput,
    siteInput,
    userInput,
  );
  const referencePeriodMonths = Math.max(
    1,
    Math.min(
      240,
      usageProfile.horizonMonths ??
        infrastructureInput?.referencePeriodMonths ??
        (launchedAtInput
          ? Math.max(1, differenceInCalendarMonths(generatedAt, launchedAtInput) + 1)
          : 12),
    ),
  );
  const referencePeriodWeeks = Math.max(1, Math.round(referencePeriodMonths * WEEKS_PER_MONTH));
  const launchedAt =
    launchedAtInput ?? addMonths(generatedAt, -referencePeriodMonths);
  const services = ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_SERVICE_DEFINITIONS.map(
    (serviceDefinition) =>
      buildInfrastructureServiceEstimate(
        serviceDefinition,
        usageProfile,
        infrastructureInput?.metrics ?? null,
      ),
  );
  const monthlyKgCo2eProxy = round6(
    services.reduce((acc, service) => acc + (service.monthlyKgCo2eProxy ?? 0), 0),
  );
  const annualKgCo2eProxy = round6(monthlyKgCo2eProxy * 12);
  const referenceMetricCount = services.reduce(
    (acc, service) => acc + service.referenceMetricCount,
    0,
  );
  const derivedMetricCount = services.reduce(
    (acc, service) => acc + service.metricEstimates.filter((metric) => metric.source === "derived").length,
    0,
  );
  const inputMetricCount = services.reduce(
    (acc, service) => acc + service.metricEstimates.filter((metric) => metric.source === "input").length,
    0,
  );
  const metricCount = services.reduce((acc, service) => acc + service.metricCount, 0);
  const confidencePercent = clamp(
    round6(
      70 +
        (inputMetricCount / Math.max(1, metricCount)) * 18 +
        (derivedMetricCount / Math.max(1, metricCount)) * 10 -
        (referenceMetricCount / Math.max(1, metricCount)) * 8,
    ),
    55,
    96,
  );
  const uncertaintyPercent = round6(100 - confidencePercent);
  const curve = buildInfrastructureCurve(
    launchedAt,
    referencePeriodMonths,
    usageProfile,
    infrastructureInput?.metrics ?? null,
  );
  const totalKgCo2eProxy = curve.at(-1)?.cumulativeKgCo2eProxy ?? null;
  const mode: EnvironmentalImpactInfrastructureEstimate["mode"] =
    hasUsageInput(infrastructureInput?.usage) ||
    hasScopeSignalInput(siteInput) ||
    hasScopeSignalInput(userInput) ||
    (infrastructureInput?.metrics &&
      Object.values(infrastructureInput.metrics).some((value) => hasNumericInput(value)))
      ? "measured"
      : "reference";
  const totalMonthlyShare = monthlyKgCo2eProxy === 0 ? 0 : monthlyKgCo2eProxy;

  const servicesWithShare = services.map((service) => ({
    ...service,
    sharePercent:
      totalMonthlyShare === 0
        ? 0
        : round6((service.monthlyKgCo2eProxy ?? 0) / totalMonthlyShare * 100),
  }));
  const graphCoveragePercent = round6(
    ((inputMetricCount + derivedMetricCount) / Math.max(1, metricCount)) * 100,
  );
  const secondOrder = buildInfrastructureSecondOrderEstimate(
    mode,
    usageProfile,
    servicesWithShare,
    monthlyKgCo2eProxy,
  );
  return {
    mode,
    generatedAt: generatedAt.toISOString(),
    launchedAt: launchedAt.toISOString(),
    referencePeriodMonths,
    totalKgCo2eProxy,
    monthlyKgCo2eProxy,
    annualKgCo2eProxy,
    confidencePercent,
    uncertaintyPercent,
    usage: usageProfile,
    services: servicesWithShare,
    curve,
    graph: {
      title: "Courbe temporelle hebdomadaire de l'impact carbone proxy",
      mode: "cumulative",
      granularity: "week",
      xAxisLabel: "Temps",
      yAxisLabel: "kg CO2e proxy cumulés",
      confidencePercent,
      uncertaintyPercent,
      coveragePercent: graphCoveragePercent,
      considerations: [...ENVIRONMENTAL_IMPACT_GRAPH_CONSIDERATIONS],
    },
    hypotheses: [...ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_HYPOTHESES],
    notes: [
      ...ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_NOTES,
      `Période de référence: ${referencePeriodMonths} mois.`,
      `Découpage du graphe: ${referencePeriodWeeks} semaines pour un point cliquable par semaine.`,
      "Le deuxième ordre décompose le total en CO2 brut, électricité, autres GES, produits chimiques et eau.",
      "La couche lifecycle complète le CO2e opérationnel avec une lecture de cycle de vie matérielle, eau et e-waste.",
      mode === "measured"
        ? "Les métriques évoluent à partir des signaux d'usage du site et des éventuels inputs explicites."
        : "Aucun signal d'usage n'est branché; les charges de référence sont utilisées.",
    ],
    secondOrder,
  };
}
