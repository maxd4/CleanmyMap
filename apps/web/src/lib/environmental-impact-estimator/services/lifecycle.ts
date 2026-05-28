import {
  ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS,
  ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES,
} from "../constants";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactLifecycleAxisKey,
  EnvironmentalImpactLifecycleComponentKey,
  EnvironmentalImpactLifecycleEstimate,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { hasNumericInput, round6 } from "./utils";

type EnvironmentalImpactLifecycleScoreSignals = Record<
  EnvironmentalImpactLifecycleAxisKey | EnvironmentalImpactLifecycleComponentKey,
  number
>;

export function buildLifecycleScoreSignals(
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

export function buildLifecycleEstimate(
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
