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
  "Les modèles IA de développement restent séparés des services web: GPT-5.4 mini couvre l'assistance de codage et Codex couvre les sessions de développement assisté.",
  "L'impact de Codex est calculé à partir d'un journal hebdomadaire CleanMyMap: sessions, conversations, actions outillées, tests et temps actif.",
  "Les services transverses comme Clerk, PostHog, Sentry, Upstash, Pinecone et Stripe restent séparés pour garder le calcul auditable.",
  "Les valeurs mensuelles évoluent à partir des signaux d'usage du site et d'un taux de croissance explicite lorsque les mesures réelles ne sont pas encore branchées.",
] as const;

export const ENVIRONMENTAL_IMPACT_INFRASTRUCTURE_NOTES = [
  "La courbe temporelle représente un cumul mensuel normalisé en kg CO2e proxy depuis la mise en ligne.",
  "Chaque point est calculé sur la charge mensuelle courante et non sur un score global opaque.",
  "Les facteurs peuvent être remplacés plus tard par des mesures réelles sans casser le contrat de rendu.",
  "Les courbes dynamiques privilégient les derniers signaux CleanMyMap pour rester spécifiques au projet.",
  "Les usages GPT-5.4 mini et Codex ne sont jamais fusionnés: ils restent deux postes distincts du moteur ACV.",
  "Le journal Codex hebdomadaire sert de source spécifique au projet; sans journal, le poste Codex reste explicitement signalé comme non branché plutôt que remplacé par une moyenne externe.",
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

export const ENVIRONMENTAL_IMPACT_SECOND_ORDER_HYPOTHESES = [
  "Le deuxième ordre décompose l'impact total en familles lisibles plutôt qu'en une moyenne globale.",
  "Le CO2 brut, l'électricité, les autres GES, les produits chimiques et l'eau sont exprimés comme proxys auditables.",
  "Les parts sont normalisées à partir des signaux réels du projet pour rester spécifiques à CleanMyMap.",
  "Les quantités affichées sont des équivalents de travail, pas des mesures physiques certifiées.",
  "Le deuxième ordre doit permettre la priorisation, pas prétendre à une ACV complète.",
] as const;

export const ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES = [
  "La couche lifecycle complète le CO2e opérationnel avec une lecture matérielle et de cycle de vie, sans prétendre à une ACV certifiée.",
  "Les serveurs, GPU, terminaux utilisateurs, réseaux, stockage, maintenance, renouvellement matériel et fin de vie sont séparés pour éviter de noyer les sources d'impact.",
  "Les quantités affichées restent des proxys de lecture et des ordres de grandeur projet, pas des mesures physiques instrumentées.",
  "Les axes énergie, carbone, eau, matière et e-waste sont normalisés à partir des mêmes signaux CleanMyMap pour rester comparables dans le temps.",
  "La décomposition lifecycle doit aider à prioriser les leviers de réduction sans créer de double comptage avec le premier ordre.",
] as const;

export const ENVIRONMENTAL_IMPACT_CHATGPT_EXTENDED_MODE_HOURS_PER_WEEK = 2;

export const ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS = [
  {
    key: "energy",
    label: "Énergie",
    unitLabel: "kWh",
    proxyKgCo2ePerUnit: 0.052,
    referenceWeight: 0.34,
    rationale:
      "Lecture énergétique des serveurs, GPU, terminaux et réseaux ramenée en équivalent CO2e.",
  },
  {
    key: "carbon",
    label: "Carbone incorporé",
    unitLabel: "kg CO2e",
    proxyKgCo2ePerUnit: 1,
    referenceWeight: 0.26,
    rationale:
      "Part directement liée au carbone contenu dans le matériel, les renouvellements et le cycle de vie.",
  },
  {
    key: "water",
    label: "Eau",
    unitLabel: "L",
    proxyKgCo2ePerUnit: 0.00012,
    referenceWeight: 0.14,
    rationale:
      "Proxy hydrique associé à l'infrastructure, au stockage et aux services énergivores.",
  },
  {
    key: "materials",
    label: "Matières",
    unitLabel: "kg matière",
    proxyKgCo2ePerUnit: 0.74,
    referenceWeight: 0.16,
    rationale:
      "Lecture de matière mobilisée par les serveurs, terminaux et opérations de maintenance.",
  },
  {
    key: "ewaste",
    label: "E-waste",
    unitLabel: "kg DEEE",
    proxyKgCo2ePerUnit: 1.2,
    referenceWeight: 0.10,
    rationale:
      "Part de fin de vie et de renouvellement matériel ramenée à un équivalent lisible.",
  },
] as const satisfies readonly import("./types").EnvironmentalImpactLifecycleAxisDefinition[];

export const ENVIRONMENTAL_IMPACT_LIFECYCLE_COMPONENT_DEFINITIONS = [
  {
    key: "servers",
    label: "Serveurs",
    description: "Hébergement, exécution et mémoire côté cloud.",
    unitLabel: "charges proxy",
    proxyKgCo2ePerUnit: 0.08,
    referenceWeight: 0.22,
    rationale:
      "Comprend la couche serveur, le compute partagé et les traitements d'arrière-plan.",
  },
  {
    key: "gpus",
    label: "GPU",
    description: "Traitements IA et calcul accéléré.",
    unitLabel: "heures IA proxy",
    proxyKgCo2ePerUnit: 0.12,
    referenceWeight: 0.18,
    rationale:
      "Rend visible la part matérielle des traitements IA et des tâches intensives.",
  },
  {
    key: "userDevices",
    label: "Terminaux utilisateurs",
    description: "Téléphones, laptops et écrans utilisés pour consulter le site.",
    unitLabel: "sessions",
    proxyKgCo2ePerUnit: 0.02,
    referenceWeight: 0.14,
    rationale:
      "Permet de rattacher une part du cycle de vie aux terminaux qui consomment le site.",
  },
  {
    key: "networks",
    label: "Réseaux",
    description: "Transferts de données et circulation entre les services.",
    unitLabel: "GB",
    proxyKgCo2ePerUnit: 0.00011,
    referenceWeight: 0.12,
    rationale:
      "Inclut la circulation du trafic entre hébergement, base, CDN et utilisateurs.",
  },
  {
    key: "storage",
    label: "Stockage",
    description: "Stockage persistant, médias et rétention opérationnelle.",
    unitLabel: "GB-mois",
    proxyKgCo2ePerUnit: 0.015,
    referenceWeight: 0.12,
    rationale:
      "Matérialise la part de stockage et de persistance des données dans le cycle de vie.",
  },
  {
    key: "maintenance",
    label: "Maintenance",
    description: "Révisions, corrections, surveillance et opérations de support.",
    unitLabel: "déploiements",
    proxyKgCo2ePerUnit: 0.018,
    referenceWeight: 0.10,
    rationale:
      "Couvre les opérations qui prolongent la durée de vie logique du site et de ses services.",
  },
  {
    key: "renewal",
    label: "Renouvellement matériel",
    description: "Remplacements, amortissements et rafraîchissements de parc.",
    unitLabel: "cycles",
    proxyKgCo2ePerUnit: 0.05,
    referenceWeight: 0.08,
    rationale:
      "Rend visible la contribution des renouvellements matériels périodiques.",
  },
  {
    key: "endOfLife",
    label: "Fin de vie",
    description: "Tri, recyclage et déchets électroniques.",
    unitLabel: "kg DEEE",
    proxyKgCo2ePerUnit: 0.22,
    referenceWeight: 0.04,
    rationale:
      "Fait apparaître le volet fin de vie et e-waste dans la lecture du projet.",
  },
] as const satisfies readonly import("./types").EnvironmentalImpactLifecycleComponentDefinition[];

export const ENVIRONMENTAL_IMPACT_PROJECT_ANCHORS = [
  {
    key: "ai-assisted-development-half-site",
    label: "Assistance IA et développement de la première moitié du site",
    description:
      "Ancrage donné pour le développement assisté et l'usage numérique associé à la première moitié du site CleanMyMap.",
    kWhEquivalent: 100,
    kgCo2eProxy: 20,
    waterLitersEquivalent: 100,
    comparisonNote:
      "Ordre de grandeur comparable à 200 km de voiture, une semaine de vie d'un français moyen en énergie et une dizaine de douches en eau.",
  },
  {
    key: "annual-volunteer-usage-paris",
    label: "Usage annuel du site par les bénévoles à l'échelle de Paris",
    description:
      "Ancrage donné pour le volume annuel d'usage des bénévoles; l'ordre de grandeur reste comparable au développement du site lui-même.",
    kWhEquivalent: null,
    kgCo2eProxy: 20,
    waterLitersEquivalent: null,
    comparisonNote:
      "Le signal annuel d'usage utilisateur doit être lu comme un ordre de grandeur voisin du développement, pas comme une mesure certifiée.",
  },
  {
    key: "chatgpt-llm-extended-conversations",
    label: "Conversation LLM GPT-5.4 mini en mode développement",
    description:
      "Ancrage de travail pour environ 2 heures de conversation LLM par semaine, distinct du journal Codex.",
    kWhEquivalent: 1,
    kgCo2eProxy: null,
    waterLitersEquivalent: null,
    comparisonNote:
      "L'ordre de grandeur énergétique est d'environ 1 kWh par semaine, avec un carbone dépendant du mix électrique et du contexte cloud; il ne doit pas être confondu avec Codex.",
  },
] as const satisfies readonly import("./types").EnvironmentalImpactProjectAnchor[];

export const ENVIRONMENTAL_IMPACT_SECOND_ORDER_FACTOR_DEFINITIONS = [
  {
    key: "grossCo2",
    label: "CO2 brut",
    unitLabel: "kg CO2 brut",
    proxyKgCo2ePerUnit: 1,
    referenceWeight: 0.28,
    rationale: "Part directe du carbone fossile ou opérationnel exprimée sans conversion supplémentaire.",
  },
  {
    key: "electricity",
    label: "Électricité transformée en CO2",
    unitLabel: "kWh",
    proxyKgCo2ePerUnit: 0.052,
    referenceWeight: 0.34,
    rationale: "Conversion proxy d'un usage énergétique électrique vers un équivalent CO2e lisible.",
  },
  {
    key: "otherGhgs",
    label: "Autres gaz à effet de serre",
    unitLabel: "kg CO2e",
    proxyKgCo2ePerUnit: 1,
    referenceWeight: 0.16,
    rationale: "Part des gaz autres que le CO2 déjà exprimée en équivalent CO2e.",
  },
  {
    key: "chemicals",
    label: "Produits chimiques",
    unitLabel: "kg",
    proxyKgCo2ePerUnit: 0.74,
    referenceWeight: 0.12,
    rationale: "Proxy de charge chimique ou matérielle légère associée aux flux numériques.",
  },
  {
    key: "water",
    label: "Consommation en eau",
    unitLabel: "L",
    proxyKgCo2ePerUnit: 0.00012,
    referenceWeight: 0.10,
    rationale: "Proxy hydrique ramené à un équivalent CO2e pour la lecture comparative.",
  },
] as const satisfies readonly import("./types").EnvironmentalImpactSecondOrderFactorDefinition[];

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
    key: "chatgptConversationHours",
    label: "GPT-5.4 mini - conversations LLM",
    unitLabel: "heures / mois",
    proxyKgCo2ePerUnit: 0.12,
    referenceMonthlyQuantity: 8.6666666667,
  },
  {
    key: "codexSessions",
    label: "Codex - sessions",
    unitLabel: "sessions / mois",
    proxyKgCo2ePerUnit: 0.00012,
    referenceMonthlyQuantity: 0,
  },
  {
    key: "codexConversationTurns",
    label: "Codex - tours de conversation",
    unitLabel: "tours / mois",
    proxyKgCo2ePerUnit: 0.00002,
    referenceMonthlyQuantity: 0,
  },
  {
    key: "codexToolActions",
    label: "Codex - actions outillées",
    unitLabel: "actions / mois",
    proxyKgCo2ePerUnit: 0.000015,
    referenceMonthlyQuantity: 0,
  },
  {
    key: "codexShellCommands",
    label: "Codex - commandes shell",
    unitLabel: "commandes / mois",
    proxyKgCo2ePerUnit: 0.00001,
    referenceMonthlyQuantity: 0,
  },
  {
    key: "codexFilesTouched",
    label: "Codex - fichiers touchés",
    unitLabel: "fichiers / mois",
    proxyKgCo2ePerUnit: 0.000008,
    referenceMonthlyQuantity: 0,
  },
  {
    key: "codexTestsRun",
    label: "Codex - tests lancés",
    unitLabel: "tests / mois",
    proxyKgCo2ePerUnit: 0.00006,
    referenceMonthlyQuantity: 0,
  },
  {
    key: "codexChangedLines",
    label: "Codex - lignes modifiées",
    unitLabel: "lignes / mois",
    proxyKgCo2ePerUnit: 0.0000002,
    referenceMonthlyQuantity: 0,
  },
  {
    key: "codexActiveMinutes",
    label: "Codex - minutes actives",
    unitLabel: "minutes / mois",
    proxyKgCo2ePerUnit: 0.00003,
    referenceMonthlyQuantity: 0,
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
    key: "chatgpt",
    label: "GPT-5.4 mini — développement du site",
    description: "Modèle IA utilisé pendant le développement CleanMyMap, séparé des services web de production.",
    sourceNote:
      "Inclus ACV, hors production et hors quotas web tant qu'aucune utilisation IA de production n'est documentée.",
    basis: "monthly",
    metricKeys: ["chatgptConversationHours"],
  },
  {
    key: "codex",
    label: "Codex — développement du site",
    description: "Sessions de développement assisté CleanMyMap, séparées des services web de production.",
    sourceNote: "Inclus ACV, hors production et hors quotas web; journal hebdomadaire spécifique au projet.",
    basis: "monthly",
    metricKeys: [
      "codexSessions",
      "codexConversationTurns",
      "codexToolActions",
      "codexShellCommands",
      "codexFilesTouched",
      "codexTestsRun",
      "codexChangedLines",
      "codexActiveMinutes",
    ],
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
