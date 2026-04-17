import type { ChapterDef } from "./types";

export const CHAPTERS: ChapterDef[] = [
  {
    id: "sommaire",
    kicker: "Navigation",
    title: "Sommaire dynamique",
    subtitle: "Acces direct a chaque partie du rapport web.",
    audience: "mixte",
  },
  {
    id: "executif",
    kicker: "Partie 1",
    title: "Synthese executive",
    subtitle:
      "Vue d'ensemble immediate pour piloter sans perdre le niveau de detail.",
    audience: "mixte",
  },
  {
    id: "pilotage",
    kicker: "Partie 2",
    title: "Bloc Pilotage",
    subtitle: "KPI coeur, qualite de donnees, moderation et priorisation elus.",
    audience: "strategie",
  },
  {
    id: "terrain",
    kicker: "Partie 3",
    title: "Bloc Terrain",
    subtitle:
      "Tracabilite operationnelle, itineraire, tri et couverture cartographique.",
    audience: "terrain",
  },
  {
    id: "contexte",
    kicker: "Partie 4",
    title: "Bloc Analyse contexte",
    subtitle: "Climat, meteo operationnelle et benchmark inter-zones.",
    audience: "mixte",
  },
  {
    id: "communaute",
    kicker: "Partie 5",
    title: "Bloc Communaute",
    subtitle: "Evenements, gamification et acteurs engages.",
    audience: "mixte",
  },
  {
    id: "gouvernance",
    kicker: "Partie 6",
    title: "Bloc Gouvernance",
    subtitle: "Methodologie, journal de version et cadre d'interpretation.",
    audience: "strategie",
  },
  {
    id: "calendrier",
    kicker: "Partie 7",
    title: "Calendrier previsionnel",
    subtitle:
      "Feuille de route operationnelle et institutionnelle des prochains cycles.",
    audience: "mixte",
  },
  {
    id: "glossaire",
    kicker: "Partie 8",
    title: "Glossaire simplifie",
    subtitle: "Traduction claire des termes techniques pour tous les publics.",
    audience: "mixte",
  },
  {
    id: "annexes",
    kicker: "Partie 9",
    title: "Annexes et exploitation",
    subtitle:
      "Tables de reference, liens d'action et reutilisation terrain/decideurs.",
    audience: "mixte",
  },
];

export const GLOSSARY_ROWS = [
  [
    "Action",
    "Intervention de nettoyage effectuee sur le terrain et enregistree dans la plateforme.",
  ],
  ["Spot", "Point signale comme problematique (zone sale ou a surveiller)."],
  ["Clean place", "Lieu verifie comme propre apres passage ou controle."],
  ["KPI", "Indicateur chiffre utilise pour suivre l'evolution des resultats."],
  [
    "Geocouverture",
    "Part des actions avec coordonnees valides et exploitables sur carte.",
  ],
  [
    "Trace cartographique",
    "Parcours ou zone dessinee (ligne/polygone) pour prouver la couverture terrain.",
  ],
  [
    "Recurrence",
    "Retour frequent des depots dans une meme zone malgre les actions precedentes.",
  ],
  [
    "Moderation",
    "Validation administrative d'une donnee avant usage dans le pilotage officiel.",
  ],
  ["RSVP", "Reponse a un evenement: oui, peut-etre, non."],
  ["Proxy d'impact", "Estimation utile pour decider, sans remplacer une mesure instrumentale."],
  ["Funnel de moderation", "Chemin de traitement des donnees: pending -> approved/rejected."],
  [
    "Data quality",
    "Niveau de fiabilite des donnees (completude, coherence, fraicheur, geolocalisation).",
  ],
] as const;
