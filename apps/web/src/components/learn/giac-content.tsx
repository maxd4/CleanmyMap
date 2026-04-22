"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  Thermometer,
  Droplets,
  Wind,
  BarChart3,
  Globe,
  Clock,
  Target,
  Scale
} from "lucide-react";

interface GIECReport {
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

const GIEC_REPORTS: GIECReport[] = [
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
      "Mobilisation de tous les acteurs",
      "Accélération technologique et sociale"
    ]
  }
];

const getImpactColor = (impact: GIECReport['keyFindings'][0]['impact']) => {
  switch (impact) {
    case 'critical': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-slate-500';
  }
};

const getImpactLabel = (impact: GIECReport['keyFindings'][0]['impact']) => {
  switch (impact) {
    case 'critical': return 'Critique';
    case 'high': return 'Élevé';
    case 'medium': return 'Moyen';
    case 'low': return 'Faible';
    default: return 'Inconnu';
  }
};

export function GIECContent() {
  const [selectedReport, setSelectedReport] = useState<GIECReport | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <FileText className="text-blue-600" size={32} />
          <h2 className="text-3xl font-black text-slate-900">Rapports du GIEC</h2>
        </div>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto">
          Le Groupe d'experts intergouvernemental sur l'évolution du climat (GIEC) produit des rapports
          scientifiques qui font référence sur le changement climatique. Voici les conclusions clés
          vulgarisées pour une meilleure compréhension.
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {GIEC_REPORTS.map((report, index) => (
          <motion.button
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedReport(report)}
            className={`
              p-6 rounded-3xl backdrop-blur-sm border transition-all duration-300 text-left
              ${selectedReport?.id === report.id
                ? 'bg-white/90 border-blue-300 shadow-xl scale-105'
                : 'bg-white/60 border-slate-200 hover:bg-white/80 hover:border-slate-300 hover:shadow-lg'
              }
            `}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">
                  GIEC {report.year}
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {report.title}
                </h3>
              </div>
              <div className="text-2xl font-black text-slate-300 ml-4">
                {report.year}
              </div>
            </div>

            {/* Focus */}
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              {report.focus}
            </p>

            {/* Key Findings Preview */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Points clés ({report.keyFindings.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {report.keyFindings.slice(0, 2).map((finding, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getImpactColor(finding.impact)}`} />
                    <span className="text-xs text-slate-600">{getImpactLabel(finding.impact)}</span>
                  </div>
                ))}
                {report.keyFindings.length > 2 && (
                  <span className="text-xs text-slate-400">+{report.keyFindings.length - 2} autres</span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-100">
                      <FileText size={32} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">
                        Rapport GIEC {selectedReport.year}
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">
                        {selectedReport.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Focus */}
                <div className="p-6 bg-blue-50 rounded-2xl">
                  <h4 className="text-lg font-bold text-blue-900 mb-2">Focus du rapport</h4>
                  <p className="text-blue-800">{selectedReport.focus}</p>
                </div>

                {/* Key Findings */}
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-6">Conclusions principales</h4>
                  <div className="grid gap-4">
                    {selectedReport.keyFindings.map((finding, index) => {
                      const Icon = finding.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-6 rounded-2xl bg-slate-50 border border-slate-200"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${getImpactColor(finding.impact)}`}>
                              <Icon size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-bold text-slate-900">{finding.title}</h5>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${getImpactColor(finding.impact)}`}>
                                  {getImpactLabel(finding.impact)}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{finding.description}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Implications */}
                <div>
                  <h4 className="text-xl font-bold text-red-900 mb-4">Implications pour l'humanité</h4>
                  <div className="grid gap-3">
                    {selectedReport.implications.map((implication, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                        <span className="text-red-800">{implication}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Solutions */}
                <div>
                  <h4 className="text-xl font-bold text-emerald-900 mb-4">Solutions et actions possibles</h4>
                  <div className="grid gap-3">
                    {selectedReport.solutions.map((solution, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        <span className="text-emerald-800">{solution}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to Action */}
                <div className="p-6 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl text-white text-center">
                  <h4 className="text-xl font-bold mb-2">Chaque action compte</h4>
                  <p className="text-blue-100 mb-4">
                    CleanMyMap vous aide à contribuer concrètement à la lutte contre le changement climatique
                    en cartographiant et réduisant la pollution plastique.
                  </p>
                  <button className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors">
                    Commencer à agir
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}