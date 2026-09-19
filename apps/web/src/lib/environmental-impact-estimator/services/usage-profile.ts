import type {
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactUsageProvenanceItem,
  EnvironmentalImpactUsageProvenanceSource,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import {
  WEEKS_PER_MONTH,
  clampUsageMultiplier,
  hasScopeSignalInput,
  hasNumericInput,
  hasUsageInput,
  resolveNumber,
  round6,
} from "./utils";
import {
  buildUsageDerivedFrom,
  buildUsageOperationsMetrics,
  buildUsageTrendMetrics,
} from "./usage-profile-operations";
interface UsageProfileContext {
  infrastructureInput: EnvironmentalImpactInfrastructureInput | null | undefined;
  siteInput: EnvironmentalImpactScopeInput | null | undefined;
  userInput: EnvironmentalImpactScopeInput | null | undefined;
  usageInput: EnvironmentalImpactInfrastructureInput["usage"] | null;
  pushProvenance: (item: EnvironmentalImpactUsageProvenanceItem) => void;
}
function getTrafficPageViewsDetail(hasSignals: boolean): string {
  return hasSignals
    ? "Dérivé des signaux site/utilisateur"
    : "Référence mensuelle si aucun signal n'est branché";
}
function getTrafficPageViewsSource(hasSignals: boolean): EnvironmentalImpactUsageProvenanceSource {
  return hasSignals ? "derived" : "reference";
}
function getTrafficSignalDetail(label: string): string {
  return `Dérivé du signal site ${label}`;
}
function getTrafficFallbackDetail(): string {
  return "Dérivé des pages vues du site";
}
function resolveMonthlyPageViewsMetric(
  ctx: UsageProfileContext,
  sitePageViews: number,
  userPageViews: number,
): number {
  const hasTrafficSignals = sitePageViews > 0 || userPageViews > 0;
  const fallbackPageViews = Math.max(1, sitePageViews + userPageViews);
  return resolveUsageField(
    ctx,
    "monthlyPageViews",
    "Pages vues",
    ctx.usageInput?.monthlyPageViews,
    fallbackPageViews > 1 ? fallbackPageViews : 60_000,
    getTrafficPageViewsDetail(hasTrafficSignals),
    getTrafficPageViewsSource(hasTrafficSignals),
  );
}
function resolveMonthlyActiveUsersMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlyActiveUsers",
    "Utilisateurs actifs",
    ctx.usageInput?.monthlyActiveUsers,
    Math.max(25, Math.round(monthlyPageViews / 18)),
    "Dérivé des pages vues mensuelles",
    "derived",
  );
}
function resolveMonthlySessionsMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
  monthlyActiveUsers: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlySessions",
    "Sessions",
    ctx.usageInput?.monthlySessions,
    Math.max(Math.round(monthlyActiveUsers * 1.8), Math.round(monthlyPageViews / 1.35)),
    "Dérivé des pages vues et des utilisateurs actifs",
    "derived",
  );
}
function resolveMonthlyPdfExportsMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
): number {
  const hasSitePdfExports = ctx.siteInput?.pdfExports != null;
  return resolveUsageField(
    ctx,
    "monthlyPdfExports",
    "Exports PDF",
    ctx.usageInput?.monthlyPdfExports,
    Math.max(0, Math.round(resolveNumber(ctx.siteInput?.pdfExports, monthlyPageViews * 0.004))),
    hasSitePdfExports ? getTrafficSignalDetail("pdfExports") : getTrafficFallbackDetail(),
    "derived",
  );
}
function resolveMonthlyMapViewsMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
): number {
  const hasSiteMaps = ctx.siteInput?.maps != null;
  return resolveUsageField(
    ctx,
    "monthlyMapViews",
    "Vues carte",
    ctx.usageInput?.monthlyMapViews,
    Math.max(0, Math.round(resolveNumber(ctx.siteInput?.maps, monthlyPageViews * 0.03))),
    hasSiteMaps ? getTrafficSignalDetail("maps") : getTrafficFallbackDetail(),
    "derived",
  );
}
function resolveMonthlyAiCallsMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
): number {
  const hasSiteAiCalls = ctx.siteInput?.aiCalls != null;
  return resolveUsageField(
    ctx,
    "monthlyAiCalls",
    "Appels IA",
    ctx.usageInput?.monthlyAiCalls,
    Math.max(0, Math.round(resolveNumber(ctx.siteInput?.aiCalls, monthlyPageViews * 0.0012))),
    hasSiteAiCalls ? getTrafficSignalDetail("aiCalls") : getTrafficFallbackDetail(),
    "derived",
  );
}
function resolveMonthlyChatgptConversationHoursMetric(ctx: UsageProfileContext): number | null {
  const value = ctx.usageInput?.monthlyChatgptConversationHours;
  if (value === null || value === undefined) {
    return null;
  }

  return resolveUsageField(
    ctx,
    "monthlyChatgptConversationHours",
    "Heures ChatGPT hors Codex",
    value,
    value,
    "Mesure fournie explicitement; sans mesure, l'usage ChatGPT exact reste NA.",
    "input",
  );
}
function resolveUsageField(
  ctx: UsageProfileContext,
  key: string,
  label: string,
  inputValue: number | null | undefined,
  fallbackValue: number,
  detail: string,
  source: EnvironmentalImpactUsageProvenanceSource,
): number {
  const hasInput = inputValue !== null && inputValue !== undefined;
  const value = resolveNumber(inputValue, fallbackValue);
  ctx.pushProvenance({
    key,
    label,
    value,
    source: hasInput ? "input" : source,
    detail,
  });
  return value;
}
function buildUsageTrafficMetrics(ctx: UsageProfileContext, sitePageViews: number, userPageViews: number) {
  const monthlyPageViews = resolveMonthlyPageViewsMetric(ctx, sitePageViews, userPageViews);
  return {
    monthlyPageViews,
    monthlyActiveUsers: resolveMonthlyActiveUsersMetric(ctx, monthlyPageViews),
    monthlySessions: resolveMonthlySessionsMetric(
      ctx,
      monthlyPageViews,
      resolveMonthlyActiveUsersMetric(ctx, monthlyPageViews),
    ),
    monthlyPdfExports: resolveMonthlyPdfExportsMetric(ctx, monthlyPageViews),
    monthlyMapViews: resolveMonthlyMapViewsMetric(ctx, monthlyPageViews),
    monthlyAiCalls: resolveMonthlyAiCallsMetric(ctx, monthlyPageViews),
    monthlyChatgptConversationHours: resolveMonthlyChatgptConversationHoursMetric(ctx),
  };
}
function buildUsageCodexMetrics(ctx: UsageProfileContext) {
  const resolveCodexMetric = (key: string, label: string, value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return null;
    }

    return resolveUsageField(
      ctx,
      key,
      label,
      value,
      value,
      "Mesure issue du journal Codex; sans journal, l'activité et l'impact physique restent NA.",
      "input",
    );
  };

  return {
    monthlyCodexSessions: resolveCodexMetric("monthlyCodexSessions", "Sessions Codex", ctx.usageInput?.monthlyCodexSessions),
    monthlyCodexConversationTurns: resolveCodexMetric("monthlyCodexConversationTurns", "Conversations Codex", ctx.usageInput?.monthlyCodexConversationTurns),
    monthlyCodexToolActions: resolveCodexMetric("monthlyCodexToolActions", "Actions outillées Codex", ctx.usageInput?.monthlyCodexToolActions),
    monthlyCodexShellCommands: resolveCodexMetric("monthlyCodexShellCommands", "Commandes shell Codex", ctx.usageInput?.monthlyCodexShellCommands),
    monthlyCodexFilesTouched: resolveCodexMetric("monthlyCodexFilesTouched", "Fichiers touchés Codex", ctx.usageInput?.monthlyCodexFilesTouched),
    monthlyCodexTestsRun: resolveCodexMetric("monthlyCodexTestsRun", "Tests Codex", ctx.usageInput?.monthlyCodexTestsRun),
    monthlyCodexChangedLines: resolveCodexMetric("monthlyCodexChangedLines", "Lignes modifiées Codex", ctx.usageInput?.monthlyCodexChangedLines),
    monthlyCodexActiveMinutes: resolveCodexMetric("monthlyCodexActiveMinutes", "Minutes actives Codex", ctx.usageInput?.monthlyCodexActiveMinutes),
  };
}
export function buildUsageProfileEstimate(
  infrastructureInput: EnvironmentalImpactInfrastructureInput | null | undefined,
  siteInput: EnvironmentalImpactScopeInput | null | undefined,
  userInput: EnvironmentalImpactScopeInput | null | undefined,
): EnvironmentalImpactUsageProfileEstimate {
  const usageInput = infrastructureInput?.usage ?? null;
  const provenance: EnvironmentalImpactUsageProvenanceItem[] = [];
  const pushProvenance = (item: EnvironmentalImpactUsageProvenanceItem) => {
    provenance.push(item);
  };
  const ctx: UsageProfileContext = {
    infrastructureInput,
    siteInput,
    userInput,
    usageInput,
    pushProvenance,
  };
  const sitePageViews = resolveNumber(siteInput?.pageViews, 0);
  const userPageViews = resolveNumber(userInput?.pageViews, 0);
  const trafficMetrics = buildUsageTrafficMetrics(ctx, sitePageViews, userPageViews);
  const codexMetrics = buildUsageCodexMetrics(ctx);
  const operationsMetrics = buildUsageOperationsMetrics(
    ctx,
    trafficMetrics.monthlyPageViews,
    trafficMetrics.monthlyActiveUsers,
    trafficMetrics.monthlySessions,
    trafficMetrics.monthlyPdfExports,
    trafficMetrics.monthlyMapViews,
  );
  const trendMetrics = buildUsageTrendMetrics(
    ctx,
    trafficMetrics.monthlyPageViews,
    trafficMetrics.monthlyActiveUsers,
  );
  if (hasNumericInput(usageInput?.monthlyElectricityKwh)) {
    pushProvenance({
      key: "monthlyElectricityKwh",
      label: "Électricité mensuelle",
      value: usageInput.monthlyElectricityKwh,
      source: "input",
      detail: "Signal kWh fourni directement; il est converti en CO2e par kWh × facteur électrique.",
    });
  }
  const source: "input" | "derived" =
    hasUsageInput(usageInput) || hasScopeSignalInput(siteInput) || hasScopeSignalInput(userInput)
      ? "input"
      : "derived";
  return {
    monthlyElectricityKwh: resolveNumber(usageInput?.monthlyElectricityKwh, 0) ||
      (usageInput?.monthlyElectricityKwh === 0 ? 0 : null),
    monthlyDirectWaterConsumptionLiters:
      usageInput?.monthlyDirectWaterConsumptionLiters == null
        ? null
        : resolveNumber(usageInput.monthlyDirectWaterConsumptionLiters, 0),
    monthlyEvaporatedWaterLiters:
      usageInput?.monthlyEvaporatedWaterLiters == null
        ? null
        : resolveNumber(usageInput.monthlyEvaporatedWaterLiters, 0),
    ...trafficMetrics,
    ...codexMetrics,
    ...operationsMetrics,
    ...trendMetrics,
    source,
    derivedFrom: buildUsageDerivedFrom(source, siteInput, userInput),
    provenance,
  };
}
export function projectUsageProfileAtWeek(
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
  const scaleNullable = (value: number | null): number | null =>
    value === null ? null : round6(value * weeklyScale * multiplier);
  return {
    ...usage,
    monthlyElectricityKwh:
      usage.monthlyElectricityKwh === null || usage.monthlyElectricityKwh === undefined
        ? usage.monthlyElectricityKwh
        : round6(usage.monthlyElectricityKwh * weeklyScale * multiplier),
    monthlyDirectWaterConsumptionLiters:
      usage.monthlyDirectWaterConsumptionLiters == null
        ? null
        : round6(usage.monthlyDirectWaterConsumptionLiters * weeklyScale * multiplier),
    monthlyEvaporatedWaterLiters:
      usage.monthlyEvaporatedWaterLiters == null
        ? null
        : round6(usage.monthlyEvaporatedWaterLiters * weeklyScale * multiplier),
    monthlyPageViews: round6(usage.monthlyPageViews * weeklyScale * multiplier),
    monthlyActiveUsers: round6(usage.monthlyActiveUsers * weeklyScale * multiplier),
    monthlySessions: round6(usage.monthlySessions * weeklyScale * multiplier),
    monthlyEmailsSent: round6(usage.monthlyEmailsSent * weeklyScale * multiplier),
    monthlyDeployments: round6(usage.monthlyDeployments * weeklyScale * multiplier),
    monthlyPdfExports: round6(usage.monthlyPdfExports * weeklyScale * multiplier),
    monthlyMapViews: round6(usage.monthlyMapViews * weeklyScale * multiplier),
    monthlyAiCalls: round6(usage.monthlyAiCalls * weeklyScale * multiplier),
    monthlyChatgptConversationHours: scaleNullable(usage.monthlyChatgptConversationHours),
    monthlyCodexSessions: scaleNullable(usage.monthlyCodexSessions),
    monthlyCodexConversationTurns: scaleNullable(usage.monthlyCodexConversationTurns),
    monthlyCodexToolActions: scaleNullable(usage.monthlyCodexToolActions),
    monthlyCodexShellCommands: scaleNullable(usage.monthlyCodexShellCommands),
    monthlyCodexFilesTouched: scaleNullable(usage.monthlyCodexFilesTouched),
    monthlyCodexTestsRun: scaleNullable(usage.monthlyCodexTestsRun),
    monthlyCodexChangedLines: scaleNullable(usage.monthlyCodexChangedLines),
    monthlyCodexActiveMinutes: scaleNullable(usage.monthlyCodexActiveMinutes),
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
