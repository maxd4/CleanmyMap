import type {
  EnvironmentalImpactLifecycleAxisDefinition,
  EnvironmentalImpactLifecycleComponentDefinition,
} from "./types-lifecycle";
import { ENVIRONMENTAL_IMPACT_ELECTRICITY_FACTOR } from "./constants-core";

export const ENVIRONMENTAL_IMPACT_LIFECYCLE_HYPOTHESES = [
  "La couche lifecycle complète le CO2e opérationnel avec une lecture matérielle et de cycle de vie, sans prétendre à une ACV certifiée.",
  "Les serveurs, GPU, terminaux utilisateurs, réseaux, stockage, maintenance, renouvellement matériel et fin de vie sont séparés pour éviter de noyer les sources d'impact.",
  "Les quantités affichées restent des proxys de lecture et des ordres de grandeur projet, pas des mesures physiques instrumentées.",
  "Les axes énergie, carbone, eau, matière et e-waste sont normalisés à partir des mêmes signaux CleanMyMap pour rester comparables dans le temps.",
  "La décomposition lifecycle doit aider à prioriser les leviers de réduction sans créer de double comptage avec le premier ordre.",
] as const;

export const ENVIRONMENTAL_IMPACT_LIFECYCLE_AXIS_DEFINITIONS = [
  {
    key: "energy",
    label: "Équivalent électrique estimé",
    unitLabel: "kWh",
    proxyKgCo2ePerUnit: ENVIRONMENTAL_IMPACT_ELECTRICITY_FACTOR.kgCo2ePerKwh,
    referenceWeight: 0.34,
    rationale:
      "Équivalent électrique dérivé du proxy CO2e; aucun kWh réel n'est affirmé sans signal branché.",
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
    label: "Proxy hydrique CO₂e",
    unitLabel: "kg CO₂e proxy",
    proxyKgCo2ePerUnit: 1,
    referenceWeight: 0.14,
    rationale:
      "Allocation de lecture carbone; ne représente pas des litres d'eau mesurés. La lecture en litres est fournie séparément par le contrat eau.",
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
] as const satisfies readonly EnvironmentalImpactLifecycleAxisDefinition[];

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
] as const satisfies readonly EnvironmentalImpactLifecycleComponentDefinition[];
