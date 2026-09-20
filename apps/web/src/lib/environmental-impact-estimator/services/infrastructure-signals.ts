import type {
  EnvironmentalImpactInfrastructureMetricKey,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { round6 } from "./utils";

type MetricUsageResolver = (usage: EnvironmentalImpactUsageProfileEstimate) => number | null;

const METRIC_USAGE_RESOLVERS: Partial<
  Record<EnvironmentalImpactInfrastructureMetricKey, MetricUsageResolver>
> = {
  vercelPageViews: (usage) => usage.monthlyPageViews,
  vercelFunctionInvocations: (usage) =>
    round6(
      usage.monthlyApiRequests * 0.78 +
        usage.monthlyPdfExports * 2.8 +
        usage.monthlyAiCalls * 1.9 +
        usage.monthlyMapViews * 0.12,
    ),
  vercelDeployments: (usage) => usage.monthlyDeployments,
  vercelBandwidthGb: (usage) => usage.monthlyBandwidthGb,
  supabaseDbRequests: (usage) =>
    round6(usage.monthlyApiRequests * 1.18 + usage.monthlyPageViews * 0.04),
  supabaseAuthEvents: (usage) => usage.monthlyAuthEvents,
  supabaseStorageGbMonths: (usage) => usage.monthlyStorageGbMonths,
  supabaseRealtimeEvents: (usage) => usage.monthlyRealtimeEvents,
  supabaseEgressGb: (usage) => usage.monthlyEgressGb,
  resendEmailsSent: (usage) => usage.monthlyEmailsSent,
  resendBatchRequests: (usage) => Math.max(0, round6(usage.monthlyEmailsSent / 20)),
  chatgptConversationHours: (usage) => usage.monthlyChatgptConversationHours,
  codexSessions: (usage) => usage.monthlyCodexSessions,
  codexConversationTurns: (usage) => usage.monthlyCodexConversationTurns,
  codexToolActions: (usage) => usage.monthlyCodexToolActions,
  codexShellCommands: (usage) => usage.monthlyCodexShellCommands,
  codexFilesTouched: (usage) => usage.monthlyCodexFilesTouched,
  codexTestsRun: (usage) => usage.monthlyCodexTestsRun,
  codexChangedLines: (usage) => usage.monthlyCodexChangedLines,
  codexActiveMinutes: (usage) => usage.monthlyCodexActiveMinutes,
  clerkAuthEvents: (usage) => usage.monthlyAuthEvents,
  clerkSessionRefreshes: (usage) => round6(usage.monthlySessions * 0.85),
  posthogEvents: (usage) =>
    round6(
      usage.monthlyPageViews * 1.1 +
        usage.monthlySessions * 0.4 +
        usage.monthlyMapViews * 0.2,
    ),
  sentryErrorEvents: (usage) => usage.monthlyErrorEvents,
  upstashOperations: (usage) =>
    round6(
      usage.monthlyApiRequests * 0.42 +
        usage.monthlyRealtimeEvents * 0.08 +
        usage.monthlyEmailsSent * 0.05,
    ),
  pineconeQueries: (usage) =>
    round6(usage.monthlyAiCalls * 3.2 + usage.monthlyPageViews * 0.015),
  stripePaymentOperations: (usage) =>
    Math.max(0, round6(usage.monthlyActiveUsers * 0.01)),
  lwsDnsQueries: (usage) =>
    round6(
      Math.max(
        0,
        20_000 + usage.monthlyPageViews * 0.03 + usage.monthlyEmailsSent * 0.02,
      ),
    ),
};

export function deriveMetricQuantityFromUsage(
  metricKey: string,
  usage: EnvironmentalImpactUsageProfileEstimate,
): number | null {
  return METRIC_USAGE_RESOLVERS[metricKey as EnvironmentalImpactInfrastructureMetricKey]?.(usage) ?? null;
}

function getServiceMonthlyProxy(
  serviceByKey: ReadonlyMap<string, EnvironmentalImpactInfrastructureServiceEstimate>,
  key: string,
): number {
  return serviceByKey.get(key)?.monthlyKgCo2eProxy ?? 0;
}

function getNullableUsageValue(value: number | null): number {
  return value ?? 0;
}

export function buildSecondOrderScoreSignals(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
): Record<"grossCo2" | "electricity" | "otherGhgs" | "chemicals" | "water", number> {
  const serviceByKey = new Map(services.map((service) => [service.key, service]));
  const vercel = getServiceMonthlyProxy(serviceByKey, "vercel");
  const supabase = getServiceMonthlyProxy(serviceByKey, "supabase");
  const resend = getServiceMonthlyProxy(serviceByKey, "resend");
  const chatgpt = getServiceMonthlyProxy(serviceByKey, "chatgpt");
  const codex = getServiceMonthlyProxy(serviceByKey, "codex");
  const posthog = getServiceMonthlyProxy(serviceByKey, "posthog");
  const sentry = getServiceMonthlyProxy(serviceByKey, "sentry");
  const upstash = getServiceMonthlyProxy(serviceByKey, "upstash");
  const pinecone = getServiceMonthlyProxy(serviceByKey, "pinecone");
  const stripe = getServiceMonthlyProxy(serviceByKey, "stripe");
  const lws = getServiceMonthlyProxy(serviceByKey, "lwsDomain");

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
        getNullableUsageValue(usageProfile.monthlyCodexActiveMinutes) * 0.24 +
        getNullableUsageValue(usageProfile.monthlyCodexTestsRun) * 0.14 +
        usageProfile.monthlyErrorEvents * 0.08 +
        codex * 0.1 +
        sentry * 0.06,
    ),
    chemicals: round6(
      usageProfile.monthlyStorageGbMonths * 0.28 +
        usageProfile.monthlyPdfExports * 0.26 +
        getNullableUsageValue(usageProfile.monthlyCodexFilesTouched) * 0.16 +
        usageProfile.monthlyDeployments * 0.2 +
        resend * 0.05 +
        stripe * 0.05,
    ),
    water: round6(
      usageProfile.monthlyAiCalls * 0.32 +
        chatgpt * 0.14 +
        getNullableUsageValue(usageProfile.monthlyCodexSessions) * 0.24 +
        usageProfile.monthlyBandwidthGb * 0.16 +
        usageProfile.monthlyStorageGbMonths * 0.12 +
        posthog * 0.06 +
        upstash * 0.04 +
        pinecone * 0.06,
    ),
  };
}
