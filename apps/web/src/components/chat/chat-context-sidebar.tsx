"use client";

import { memo } from "react";
import { 
  CheckCircle2, 
  Sparkles, 
  Users, 
  ArrowRight, 
  Info, 
  Zap,
  Pin,
  BarChart,
  Download,
  UserPlus
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

type ChatContextSidebarProps = {
  tone?: "light" | "dark";
};

export const ChatContextSidebar = memo(function ChatContextSidebar({
  tone = "dark",
}: ChatContextSidebarProps) {
  const isLight = tone === "light";

  return (
    <aside className={`w-80 flex-shrink-0 flex flex-col p-4 space-y-4 overflow-y-auto border-l custom-scrollbar ${isLight ? "border-rose-100/80 bg-rose-50/30" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"}`}>
      
      {/* BONNES PRATIQUES */}
      <div className={`p-4 rounded-3xl border ${isLight ? "bg-white border-rose-100 shadow-sm" : "bg-slate-800/50 border-slate-700"}`}>
        <div className="flex gap-3 mb-4">
          <div className={`p-2 rounded-xl h-fit ${isLight ? "bg-rose-50 text-rose-500" : "bg-indigo-500/20 text-indigo-400"}`}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h3 className={`text-sm font-black ${isLight ? "text-slate-800" : "text-slate-200"}`}>Bonnes pratiques</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>Pour des échanges utiles et respectueux</p>
          </div>
        </div>
        <ul className="space-y-2 mb-4">
          {[
            "Restez bienveillant·e et courtois·e",
            "Partagez des infos fiables et utiles",
            "Évitez le spam et les hors-sujets"
          ].map((rule, i) => (
            <li key={i} className="flex gap-2 items-start text-xs">
              <CheckCircle2 size={14} className={isLight ? "text-emerald-500 mt-0.5 shrink-0" : "text-emerald-400 mt-0.5 shrink-0"} />
              <span className={isLight ? "text-slate-600" : "text-slate-300"}>{rule}</span>
            </li>
          ))}
        </ul>
        <button className={`text-xs font-bold hover:underline ${isLight ? "text-rose-600" : "text-indigo-400"}`}>
          Voir toutes les règles →
        </button>
      </div>

      {/* MODELES RAPIDES */}
      <div className={`p-4 rounded-3xl border ${isLight ? "bg-white border-rose-100 shadow-sm" : "bg-slate-800/50 border-slate-700"}`}>
        <div className="flex gap-3 mb-4">
          <div className={`p-2 rounded-xl h-fit ${isLight ? "bg-rose-50 text-rose-500" : "bg-indigo-500/20 text-indigo-400"}`}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className={`text-sm font-black ${isLight ? "text-slate-800" : "text-slate-200"}`}>Modèles rapides</h3>
            <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>Gagnez du temps avec nos modèles</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: "Recherche de bénévoles", icon: Users },
            { label: "Demande de relai", icon: Zap },
            { label: "Annonce locale", icon: Pin },
          ].map((template, i) => (
            <button key={i} className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-colors ${isLight ? "border-rose-100 bg-rose-50/50 text-rose-700 hover:bg-rose-50" : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"}`}>
              <div className="flex items-center gap-2">
                <template.icon size={14} />
                <span className="text-xs font-bold">{template.label}</span>
              </div>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
        <button className={`text-xs font-bold mt-4 hover:underline ${isLight ? "text-rose-600" : "text-indigo-400"}`}>
          Voir tous les modèles →
        </button>
      </div>

      {/* INFOS DU CANAL */}
      <div className={`p-4 rounded-3xl border ${isLight ? "bg-white border-rose-100 shadow-sm" : "bg-slate-800/50 border-slate-700"}`}>
        <div className="flex gap-3 mb-4">
          <div className={`p-2 rounded-xl h-fit ${isLight ? "bg-slate-50 text-slate-500" : "bg-slate-700 text-slate-300"}`}>
            <Info size={18} />
          </div>
          <div>
            <h3 className={`text-sm font-black ${isLight ? "text-slate-800" : "text-slate-200"}`}>Infos du canal</h3>
          </div>
        </div>
        <div className="space-y-2 mb-4 text-xs font-medium">
          <div className="flex justify-between">
            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Membres</span>
            <span className={isLight ? "text-slate-800 font-bold" : "text-slate-200 font-bold"}>1 246</span>
          </div>
          <div className="flex justify-between">
            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Messages aujourd&apos;hui</span>
            <span className={isLight ? "text-slate-800 font-bold" : "text-slate-200 font-bold"}>86</span>
          </div>
          <div className="flex justify-between">
            <span className={isLight ? "text-slate-500" : "text-slate-400"}>Dernier message</span>
            <span className={isLight ? "text-slate-800 font-bold" : "text-slate-200 font-bold"}>il y a 2 min</span>
          </div>
        </div>
        <CmmButton 
          variant="pill" 
          tone={isLight ? "secondary" : "tertiary"} 
          className={`w-full py-2 flex items-center justify-center gap-2 ${isLight ? "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100" : ""}`}
        >
          <UserPlus size={14} /> Inviter des membres
        </CmmButton>
      </div>

      {/* ACTIONS UTILES */}
      <div className={`p-4 rounded-3xl border ${isLight ? "bg-white border-rose-100 shadow-sm" : "bg-slate-800/50 border-slate-700"}`}>
        <div className="flex gap-3 mb-4">
          <div className={`p-2 rounded-xl h-fit ${isLight ? "bg-rose-50 text-rose-500" : "bg-indigo-500/20 text-indigo-400"}`}>
            <Zap size={18} />
          </div>
          <div>
            <h3 className={`text-sm font-black ${isLight ? "text-slate-800" : "text-slate-200"}`}>Actions utiles</h3>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { label: "Épingler un message", icon: Pin },
            { label: "Créer un sondage", icon: BarChart },
            { label: "Exporter les infos du canal", icon: Download },
          ].map((action, i) => (
            <button key={i} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-xs font-bold ${isLight ? "text-rose-700 hover:bg-rose-50" : "text-slate-300 hover:bg-slate-800"}`}>
              <action.icon size={16} className={isLight ? "text-rose-400" : "text-indigo-400"} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

    </aside>
  );
});
