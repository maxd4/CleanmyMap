import {
  Thermometer,
  TrendingUp,
  AlertTriangle,
  Globe,
  BarChart3,
  Droplets,
  Target,
  Wind,
  Clock,
  Scale
} from "lucide-react";

export interface GIECReport {
  id: string;
  title: string;
  year: number;
  focus: string;
  keyFindings: {
    title: string;
    description: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }[];
  implications: string[];
  solutions: string[];
}

export const GIEC_REPORTS: GIECReport[] = [
  {
    id: "ar6-wg1",
    title: "Changements Climatiques 2021 - Les Bases Scientifiques",
    year: 2021,
    focus: "État des connaissances scientifiques sur le changement climatique",
    keyFindings: [
      {
        title: "Échauffement déjà de +1,1°C",
        description: "L'humanité a déjà causé un réchauffement de 1,1°C depuis l'ère pré-industrielle. Chaque dixième de degré compte.",
        impact: "critical",
        icon: Thermometer
      },
      {
        title: "Attribution humaine indéniable",
        description: "Il est indéniable que l'influence humaine a réchauffé l'atmosphère, l'océan et les terres.",
        impact: "critical",
        icon: TrendingUp
      },
      {
        title: "Accélération des phénomènes extrêmes",
        description: "Les vagues de chaleur, sécheresses et précipitations intenses sont déjà plus fréquentes et intenses.",
        impact: "high",
        icon: AlertTriangle
      }
    ],
    implications: [
      "Risque de franchissement de seuils critiques (points de basculement)",
      "Impact disproportionné sur les populations vulnérables",
      "Coûts économiques croissants pour l'adaptation",
      "Menace pour la sécurité alimentaire mondiale"
    ],
    solutions: [
      "Réduction drastique des émissions de GES d'ici 2030",
      "Transition énergétique 100% renouvelable",
      "Technologies de capture du carbone à grande échelle",
      "Adaptation et résilience des infrastructures"
    ]
  },
  {
    id: "ar6-wg2",
    title: "Impacts, Adaptation et Vulnérabilité",
    year: 2022,
    focus: "Conséquences du changement climatique sur les sociétés et écosystèmes",
    keyFindings: [
      {
        title: "Risques croissants pour la biodiversité",
        description: "20-30% des espèces terrestres risquent l'extinction si le réchauffement dépasse 2°C.",
        impact: "critical",
        icon: Globe
      },
      {
        title: "Menaces pour la sécurité alimentaire",
        description: "Le changement climatique affecte déjà la production agricole dans de nombreuses régions.",
        impact: "high",
        icon: BarChart3
      },
      {
        title: "Vulnérabilité des populations côtières",
        description: "Plus de 600 millions de personnes vivent dans des zones côtières basses menacées par l'élévation du niveau de la mer.",
        impact: "high",
        icon: Droplets
      }
    ],
    implications: [
      "Migrations climatiques forcées",
      "Conflits pour les ressources naturelles",
      "Détérioration de la santé publique",
      "Perte de biodiversité irréversible"
    ],
    solutions: [
      "Stratégies d'adaptation locales et globales",
      "Protection des écosystèmes naturels",
      "Sécurité sociale climatique",
      "Agriculture régénératrice et résiliente"
    ]
  },
  {
    id: "ar6-wg3",
    title: "Atténuation du Changement Climatique",
    year: 2022,
    focus: "Solutions pour réduire les émissions de gaz à effet de serre",
    keyFindings: [
      {
        title: "Scénarios 1,5°C encore possibles",
        description: "Il est encore possible de limiter le réchauffement à 1,5°C, mais cela nécessite des actions immédiates et massives.",
        impact: "medium",
        icon: Target
      },
      {
        title: "Émissions en baisse dans certains secteurs",
        description: "Les coûts des énergies renouvelables ont chuté de 85% en 10 ans, rendant la transition économiquement viable.",
        impact: "low",
        icon: TrendingUp
      },
      {
        title: "Rôle crucial des forêts",
        description: "Les forêts stockent 25% du carbone anthropique et peuvent en absorber davantage si elles sont préservées.",
        impact: "high",
        icon: Wind
      }
    ],
    implications: [
      "Fenêtre d'opportunité se refermant rapidement",
      "Inégalités dans l'accès aux technologies propres",
      "Dépendances aux combustibles fossiles persistantes",
      "Coûts de la transition à court terme"
    ],
    solutions: [
      "Accélération de la décarbonation de tous les secteurs",
      "Financement climatique équitable",
      "Innovation technologique accélérée",
      "Politiques publiques ambitieuses et cohérentes"
    ]
  },
  {
    id: "synthesis",
    title: "Rapport de Synthèse 2023",
    year: 2023,
    focus: "Vue d'ensemble intégrée des trois groupes de travail",
    keyFindings: [
      {
        title: "Limite de 1,5°C en danger",
        description: "Les engagements actuels des pays mènent à un réchauffement de 2,4-2,6°C, bien au-delà de l'objectif de 1,5°C.",
        impact: "critical",
        icon: AlertTriangle
      },
      {
        title: "Actions insuffisantes",
        description: "Les réductions d'émissions promises ne représentent que 1% des réductions nécessaires d'ici 2030.",
        impact: "critical",
        icon: Clock
      },
      {
        title: "Justice climatique essentielle",
        description: "Les pays développés doivent réduire leurs émissions de 60-70% d'ici 2030 pour respecter l'équité.",
        impact: "high",
        icon: Scale
      }
    ],
    implications: [
      "Risques systémiques globaux",
      "Inefficacité des politiques actuelles",
      "Urgence d'une transformation profonde",
      "Responsabilité historique des pays riches"
    ],
    solutions: [
      "Ambition climatique multipliée par 5-10",
      "Justice et équité dans la transition",
      "Mobilisation de toutes les structures",
      "Accélération technologique et sociale"
    ]
  }
];
