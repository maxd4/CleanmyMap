import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactLifecycleAxisKey,
  EnvironmentalImpactLifecycleComponentKey,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { getNullableUsageValue, getServiceMonthlyProxy } from "./infrastructure-signals";
import { round6 } from "./utils";

export type EnvironmentalImpactLifecycleScoreSignals = Record<
  EnvironmentalImpactLifecycleAxisKey | EnvironmentalImpactLifecycleComponentKey,
  number
>;

function buildLifecycleAxisScoreSignals(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  serviceByKey: ReadonlyMap<string, EnvironmentalImpactInfrastructureServiceEstimate>,
): Pick<EnvironmentalImpactLifecycleScoreSignals, EnvironmentalImpactLifecycleAxisKey> {
  const vercel = getServiceMonthlyProxy(serviceByKey, "vercel");
  const supabase = getServiceMonthlyProxy(serviceByKey, "supabase");
  const chatgpt = getServiceMonthlyProxy(serviceByKey, "chatgpt");
  const codex = getServiceMonthlyProxy(serviceByKey, "codex");
  const posthog = getServiceMonthlyProxy(serviceByKey, "posthog");
  const sentry = getServiceMonthlyProxy(serviceByKey, "sentry");
  const upstash = getServiceMonthlyProxy(serviceByKey, "upstash");
  const pinecone = getServiceMonthlyProxy(serviceByKey, "pinecone");
  const stripe = getServiceMonthlyProxy(serviceByKey, "stripe");
  const clerk = getServiceMonthlyProxy(serviceByKey, "clerk");
  const lws = getServiceMonthlyProxy(serviceByKey, "lwsDomain");

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
        getNullableUsageValue(usageProfile.monthlyCodexActiveMinutes) * 0.22 +
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
        getServiceMonthlyProxy(serviceByKey, "resend") * 0.08 +
        stripe * 0.06 +
        clerk * 0.06 +
        sentry * 0.04,
    ),
    ewaste: round6(
      usageProfile.monthlyDeployments * 0.26 +
        getNullableUsageValue(usageProfile.monthlyCodexFilesTouched) * 0.18 +
        usageProfile.monthlyErrorEvents * 0.14 +
        usageProfile.monthlySessions * 0.1 +
        usageProfile.monthlyEmailsSent * 0.08 +
        usageProfile.monthlyActiveUsers * 0.04 +
        getServiceMonthlyProxy(serviceByKey, "resend") * 0.1 +
        sentry * 0.06 +
        stripe * 0.04,
    ),
  };
}

function buildLifecycleComponentScoreSignals(
  usageProfile: EnvironmentalImpactUsageProfileEstimate,
  serviceByKey: ReadonlyMap<string, EnvironmentalImpactInfrastructureServiceEstimate>,
): Pick<EnvironmentalImpactLifecycleScoreSignals, EnvironmentalImpactLifecycleComponentKey> {
  const vercel = getServiceMonthlyProxy(serviceByKey, "vercel");
  const supabase = getServiceMonthlyProxy(serviceByKey, "supabase");
  const resend = getServiceMonthlyProxy(serviceByKey, "resend");
  const chatgpt = getServiceMonthlyProxy(serviceByKey, "chatgpt");
  const codex = getServiceMonthlyProxy(serviceByKey, "codex");
  const clerk = getServiceMonthlyProxy(serviceByKey, "clerk");
  const posthog = getServiceMonthlyProxy(serviceByKey, "posthog");
  const sentry = getServiceMonthlyProxy(serviceByKey, "sentry");
  const upstash = getServiceMonthlyProxy(serviceByKey, "upstash");
  const stripe = getServiceMonthlyProxy(serviceByKey, "stripe");
  const lws = getServiceMonthlyProxy(serviceByKey, "lwsDomain");

  return {
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
        getNullableUsageValue(usageProfile.monthlyCodexActiveMinutes) * 0.24 +
        getNullableUsageValue(usageProfile.monthlyCodexTestsRun) * 0.1 +
        getNullableUsageValue(usageProfile.monthlyCodexConversationTurns) * 0.08 +
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
        getNullableUsageValue(usageProfile.monthlyCodexFilesTouched) * 0.16 +
        usageProfile.monthlyErrorEvents * 0.14 +
        usageProfile.monthlyEmailsSent * 0.08 +
        stripe * 0.08 +
        resend * 0.1 +
        sentry * 0.12 +
        lws * 0.12,
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
