import type { EnvironmentalImpactInfrastructureServiceKey } from "./types";

export type ServicePlanType = "gratuit" | "payant" | "étudiant" | "sponsorisé" | "NA";

export type ServicePlanInfo = {
  type: ServicePlanType;
  price: string;
};

const SERVICE_PLAN_INFO: Record<EnvironmentalImpactInfrastructureServiceKey, ServicePlanInfo> = {
  vercel: { type: "gratuit", price: "NA" },
  supabase: { type: "gratuit", price: "NA" },
  resend: { type: "gratuit", price: "NA" },
  chatgpt: { type: "NA", price: "NA" },
  codex: { type: "NA", price: "NA" },
  clerk: { type: "gratuit", price: "NA" },
  posthog: { type: "gratuit", price: "NA" },
  sentry: { type: "gratuit", price: "NA" },
  upstash: { type: "gratuit", price: "NA" },
  pinecone: { type: "gratuit", price: "NA" },
  stripe: { type: "payant", price: "NA" },
  lwsDomain: { type: "payant", price: "10 €/an" },
};

export function getServicePlanInfo(
  serviceKey: EnvironmentalImpactInfrastructureServiceKey,
): ServicePlanInfo {
  return SERVICE_PLAN_INFO[serviceKey] ?? { type: "NA", price: "NA" };
}
