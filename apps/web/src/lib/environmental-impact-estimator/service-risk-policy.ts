import type { EnvironmentalImpactInfrastructureServiceKey } from "./types";

/** POLICY service-risk-v1: current product thresholds and weights. */
export const SERVICE_RISK_POLICY = {
  version: "service-risk-v1",
  scoreWeights: {
    quotaConsumed: 0.24,
    growth: 0.22,
    confidencePressure: 0.16,
    criticality: 0.18,
    thresholdProximity: 0.2,
  },
  scoreBands: { surveiller: 30, alerte: 60, critique: 80 },
  quotaStates: { attention: 70, procheLimite: 90, depasse: 100 },
  alerts: { quotaShare: 70, growth: 15, trend: 10 },
  criticalityPercentByService: {
    supabase: 100,
    vercel: 95,
    github: 50,
    clerk: 90,
    resend: 72,
    stripe: 70,
    upstash: 66,
    sentry: 62,
    posthog: 58,
    pinecone: 56,
    chatgpt: 54,
    codex: 64,
    lwsDomain: 40,
  } satisfies Record<EnvironmentalImpactInfrastructureServiceKey, number>,
} as const;
