import type { EnvironmentalImpactInfrastructureServiceKey } from "./types";

export type ServicePlanType = "gratuit" | "payant" | "étudiant" | "sponsorisé" | "NA";

export type ServicePlanInfo = {
  type: ServicePlanType;
  price: string;
  cycleResetLabel?: string | null;
  notes?: string[];
};

const SERVICE_PLAN_INFO: Record<EnvironmentalImpactInfrastructureServiceKey, ServicePlanInfo> = {
  vercel: { type: "gratuit", price: "NA" },
  supabase: {
    type: "gratuit",
    price: "NA",
    cycleResetLabel: "Réinitialisation du cycle le 25 de chaque mois",
    notes: [
      "Taille base de données: 0,5 GB",
      "Egress: 5 GB",
      "Egress mis en cache: 5 GB",
      "Utilisateurs actifs tiers mensuels: 50 000 MAU",
      "Utilisateurs actifs mensuels: 50 000 MAU",
      "Stockage: 1 GB",
      "Connexions realtime simultanées: 200",
      "Messages realtime: 2 000 000",
      "Invocations Edge Functions: 500 000",
      "Utilisateurs SSO actifs: indisponible sur le plan",
      "Transformations d'images: indisponible sur le plan",
    ],
  },
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
