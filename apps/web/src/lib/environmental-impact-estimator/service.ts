import { addMonths, addWeeks, differenceInCalendarMonths } from "date-fns";
import {
  ENVIRONMENTAL_IMPACT_ESTIMATOR_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_ESTIMATOR_LIMITATIONS,
  ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
  ENVIRONMENTAL_IMPACT_GRAPH_CONSIDERATIONS,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_METRIC_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_NOTES,
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_SERVICE_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_POST_DEFINITIONS,
} from "./constants";
import { normalizeEnvironmentalImpactEstimateInput } from "./validation";
import type {
  EnvironmentalImpactEstimateInput,
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactDataGapNote,
  EnvironmentalImpactEstimatorMethodology,
  EnvironmentalImpactInfrastructureCurvePoint,
  EnvironmentalImpactInfrastructureEstimate,
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactInfrastructureMetricDefinition,
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureMetricsInput,
  EnvironmentalImpactInfrastructureServiceDefinition,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactPostDefinition,
  EnvironmentalImpactPostEstimate,
  EnvironmentalImpactScopeEstimate,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactScopeKey,
  EnvironmentalImpactUsageProfileEstimate,
  EnvironmentalImpactUsageProfileInput,
} from "./types";

const METRIC_DEFINITION_BY_KEY = new Map(
  ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_METRIC_DEFINITIONS.map((definition) => [
    definition.key,
    definition,
  ]),
);

const WEEKS_PER_MONTH = 52 / 12;

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sumDefined(values: Array<number | null>): number | null {
  const available = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  if (available.length === 0) {
    return null;
  }

  return round6(available.reduce((acc, value) => acc + value, 0));
}

function hasNumericInput(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function hasUsageInput(
  input: EnvironmentalImpactUsageProfileInput | null | undefined,
): boolean {
  if (!input) {
    return false;
  }

  return Object.values(input).some((value) => value !== null && value !== undefined);
}

function hasScopeSignalInput(
  input: EnvironmentalImpactScopeInput | null | undefined,
): boolean {
  if (!input) {
    return false;
  }

  return [
    input.pageViews,
    input.storedImages,
    input.apiRequests,
    input.pdfExports,
    input.maps,
    input.storageGbMonths,
    input.aiCalls,
  ].some((value) => hasNumericInput(value));
}

function resolveNumber(value: number | null | undefined, fallback: number): number {
  return hasNumericInput(value) ? value : fallback;
}

function clampUsageMultiplier(value: number): number {
  return Math.max(0.1, value);
}

function buildUsageProfileEstimate(
  infrastructureInput: EnvironmentalImpactInfrastructureInput | null | undefined,
  siteInput: EnvironmentalImpactScopeInput | null | undefined,
  userInput: EnvironmentalImpactScopeInput | null | undefined,
): EnvironmentalImpactUsageProfileEstimate {
  const usageInput = infrastructureInput?.usage ?? null;
  const sitePageViews = resolveNumber(siteInput?.pageViews, 0);
  const userPageViews = resolveNumber(userInput?.pageViews, 0);
  const fallbackPageViews = Math.max(1, sitePageViews + userPageViews);
  const monthlyPageViews = resolveNumber(
    usageInput?.monthlyPageViews,
    fallbackPageViews > 1 ? fallbackPageViews : 60_000,
  );
  const monthlyActiveUsers = resolveNumber(
    usageInput?.monthlyActiveUsers,
    Math.max(25, Math.round(monthlyPageViews / 18)),
  );
  const monthlySessions = resolveNumber(
    usageInput?.monthlySessions,
    Math.max(Math.round(monthlyActiveUsers * 1.8), Math.round(monthlyPageViews / 1.35)),
  );
  const monthlyPdfExports = resolveNumber(
    usageInput?.monthlyPdfExports,
    Math.max(0, Math.round(resolveNumber(siteInput?.pdfExports, monthlyPageViews * 0.004))),
  );
  const monthlyMapViews = resolveNumber(
    usageInput?.monthlyMapViews,
    Math.max(0, Math.round(resolveNumber(siteInput?.maps, monthlyPageViews * 0.03))),
  );
  const monthlyAiCalls = resolveNumber(
    usageInput?.monthlyAiCalls,
    Math.max(0, Math.round(resolveNumber(siteInput?.aiCalls, monthlyPageViews * 0.0012))),
  );
  const monthlyStorageGbMonths = resolveNumber(
    usageInput?.monthlyStorageGbMonths,
    Math.max(
      0.1,
      round6(
        resolveNumber(siteInput?.storageGbMonths, 0) +
          resolveNumber(siteInput?.storedImages, 0) * 0.0025 +
          resolveNumber(userInput?.storageGbMonths, 0) * 0.35,
      ),
    ),
  );
  const monthlyApiRequests = resolveNumber(
    usageInput?.monthlyApiRequests,
    Math.max(
      1,
      Math.round(
        resolveNumber(siteInput?.apiRequests, monthlyPageViews * 0.32) +
          monthlySessions * 0.12 +
          monthlyPdfExports * 2,
      ),
    ),
  );
  const monthlyAuthEvents = resolveNumber(
    usageInput?.monthlyAuthEvents,
    Math.max(1, Math.round(monthlyActiveUsers * 1.45)),
  );
  const monthlyRealtimeEvents = resolveNumber(
    usageInput?.monthlyRealtimeEvents,
    Math.max(1, Math.round(monthlyActiveUsers * 10 + monthlySessions * 0.55)),
  );
  const monthlyEgressGb = resolveNumber(
    usageInput?.monthlyEgressGb,
    Math.max(
      0.1,
      round6(monthlyPageViews * 0.00008 + monthlyMapViews * 0.0014 + monthlyStorageGbMonths * 0.12),
    ),
  );
  const monthlyBandwidthGb = resolveNumber(
    usageInput?.monthlyBandwidthGb,
    Math.max(
      0.1,
      round6(monthlyPageViews * 0.00011 + monthlyMapViews * 0.0012 + monthlyPdfExports * 0.002),
    ),
  );
  const monthlyEmailsSent = resolveNumber(
    usageInput?.monthlyEmailsSent,
    Math.max(0, Math.round(monthlyActiveUsers * 0.08 + monthlyPdfExports * 0.15)),
  );
  const monthlyDeployments = resolveNumber(
    usageInput?.monthlyDeployments,
    Math.max(1, Math.round(2 + monthlyActiveUsers / 250)),
  );
  const monthlyErrorEvents = resolveNumber(
    usageInput?.monthlyErrorEvents,
    Math.max(0, Math.round(monthlyApiRequests * 0.0025)),
  );
  const growthRateMonthly = resolveNumber(
    usageInput?.growthRateMonthly,
    Math.min(0.12, Math.max(0.01, monthlyPageViews > 0 ? Math.min(0.1, monthlyActiveUsers / monthlyPageViews) : 0.04)),
  );
  const seasonalityAmplitude = resolveNumber(usageInput?.seasonalityAmplitude, 0.08);
  const horizonMonths = resolveNumber(
    usageInput?.horizonMonths,
    infrastructureInput?.referencePeriodMonths ?? 12,
  );

  const source: "input" | "derived" =
    hasUsageInput(usageInput) || hasScopeSignalInput(siteInput) || hasScopeSignalInput(userInput)
      ? "input"
      : "derived";
  const derivedFrom =
    source === "input"
    ? []
    : [
        ...(siteInput?.pageViews != null ? ["site.pageViews"] : []),
        ...(siteInput?.apiRequests != null ? ["site.apiRequests"] : []),
        ...(siteInput?.pdfExports != null ? ["site.pdfExports"] : []),
        ...(siteInput?.maps != null ? ["site.maps"] : []),
        ...(siteInput?.storageGbMonths != null ? ["site.storageGbMonths"] : []),
        ...(siteInput?.aiCalls != null ? ["site.aiCalls"] : []),
        ...(userInput?.pageViews != null ? ["user.pageViews"] : []),
      ];

  return {
    monthlyPageViews,
    monthlyActiveUsers,
    monthlySessions,
    monthlyEmailsSent,
    monthlyDeployments,
    monthlyPdfExports,
    monthlyMapViews,
    monthlyAiCalls,
    monthlyStorageGbMonths,
    monthlyApiRequests,
    monthlyAuthEvents,
    monthlyRealtimeEvents,
    monthlyEgressGb,
    monthlyBandwidthGb,
    monthlyErrorEvents,
    growthRateMonthly,
    seasonalityAmplitude,
    horizonMonths,
    source,
    derivedFrom,
  };
}

function projectUsageProfileAtWeek(
  usage: EnvironmentalImpactUsageProfileEstimate,
  weekIndex: number,
): EnvironmentalImpactUsageProfileEstimate {
  const weeklyGrowthRate = Math.pow(1 + usage.growthRateMonthly, 1 / WEEKS_PER_MONTH) - 1;
  const growthMultiplier = Math.pow(1 + weeklyGrowthRate, weekIndex);
  const seasonalMultiplier =
    1 +
    usage.seasonalityAmplitude *
      Math.sin(((weekIndex % 52) / 52) * Math.PI * 2);
  const multiplier = clampUsageMultiplier(growthMultiplier * seasonalMultiplier);
  const weeklyScale = 1 / WEEKS_PER_MONTH;

  return {
    ...usage,
    monthlyPageViews: round6(usage.monthlyPageViews * weeklyScale * multiplier),
    monthlyActiveUsers: round6(usage.monthlyActiveUsers * weeklyScale * multiplier),
    monthlySessions: round6(usage.monthlySessions * weeklyScale * multiplier),
    monthlyEmailsSent: round6(usage.monthlyEmailsSent * weeklyScale * multiplier),
    monthlyDeployments: round6(usage.monthlyDeployments * weeklyScale * multiplier),
    monthlyPdfExports: round6(usage.monthlyPdfExports * weeklyScale * multiplier),
    monthlyMapViews: round6(usage.monthlyMapViews * weeklyScale * multiplier),
    monthlyAiCalls: round6(usage.monthlyAiCalls * weeklyScale * multiplier),
    monthlyStorageGbMonths: round6(usage.monthlyStorageGbMonths * weeklyScale * multiplier),
    monthlyApiRequests: round6(usage.monthlyApiRequests * weeklyScale * multiplier),
    monthlyAuthEvents: round6(usage.monthlyAuthEvents * weeklyScale * multiplier),
    monthlyRealtimeEvents: round6(usage.monthlyRealtimeEvents * weeklyScale * multiplier),
    monthlyEgressGb: round6(usage.monthlyEgressGb * weeklyScale * multiplier),
    monthlyBandwidthGb: round6(usage.monthlyBandwidthGb * weeklyScale * multiplier),
    monthlyErrorEvents: round6(usage.monthlyErrorEvents * weeklyScale * multiplier),
    horizonMonths: usage.horizonMonths,
    growthRateMonthly: usage.growthRateMonthly,
    seasonalityAmplitude: usage.seasonalityAmplitude,
    source: usage.source,
    derivedFrom: usage.derivedFrom,
  };
}

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatWeekLabel(date: Date, isLaunchPoint: boolean): string {
  if (isLaunchPoint) {
    return "Lancement";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function getServiceMonthlyTotal(
  service: EnvironmentalImpactInfrastructureServiceDefinition,
  metricEstimates: EnvironmentalImpactInfrastructureMetricEstimate[],
): number {
  const total = metricEstimates.reduce(
    (acc, metric) => acc + (metric.estimatedKgCo2eProxy ?? 0),
    0,
  );

  return round6(total);
}

function buildPostEstimate(
  definition: EnvironmentalImpactPostDefinition,
  scopeInput: EnvironmentalImpactScopeInput | null | undefined,
): EnvironmentalImpactPostEstimate {
  const quantity = hasNumericInput(scopeInput?.[definition.key])
    ? scopeInput?.[definition.key] ?? null
    : null;
  const estimatedKgCo2eProxy =
    quantity === null ? null : round6(quantity * definition.proxyKgCo2ePerUnit);

  return {
    ...definition,
    quantity,
    estimatedKgCo2eProxy,
    state: quantity === null ? "missing" : "available",
  };
}

function buildScopeStatus(availablePostCount: number, totalPostCount: number) {
  if (availablePostCount === 0) {
    return "unbound" as const;
  }

  if (availablePostCount < totalPostCount) {
    return "partial" as const;
  }

  return "ready" as const;
}

function buildScopeEstimate(
  key: EnvironmentalImpactScopeKey,
  scopeInput: EnvironmentalImpactScopeInput | null | undefined,
): EnvironmentalImpactScopeEstimate {
  const posts = ENVIRONMENTAL_IMPACT_POST_DEFINITIONS.map((definition) =>
    buildPostEstimate(definition, scopeInput),
  );
  const availablePostCount = posts.filter((post) => post.state === "available").length;
  const missingPostCount = posts.length - availablePostCount;
  const totalKgCo2eProxy = sumDefined(
    posts.map((post) => post.estimatedKgCo2eProxy),
  );

  return {
    key,
    label:
      key === "site"
        ? "Impact total du site au jour J"
        : "Impact par utilisateur depuis la création du compte",
    periodLabel:
      key === "site" ? "Lecture globale" : "Lecture depuis ouverture du compte",
    accountCreatedAt: scopeInput?.accountCreatedAt ?? null,
    measuredAt: scopeInput?.measuredAt ?? null,
    status: buildScopeStatus(availablePostCount, posts.length),
    totalKgCo2eProxy,
    availablePostCount,
    missingPostCount,
    coveragePercent:
      posts.length > 0 ? round6((availablePostCount / posts.length) * 100) : 0,
    posts,
  };
}

function buildScopeMissingDataNotes(
  scope: EnvironmentalImpactScopeEstimate,
): EnvironmentalImpactDataGapNote[] {
  const scopeLabel = scope.key === "site" ? "Site" : "Utilisateur";

  return scope.posts
    .filter((post) => post.state === "missing")
    .map((post) => ({
      key: `${scope.key}.${post.key}`,
      title: `${scopeLabel} - ${post.label} non branché`,
      detail: `Aucune donnée directe n'est disponible pour ${post.label.toLowerCase()} sur cette portée. Le calcul conserve ce poste comme manquant au lieu de le transformer en zéro implicite.`,
      scope: scope.key,
      severity: "warn" as const,
    }));
}

function buildInfrastructureMetricEstimate(
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

function buildInfrastructureMissingDataNotes(
  infrastructure: EnvironmentalImpactInfrastructureEstimate,
): EnvironmentalImpactDataGapNote[] {
  return infrastructure.services
    .filter((service) => service.metricEstimates.some((metric) => metric.source !== "input"))
    .map((service) => {
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

function deriveMetricQuantityFromUsage(
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

function buildInfrastructureServiceEstimate(
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
      inputMetricCount > 0 && derivedMetricCount === 0 && referenceMetricCount === 0
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

function buildInfrastructureCurve(
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

function buildInfrastructureEstimate(
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
      mode === "measured"
        ? "Les métriques évoluent à partir des signaux d'usage du site et des éventuels inputs explicites."
        : "Aucun signal d'usage n'est branché; les charges de référence sont utilisées.",
    ],
  };
}

export function buildEnvironmentalImpactEstimatorMethodology(
  generatedAt: string,
): EnvironmentalImpactEstimatorMethodology {
  return {
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
    generatedAt,
    hypotheses: [
      ...ENVIRONMENTAL_IMPACT_ESTIMATOR_HYPOTHESES,
      ...ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_HYPOTHESES,
    ],
    limitations: [...ENVIRONMENTAL_IMPACT_ESTIMATOR_LIMITATIONS],
    notes: [
      "Le moteur expose chaque poste de consommation et son facteur plutôt que de masquer l'approximation dans un score unique.",
      "Les totaux ne sont calculés que sur les postes branchés, afin de ne jamais confondre absence de données et valeur nulle.",
      "La courbe temporelle est un cumul mensuel proxy pour les services d'infrastructure et le domaine.",
    ],
  };
}

export function computeEnvironmentalImpactEstimate(
  input?: EnvironmentalImpactEstimateInput | null,
): EnvironmentalImpactEstimateModel {
  const normalized = normalizeEnvironmentalImpactEstimateInput(input);
  const generatedAt = normalized.input.generatedAt ?? new Date().toISOString();
  const site = buildScopeEstimate("site", normalized.input.site);
  const user = buildScopeEstimate("user", normalized.input.user);
  const infrastructure = buildInfrastructureEstimate(
    normalized.input.infrastructure,
    generatedAt,
    normalized.input.site,
    normalized.input.user,
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
  };
}
