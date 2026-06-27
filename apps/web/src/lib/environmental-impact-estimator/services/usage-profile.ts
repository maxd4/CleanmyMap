import { ENVIRONMENTAL_IMPACT_CHATGPT_EXTENDED_MODE_HOURS_PER_WEEK } from "../constants";
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
function resolveMonthlyChatgptConversationHoursMetric(ctx: UsageProfileContext): number {
  return resolveUsageField(
    ctx,
    "monthlyChatgptConversationHours",
    "Heures GPT-5.4 mini",
    ctx.usageInput?.monthlyChatgptConversationHours,
    ENVIRONMENTAL_IMPACT_CHATGPT_EXTENDED_MODE_HOURS_PER_WEEK * WEEKS_PER_MONTH,
    "Référence CleanMyMap documentée à 2h hebdomadaires",
    "reference",
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
  return {
    monthlyCodexSessions: resolveUsageField(
      ctx,
      "monthlyCodexSessions",
      "Sessions Codex",
      ctx.usageInput?.monthlyCodexSessions,
      0,
      "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
      "reference",
    ),
    monthlyCodexConversationTurns: resolveUsageField(
      ctx,
      "monthlyCodexConversationTurns",
      "Conversations Codex",
      ctx.usageInput?.monthlyCodexConversationTurns,
      0,
      "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
      "reference",
    ),
    monthlyCodexToolActions: resolveUsageField(
      ctx,
      "monthlyCodexToolActions",
      "Actions outillées Codex",
      ctx.usageInput?.monthlyCodexToolActions,
      0,
      "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
      "reference",
    ),
    monthlyCodexShellCommands: resolveUsageField(
      ctx,
      "monthlyCodexShellCommands",
      "Commandes shell Codex",
      ctx.usageInput?.monthlyCodexShellCommands,
      0,
      "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
      "reference",
    ),
    monthlyCodexFilesTouched: resolveUsageField(
      ctx,
      "monthlyCodexFilesTouched",
      "Fichiers touchés Codex",
      ctx.usageInput?.monthlyCodexFilesTouched,
      0,
      "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
      "reference",
    ),
    monthlyCodexTestsRun: resolveUsageField(
      ctx,
      "monthlyCodexTestsRun",
      "Tests Codex",
      ctx.usageInput?.monthlyCodexTestsRun,
      0,
      "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
      "reference",
    ),
    monthlyCodexChangedLines: resolveUsageField(
      ctx,
      "monthlyCodexChangedLines",
      "Lignes modifiées Codex",
      ctx.usageInput?.monthlyCodexChangedLines,
      0,
      "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
      "reference",
    ),
    monthlyCodexActiveMinutes: resolveUsageField(
      ctx,
      "monthlyCodexActiveMinutes",
      "Minutes actives Codex",
      ctx.usageInput?.monthlyCodexActiveMinutes,
      0,
      "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
      "reference",
    ),
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
  const source: "input" | "derived" =
    hasUsageInput(usageInput) || hasScopeSignalInput(siteInput) || hasScopeSignalInput(userInput)
      ? "input"
      : "derived";
  return {
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
