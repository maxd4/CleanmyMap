import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactLifecycleAxisKey,
  EnvironmentalImpactLifecycleComponentKey,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { getNullableUsageValue, getServiceMonthlyProxies } from "./infrastructure-signals";
import { round6 } from "./utils";

export type EnvironmentalImpactLifecycleScoreSignals = Record<
  EnvironmentalImpactLifecycleAxisKey | EnvironmentalImpactLifecycleComponentKey,
  number
>;

function buildLifecycleAxisScoreSignals(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  serviceByKey: ReadonlyMap<string, EnvironmentalImpactInfrastructureServiceEstimate>,
): Pick<EnvironmentalImpactLifecycleScoreSignals, EnvironmentalImpactLifecycleAxisKey> {
  const serviceProxies = getServiceMonthlyProxies(serviceByKey, [
    "vercel",
    "supabase",
    "chatgpt",
    "codex",
    "posthog",
    "sentry",
    "upstash",
    "pinecone",
    "stripe",
    "clerk",
    "lwsDomain",
    "resend",
  ] as const);

  return {
    energy: round6(
      usageProfile.monthlyPageViews * 0.22 +
        usageProfile.monthlyBandwidthGb * 0.28 +
        usageProfile.monthlyEgressGb * 0.24 +
        usageProfile.monthlyStorageGbMonths * 0.16 +
        serviceProxies.chatgpt * 0.08 +
        serviceProxies.vercel * 0.1,
    ),
    carbon: round6(
      usageProfile.monthlyAiCalls * 0.28 +
        serviceProxies.chatgpt * 0.12 +
        getNullableUsageValue(usageProfile.monthlyCodexActiveMinutes) * 0.22 +
        usageProfile.monthlyDeployments * 0.16 +
        usageProfile.monthlyErrorEvents * 0.08 +
        serviceProxies.codex * 0.16 +
        serviceProxies.lwsDomain * 0.1,
    ),
    water: round6(
      usageProfile.monthlyAiCalls * 0.3 +
        serviceProxies.chatgpt * 0.14 +
        usageProfile.monthlyStorageGbMonths * 0.18 +
        usageProfile.monthlyBandwidthGb * 0.14 +
        usageProfile.monthlyEgressGb * 0.12 +
        serviceProxies.supabase * 0.12 +
        serviceProxies.posthog * 0.04 +
        serviceProxies.upstash * 0.02 +
        serviceProxies.pinecone * 0.08,
    ),
    materials: round6(
      usageProfile.monthlyStorageGbMonths * 0.26 +
        usageProfile.monthlyPdfExports * 0.18 +
        usageProfile.monthlyActiveUsers * 0.16 +
        usageProfile.monthlyDeployments * 0.14 +
        serviceProxies.resend * 0.08 +
        serviceProxies.stripe * 0.06 +
        serviceProxies.clerk * 0.06 +
        serviceProxies.sentry * 0.04,
    ),
    ewaste: round6(
      usageProfile.monthlyDeployments * 0.26 +
        getNullableUsageValue(usageProfile.monthlyCodexFilesTouched) * 0.18 +
        usageProfile.monthlyErrorEvents * 0.14 +
        usageProfile.monthlySessions * 0.1 +
        usageProfile.monthlyEmailsSent * 0.08 +
        usageProfile.monthlyActiveUsers * 0.04 +
        serviceProxies.resend * 0.1 +
        serviceProxies.sentry * 0.06 +
        serviceProxies.stripe * 0.04,
    ),
  };
}

function buildLifecycleComponentScoreSignals(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  serviceByKey: ReadonlyMap<string, EnvironmentalImpactInfrastructureServiceEstimate>,
): Pick<EnvironmentalImpactLifecycleScoreSignals, EnvironmentalImpactLifecycleComponentKey> {
  const serviceProxies = getServiceMonthlyProxies(serviceByKey, [
    "vercel",
    "supabase",
    "resend",
    "chatgpt",
    "codex",
    "clerk",
    "posthog",
    "sentry",
    "upstash",
    "stripe",
    "lwsDomain",
  ] as const);

  return {
    servers: round6(
      usageProfile.monthlyPageViews * 0.18 +
        usageProfile.monthlyApiRequests * 0.2 +
        usageProfile.monthlyRealtimeEvents * 0.12 +
        serviceProxies.vercel * 0.26 +
        serviceProxies.supabase * 0.24,
    ),
    gpus: round6(
      usageProfile.monthlyAiCalls * 0.48 +
        serviceProxies.chatgpt * 0.18 +
        getNullableUsageValue(usageProfile.monthlyCodexActiveMinutes) * 0.24 +
        getNullableUsageValue(usageProfile.monthlyCodexTestsRun) * 0.1 +
        getNullableUsageValue(usageProfile.monthlyCodexConversationTurns) * 0.08 +
        serviceProxies.codex * 0.1,
    ),
    userDevices: round6(
      usageProfile.monthlyActiveUsers * 0.22 +
        usageProfile.monthlySessions * 0.18 +
        usageProfile.monthlyPageViews * 0.18 +
        usageProfile.monthlyMapViews * 0.12 +
        serviceProxies.posthog * 0.05 +
        serviceProxies.clerk * 0.05 +
        serviceProxies.resend * 0.04 +
        serviceProxies.stripe * 0.02,
    ),
    networks: round6(
      usageProfile.monthlyBandwidthGb * 0.32 +
        usageProfile.monthlyEgressGb * 0.26 +
        usageProfile.monthlyRealtimeEvents * 0.14 +
        usageProfile.monthlyPageViews * 0.1 +
        usageProfile.monthlyApiRequests * 0.08 +
        serviceProxies.lwsDomain * 0.1,
    ),
    storage: round6(
      usageProfile.monthlyStorageGbMonths * 0.42 +
        usageProfile.monthlyPdfExports * 0.18 +
        usageProfile.monthlyEmailsSent * 0.08 +
        serviceProxies.supabase * 0.2 +
        serviceProxies.resend * 0.12,
    ),
    maintenance: round6(
      usageProfile.monthlyDeployments * 0.34 +
        usageProfile.monthlyErrorEvents * 0.16 +
        usageProfile.monthlyAuthEvents * 0.14 +
        usageProfile.monthlyRealtimeEvents * 0.1 +
        serviceProxies.sentry * 0.12 +
        serviceProxies.clerk * 0.08 +
        serviceProxies.upstash * 0.06,
    ),
    renewal: round6(
      usageProfile.monthlyDeployments * 0.24 +
        usageProfile.monthlyActiveUsers * 0.14 +
        usageProfile.monthlyStorageGbMonths * 0.16 +
        usageProfile.monthlyPageViews * 0.08 +
        serviceProxies.vercel * 0.18 +
        serviceProxies.supabase * 0.12 +
        serviceProxies.lwsDomain * 0.08,
    ),
    endOfLife: round6(
      usageProfile.monthlyDeployments * 0.2 +
        getNullableUsageValue(usageProfile.monthlyCodexFilesTouched) * 0.16 +
        usageProfile.monthlyErrorEvents * 0.14 +
        usageProfile.monthlyEmailsSent * 0.08 +
        serviceProxies.stripe * 0.08 +
        serviceProxies.resend * 0.1 +
        serviceProxies.sentry * 0.12 +
        serviceProxies.lwsDomain * 0.12,
    ),
  };
}

export function buildLifecycleScoreSignals(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
): EnvironmentalImpactLifecycleScoreSignals {
  const serviceByKey = new Map(services.map((service) => [service.key, service]));

  return {
    ...buildLifecycleAxisScoreSignals(usageProfile, serviceByKey),
    ...buildLifecycleComponentScoreSignals(usageProfile, serviceByKey),
  };
}
