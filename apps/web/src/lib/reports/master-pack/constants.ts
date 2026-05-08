import type { ChapterDef } from "@/components/reports/web-document/types";

export const MASTER_PACK_CHAPTERS: ChapterDef[] = [
  {
    id: "sommaire",
    kicker: "Navigation",
    title: "Table des Matières",
    subtitle: "Accès direct à chaque partie du rapport exhaustif.",
    audience: "mixte",
  },
  {
    id: "executif",
    kicker: "Partie 1",
    title: "Synthèse Institutionnelle",
    subtitle: "Vue d'ensemble stratégique et score de confiance des données.",
    audience: "mixte",
  },
  {
    id: "pilotage",
    kicker: "Partie 2",
    title: "Focus Décideurs",
    subtitle: "KPI consolidés, arbitrage budgétaire et priorisation territoriale.",
    audience: "strategie",
  },
  {
    id: "terrain",
    kicker: "Partie 3",
    title: "Focus Opérationnel",
    subtitle: "Traçabilité terrain, itinéraires et couverture cartographique.",
    audience: "terrain",
  },
  {
    id: "contexte",
    kicker: "Partie 4",
    title: "Analyse d'Impact Environnemental",
    subtitle: "Proxies écologiques (Eau, CO2) et météo opérationnelle.",
    audience: "mixte",
  },
  {
    id: "communaute",
    kicker: "Partie 5",
    title: "Engagement Citoyen",
    subtitle: "Dynamique communautaire, événements et reconnaissance.",
    audience: "mixte",
  },
  {
    id: "gouvernance",
    kicker: "Partie 6",
    title: "Méthodologie & Transparence",
    subtitle: "Cadre d'interprétation, formules et journal de version.",
    audience: "strategie",
  },
  {
    id: "annexes",
    kicker: "Partie 7",
    title: "Annexes & Exploitation",
    subtitle: "Tables de référence et ressources pour le terrain.",
    audience: "mixte",
  },
];

export const MASTER_PACK_GLOSSARY = [
  ["Action", "Intervention de nettoyage terrain validée."],
  ["Spot", "Point de pollution signalé."],
  ["Recurrence", "Persistance de la pollution sur une zone traitée."],
  ["Readiness Score", "Indice de fiabilité globale du rapport (0-100%)."],
] as const;
