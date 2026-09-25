import {
  Cloud,
  Droplets,
  Factory,
  Leaf,
  Mountain,
  Thermometer,
  Users,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PlanetaryBoundary = {
  id: string;
  name: string;
  icon: LucideIcon;
  status: "safe" | "increasing-risk" | "high-risk" | "transgressed";
  currentValue: string;
  safeLimit: string;
  description: string;
  impacts: string[];
  solutions: string[];
};

export const PLANETARY_BOUNDARIES: PlanetaryBoundary[] = [
  {
    id: "climate-change",
    name: "Climat",
    icon: Thermometer,
    status: "high-risk",
    currentValue: "+1.1°C",
    safeLimit: "+1.5°C",
    description: "Le réchauffement climatique menace tous les écosystèmes.",
    impacts: ["Fonte des glaciers", "Météo extrême", "Perte de biodiversité"],
    solutions: ["100% renouvelable", "Capture CO2"],
  },
  {
    id: "biodiversity-loss",
    name: "Biodiversité",
    icon: Leaf,
    status: "transgressed",
    currentValue: "Extinction",
    safeLimit: "< 10/an",
    description: "La 6ème extinction de masse est en cours.",
    impacts: ["Effondrement chaînes alimentaires", "Perte résilience"],
    solutions: ["Protection 30% terres/océans", "Agri régénératrice"],
  },
  {
    id: "biogeochemical-flows",
    name: "Azote/Phosphore",
    icon: Factory,
    status: "transgressed",
    currentValue: "250% Azote",
    safeLimit: "Niveau 1900",
    description: "Les cycles naturels sont perturbés par l'agriculture.",
    impacts: ["Zones mortes", "Eutrophisation"],
    solutions: ["Agriculture précision", "Baisse engrais"],
  },
  {
    id: "land-system-change",
    name: "Sols",
    icon: Mountain,
    status: "high-risk",
    currentValue: "75% dégradés",
    safeLimit: "< 15% artif.",
    description: "La déforestation détruit la séquestration carbone.",
    impacts: ["Perte fertilité", "Baisse stockage CO2"],
    solutions: ["Zéro déforestation", "Régénération"],
  },
  {
    id: "freshwater-change",
    name: "Eau douce",
    icon: Droplets,
    status: "increasing-risk",
    currentValue: "Limite dépassée — bleu et vert",
    safeLimit: "Dans la zone sûre",
    description:
      "Le Stockholm Resilience Centre indique une transgression des composantes blue water et green water de la limite Freshwater Change.",
    impacts: ["Stress hydrique", "Conflits d'accès"],
    solutions: ["Gestion intégrée", "Baisse gaspillages"],
  },
  {
    id: "ocean-acidification",
    name: "Océans (pH)",
    icon: Waves,
    status: "high-risk",
    currentValue: "pH -0.1",
    safeLimit: "Stable",
    description: "L'absorption du CO2 acidifie l'eau.",
    impacts: ["Dissolution coraux", "Perturbation marine"],
    solutions: ["Baisse CO2", "Protection côtière"],
  },
  {
    id: "atmospheric-aerosols",
    name: "Aérosols",
    icon: Cloud,
    status: "safe",
    currentValue: "Contrôlé",
    safeLimit: "Équilibre",
    description: "Particules affectant le climat et la santé.",
    impacts: ["Troubles respiratoires", "Pluies acides"],
    solutions: ["Filtres industriels", "Contrôle air"],
  },
  {
    id: "ozone-depletion",
    name: "Couche d'Ozone",
    icon: Cloud,
    status: "safe",
    currentValue: "Récupération",
    safeLimit: "Intacte",
    description: "La couche se reconstitue grâce au protocole de Montréal.",
    impacts: ["Rayons UV", "Dommages écosystèmes"],
    solutions: ["Maintien protocoles", "Alternatives CFC"],
  },
  {
    id: "novel-entities",
    name: "Polluants",
    icon: Users,
    status: "increasing-risk",
    currentValue: "Émergents",
    safeLimit: "Contrôlé",
    description: "Microplastiques, nanoparticules, chimie de synthèse.",
    impacts: ["Accumulation vivante", "Résistances"],
    solutions: ["Filtration avancée", "Précaution"],
  },
];
