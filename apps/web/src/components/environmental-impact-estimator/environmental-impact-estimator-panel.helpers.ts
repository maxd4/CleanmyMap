import type {
  EnvironmentalImpactDataGapNote,
  EnvironmentalImpactEstimateModel,
} from "@/lib/environmental-impact-estimator/types";

export type ReductionAction = {
  title: string;
  detail: string;
  serviceLabel: string;
  sharePercent: number;
};

type EnvironmentalImpactInfrastructureService =
  EnvironmentalImpactEstimateModel["infrastructure"]["services"][number];

export const DOCUMENTATION_DOWNLOADS = [
  {
    title: "Fonctionnement du graphique",
    description:
      "Télécharge la méthode détaillée du tracé, les règles de calcul et la lecture des points hebdomadaires.",
    href: "/api/documentation/graphique-impact-co2e",
    filename: "graphique_impact_CO2e.md",
  },
  {
    title: "Atelier DU",
    description:
      "Télécharge le résumé des ateliers DU qui ont nourri les arbitrages de sobriété et de lisibilité.",
    href: "/api/documentation/atelier_DU",
    filename: "atelier_DU.md",
  },
  {
    title: "Journal DU",
    description:
      "Télécharge le journal court des décisions et des évolutions liées à l'impact.",
    href: "/api/documentation/journal_DU",
    filename: "journal_DU.md",
  },
] as const;

export const DOCUMENTATION_READS = [
  {
    title: "Méthodologie ACV numérique",
    description:
      "Ouvre la fiche qui explique comment CleanMyMap mesure, classe et trace l'impact carbone du site et de son développement.",
    href: "/docs/plans/rapport_impact/impact_carbone_methodologie.md",
    filename: "impact_carbone_methodologie.md",
  },
] as const;

export function formatQuantity(value: number | null, unitLabel: string) {
  if (value === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: unitLabel === "GB-mois" ? 2 : 0,
  }).format(value)} ${unitLabel}`;
}

export function formatProxyMass(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value >= 1) {
    return `${new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 3,
    }).format(value)} kg CO2e proxy`;
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value * 1000)} g CO2e proxy`;
}

export function getScopeTone(status: EnvironmentalImpactEstimateModel["site"]["status"]) {
  if (status === "ready") {
    return "text-emerald-300";
  }
  if (status === "partial") {
    return "text-amber-300";
  }
  return "text-red-300";
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getDataGapScopeLabel(scope: EnvironmentalImpactDataGapNote["scope"]) {
  switch (scope) {
    case "site":
      return "Site";
    case "user":
      return "Utilisateur";
    case "infrastructure":
      return "Infrastructure";
    case "history":
      return "Historique";
    default:
      return "Donnée";
  }
}

export function getDataGapTone(severity: EnvironmentalImpactDataGapNote["severity"]) {
  return severity === "warn"
    ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
    : "border-sky-400/20 bg-sky-400/10 text-sky-100";
}

export function getUsageProvenanceTone(source: "input" | "derived" | "reference") {
  switch (source) {
    case "input":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    case "derived":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    case "reference":
      return "border-slate-400/20 bg-slate-400/10 text-slate-100";
    default:
      return "border-white/10 bg-white/5 text-red-100";
  }
}

export function formatSharePercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value)} %`;
}

export function formatSecondOrderQuantity(value: number | null, unitLabel: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  const maximumFractionDigits =
    unitLabel === "kWh" ? 1 : unitLabel === "L" ? 0 : unitLabel === "kg CO2 brut" ? 3 : 2;

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value)} ${unitLabel}`;
}

export function formatLifecycleQuantity(value: number | null, unitLabel: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  const maximumFractionDigits =
    unitLabel === "kWh" || unitLabel === "kg CO2e" ? 1 : unitLabel === "L" ? 0 : 2;

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value)} ${unitLabel}`;
}

export function buildReductionAction(service: {
  key: string;
  label: string;
  sharePercent: number;
}): ReductionAction {
  switch (service.key) {
    case "vercel":
      return {
        title: "Réduire la charge Vercel",
        detail:
          "Favoriser les pages statiques, réduire les fonctions serverless, alléger les bundles et mettre davantage en cache pour diminuer le trafic servi.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "supabase":
      return {
        title: "Rationaliser Supabase",
        detail:
          "Regrouper les écritures, limiter les requêtes répétées, réduire le realtime non utile et nettoyer le stockage pour faire baisser les transferts.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "codex":
      return {
        title: "Canaliser l'usage Codex",
        detail:
          "Concentrer les sessions IA sur des lots précis, réduire les relances, réutiliser les prompts et limiter les tests inutiles pour baisser l'impact du développement assisté.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "resend":
      return {
        title: "Mutualiser les envois Resend",
        detail:
          "Regrouper les lots d'email, éviter les doublons et ne garder que les notifications utiles pour réduire les envois sortants.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "posthog":
      return {
        title: "Alléger la télémétrie",
        detail:
          "Filtrer les événements peu utiles, éviter la sur-instrumentation et privilégier des mesures synthétiques pour diminuer le volume de suivi.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "clerk":
      return {
        title: "Réduire les cycles Clerk",
        detail:
          "Limiter les refreshs de session, les redirections d'auth et les vérifications redondantes pour réduire les appels d'authentification.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "upstash":
      return {
        title: "Batcher les opérations Upstash",
        detail:
          "Regrouper les accès cache et queue, éviter les allers-retours superflus et supprimer les opérations temporaires non nécessaires.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "pinecone":
      return {
        title: "Limiter les requêtes Pinecone",
        detail:
          "Réduire les appels de recherche vectorielle, mieux invalider les index et ne lancer les requêtes que sur les parcours réellement utiles.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "sentry":
      return {
        title: "Filtrer le bruit Sentry",
        detail:
          "Réduire les erreurs bruitées et les logs redondants pour garder uniquement les signaux de qualité réellement utiles au diagnostic.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "stripe":
      return {
        title: "Éviter les opérations Stripe inutiles",
        detail:
          "Conserver un flux de paiement compact, éviter les appels de test non nécessaires et réduire les opérations répétées.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "lwsDomain":
      return {
        title: "Stabiliser le domaine LWS",
        detail:
          "Conserver un domaine unique, limiter les sous-domaines superflus et réduire les requêtes DNS inutiles pour garder le coût fixe bas.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    default:
      return {
        title: `Réduire la charge ${service.label}`,
        detail:
          "Prioriser les usages visibles, supprimer les requêtes ou calculs non essentiels et concentrer l'optimisation sur ce service.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
  }
}

export function buildTopReductionActions(
  services: Array<EnvironmentalImpactInfrastructureService>,
): ReductionAction[] {
  return services
    .filter((service) => (service.monthlyKgCo2eProxy ?? 0) > 0)
    .sort((a, b) => (b.monthlyKgCo2eProxy ?? 0) - (a.monthlyKgCo2eProxy ?? 0))
    .map((service) =>
      buildReductionAction({
        key: service.key,
        label: service.label,
        sharePercent: service.sharePercent,
      }),
    )
    .slice(0, 3);
}
