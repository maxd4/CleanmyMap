import React from "react";
import { Leaf, Heart, Users, Trash2, Wind, Info, Sparkles } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnnuaireThematicExplorationProps {
  fr: boolean;
  onSelectTag: (tag: string) => void;
  activeTag: string | null;
}

export function AnnuaireThematicExploration({
  fr,
  onSelectTag,
  activeTag,
}: AnnuaireThematicExplorationProps) {
  const themes = [
    { 
      id: "environnement", 
      label: fr ? "Environnement" : "Environment", 
      icon: Leaf, 
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      desc: fr ? "Protection de la biodiversité et des écosystèmes." : "Protection of biodiversity and ecosystems."
    }, 
    { 
      id: "social", 
      label: fr ? "Social" : "Social", 
      icon: Users, 
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      desc: fr ? "Inclusion, partage et lien social local." : "Inclusion, sharing and local social links."
    },
    { 
      id: "humanitaire", 
      label: fr ? "Humanitaire" : "Humanitarian", 
      icon: Heart, 
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      desc: fr ? "Aide d'urgence et soutien aux plus fragiles." : "Emergency aid and support for the most fragile."
    },
    { 
      id: "propreté", 
      label: fr ? "Propreté" : "Cleaning", 
      icon: Trash2, 
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      desc: fr ? "Gestion des déchets et propreté de l'espace public." : "Waste management and public space cleanliness."
    },
    { 
      id: "climat", 
      label: fr ? "Climat" : "Climate", 
      icon: Wind, 
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      desc: fr ? "Actions directes contre le réchauffement climatique." : "Direct actions against global warming."
    },
    { 
      id: "sensibilisation", 
      label: fr ? "Sensibilisation" : "Awareness", 
      icon: Info, 
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      desc: fr ? "Éducation et formation aux enjeux citoyens." : "Education and training on civic issues."
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {themes.map((theme, i) => {
        const Icon = theme.icon;
        const isActive = activeTag === theme.id;
        
        return (
          <CmmButton
            key={theme.id}
            onClick={() => onSelectTag(theme.id)}
            tone={isActive ? "primary" : "tertiary"}
            variant="pill"
            className={cn(
              "text-left group relative p-6 rounded-[2.5rem] border transition-all duration-500 backdrop-blur-xl overflow-hidden",
              isActive 
                ? "bg-white/10 border-white/20 shadow-2xl scale-105" 
                : "bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10"
            )}
          >
            {isActive && (
              <motion.div 
                layoutId="active-theme-glow"
                className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 -z-10"
              />
            )}
            
            <div className="space-y-6 relative z-10">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500 border",
                isActive 
                  ? "bg-white text-slate-950 border-white shadow-2xl scale-110" 
                  : cn("bg-slate-950/40 text-slate-400 group-hover:scale-110 group-hover:text-white transition-transform", theme.border)
              )}>
                <Icon size={20} />
              </div>
              <div className="space-y-2">
                <h4 className={cn(
                  "text-sm font-black uppercase tracking-[0.2em] transition-colors",
                  isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                )}>
                  {theme.label}
                </h4>
                <p className={cn(
                  "text-[10px] font-bold leading-relaxed transition-opacity line-clamp-2",
                  isActive ? "text-white/80" : "text-slate-600 opacity-0 group-hover:opacity-100"
                )}>
                  {theme.desc}
                </p>
              </div>
            </div>
            
            <div className={cn(
               "absolute -right-8 -bottom-8 opacity-5 transition-all duration-700 group-hover:scale-125 group-hover:opacity-10",
               theme.color
            )}>
               <Icon size={120} />
            </div>
          </CmmButton>
        );
      })}
    </div>
  );
}
