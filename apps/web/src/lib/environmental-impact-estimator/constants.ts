import type { EnvironmentalImpactPostDefinition } from "./types";
import type {
  EnvironmentalImpactInfrastructureMetricDefinition,
  EnvironmentalImpactInfrastructureServiceDefinition,
} from "./types";

export const ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION =
  "environmental-impact-estimator-2026.05-v1";

export const ENVIRONMENTAL_IMPACT_ESTIMATOR_HYPOTHESES = [
  "Les mesures sont des proxys d'usage et non un bilan carbone certifié.",
  "Une donnée absente signifie 'non branchée' et non zéro.",
  "Quand elles existent, les métriques sont déduites des tables opérationnelles CleanMyMap plutôt que de moyennes externes génériques.",
  "Le stockage est normalisé en GB-mois pour rester comparable dans le temps.",
  "Les appels IA sont isolés car leur coût varie davantage que les autres postes.",
  "Les calculs restent additifs et traçables poste par poste.",
] as const;

export const ENVIRONMENTAL_IMPACT_ESTIMATOR_LIMITATIONS = [
  "Le socle décrit une structure d'estimation, pas une méthode d'ACV complète.",
  "Les facteurs doivent être recalibrés lorsque des données réelles seront disponibles.",
  "Le moteur conserve les postes visibles même si certaines sources ne sont pas branchées.",
] as const;

export const ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_HYPOTHESES = [
  "Chaque fournisseur est estimé à partir de sa charge principale pour éviter les chevauchements entre services.",
  "Les métriques absentes utilisent une charge de référence mensuelle documentée plutôt qu'une valeur nulle implicite.",
  "Le coût du domaine LWS est amorti sur la période pour matérialiser sa contribution dans la courbe temporelle.",
  "Les impacts de Vercel, Supabase et Resend sont modélisés à partir de leurs facteurs de charge dominants: pages, fonctions, requêtes, stockage, emails et bande passante.",
  "Les services transverses comme Clerk, PostHog, Sentry, Upstash, Pinecone et Stripe restent séparés pour garder le calcul auditable.",
  "Les valeurs mensuelles évoluent à partir des signaux d'usage du site et d'un taux de croissance explicite lorsque les mesures réelles ne sont pas encore branchées.",
] as const;

export const ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_NOTES = [
  "La courbe temporelle représente un cumul mensuel normalisé en kg CO2e proxy depuis la mise en ligne.",
  "Chaque point est calculé sur la charge mensuelle courante et non sur un score global opaque.",
  "Les facteurs peuvent être remplacés plus tard par des mesures réelles sans casser le contrat de rendu.",
  "Les courbes dynamiques privilégient les derniers signaux CleanMyMap pour rester spécifiques au projet.",
] as const;

export const ENVIRONMENTAL_IMPACT_GRAPH_CONSIDERATIONS = [
  "La courbe est cumulative afin de montrer l'accumulation réelle du service dans le temps.",
  "L'axe temporel est découpé à un point par semaine pour permettre un détail plus fin à l'interaction.",
  "Les points successifs sont recalculés à partir d'un profil d'usage mensuel qui peut grandir avec le trafic.",
  "La confiance baisse quand davantage de métriques reposent sur des valeurs de référence.",
  "Les bornes basses et hautes matérialisent l'incertitude des facteurs proxy, pas un intervalle statistique certifié.",
  "Le domaine LWS est amorti et doit être visible comme un coût fixe, pas noyé dans l'hébergement.",
  "Les services sont séparés pour éviter les doubles comptages et garder le détail auditable.",
] as const;

export const ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_METRIC_DEFINITIONS = [
  {
    key: "vercelPageViews",
    label: "Vercel - pages vues",
    unitLabel: "pages / mois",
    proxyKgCo2ePerUnit: 0.000015,
    referenceMonthlyQuantity: 120_000,
  },
  {
    key: "vercelFunctionInvocations",
    label: "Vercel - invocations fonctions",
    unitLabel: "invocations / mois",
    proxyKgCo2ePerUnit: 0.00004,
    referenceMonthlyQuantity: 16_000,
  },
  {
    key: "vercelDeployments",
    label: "Vercel - déploiements",
    unitLabel: "déploiements / mois",
    proxyKgCo2ePerUnit: 0.015,
    referenceMonthlyQuantity: 24,
  },
  {
    key: "vercelBandwidthGb",
    label: "Vercel - bande passante",
    unitLabel: "GB / mois",
    proxyKgCo2ePerUnit: 0.00012,
    referenceMonthlyQuantity: 180,
  },
  {
    key: "supabaseDbRequests",
    label: "Supabase - requêtes DB",
    unitLabel: "requêtes / mois",
    proxyKgCo2ePerUnit: 0.000004,
    referenceMonthlyQuantity: 420_000,
  },
  {
    key: "supabaseAuthEvents",
    label: "Supabase - événements auth",
    unitLabel: "événements / mois",
    proxyKgCo2ePerUnit: 0.00003,
    referenceMonthlyQuantity: 18_000,
  },
  {
    key: "supabaseStorageGbMonths",
    label: "Supabase - stockage",
    unitLabel: "GB-mois",
    proxyKgCo2ePerUnit: 0.015,
    referenceMonthlyQuantity: 45,
  },
  {
    key: "supabaseRealtimeEvents",
    label: "Supabase - realtime",
    unitLabel: "événements / mois",
    proxyKgCo2ePerUnit: 0.000005,
    referenceMonthlyQuantity: 80_000,
  },
  {
    key: "supabaseEgressGb",
    label: "Supabase - egress",
    unitLabel: "GB / mois",
    proxyKgCo2ePerUnit: 0.00011,
    referenceMonthlyQuantity: 60,
  },
  {
    key: "resendEmailsSent",
    label: "Resend - emails",
    unitLabel: "emails / mois",
    proxyKgCo2ePerUnit: 0.00002,
    referenceMonthlyQuantity: 2_500,
  },
  {
    key: "resendBatchRequests",
    label: "Resend - lots",
    unitLabel: "lots / mois",
    proxyKgCo2ePerUnit: 0.0012,
    referenceMonthlyQuantity: 120,
  },
  {
    key: "clerkAuthEvents",
    label: "Clerk - événements auth",
    unitLabel: "événements / mois",
    proxyKgCo2ePerUnit: 0.00003,
    referenceMonthlyQuantity: 18_000,
  },
  {
    key: "clerkSessionRefreshes",
    label: "Clerk - renouvellements de session",
    unitLabel: "renouvellements / mois",
    proxyKgCo2ePerUnit: 0.00001,
    referenceMonthlyQuantity: 16_000,
  },
  {
    key: "posthogEvents",
    label: "PostHog - événements",
    unitLabel: "événements / mois",
    proxyKgCo2ePerUnit: 0.000006,
    referenceMonthlyQuantity: 90_000,
  },
  {
    key: "sentryErrorEvents",
    label: "Sentry - événements d'erreur",
    unitLabel: "erreurs / mois",
    proxyKgCo2ePerUnit: 0.00009,
    referenceMonthlyQuantity: 900,
  },
  {
    key: "upstashOperations",
    label: "Upstash - opérations",
    unitLabel: "opérations / mois",
    proxyKgCo2ePerUnit: 0.000004,
    referenceMonthlyQuantity: 60_000,
  },
  {
    key: "pineconeQueries",
    label: "Pinecone - requêtes",
    unitLabel: "requêtes / mois",
    proxyKgCo2ePerUnit: 0.000008,
    referenceMonthlyQuantity: 14_000,
  },
  {
    key: "stripePaymentOperations",
    label: "Stripe - opérations de paiement",
    unitLabel: "opérations / mois",
    proxyKgCo2ePerUnit: 0.00003,
    referenceMonthlyQuantity: 2_500,
  },
  {
    key: "lwsDomainYears",
    label: "Nom de domaine LWS",
    unitLabel: "an",
    proxyKgCo2ePerUnit: 0.024,
    referenceMonthlyQuantity: 1 / 12,
  },
  {
    key: "lwsDnsQueries",
    label: "LWS - requêtes DNS",
    unitLabel: "requêtes / mois",
    proxyKgCo2ePerUnit: 0.00000025,
    referenceMonthlyQuantity: 80_000,
  },
] as const satisfies readonly EnvironmentalImpactInfrastructureMetricDefinition[];

export const ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_SERVICE_DEFINITIONS = [
  {
    key: "vercel",
    label: "Vercel",
    description: "Hébergement front, fonctions serverless, déploiements et diffusion.",
    sourceNote: "Charge réseau et exécution serverless dominantes.",
    basis: "monthly",
    metricKeys: [
      "vercelPageViews",
      "vercelFunctionInvocations",
      "vercelDeployments",
      "vercelBandwidthGb",
    ],
  },
  {
    key: "supabase",
    label: "Supabase",
    description: "Base de données, authentification, stockage et realtime.",
    sourceNote: "Consommation liée aux requêtes, au stockage et aux flux temps réel.",
    basis: "monthly",
    metricKeys: [
      "supabaseDbRequests",
      "supabaseAuthEvents",
      "supabaseStorageGbMonths",
      "supabaseRealtimeEvents",
      "supabaseEgressGb",
    ],
  },
  {
    key: "resend",
    label: "Resend",
    description: "Envoi d'emails transactionnels et lots de notifications.",
    sourceNote: "Les emails sont modélisés séparément des autres services.",
    basis: "monthly",
    metricKeys: ["resendEmailsSent", "resendBatchRequests"],
  },
  {
    key: "clerk",
    label: "Clerk",
    description: "Authentification, sessions et synchronisation utilisateur.",
    sourceNote: "Flux d'authentification et de rafraîchissement de session.",
    basis: "monthly",
    metricKeys: ["clerkAuthEvents", "clerkSessionRefreshes"],
  },
  {
    key: "posthog",
    label: "PostHog",
    description: "Instrumentation produit, événements et analyse d'usage.",
    sourceNote: "Les événements analytiques restent séparés du trafic front.",
    basis: "monthly",
    metricKeys: ["posthogEvents"],
  },
  {
    key: "sentry",
    label: "Sentry",
    description: "Surveillance des erreurs et remontée des exceptions.",
    sourceNote: "Les erreurs restent un poste distinct pour l'audit.",
    basis: "monthly",
    metricKeys: ["sentryErrorEvents"],
  },
  {
    key: "upstash",
    label: "Upstash",
    description: "Cache, files d'attente et opérations de faible latence.",
    sourceNote: "Les opérations serveur sont ramenées à une charge mensuelle.",
    basis: "monthly",
    metricKeys: ["upstashOperations"],
  },
  {
    key: "pinecone",
    label: "Pinecone",
    description: "Recherche vectorielle et requêtes d'index.",
    sourceNote: "Charge séparée pour les requêtes d'indexation et de recherche.",
    basis: "monthly",
    metricKeys: ["pineconeQueries"],
  },
  {
    key: "stripe",
    label: "Stripe",
    description: "Paiements, intents et opérations financières.",
    sourceNote: "Les opérations de paiement sont isolées du reste du trafic.",
    basis: "monthly",
    metricKeys: ["stripePaymentOperations"],
  },
  {
    key: "lwsDomain",
    label: "Nom de domaine LWS",
    description: "Nom de domaine et résolution DNS associés au projet.",
    sourceNote: "Le domaine est amorti pour apparaître correctement dans la courbe temporelle.",
    basis: "annual",
    metricKeys: ["lwsDomainYears", "lwsDnsQueries"],
  },
] as const satisfies readonly EnvironmentalImpactInfrastructureServiceDefinition[];

export const ENVIRONMENTAL_IMPACT_POST_DEFINITIONS = [
  {
    key: "pageViews",
    label: "Pages vues",
    description: "Navigation et affichage des écrans du site.",
    unitLabel: "pages",
    proxyKgCo2ePerUnit: 0.00002,
    proxyRationale:
      "Proxy interne pour un affichage classique de page applicative.",
  },
  {
    key: "storedImages",
    label: "Images stockées",
    description: "Ressources média conservées côté site ou dans les dossiers.",
    unitLabel: "images",
    proxyKgCo2ePerUnit: 0.00025,
    proxyRationale:
      "Proxy interne pour le stockage et la diffusion de médias légers.",
  },
  {
    key: "apiRequests",
    label: "Requêtes API",
    description: "Appels serveur, routes métier et réponses hydratées.",
    unitLabel: "requêtes",
    proxyKgCo2ePerUnit: 0.00001,
    proxyRationale:
      "Proxy interne pour des échanges API standards avec cache et sérialisation.",
  },
  {
    key: "pdfExports",
    label: "Exports PDF",
    description: "Génération, rendu et téléchargement de livrables PDF.",
    unitLabel: "exports",
    proxyKgCo2ePerUnit: 0.0025,
    proxyRationale:
      "Proxy interne pour un export documentaire rendu côté serveur.",
  },
  {
    key: "maps",
    label: "Cartes",
    description: "Chargements cartographiques, tuiles, interactions et tracés.",
    unitLabel: "cartes",
    proxyKgCo2ePerUnit: 0.00008,
    proxyRationale:
      "Proxy interne pour une vue cartographique interactive classique.",
  },
  {
    key: "storageGbMonths",
    label: "Stockage",
    description: "Capacité hébergée normalisée en GB-mois.",
    unitLabel: "GB-mois",
    proxyKgCo2ePerUnit: 0.015,
    proxyRationale:
      "Proxy interne pour le stockage applicatif et les fichiers persistés.",
  },
  {
    key: "aiCalls",
    label: "Appels IA",
    description: "Appels de modèles, assistances et enrichissements IA.",
    unitLabel: "appels",
    proxyKgCo2ePerUnit: 0.05,
    proxyRationale:
      "Proxy interne pour des appels IA ponctuels à coût variable.",
  },
] as const satisfies readonly EnvironmentalImpactPostDefinition[];
