import type { EnvironmentalImpactPostDefinition } from "./types-scope";

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
