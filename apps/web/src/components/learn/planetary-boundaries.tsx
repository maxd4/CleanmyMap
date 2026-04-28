"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Thermometer,
  Leaf,
  Factory,
  Mountain,
  Waves,
  Cloud,
  Users,
  AlertTriangle,
  Info,
  Sparkles
} from "lucide-react";
import { PlanetaryRadarChart } from "./planetary-radar-chart";

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
    name: "Climat",
    icon: Thermometer,
    status: "high-risk",
    currentValue: "+1.1°C",
    safeLimit: "+1.5°C",
    description: "Le réchauffement climatique menace tous les écosystèmes.",
    impacts: ["Fonte des glaciers", "Météo extrême", "Perte de biodiversité"],
    solutions: ["100% renouvelable", "Capture CO2"]
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
    solutions: ["Protection 30% terres/océans", "Agri régénératrice"]
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
    solutions: ["Agriculture précision", "Baisse engrais"]
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
    solutions: ["Zéro déforestation", "Régénération"]
  },
  {
    id: "freshwater-change",
    name: "Eau douce",
    icon: Droplets,
    status: "increasing-risk",
    currentValue: "Déficit",
    safeLimit: "Équilibre",
    description: "Cycle perturbé par la surexploitation et le climat.",
    impacts: ["Stress hydrique", "Conflits d'accès"],
    solutions: ["Gestion intégrée", "Baisse gaspillages"]
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
    solutions: ["Baisse CO2", "Protection côtière"]
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
    solutions: ["Filtres industriels", "Contrôle air"]
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
    solutions: ["Maintien protocoles", "Alternatives CFC"]
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
    solutions: ["Filtration avancée", "Précaution"]
  }
];

const getStatusColor = (status: PlanetaryBoundary['status']) => {
  switch (status) {
    case 'safe': return '#10b981'; // emerald
    case 'increasing-risk': return '#f59e0b'; // amber
    case 'high-risk': return '#f97316'; // orange
    case 'transgressed': return '#ef4444'; // red
    default: return '#64748b';
  }
};

const getStatusRadius = (status: PlanetaryBoundary['status']) => {
  switch (status) {
    case 'safe': return 0.4;
    case 'increasing-risk': return 0.6;
    case 'high-risk': return 0.8;
    case 'transgressed': return 1.0;
    default: return 0.5;
  }
};

export function PlanetaryBoundariesInteractive() {
  const [selectedId, setSelectedId] = useState<string | null>(PLANETARY_BOUNDARIES[0].id);

  const selectedBoundary = PLANETARY_BOUNDARIES.find(b => b.id === selectedId) || PLANETARY_BOUNDARIES[0];

  const radarBoundaries = PLANETARY_BOUNDARIES.map(b => ({
    id: b.id,
    name: b.name,
    icon: b.icon as any,
    status: b.status,
    color: getStatusColor(b.status),
    radiusRatio: getStatusRadius(b.status)
  }));

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 shadow-sm mb-2">
          <Sparkles size={14} className="text-violet-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700 dark:text-violet-400">Science & Données</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-black cmm-text-primary tracking-tight">Les 9 Limites Planétaires</h2>
        <p className="text-lg cmm-text-secondary max-w-3xl mx-auto font-medium">
          Découvrez l'état de santé de notre planète à travers ce radar interactif. Le dépassement de ces limites menace la résilience de la Terre.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-center">
        
        {/* Visualisation Radar Premium */}
        <div className="relative order-2 xl:order-1">
          <PlanetaryRadarChart 
            boundaries={radarBoundaries}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          
          {/* Légende flottante */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 py-4 md:py-0">
            {[
              { label: 'Sûr', color: '#10b981' },
              { label: 'Risque', color: '#f97316' },
              { label: 'Dépassé', color: '#ef4444' }
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold uppercase tracking-wider cmm-text-muted">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panneau de détails dynamique (Style Neumorphic/Glass) */}
        <div className="relative min-h-[550px] order-1 xl:order-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedBoundary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900/50 p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 backdrop-blur-xl relative overflow-hidden"
            >
              {/* Filigrane d'icône en arrière-plan */}
              <div className="absolute -top-10 -right-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <selectedBoundary.icon size={280} />
              </div>

              <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-6">
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-lg relative"
                    style={{ backgroundColor: getStatusColor(selectedBoundary.status) }}
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse" />
                    <selectedBoundary.icon size={40} className="relative z-10" />
                  </motion.div>
                  <div>
                    <h3 className="text-3xl font-black cmm-text-primary tracking-tight mb-2">{selectedBoundary.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-sm",
                        selectedBoundary.status === 'safe' ? 'bg-emerald-500' : 
                        selectedBoundary.status === 'increasing-risk' ? 'bg-amber-500' :
                        selectedBoundary.status === 'high-risk' ? 'bg-orange-500' : 'bg-red-500'
                      )}>
                        {selectedBoundary.status === 'safe' ? 'SÉCURISÉ' : 
                         selectedBoundary.status === 'increasing-risk' ? 'RISQUE CROISSANT' :
                         selectedBoundary.status === 'high-risk' ? 'RISQUE ÉLEVÉ' : 'DÉPASSÉ'}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xl cmm-text-secondary leading-relaxed font-medium">
                  {selectedBoundary.description}
                </p>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-900/80 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] cmm-text-muted mb-2 block">Mesure Actuelle</span>
                    <div className="text-2xl font-black cmm-text-primary">{selectedBoundary.currentValue}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-800/50 shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400 mb-2 block">Limite Sûre</span>
                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{selectedBoundary.safeLimit}</div>
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  <div>
                    <h4 className="flex items-center gap-2 text-xs font-black cmm-text-primary uppercase tracking-[0.2em] mb-4">
                      <AlertTriangle size={16} className="text-orange-500" />
                      Impacts Majeurs
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedBoundary.impacts.map((impact, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group/item hover:border-orange-200 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 group-hover/item:scale-125 transition-transform" />
                          <span className="text-sm font-bold cmm-text-secondary">{impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="flex items-center gap-2 text-xs font-black cmm-text-primary uppercase tracking-[0.2em] mb-4">
                      <Info size={16} className="text-emerald-500" />
                      Leviers d'Action
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedBoundary.solutions.map((solution, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/50 group/sol hover:border-emerald-300 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-sol/item:scale-125 transition-transform" />
                          <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{solution}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}