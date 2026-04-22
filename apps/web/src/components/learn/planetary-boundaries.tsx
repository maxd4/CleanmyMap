"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Thermometer,
  Leaf,
  Zap,
  Factory,
  Mountain,
  Waves,
  Cloud,
  Users
} from "lucide-react";

interface PlanetaryBoundary {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: 'safe' | 'increasing-risk' | 'high-risk' | 'transgressed';
  currentValue: string;
  safeLimit: string;
  description: string;
  impacts: string[];
  solutions: string[];
}

const PLANETARY_BOUNDARIES: PlanetaryBoundary[] = [
  {
    id: "climate-change",
    name: "Changement Climatique",
    icon: Thermometer,
    status: "high-risk",
    currentValue: "+1.1°C",
    safeLimit: "+1.5°C",
    description: "Le réchauffement climatique menace tous les écosystèmes et sociétés humaines. Chaque dixième de degré compte.",
    impacts: [
      "Fonte accélérée des glaciers",
      "Événements météorologiques extrêmes",
      "Perte de biodiversité massive",
      "Risques pour l'agriculture mondiale"
    ],
    solutions: [
      "Transition énergétique 100% renouvelable",
      "Reforestation massive (1 trillion d'arbres)",
      "Réduction des émissions de 50% d'ici 2030",
      "Technologies de capture du CO2"
    ]
  },
  {
    id: "biodiversity-loss",
    name: "Perte de Biodiversité",
    icon: Leaf,
    status: "transgressed",
    currentValue: "Extinction accélérée",
    safeLimit: "< 10 extinctions/an",
    description: "La 6ème extinction de masse est en cours. Nous perdons des espèces plus vite que jamais dans l'histoire.",
    impacts: [
      "Effondrement des chaînes alimentaires",
      "Perte de services écosystémiques",
      "Réduction de la résilience des écosystèmes",
      "Impact sur la santé humaine"
    ],
    solutions: [
      "Protection de 30% des terres et océans",
      "Agriculture régénératrice",
      "Lutte contre le trafic d'espèces",
      "Restauration des habitats naturels"
    ]
  },
  {
    id: "biogeochemical-flows",
    name: "Cycles Biogéochimiques",
    icon: Factory,
    status: "transgressed",
    currentValue: "250% de l'azote",
    safeLimit: "Niveau pré-industriel",
    description: "Les cycles naturels de l'azote et du phosphore sont perturbés par l'agriculture intensive et les engrais.",
    impacts: [
      "Eutrophisation des cours d'eau",
      "Zones mortes océaniques",
      "Acidification des sols",
      "Pollution de l'air par l'ammoniac"
    ],
    solutions: [
      "Agriculture de précision",
      "Réduction des engrais de synthèse",
      "Gestion circulaire des nutriments",
      "Traitement des eaux usées avancés"
    ]
  },
  {
    id: "land-system-change",
    name: "Changement d'Usage des Sols",
    icon: Mountain,
    status: "high-risk",
    currentValue: "75% des sols dégradés",
    safeLimit: "< 15% artificialisés",
    description: "La déforestation et l'urbanisation massive détruisent les sols et réduisent la capacité de séquestration du carbone.",
    impacts: [
      "Perte de fertilité des sols",
      "Réduction de la biodiversité",
      "Diminution de la capacité de stockage du carbone",
      "Risques d'inondations et de sécheresses"
    ],
    solutions: [
      "Zéro déforestation nette",
      "Agriculture urbaine et verticale",
      "Régénération des sols dégradés",
      "Protection des forêts primaires"
    ]
  },
  {
    id: "freshwater-change",
    name: "Changement du Cycle de l'Eau",
    icon: Droplets,
    status: "increasing-risk",
    currentValue: "Déficit croissant",
    safeLimit: "Équilibre hydrologique",
    description: "Le cycle de l'eau douce est perturbé par le changement climatique et la surexploitation des ressources.",
    impacts: [
      "Stress hydrique dans de nombreuses régions",
      "Réduction des débits fluviaux",
      "Dégradation de la qualité de l'eau",
      "Conflits pour l'accès à l'eau"
    ],
    solutions: [
      "Gestion intégrée des ressources en eau",
      "Réduction des pertes et gaspillages",
      "Infrastructures de rétention d'eau",
      "Technologies de dessalement durable"
    ]
  },
  {
    id: "ocean-acidification",
    name: "Acidification des Océans",
    icon: Waves,
    status: "high-risk",
    currentValue: "pH -0.1",
    safeLimit: "pH stable",
    description: "L'absorption du CO2 par les océans acidifie l'eau, menaçant les organismes marins calcifiants.",
    impacts: [
      "Dissolution des coraux et coquillages",
      "Perturbation des chaînes alimentaires marines",
      "Réduction de la biodiversité océanique",
      "Impact sur les pêcheries mondiales"
    ],
    solutions: [
      "Réduction drastique des émissions de CO2",
      "Protection des zones côtières",
      "Aquaculture durable",
      "Technologies de reminéralisation"
    ]
  },
  {
    id: "atmospheric-aerosols",
    name: "Aérosols Atmosphériques",
    icon: Cloud,
    status: "safe",
    currentValue: "Sous contrôle",
    safeLimit: "Équilibre radiatif",
    description: "Les particules en suspension dans l'air affectent le climat et la santé humaine.",
    impacts: [
      "Problèmes respiratoires",
      "Réduction de la visibilité",
      "Acidification des précipitations",
      "Changement climatique régional"
    ],
    solutions: [
      "Réduction des émissions industrielles",
      "Filtres et technologies propres",
      "Surveillance continue de la qualité de l'air",
      "Politiques de réduction des polluants"
    ]
  },
  {
    id: "ozone-depletion",
    name: "Appauvrissement de la Couche d'Ozone",
    icon: Cloud,
    status: "safe",
    currentValue: "En récupération",
    safeLimit: "Couche intacte",
    description: "La couche d'ozone se reconstitue grâce au protocole de Montréal, mais reste vulnérable.",
    impacts: [
      "Augmentation des UV sur la surface",
      "Risques de cancers de la peau",
      "Dommages aux écosystèmes",
      "Perturbation des cycles biologiques"
    ],
    solutions: [
      "Maintien du protocole de Montréal",
      "Surveillance continue",
      "Technologies alternatives aux CFC",
      "Éducation et sensibilisation"
    ]
  },
  {
    id: "novel-entities",
    name: "Entités Nouvelles",
    icon: Users,
    status: "increasing-risk",
    currentValue: "Polluants émergents",
    safeLimit: "Sous contrôle",
    description: "Les polluants chimiques nouveaux (nanoparticules, microplastiques, produits pharmaceutiques) s'accumulent.",
    impacts: [
      "Effets sur la santé humaine inconnus",
      "Accumulation dans les chaînes alimentaires",
      "Perturbation des écosystèmes",
      "Résistance aux antibiotiques"
    ],
    solutions: [
      "Évaluation systématique des risques",
      "Politique de précaution renforcée",
      "Technologies de filtration avancées",
      "Recherche sur les alternatives sûres"
    ]
  }
];

const getStatusColor = (status: PlanetaryBoundary['status']) => {
  switch (status) {
    case 'safe': return 'bg-emerald-500';
    case 'increasing-risk': return 'bg-amber-500';
    case 'high-risk': return 'bg-orange-500';
    case 'transgressed': return 'bg-red-500';
    default: return 'bg-slate-500';
  }
};

const getStatusLabel = (status: PlanetaryBoundary['status']) => {
  switch (status) {
    case 'safe': return 'Sécurisé';
    case 'increasing-risk': return 'Risque croissant';
    case 'high-risk': return 'Risque élevé';
    case 'transgressed': return 'Transgressé';
    default: return 'Inconnu';
  }
};

export function PlanetaryBoundariesInteractive() {
  const [selectedBoundary, setSelectedBoundary] = useState<PlanetaryBoundary | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-slate-900">Les 9 Limites Planétaires</h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Le concept des limites planétaires définit les seuils au-delà desquels l'humanité risque de
          compromettre les conditions de vie sur Terre. Développé par le Stockholm Resilience Centre.
        </p>
      </div>

      {/* Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANETARY_BOUNDARIES.map((boundary, index) => {
          const Icon = boundary.icon;
          return (
            <motion.button
              key={boundary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedBoundary(boundary)}
              className={`
                relative p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300
                ${selectedBoundary?.id === boundary.id
                  ? 'bg-white/90 border-emerald-300 shadow-xl scale-105'
                  : 'bg-white/60 border-slate-200 hover:bg-white/80 hover:border-slate-300 hover:shadow-lg'
                }
              `}
            >
              {/* Status Indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(boundary.status)}`} />
                <span className="text-xs font-medium text-slate-500">
                  {getStatusLabel(boundary.status)}
                </span>
              </div>

              {/* Icon and Title */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`
                  p-3 rounded-xl transition-colors
                  ${selectedBoundary?.id === boundary.id
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-600'
                  }
                `}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-left">
                  {boundary.name}
                </h3>
              </div>

              {/* Values */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Valeur actuelle:</span>
                  <span className="font-bold text-slate-900">{boundary.currentValue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Limite sûre:</span>
                  <span className="font-bold text-emerald-600">{boundary.safeLimit}</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBoundary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBoundary(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${getStatusColor(selectedBoundary.status)}`}>
                      <selectedBoundary.icon size={32} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">
                        {selectedBoundary.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedBoundary.status)}`} />
                        <span className="text-sm font-medium text-slate-600">
                          {getStatusLabel(selectedBoundary.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBoundary(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Description */}
                <p className="text-slate-700 leading-relaxed">
                  {selectedBoundary.description}
                </p>

                {/* Values */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-sm text-slate-600">Valeur actuelle</p>
                    <p className="text-xl font-bold text-slate-900">{selectedBoundary.currentValue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Limite sûre</p>
                    <p className="text-xl font-bold text-emerald-600">{selectedBoundary.safeLimit}</p>
                  </div>
                </div>

                {/* Impacts */}
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-3">Impacts principaux</h4>
                  <ul className="space-y-2">
                    {selectedBoundary.impacts.map((impact, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                        <span className="text-slate-700">{impact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Solutions */}
                <div>
                  <h4 className="text-lg font-bold text-emerald-900 mb-3">Solutions concrètes</h4>
                  <ul className="space-y-2">
                    {selectedBoundary.solutions.map((solution, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        <span className="text-slate-700">{solution}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}