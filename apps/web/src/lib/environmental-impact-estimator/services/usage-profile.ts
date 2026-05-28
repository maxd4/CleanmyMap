import { ENVIRONMENTAL_IMPACT_CHATGPT_EXTENDED_MODE_HOURS_PER_WEEK } from "../constants";
import type {
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactScopeInput,
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

export function buildUsageProfileEstimate(
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
