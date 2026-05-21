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
  ENVIRONMENTAL_IMPACT_CHATGPT_EXTENDED_MODE_HOURS_PER_WEEK,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_PROJECT_ANCHORS,
  ENVIRONMENTAL_IMPACT_POST_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_SECOND_ORDER_FACTOR_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_SECOND_ORDER_HYPOTHESES,
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
  EnvironmentalImpactLifecycleAxisEstimate,
  EnvironmentalImpactLifecycleAxisKey,
  EnvironmentalImpactLifecycleComponentEstimate,
  EnvironmentalImpactLifecycleComponentKey,
  EnvironmentalImpactLifecycleEstimate,
  EnvironmentalImpactPostDefinition,
  EnvironmentalImpactPostEstimate,
  EnvironmentalImpactSecondOrderEstimate,
  EnvironmentalImpactScopeEstimate,
  EnvironmentalImpactScopeCurvePoint,
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

const SECOND_ORDER_FACTOR_DEFINITION_BY_KEY = new Map(
  ENVIRONMENTAL_IMPACT_SECOND_ORDER_FACTOR_DEFINITIONS.map((definition) => [
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
  const monthlyChatgptConversationHours = resolveNumber(
    usageInput?.monthlyChatgptConversationHours,
    ENVIRONMENTAL_IMPACT_CHATGPT_EXTENDED_MODE_HOURS_PER_WEEK * WEEKS_PER_MONTH,
  );
  const monthlyCodexSessions = resolveNumber(usageInput?.monthlyCodexSessions, 0);
  const monthlyCodexConversationTurns = resolveNumber(
    usageInput?.monthlyCodexConversationTurns,
    0,
  );
  const monthlyCodexToolActions = resolveNumber(usageInput?.monthlyCodexToolActions, 0);
  const monthlyCodexShellCommands = resolveNumber(usageInput?.monthlyCodexShellCommands, 0);
  const monthlyCodexFilesTouched = resolveNumber(usageInput?.monthlyCodexFilesTouched, 0);
  const monthlyCodexTestsRun = resolveNumber(usageInput?.monthlyCodexTestsRun, 0);
  const monthlyCodexChangedLines = resolveNumber(usageInput?.monthlyCodexChangedLines, 0);
  const monthlyCodexActiveMinutes = resolveNumber(usageInput?.monthlyCodexActiveMinutes, 0);
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
    monthlyChatgptConversationHours,
    monthlyCodexSessions,
    monthlyCodexConversationTurns,
    monthlyCodexToolActions,
    monthlyCodexShellCommands,
    monthlyCodexFilesTouched,
    monthlyCodexTestsRun,
    monthlyCodexChangedLines,
    monthlyCodexActiveMinutes,
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
    monthlyChatgptConversationHours: round6(
      usage.monthlyChatgptConversationHours * weeklyScale * multiplier,
    ),
    monthlyCodexSessions: round6(usage.monthlyCodexSessions * weeklyScale * multiplier),
    monthlyCodexConversationTurns: round6(
      usage.monthlyCodexConversationTurns * weeklyScale * multiplier,
    ),
    monthlyCodexToolActions: round6(usage.monthlyCodexToolActions * weeklyScale * multiplier),
    monthlyCodexShellCommands: round6(usage.monthlyCodexShellCommands * weeklyScale * multiplier),
    monthlyCodexFilesTouched: round6(usage.monthlyCodexFilesTouched * weeklyScale * multiplier),
    monthlyCodexTestsRun: round6(usage.monthlyCodexTestsRun * weeklyScale * multiplier),
    monthlyCodexChangedLines: round6(usage.monthlyCodexChangedLines * weeklyScale * multiplier),
    monthlyCodexActiveMinutes: round6(usage.monthlyCodexActiveMinutes * weeklyScale * multiplier),
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
    curve: [],
  };
}

function buildScopeCurveDriverBreakdown(
  breakdown: Partial<Record<EnvironmentalImpactPostDefinition["key"], number>>,
  scopeKey: EnvironmentalImpactScopeKey,
): Record<"pageView" | "community" | "notifications" | "actions" | "pdf" | "ia" | "codex", number> {
  const pageView = breakdown.pageViews ?? 0;
  const community = (breakdown.storedImages ?? 0) * 0.6;
  const notifications = (breakdown.apiRequests ?? 0) * 0.25;
  const actions = (breakdown.maps ?? 0) * 0.7;
  const pdf = breakdown.pdfExports ?? 0;
  const ia = (breakdown.aiCalls ?? 0) * 0.9;
  const codex = scopeKey === "user" ? (breakdown.storageGbMonths ?? 0) * 0.15 : 0;

  return {
    pageView: round6(pageView),
    community: round6(community),
    notifications: round6(notifications),
    actions: round6(actions),
    pdf: round6(pdf),
    ia: round6(ia),
    codex: round6(codex),
  };
}

function buildScopeCurveEstimate(params: {
  scope: EnvironmentalImpactScopeEstimate;
  usageProfile: EnvironmentalImpactUsageProfileEstimate;
  referencePeriodMonths: number;
  anchorDate: string;
}): EnvironmentalImpactScopeCurvePoint[] {
  const { scope, usageProfile, referencePeriodMonths, anchorDate } = params;
  const launchedAt = parseDateOrNull(anchorDate) ?? new Date(anchorDate);
  const weeks = Math.max(1, Math.round(referencePeriodMonths * WEEKS_PER_MONTH));
  const rawWeights: number[] = [];

  for (let index = 0; index <= weeks; index += 1) {
    if (index === 0) {
      rawWeights.push(0);
      continue;
    }

    const projectedUsage = projectUsageProfileAtWeek(usageProfile, index);
    const baseWeeklyPageViews = Math.max(1, usageProfile.monthlyPageViews / WEEKS_PER_MONTH);
    rawWeights.push(
      clampUsageMultiplier(projectedUsage.monthlyPageViews / Math.max(1, baseWeeklyPageViews)),
    );
  }

  const weightTotal = rawWeights.reduce((acc, value) => acc + value, 0);
  const fallbackWeight = weeks > 0 ? 1 / weeks : 1;
  const pointConfidenceBase = clamp(round6(58 + (scope.coveragePercent / 100) * 26), 46, 94);
  let cumulativeKgCo2eProxy = 0;

  return rawWeights.map((rawWeight, index) => {
    const normalizedWeight =
      index === 0
        ? 0
        : weightTotal > 0
          ? rawWeight / weightTotal
          : fallbackWeight;
    const weeklyKgCo2eProxy = round6((scope.totalKgCo2eProxy ?? 0) * normalizedWeight);
    cumulativeKgCo2eProxy = round6(cumulativeKgCo2eProxy + weeklyKgCo2eProxy);
    const pointDate = addWeeks(launchedAt, index);
    const breakdown = Object.fromEntries(
      scope.posts.map((post) => [
        post.key,
        round6((post.estimatedKgCo2eProxy ?? 0) * normalizedWeight),
      ]),
    ) as Partial<Record<EnvironmentalImpactPostDefinition["key"], number>>;
    const pointConfidence = clamp(round6(pointConfidenceBase - index * 0.18), 42, 96);
    const pointUncertainty = round6(100 - pointConfidence);

    return {
      index,
      weekLabel: formatWeekLabel(pointDate, index === 0),
      date: pointDate.toISOString(),
      weeklyKgCo2eProxy,
      cumulativeKgCo2eProxy,
      lowerKgCo2eProxy: round6(
        Math.max(0, cumulativeKgCo2eProxy * (1 - pointUncertainty / 100)),
      ),
      upperKgCo2eProxy: round6(
        cumulativeKgCo2eProxy * (1 + pointUncertainty / 100),
      ),
      confidencePercent: pointConfidence,
      breakdown,
      driverBreakdown: buildScopeCurveDriverBreakdown(breakdown, scope.key),
    };
  });
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

function buildSecondOrderScoreSignals(
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

function buildInfrastructureSecondOrderEstimate(
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

type EnvironmentalImpactLifecycleScoreSignals = Record<
  EnvironmentalImpactLifecycleAxisKey | EnvironmentalImpactLifecycleComponentKey,
  number
>;

function buildLifecycleScoreSignals(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
): EnvironmentalImpactLifecycleScoreSignals {
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
    energy: round6(
      usageProfile.monthlyPageViews * 0.22 +
        usageProfile.monthlyBandwidthGb * 0.28 +
        usageProfile.monthlyEgressGb * 0.24 +
        usageProfile.monthlyStorageGbMonths * 0.16 +
        chatgpt * 0.08 +
        vercel * 0.1,
    ),
    carbon: round6(
      usageProfile.monthlyAiCalls * 0.28 +
        chatgpt * 0.12 +
        usageProfile.monthlyCodexActiveMinutes * 0.22 +
        usageProfile.monthlyDeployments * 0.16 +
        usageProfile.monthlyErrorEvents * 0.08 +
        codex * 0.16 +
        lws * 0.1,
    ),
    water: round6(
      usageProfile.monthlyAiCalls * 0.3 +
        chatgpt * 0.14 +
        usageProfile.monthlyStorageGbMonths * 0.18 +
        usageProfile.monthlyBandwidthGb * 0.14 +
        usageProfile.monthlyEgressGb * 0.12 +
        supabase * 0.12 +
        posthog * 0.04 +
        upstash * 0.02 +
        pinecone * 0.08,
    ),
    materials: round6(
      usageProfile.monthlyStorageGbMonths * 0.26 +
        usageProfile.monthlyPdfExports * 0.18 +
        usageProfile.monthlyActiveUsers * 0.16 +
        usageProfile.monthlyDeployments * 0.14 +
        resend * 0.08 +
        stripe * 0.06 +
        clerk * 0.06 +
        sentry * 0.04,
    ),
    ewaste: round6(
      usageProfile.monthlyDeployments * 0.26 +
        usageProfile.monthlyCodexFilesTouched * 0.18 +
        usageProfile.monthlyErrorEvents * 0.14 +
        usageProfile.monthlySessions * 0.1 +
        usageProfile.monthlyEmailsSent * 0.08 +
        usageProfile.monthlyActiveUsers * 0.04 +
        resend * 0.1 +
        sentry * 0.06 +
        stripe * 0.04,
    ),
    servers: round6(
      usageProfile.monthlyPageViews * 0.18 +
        usageProfile.monthlyApiRequests * 0.2 +
        usageProfile.monthlyRealtimeEvents * 0.12 +
        vercel * 0.26 +
        supabase * 0.24,
    ),
    gpus: round6(
      usageProfile.monthlyAiCalls * 0.48 +
        chatgpt * 0.18 +
        usageProfile.monthlyCodexActiveMinutes * 0.24 +
        usageProfile.monthlyCodexTestsRun * 0.1 +
        usageProfile.monthlyCodexConversationTurns * 0.08 +
        codex * 0.1,
    ),
    userDevices: round6(
      usageProfile.monthlyActiveUsers * 0.22 +
        usageProfile.monthlySessions * 0.18 +
        usageProfile.monthlyPageViews * 0.18 +
        usageProfile.monthlyMapViews * 0.12 +
        posthog * 0.05 +
        clerk * 0.05 +
        resend * 0.04 +
        stripe * 0.02,
    ),
    networks: round6(
      usageProfile.monthlyBandwidthGb * 0.32 +
        usageProfile.monthlyEgressGb * 0.26 +
        usageProfile.monthlyRealtimeEvents * 0.14 +
        usageProfile.monthlyPageViews * 0.1 +
        usageProfile.monthlyApiRequests * 0.08 +
        lws * 0.1,
    ),
    storage: round6(
      usageProfile.monthlyStorageGbMonths * 0.42 +
        usageProfile.monthlyPdfExports * 0.18 +
        usageProfile.monthlyEmailsSent * 0.08 +
        supabase * 0.2 +
        resend * 0.12,
    ),
    maintenance: round6(
      usageProfile.monthlyDeployments * 0.34 +
        usageProfile.monthlyErrorEvents * 0.16 +
        usageProfile.monthlyAuthEvents * 0.14 +
        usageProfile.monthlyRealtimeEvents * 0.1 +
        sentry * 0.12 +
        clerk * 0.08 +
        upstash * 0.06,
    ),
    renewal: round6(
      usageProfile.monthlyDeployments * 0.24 +
        usageProfile.monthlyActiveUsers * 0.14 +
        usageProfile.monthlyStorageGbMonths * 0.16 +
        usageProfile.monthlyPageViews * 0.08 +
        vercel * 0.18 +
        supabase * 0.12 +
        lws * 0.08,
    ),
    endOfLife: round6(
      usageProfile.monthlyDeployments * 0.2 +
        usageProfile.monthlyCodexFilesTouched * 0.16 +
        usageProfile.monthlyErrorEvents * 0.14 +
        usageProfile.monthlyEmailsSent * 0.08 +
        stripe * 0.08 +
        resend * 0.1 +
        sentry * 0.12 +
        lws * 0.12,
    ),
  };
}

function buildLifecycleEstimate(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
  totalKgCo2eProxy: number | null,
): EnvironmentalImpactLifecycleEstimate {
  const scoreSignals = buildLifecycleScoreSignals(usageProfile, services);
  const axisScoreTotal = round6(
    ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.reduce(
      (acc, definition) => acc + scoreSignals[definition.key],
      0,
    ),
  );
  const componentScoreTotal = round6(
    ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS.reduce(
      (acc, definition) => acc + scoreSignals[definition.key],
      0,
    ),
  );
  const source: EnvironmentalImpactLifecycleEstimate["source"] =
    totalKgCo2eProxy === null || totalKgCo2eProxy <= 0 ? "reference" : "mixed";

  if (!hasNumericInput(totalKgCo2eProxy) || totalKgCo2eProxy <= 0) {
    return {
      totalKgCo2eProxy: totalKgCo2eProxy ?? 0,
      axisEstimates: ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.map((definition) => ({
        ...definition,
        quantity: 0,
        estimatedKgCo2eProxy: 0,
        sharePercent: 0,
        source,
      })),
      componentEstimates: ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS.map(
        (definition) => ({
          ...definition,
          quantity: 0,
          estimatedKgCo2eProxy: 0,
          sharePercent: 0,
          source,
        }),
      ),
      notes: [
        "La lecture lifecycle reste nulle tant que le total d'infrastructure n'affiche aucune charge environnementale.",
      ],
      hypotheses: [...ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES],
      source,
    };
  }

  const axisTotalWeight = ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.reduce(
    (acc, definition) => acc + definition.referenceWeight,
    0,
  );
  const componentTotalWeight = ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS.reduce(
    (acc, definition) => acc + definition.referenceWeight,
    0,
  );
  const axisNormalizer = axisScoreTotal > 0 ? axisScoreTotal : axisTotalWeight;
  const componentNormalizer =
    componentScoreTotal > 0 ? componentScoreTotal : componentTotalWeight;

  const axisEstimates = ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS.map((definition) => {
    const score = scoreSignals[definition.key];
    const normalizedWeight =
      axisScoreTotal > 0
        ? score / axisNormalizer
        : definition.referenceWeight / Math.max(1, axisTotalWeight);
    const estimatedKgCo2eProxy = round6((totalKgCo2eProxy ?? 0) * normalizedWeight);
    const quantity = round6(estimatedKgCo2eProxy / definition.proxyKgCo2ePerUnit);

    return {
      ...definition,
      quantity,
      estimatedKgCo2eProxy,
      sharePercent: round6(normalizedWeight * 100),
      source: "mixed" as const,
    };
  });

  const componentEstimates = ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS.map(
    (definition) => {
    const score = scoreSignals[definition.key];
    const normalizedWeight =
        componentScoreTotal > 0
          ? score / componentNormalizer
          : definition.referenceWeight / Math.max(1, componentTotalWeight);
      const estimatedKgCo2eProxy = round6((totalKgCo2eProxy ?? 0) * normalizedWeight);
      const quantity = round6(estimatedKgCo2eProxy / definition.proxyKgCo2ePerUnit);

      return {
        ...definition,
        quantity,
        estimatedKgCo2eProxy,
        sharePercent: round6(normalizedWeight * 100),
        source: "mixed" as const,
      };
    },
  );

  const totalFromAxes = round6(
    axisEstimates.reduce((acc, axis) => acc + (axis.estimatedKgCo2eProxy ?? 0), 0),
  );

  return {
    totalKgCo2eProxy: totalKgCo2eProxy ?? totalFromAxes,
    axisEstimates,
    componentEstimates,
    notes: [
      "La lecture lifecycle réunit énergie, carbone, eau, matière et e-waste pour montrer l'empreinte matérielle complète du projet.",
      "Cette couche reste une décomposition auditable du total d'infrastructure et ne doit pas être additionnée à un autre total identique.",
    ],
    hypotheses: [...ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES],
    source,
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
      "Les conversations ChatGPT / LLM sont distinguées des sessions Codex et peuvent être ancrées à 2h hebdomadaires en mode ChatGPT 5.5 étendu tant qu'aucun journal plus fin n'est branché.",
      "Le poste Codex / ChatGPT Plus repose sur un journal hebdomadaire spécifique au projet; sans semaine enregistrée, il reste explicitement à zéro et signalé comme non branché.",
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
