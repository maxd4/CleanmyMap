"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, MapPin, Users, ClipboardList, Truck, 
  Megaphone, CheckCircle, ChevronRight, Leaf 
} from "lucide-react";

const STEPS = [
  {
    id: 1,
    icon: Calendar,
    title: "Choisir la date",
    desc: "Privilégier un week-end, éviter les jours feriés. Prévoir 2-3 semaines de communication.",
    tips: ["Vérifier la météo", "Choisir un créneau de 2-3h", "统筹 le marée basse si bord de mer"],
  },
  {
    id: 2,
    icon: MapPin,
    title: "Sélectionner le lieu",
    desc: "Identifier les zones à forte accumulation de déchets. Consulter la carte CleanMyMap.",
    tips: ["Zones industrielles", "Parcs et plages", "Berges de rivière", "Parkings"],
  },
  {
    id: 3,
    icon: Users,
    title: "Mobiliser l'équipe",
    desc: "Constituer un noyau de bénévoles motivés. Solliciter partenaires locaux (associations, entreprises).",
    tips: ["4-10 personnes idéal", "Prévoir un coordinateur", "Créer un groupe WhatsApp"],
  },
  {
    id: 4,
    icon: ClipboardList,
    title: "Préparer le matériel",
    desc: "Gants, sacs poubelle, pinces, gilets, trousse de premiers secours.",
    tips: ["Prévoir 2 sacs par personne", "Pinces anti-coupure", "Eau et en-cas", "Poubelles规格 adapté"],
  },
  {
    id: 5,
    icon: Megaphone,
    title: "Communiquer",
    desc: "Diffuser l'événement sur les réseaux sociaux, flyers, bouche-à-oreille.",
    tips: ["Créer un Événement Facebook", "Partager sur CleanMyMap", "Contacter les médias locaux"],
  },
  {
    id: 6,
    icon: Truck,
    title: "Organiser le transport",
    desc: "Prévoir le rapatriement des sacs vers un point de collecte ou déchetterie.",
    tips: ["Contacter la mairie pour benne", "Vérifier horaires déchetterie", "Prévoir tri sélectif"],
  },
];

export function CleanupGuideCard() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-pink-200 bg-white p-6 shadow-lg shadow-pink-100"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center">
          <Leaf size={24} className="text-pink-600" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight cmm-text-primary">
            Organiser un cleanup
          </h3>
          <p className="text-sm text-slate-500">
            Guide étape par étape pour réussir votre action terrain
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const isExpanded = expandedStep === step.id;
          const Icon = step.icon;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-slate-100 bg-white/50 backdrop-blur-sm overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">
                    Étape {step.id}
                  </p>
                  <p className="font-bold cmm-text-primary truncate">{step.title}</p>
                </div>
                <ChevronRight 
                  size={18} 
                  className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100">
                      <p className="text-sm cmm-text-secondary pt-3">{step.desc}</p>
                      <div className="space-y-1">
                        {step.tips.map((tip, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <CheckCircle size={12} className="text-pink-500 shrink-0" />
                            <span className="text-slate-600">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-pink-50 border border-pink-200">
        <p className="text-sm font-medium text-pink-800">
          💡 <strong>Conseil</strong> : Documentez votre action sur CleanMyMap pour calculer l&apos;impact et obtenir votre certificat !
        </p>
      </div>
    </motion.div>
  );
}
