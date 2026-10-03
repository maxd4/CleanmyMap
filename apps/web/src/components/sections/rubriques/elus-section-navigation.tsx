import { BarChart3, Clock, Download, FileText, MapPin } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";

export type ElusSectionTab = "overview" | "zones" | "methods";

type ElusSectionNavigationProps = {
  fr: boolean;
  activeTab: ElusSectionTab;
  onTabChange: (tab: ElusSectionTab) => void;
};

export function ElusSectionNavigation({ fr, activeTab, onTabChange }: ElusSectionNavigationProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-4">
      <div className="flex items-center gap-2 p-2 rounded-[2.5rem] bg-slate-950/40 border border-white/5 backdrop-blur-3xl shadow-2xl">
        {[
          { id: "overview" as const, label: fr ? "Vue d'ensemble" : "Overview", icon: BarChart3 },
          { id: "zones" as const, label: fr ? "Priorités Zones" : "Zone Priorities", icon: MapPin },
          { id: "methods" as const, label: fr ? "Référentiel" : "Reference", icon: FileText },
        ].map((tab) => (
          <CmmButton
            key={tab.id}
            type="button"
            tone={activeTab === tab.id ? "primary" : "tertiary"}
            variant="pill"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
              activeTab === tab.id ? "shadow-[0_0_40px_rgba(255,255,255,0.2)]" : "",
            )}
          >
            <tab.icon size={14} className={cn(activeTab === tab.id ? "animate-pulse" : "")} />
            {tab.label}
          </CmmButton>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest italic">
          <Clock size={14} />
          {fr ? "Dernière MAJ: il y a 12 min" : "Last Update: 12 min ago"}
        </div>
        <CmmButton type="button" tone="secondary" variant="pill" className="flex items-center gap-3 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all">
          <Download size={14} />
          {fr ? "Rapport PDF" : "PDF Report"}
        </CmmButton>
      </div>
    </div>
  );
}
