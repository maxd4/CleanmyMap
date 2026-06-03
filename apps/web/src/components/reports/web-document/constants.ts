import type { ChapterDef } from "./types";

export type ReportTocLink = {
  id: string;
  label: string;
  subtitle: string;
};

export type ReportTocEntry = ChapterDef & {
  links?: ReportTocLink[];
};

export const REPORT_EXECUTIVE_LINKS: ReportTocLink[] = [
  {
    id: "executive-overview",
    label: "Vue d’ensemble du rapport",
    subtitle: "Lecture globale, périmètre et ligne directrice.",
  },
  {
    id: "executive-key-figures",
    label: "Chiffres clés",
    subtitle: "Masse, actions, bénévoles et couverture territoriale.",
  },
  {
    id: "executive-conclusions",
    label: "Principales conclusions",
    subtitle: "Ce qu’il faut retenir pour piloter rapidement.",
  },
  {
    id: "executive-recommendations",
    label: "Recommandations prioritaires",
    subtitle: "Les actions à lancer en premier.",
  },
];

export const REPORT_SECTIONS: ChapterDef[] = [
  {
    id: "perimetre-rapport",
    kicker: "Partie 1",
    title: "Périmètre du rapport",
    subtitle: "Période analysée, territoire couvert, collectif concerné et sources des données.",
    audience: "mixte",
  },
  {
    id: "resultats-terrain",
    kicker: "Partie 2",
    title: "Résultats terrain",
    subtitle: "Actions recensées, déchets, bénévoles et zones traitées ou restantes.",
    audience: "terrain",
  },
  {
    id: "cartographie-impact",
    kicker: "Partie 3",
    title: "Cartographie d’impact",
    subtitle: "Carte des actions, zones prioritaires, signalements et lecture territoriale.",
    audience: "terrain",
  },
  {
    id: "indicateurs-environnementaux",
    kicker: "Partie 4",
    title: "Indicateurs environnementaux",
    subtitle: "Impact estimé, CO2 évité, eau préservée, surface d’action et indice de pollution.",
    audience: "strategie",
  },
  {
    id: "contexte-local",
    kicker: "Partie 5",
    title: "Analyse du contexte local",
    subtitle: "Typologie des déchets, contraintes, vigilance et besoins identifiés.",
    audience: "mixte",
  },
  {
    id: "methodologie-fiabilite",
    kicker: "Partie 6",
    title: "Méthodologie et fiabilité",
    subtitle: "Mode de calcul, sources, qualité des données, limites et incertitudes.",
    audience: "strategie",
  },
  {
    id: "communaute-mobilisation",
    kicker: "Partie 7",
    title: "Communauté et mobilisation",
    subtitle: "Bénévoles, partenaires, dynamique collective et contribution citoyenne.",
    audience: "mixte",
  },
  {
    id: "gouvernance-transparence",
    kicker: "Partie 8",
    title: "Gouvernance et transparence",
    subtitle: "Validation, modération, protection des données et traçabilité.",
    audience: "strategie",
  },
  {
    id: "recommandations-operationnelles",
    kicker: "Partie 9",
    title: "Recommandations opérationnelles",
    subtitle: "Actions à court et moyen terme, priorités territoriales et améliorations.",
    audience: "strategie",
  },
  {
    id: "calendrier-previsionnel",
    kicker: "Partie 10",
    title: "Calendrier prévisionnel",
    subtitle: "Prochaines actions, objectifs de suivi et échéances recommandées.",
    audience: "mixte",
  },
  {
    id: "glossaire-simplifie",
    kicker: "Partie 11",
    title: "Glossaire simplifié",
    subtitle: "Définitions clés, indicateurs et méthodes de calcul.",
    audience: "mixte",
  },
  {
    id: "annexes",
    kicker: "Partie 12",
    title: "Annexes",
    subtitle: "Données détaillées, cartes complémentaires, exports techniques et documentation.",
    audience: "mixte",
  },
];

export const REPORT_TOC_ENTRIES: ReportTocEntry[] = [
  {
    id: "synthese-executive",
    kicker: "Synthèse",
    title: "Synthèse exécutive",
    subtitle: "Vue d’ensemble du rapport, chiffres clés, conclusions et recommandations prioritaires.",
    audience: "mixte",
    links: REPORT_EXECUTIVE_LINKS,
  },
  ...REPORT_SECTIONS.map((section) => ({
    ...section,
    links: [],
  })),
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
  [
    "Proxy d'impact",
    "Estimation utile pour décider, sans remplacer une mesure instrumentale.",
  ],
  [
    "Funnel de modération",
    "Chemin de traitement des données: pending -> approved/rejected.",
  ],
  [
    "Data quality",
    "Niveau de fiabilité des données (complétude, cohérence, fraîcheur, géolocalisation).",
  ],
] as const;
