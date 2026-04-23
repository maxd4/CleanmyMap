import type { ChapterDef } from "./types";

export const CHAPTERS: ChapterDef[] = [
  {
    id: "sommaire",
    kicker: "Navigation",
    title: "Sommaire dynamique",
    subtitle: "Accès direct à chaque partie du rapport web.",
    audience: "mixte",
  },
  {
    id: "executif",
    kicker: "Partie 1",
    title: "Synthèse exécutive",
    subtitle:
      "Vue d'ensemble immédiate pour piloter sans perdre le niveau de détail.",
    audience: "mixte",
  },
  {
    id: "pilotage",
    kicker: "Partie 2",
    title: "Bloc Pilotage",
    subtitle: "KPI cœur, qualité de données, modération et priorisation élus.",
    audience: "strategie",
  },
  {
    id: "terrain",
    kicker: "Partie 3",
    title: "Bloc Terrain",
    subtitle:
      "Traçabilité opérationnelle, itinéraire, tri et couverture cartographique.",
    audience: "terrain",
  },
  {
    id: "contexte",
    kicker: "Partie 4",
    title: "Bloc Analyse contexte",
    subtitle: "Climat, météo opérationnelle et benchmark inter-zones.",
    audience: "mixte",
  },
  {
    id: "communaute",
    kicker: "Partie 5",
    title: "Bloc Communauté",
    subtitle: "Événements, gamification et acteurs engagés.",
    audience: "mixte",
  },
  {
    id: "gouvernance",
    kicker: "Partie 6",
    title: "Bloc Gouvernance",
    subtitle: "Méthodologie, journal de version et cadre d'interprétation.",
    audience: "strategie",
  },
  {
    id: "calendrier",
    kicker: "Partie 7",
    title: "Calendrier prévisionnel",
    subtitle:
      "Feuille de route opérationnelle et institutionnelle des prochains cycles.",
    audience: "mixte",
  },
  {
    id: "glossaire",
    kicker: "Partie 8",
    title: "Glossaire simplifié",
    subtitle: "Traduction claire des termes techniques pour tous les publics.",
    audience: "mixte",
  },
  {
    id: "annexes",
    kicker: "Partie 9",
    title: "Annexes et exploitation",
    subtitle:
      "Tables de référence, liens d'action et réutilisation terrain/décideurs.",
    audience: "mixte",
  },
];

export const GLOSSARY_ROWS = [
  [
    "Action",
    "Intervention de nettoyage effectuée sur le terrain et enregistrée dans la plateforme.",
  ],
  ["Spot", "Point signalé comme problématique (zone sale ou à surveiller)."],
  ["Clean place", "Lieu vérifié comme propre après passage ou contrôle."],
  ["KPI", "Indicateur chiffré utilisé pour suivre l'évolution des résultats."],
  [
    "Geocouverture",
    "Part des actions avec coordonnées valides et exploitables sur carte.",
  ],
  [
    "Trace cartographique",
    "Parcours ou zone dessinée (ligne/polygone) pour prouver la couverture terrain.",
  ],
  [
    "Recurrence",
    "Retour fréquent des dépôts dans une même zone malgré les actions précédentes.",
  ],
  [
    "Modération",
    "Validation administrative d'une donnée avant usage dans le pilotage officiel.",
  ],
  ["RSVP", "Réponse à un événement: oui, peut-être, non."],
  ["Proxy d'impact", "Estimation utile pour décider, sans remplacer une mesure instrumentale."],
  ["Funnel de modération", "Chemin de traitement des données: pending -> approved/rejected."],
  [
    "Data quality",
    "Niveau de fiabilité des données (complétude, cohérence, fraîcheur, géolocalisation).",
  ],
] as const;
