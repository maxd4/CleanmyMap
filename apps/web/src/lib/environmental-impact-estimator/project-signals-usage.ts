import { subDays } from "date-fns";
import { buildCodexMonthlyUsageEstimate } from "./codex-usage-store";
import {
  buildScopeInputFromRows,
  clamp,
  round6,
  type ProjectSignalRows,
} from "./project-signals.calculations";
import { buildProjectSignalRows } from "./project-signals-scope";
import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactScopeInput,
} from "./types";

export function calculateCodexMonthlyUsageInput(
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[],
): {
  codexUsage: EnvironmentalImpactCodexUsageMonthlyEstimate;
  usage: EnvironmentalImpactInfrastructureInput["usage"];
} {
  const codexUsage = buildCodexMonthlyUsageEstimate(snapshots);
  if (codexUsage.weekCount === 0) {
    return {
      codexUsage,
      usage: {
        monthlyCodexSessions: null,
        monthlyCodexConversationTurns: null,
        monthlyCodexToolActions: null,
        monthlyCodexShellCommands: null,
        monthlyCodexFilesTouched: null,
        monthlyCodexTestsRun: null,
        monthlyCodexChangedLines: null,
        monthlyCodexActiveMinutes: null,
      },
    };
  }

  return {
    codexUsage,
    usage: {
      monthlyCodexSessions: codexUsage.monthlyEquivalent.sessionCount,
      monthlyCodexConversationTurns: codexUsage.monthlyEquivalent.conversationCount,
      monthlyCodexToolActions: codexUsage.monthlyEquivalent.toolCallCount,
      monthlyCodexShellCommands: codexUsage.monthlyEquivalent.shellCommandCount,
      monthlyCodexFilesTouched: codexUsage.monthlyEquivalent.fileTouchCount,
      monthlyCodexTestsRun: codexUsage.monthlyEquivalent.testRunCount,
      monthlyCodexChangedLines: codexUsage.monthlyEquivalent.changedLineCount,
      monthlyCodexActiveMinutes: codexUsage.monthlyEquivalent.activeMinutes,
    },
  };
}

export function calculateMonthlyUsageInput(
  rows: ProjectSignalRows,
): EnvironmentalImpactInfrastructureInput["usage"] {
  const now = new Date();
  const currentWindowFrom = subDays(now, 30).getTime();
  const previousWindowFrom = subDays(now, 60).getTime();
  const currentRows = buildProjectSignalRows(
    rows,
    currentWindowFrom,
    now.getTime(),
  );
  const previousRows = buildProjectSignalRows(
    rows,
    previousWindowFrom,
    currentWindowFrom - 1,
  );

  const currentScope = buildScopeInputFromRows(currentRows, {
    userId: null,
    fromMs: Number.NEGATIVE_INFINITY,
    untilMs: Number.POSITIVE_INFINITY,
  }) as EnvironmentalImpactScopeInput & {
    monthlyPageViews: number;
    monthlyActiveUsers: number;
    monthlySessions: number;
    monthlyEmailsSent: number;
    monthlyPdfExports: number;
    monthlyMapViews: number;
    monthlyAiCalls: number;
    monthlyStorageGbMonths: number;
    monthlyApiRequests: number;
    monthlyAuthEvents: number;
  };
  const previousScope = buildScopeInputFromRows(previousRows, {
    userId: null,
    fromMs: Number.NEGATIVE_INFINITY,
    untilMs: Number.POSITIVE_INFINITY,
  }) as EnvironmentalImpactScopeInput & { monthlyPageViews: number };

  const hasAnyCurrentSignal =
    currentRows.actions.length +
      currentRows.spots.length +
      currentRows.funnelEvents.length +
      currentRows.progressionEvents.length +
      currentRows.reports.length +
      currentRows.trainingExamples.length +
      currentRows.serviceEmails.length +
      currentRows.communityEvents.length +
      currentRows.eventRsvps.length +
      currentRows.appNotifications.length >
    0;

  if (!hasAnyCurrentSignal) {
    return {
      monthlyPageViews: null,
      monthlyActiveUsers: null,
      monthlySessions: null,
      monthlyEmailsSent: null,
      monthlyPdfExports: null,
      monthlyMapViews: null,
      monthlyAiCalls: null,
      monthlyStorageGbMonths: null,
      monthlyApiRequests: null,
      monthlyAuthEvents: null,
      growthRateMonthly: null,
      seasonalityAmplitude: null,
      horizonMonths: 12,
    };
  }

  const growthRateMonthly = clamp(
    ((currentScope.monthlyPageViews - previousScope.monthlyPageViews) /
      Math.max(1, Math.max(previousScope.monthlyPageViews, currentScope.monthlyPageViews))) || 0,
    -0.35,
    0.35,
  );
  const seasonalityAmplitude = clamp(
    Math.abs(currentScope.monthlyPageViews - previousScope.monthlyPageViews) /
      Math.max(1, currentScope.monthlyPageViews + previousScope.monthlyPageViews),
    0.04,
    0.25,
  );

  return {
    monthlyPageViews: currentScope.monthlyPageViews,
    monthlyActiveUsers: currentScope.monthlyActiveUsers,
    monthlySessions: currentScope.monthlySessions,
    monthlyEmailsSent: currentScope.monthlyEmailsSent,
    monthlyPdfExports: currentScope.monthlyPdfExports,
    monthlyMapViews: currentScope.monthlyMapViews,
    monthlyAiCalls: currentScope.monthlyAiCalls,
    monthlyStorageGbMonths: currentScope.monthlyStorageGbMonths,
    monthlyApiRequests: currentScope.monthlyApiRequests,
    monthlyAuthEvents: currentScope.monthlyAuthEvents,
    monthlyRealtimeEvents: Math.max(1, currentScope.monthlyActiveUsers * 8),
    monthlyEgressGb: round6(
      Math.max(
        0.1,
        currentScope.monthlyPageViews * 0.00008 +
          currentScope.monthlyMapViews * 0.0012 +
          currentScope.monthlyStorageGbMonths * 0.12,
      ),
    ),
    monthlyBandwidthGb: round6(
      Math.max(
        0.1,
        currentScope.monthlyPageViews * 0.00011 +
          currentScope.monthlyMapViews * 0.001 +
          currentScope.monthlyPdfExports * 0.002,
      ),
    ),
    monthlyErrorEvents:
      currentScope.monthlyApiRequests > 0
        ? Math.max(0, Math.round(currentScope.monthlyApiRequests * 0.0025))
        : null,
    growthRateMonthly: Number.isFinite(growthRateMonthly) ? growthRateMonthly : null,
    seasonalityAmplitude: Number.isFinite(seasonalityAmplitude) ? seasonalityAmplitude : null,
    horizonMonths: 12,
  };
}
