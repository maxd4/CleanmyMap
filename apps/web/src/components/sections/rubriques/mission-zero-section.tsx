"use client";

import { motion } from "framer-motion";
import { 
  Building2, Users, Trash2, Leaf, Target, 
  TrendingUp, Calendar, MapPin, HandHeart, Shield
} from "lucide-react";

const FIVE_PILLARS = [
  {
    id: 1,
    icon: Building2,
    color: "emerald",
    title: "Diagnostic territorial",
    short: "Cartographier les zones",
    description: "Identifier et cartographier les points noirs de votre commune : zones industrielles, parks, plages, berges.",
    actions: [
      "Utiliser la carte CleanMyMap pour recenser",
      "Analyser les flux de passage",
      "Identifier les points de défaillance",
      "Quantifier l'état initial",
    ],
  },
  {
    id: 2,
    icon: Users,
    color: "blue",
    title: "Mobilisation citoyenne",
    short: "Impliquer les habitants",
    description: "Fédérer les habitants, associations et entreprises locales autour d'objectifs communs.",
    actions: [
      "Organiser des cleanups thérapeutiants",
      "Créer des ambassadeurs du tri",
      "Mettre en place des défis collectifs",
      "Valoriser les bénévoles (certificats)",
    ],
  },
  {
    id: 3,
    icon: Trash2,
    color: "rose",
    title: "Équipements adaptés",
    short: "Installer des solutions",
    description: "Déployer poubelles, cendriers et signalétique adaptés aux usages.",
    actions: [
      "Installer des cendriers muraux",
      "Créer des points de collecte thérapeutiants",
      " Mettre en place une signalétique claire",
      "Optimiser le maillage territorial",
    ],
  },
  {
    id: 4,
    icon: Leaf,
    color: "amber",
    title: "Communication & sensibilisation",
    short: "Changer les comportements",
    description: "Communiquer de manière créative pour créer un changement durable.",
    actions: [
      "Campagnes sur les réseaux sociaux",
      "Affichage dans les espaces publics",
      "Éducation dans les écoles",
      "Messages de Terrain (Clean Tags)",
    ],
  },
  {
    id: 5,
    icon: Target,
    color: "violet",
    title: "Suivi & évaluation",
    short: "Mesurer les progrès",
    description: "Mettre en place des indicateurs pour mesurer l'impact et ajuster la stratégie.",
    actions: [
      "Suivre les données CleanMyMap",
      "Comparer N vs N-1",
      "Publier un rapport annuel",
      "Ajuster les actions correctives",
    ],
  },
];

export function MissionZeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-lg shadow-violet-100"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <Shield size={24} className="text-violet-600" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight cmm-text-primary">
            La Mission Zéro Déchet Abandonné
          </h3>
          <p className="text-sm text-slate-500">
            Approche en 5 piliers pour transformer votre territoire
          </p>
        </div>
      </div>

      <p className="text-sm cmm-text-secondary mb-6">
        Cette méthodologie, inspirée des expérimentations ville de Gestes Propres, structure l'approche CleanMyMap pour les zones pilotes.
      </p>

      <div className="grid gap-4 sm:grid-cols-5">
        {FIVE_PILLARS.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <motion.div
              key={pillar.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden rounded-[1.5rem] border border-${pillar.color}-200 bg-${pillar.color}-50/30 p-4 hover:shadow-lg transition-shadow`}
            >
              <div className={`w-10 h-10 rounded-xl bg-${pillar.color}-100 flex items-center justify-center mb-3`}>
                <span className={`text-lg font-black text-${pillar.color}-600`}>{pillar.id}</span>
              </div>
              <h4 className={`font-bold text-${pillar.color}-700 mb-1`}>{pillar.title}</h4>
              <p className="text-xs text-slate-500 mb-3">{pillar.short}</p>
              
              <div className="space-y-1">
                {pillar.actions.slice(0, 2).map((action, i) => (
                  <div key={i} className="text-[10px] cmm-text-muted flex items-start gap-1">
                    <span className={`w-1 h-1 rounded-full bg-${pillar.color}-400 mt-1 shrink-0`} />
                    <span>{action}</span>
                  </div>
                ))}
                {pillar.actions.length > 2 && (
                  <p className="text-[10px] font-medium text-slate-400">
                    +{pillar.actions.length - 2} actions...
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="p-4 rounded-2xl bg-emerald-50/80 backdrop-blur-sm border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">Cycle court</span>
          </div>
          <p className="text-xs text-emerald-600">Résultats visibles en 3 mois avec des actions concrètes</p>
        </div>
        
        <div className="p-4 rounded-2xl bg-blue-50/80 backdrop-blur-sm border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-blue-600" />
            <span className="text-sm font-bold text-blue-700">Territoire ciblé</span>
          </div>
          <p className="text-xs text-blue-600">Priorité aux zones à forte accumulation de déchets</p>
        </div>
        
        <div className="p-4 rounded-2xl bg-rose-50/80 backdrop-blur-sm border border-rose-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-rose-600" />
            <span className="text-sm font-bold text-rose-700">Suivi数据</span>
          </div>
          <p className="text-xs text-rose-600">Indicateurs concrets pour mesurer l'évolution</p>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-violet-50/80 backdrop-blur-sm border border-violet-200 shadow-sm">
        <p className="text-sm font-medium text-violet-800">
          🚀 <strong>Devenir zone pilote ?</strong> Rejoignez le programme CleanMyMap pour bénéficier d'un accompagnement personnalisé et accéder aux ressources exclusives.
        </p>
      </div>
    </motion.div>
  );
}