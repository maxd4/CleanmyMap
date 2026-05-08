import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import {
  CONTRIBUTION_LABELS,
  ENTITY_LABELS,
  getEntryTrustState,
  getPartnerWhyThisStructureMatters,
  formatCoverage,
  formatFreshness,
  hasRecentPartnerUpdate,
} from "./annuaire-helpers";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { Info, MapPin, MessageSquare, ShieldCheck, Clock, Star, Target, Zap, Building2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type AnnuaireActorCardProps = {
  entry: EnrichedAnnuaireEntry;
  onFocusMap: (entryId: string) => void;
  showInternalContact: boolean;
};

export function AnnuaireActorCard({
  entry,
  onFocusMap,
  showInternalContact,
}: AnnuaireActorCardProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const trustState = getEntryTrustState(entry);
  const isTrusted = trustState === "trusted";
  const isIncomplete = trustState === "incomplete";

  const isFeatured = entry.isFeatured;

  return (
    <CmmCard
      variant="elevated"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[2.5rem] border transition-all duration-500 backdrop-blur-3xl p-8",
        isFeatured
          ? "bg-violet-900/40 border-violet-500/40 shadow-[0_0_50px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/50"
          : "bg-slate-900/40 border-white/10 hover:bg-white/[0.05] hover:border-white/20 shadow-2xl"
      )}
    >
      {/* Dynamic Status Badges */}
      <div className="absolute top-6 right-6 flex flex-wrap justify-end gap-2 z-10">
        {isFeatured && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 px-3 py-1 text-[9px] font-black tracking-widest text-violet-300 shadow-2xl">
            <Star size={10} className="fill-current text-amber-400 animate-pulse" />
            {fr ? "À LA UNE" : "FEATURED"}
          </span>
        )}
        {isTrusted && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[9px] font-black tracking-widest text-emerald-400 shadow-2xl">
            <ShieldCheck size={10} />
            {fr ? "CERTIFIÉ" : "CERTIFIED"}
          </span>
        )}
        {hasRecentPartnerUpdate(entry) && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-[9px] font-black tracking-widest text-sky-400 shadow-2xl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
            </span>
            {fr ? "ACTIF" : "ACTIVE"}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-6">
        {/* Header - Identification */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black tracking-widest text-slate-500 uppercase">
              {ENTITY_LABELS[entry.kind]}
            </span>
            {entry.tags?.slice(0, 3).map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-lg bg-violet-500/5 text-[9px] font-black tracking-widest text-violet-400 border border-violet-500/10">
                {tag.toUpperCase()}
              </span>
            ))}
          </div>
          <h3 className={cn(
            "font-black tracking-tight leading-tight transition-colors",
            isFeatured ? "text-2xl text-white group-hover:text-violet-300" : "text-xl text-white group-hover:text-violet-300"
          )}>
            {entry.name}
          </h3>
        </div>

        {/* Narrative description */}
        <p className="text-sm font-medium leading-relaxed text-slate-400 line-clamp-2 opacity-80">
          {entry.description}
        </p>

        {/* Key Operational Metrics */}
        <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px]">
             <div className="flex items-center gap-3">
                <MapPin size={12} className="text-slate-600" />
                <span className="font-black text-slate-500 uppercase tracking-widest">{fr ? "Périmètre" : "Scope"}</span>
             </div>
             <span className="font-bold text-white uppercase">{formatCoverage(entry.coveredArrondissements, entry.location)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
             <div className="flex items-center gap-3">
                <Clock size={12} className="text-slate-600" />
                <span className="font-black text-slate-500 uppercase tracking-widest">{fr ? "Disponibilité" : "Availability"}</span>
             </div>
             <span className="font-bold text-white uppercase">{entry.availability}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
             <div className="flex items-center gap-3">
                <Zap size={12} className="text-slate-600" />
                <span className="font-black text-slate-500 uppercase tracking-widest">{fr ? "Impact" : "Impact"}</span>
             </div>
             <span className="font-bold text-white uppercase line-clamp-1 max-w-[120px] text-right">
                {entry.contributionTypes.map((item) => CONTRIBUTION_LABELS[item]).join(", ")}
             </span>
          </div>
        </div>

        {/* Trust Insight / Context */}
        <div className="pt-2">
          {isTrusted ? (
            <div className="relative overflow-hidden rounded-[1.5rem] border border-violet-500/20 bg-violet-500/5 p-5 shadow-inner">
              <div className="flex items-start gap-4">
                 <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                    <Sparkles size={14} />
                 </div>
                 <p className="text-[11px] font-bold text-slate-300 italic leading-relaxed">
                    {getPartnerWhyThisStructureMatters(entry)}
                 </p>
              </div>
            </div>
          ) : (
            <div className={cn(
              "relative overflow-hidden rounded-[1.5rem] border border-dashed p-4",
              isIncomplete ? "border-rose-500/30 bg-rose-500/5 text-rose-300" : "border-amber-500/30 bg-amber-500/5 text-amber-300"
            )}>
              <div className="flex items-center gap-3">
                 <Info size={14} className="opacity-60" />
                 <p className="text-[10px] font-black uppercase tracking-widest">
                   {isIncomplete ? (fr ? "Données partielles" : "Partial Data") : (fr ? "Vérification en cours" : "Validation Pending")}
                 </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action System */}
      <div className="mt-8 flex items-center gap-4 pt-6 border-t border-white/5">
        <CmmButton
          variant="secondary"
          className="flex-1 h-12 rounded-xl bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all shadow-2xl"
          onClick={() => onFocusMap(entry.id)}
        >
          <MapPin size={14} className="mr-2 text-violet-400" />
          {fr ? "Localiser" : "Locate"}
        </CmmButton>
        
        {entry.primaryChannel ? (
          <CmmButton
            variant="primary"
            className="flex-1 h-12 rounded-xl bg-violet-600 border-none text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-violet-500 transition-all shadow-[0_10px_30px_rgba(139,92,246,0.2)] group/btn"
            asChild
          >
            <a href={entry.primaryChannel.url} target="_blank" rel="noopener noreferrer">
              <MessageSquare size={14} className="mr-2 group-hover/btn:scale-110 transition-transform" />
              {fr ? "Contacter" : "Contact"}
            </a>
          </CmmButton>
        ) : (
          <div className="flex-1 h-12 flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
            {fr ? "Indisponible" : "N/A"}
          </div>
        )}
      </div>

      {/* Subtle Footer Meta */}
      <div className="mt-6 flex items-center justify-between opacity-40">
         <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">ID: {entry.id.split('-')[0]}</span>
         <div className="flex items-center gap-2">
            <Clock size={10} className="text-slate-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{formatFreshness(entry.lastUpdatedAt)}</span>
         </div>
      </div>
    </CmmCard>
  );
}
