import { Thermometer, TrendingUp, AlertTriangle, Globe, BarChart3, Droplets, Target, Wind, Clock, Scale } from "lucide-react";

export interface GIECReport {
  id: string;
  title: string;
  year: number;
  focus: string;
  sourceUrl: string;
  keyFindings: {
    title: string;
    description: string;
    impact: "critical" | "high" | "medium" | "low";
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }[];
  implications: string[];
  solutions: string[];
}

// Dated summaries of AR6, not a current thermometer or a new IPCC assessment.
export const GIEC_REPORTS: GIECReport[] = [
  {
    id: "ar6-wg1", title: "Les bases scientifiques", year: 2021,
    focus: "Observations, attribution et scénarios du changement climatique.",
    sourceUrl: "https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/",
    keyFindings: [
      { title: "+1,09 °C", description: "Température moyenne mondiale de surface en 2011 à 2020 par rapport à 1850 à 1900 : +1,09 °C, intervalle évalué de +0,95 à +1,20 °C (SPM A.1.2).", impact: "critical", icon: Thermometer },
      { title: "Influence humaine établie", description: "L'influence humaine a réchauffé l'atmosphère, l'océan et les terres (SPM A.1).", impact: "critical", icon: TrendingUp },
      { title: "Extrêmes et attribution", description: "Le changement climatique d'origine humaine affecte déjà de nombreux extrêmes météorologiques et climatiques (SPM A.3).", impact: "high", icon: AlertTriangle },
    ],
    implications: ["Distinguer moyenne mondiale, variations locales et événements individuels.", "Les projections dépendent des trajectoires d'émissions."],
    solutions: ["Limiter les émissions cumulées de CO₂ et réduire fortement les autres gaz à effet de serre (SPM D.1)."],
  },
  {
    id: "ar6-wg2", title: "Impacts, adaptation et vulnérabilité", year: 2022,
    focus: "Risques pour les écosystèmes, les sociétés et capacités d'adaptation.",
    sourceUrl: "https://www.ipcc.ch/report/ar6/wg2/chapter/summary-for-policymakers/",
    keyFindings: [
      { title: "3 à 18 % à +2 °C", description: "Dans les écosystèmes terrestres, 3 à 18 % des espèces évaluées feraient probablement face à un risque très élevé d'extinction à +2 °C (SPM B.4.1). Ce n'est pas une proportion d'extinctions certaines.", impact: "critical", icon: Globe },
      { title: "Alimentation et eau", description: "Le réchauffement a déjà affecté la sécurité alimentaire et hydrique ; les risques dépendent notamment de l'exposition et de la vulnérabilité (SPM B.1).", impact: "high", icon: BarChart3 },
      { title: "Risques côtiers", description: "La poursuite de la hausse du niveau marin menace les installations humaines et les écosystèmes côtiers bas (SPM B.4).", impact: "high", icon: Droplets },
    ],
    implications: ["Les risques augmentent avec le niveau de réchauffement et la vulnérabilité.", "L'adaptation réduit certains risques, mais rencontre des limites."],
    solutions: ["Préserver les écosystèmes et mettre en œuvre des adaptations contextualisées.", "Prioriser la réduction des risques et l'équité (SPM D.2)."],
  },
  {
    id: "ar6-wg3", title: "Atténuation du changement climatique", year: 2022,
    focus: "Options et trajectoires de réduction des émissions de gaz à effet de serre.",
    sourceUrl: "https://www.ipcc.ch/report/ar6/wg3/chapter/summary-for-policymakers/",
    keyFindings: [
      { title: "Trajectoires conditionnelles", description: "Les trajectoires modélisées limitant le réchauffement à 1,5 °C avec dépassement nul ou limité nécessitent des réductions rapides et profondes des émissions (SPM C.1).", impact: "medium", icon: Target },
      { title: "Coûts technologiques : 2010 à 2019", description: "Le GIEC évalue des baisses de coûts unitaires de 85 % pour le solaire, 55 % pour l'éolien et 85 % pour les batteries lithium-ion sur cette période (SPM B.4.1).", impact: "low", icon: TrendingUp },
      { title: "Plusieurs leviers", description: "L'efficacité énergétique, les systèmes énergétiques à faibles émissions, la gestion des terres et les changements de demande font partie des leviers étudiés (SPM C).", impact: "high", icon: Wind },
    ],
    implications: ["Les options présentent des coûts, potentiels et contraintes différents selon les contextes.", "Une baisse de coût technologique ne suffit pas à mesurer une baisse réelle des émissions."],
    solutions: ["Combiner les leviers de réduction de la demande, d'efficacité et de décarbonation adaptés aux secteurs (SPM C)."],
  },
  {
    id: "synthesis", title: "Rapport de synthèse", year: 2023,
    focus: "Synthèse des connaissances, risques et options des trois groupes de travail.",
    sourceUrl: "https://www.ipcc.ch/report/ar6/syr/summary-for-policymakers/",
    keyFindings: [
      { title: "Chaque fraction de degré compte", description: "Les risques et pertes augmentent avec chaque incrément de réchauffement (SPM B.2).", impact: "critical", icon: AlertTriangle },
      { title: "Engagements et mise en œuvre", description: "Les contributions nationales annoncées en octobre 2021 rendaient probable un dépassement de 1,5 °C au XXIe siècle. Ce constat historique n'est pas une prévision mise à jour en temps réel (SPM A.4).", impact: "critical", icon: Clock },
      { title: "Adaptation et atténuation", description: "Les choix de cette décennie affectent les risques et les possibilités de développement résilient au climat (SPM C.1).", impact: "high", icon: Scale },
    ],
    implications: ["Distinguer les engagements annoncés, leur mise en œuvre et les émissions mesurées.", "Une action locale ne constitue pas à elle seule une mesure d'atténuation climatique."],
    solutions: ["Accélérer les réductions d'émissions et l'adaptation, avec des politiques et financements adaptés (SPM C)."],
  },
];
