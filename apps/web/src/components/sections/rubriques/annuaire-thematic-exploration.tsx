import React from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { Leaf, Heart, Users, Trash2, Wind, Info } from "lucide-react";
import { cn } from "@/lib/utils";

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
      color: "emerald",
      desc: fr ? "Protection de la biodiversité et des écosystèmes." : "Protection of biodiversity and ecosystems."
    },
    { 
      id: "social", 
      label: fr ? "Social" : "Social", 
      icon: Users, 
      color: "blue",
      desc: fr ? "Inclusion, partage et lien social local." : "Inclusion, sharing and local social links."
    },
    { 
      id: "humanitaire", 
      label: fr ? "Humanitaire" : "Humanitarian", 
      icon: Heart, 
      color: "rose",
      desc: fr ? "Aide d'urgence et soutien aux plus fragiles." : "Emergency aid and support for the most fragile."
    },
    { 
      id: "propreté", 
      label: fr ? "Propreté Urbaine" : "Urban Cleaning", 
      icon: Trash2, 
      color: "amber",
      desc: fr ? "Gestion des déchets et propreté de l'espace public." : "Waste management and public space cleanliness."
    },
    { 
      id: "climat", 
      label: fr ? "Climat" : "Climate", 
      icon: Wind, 
      color: "sky",
      desc: fr ? "Actions directes contre le réchauffement climatique." : "Direct actions against global warming."
    },
    { 
      id: "sensibilisation", 
      label: fr ? "Sensibilisation" : "Awareness", 
      icon: Info, 
      color: "indigo",
      desc: fr ? "Éducation et formation aux enjeux citoyens." : "Education and training on civic issues."
    },
  ];

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2">
          <span className="h-px w-8 bg-violet-300" />
          <span className="text-[10px] font-black tracking-[0.3em] text-violet-600 uppercase">
            {fr ? "Exploration Thématique" : "Thematic Exploration"}
          </span>
          <span className="h-px w-8 bg-violet-300" />
        </div>
        <h2 className="cmm-text-h2 cmm-text-primary tracking-tight">
          {fr ? "Trouvez l'acteur qu'il vous faut" : "Find the actor you need"}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isActive = activeTag === theme.id;
          const tone = (theme.color === "blue" ? "sky" : theme.color) as any;
          
          return (
            <button
              key={theme.id}
              onClick={() => onSelectTag(theme.id)}
              className={cn(
                "text-left group transition-all duration-500 rounded-[2rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
                isActive ? "scale-105" : "hover:scale-102"
              )}
            >
              <CmmCard 
                tone={tone} 
                variant={isActive ? "elevated" : "subtle"}
                className={cn(
                  "p-8 h-full rounded-[2rem] transition-all duration-500 border-none",
                  isActive 
                    ? "bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-2 ring-violet-500" 
                    : "bg-white/50 backdrop-blur-sm border border-slate-100 hover:bg-white hover:shadow-xl"
                )}
              >
                <div className="flex flex-col gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                    isActive 
                      ? `bg-${tone}-500 text-white shadow-lg shadow-${tone}-200` 
                      : "bg-slate-100 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-600"
                  )}>
                    <Icon size={28} />
                  </div>
                  <div className="space-y-2">
                    <h4 className={cn(
                      "text-xl font-black tracking-tight transition-colors",
                      isActive ? "text-slate-900" : "text-slate-600 group-hover:text-violet-700"
                    )}>
                      {theme.label}
                    </h4>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed line-clamp-2">
                      {theme.desc}
                    </p>
                  </div>
                </div>
              </CmmCard>
            </button>
          );
        })}
      </div>
    </div>
  );
}
