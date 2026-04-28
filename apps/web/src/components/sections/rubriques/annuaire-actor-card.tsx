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
import { Info, MapPin, MessageSquare, ShieldCheck, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

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
      tone={isFeatured ? "violet" : isTrusted ? "violet" : isIncomplete ? "rose" : "amber"}
      variant={isFeatured ? "elevated" : "default"}
      className={cn(
        "group relative flex flex-col transition-all duration-500",
        isFeatured
          ? "ring-2 ring-violet-200 shadow-xl scale-[1.02]"
          : "hover:shadow-xl hover:-translate-y-1 hover:border-violet-200"
      )}
    >
      {/* Dynamic Accent Bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 transition-opacity",
        isFeatured ? "bg-violet-600 opacity-100" : "bg-violet-400 opacity-0 group-hover:opacity-100"
      )} />

      {/* Badges Flottants */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
        {isFeatured && (
          <div className="relative">
            <div className="absolute inset-0 bg-violet-400 blur-sm opacity-40 rounded-full" />
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black tracking-widest text-white shadow-lg">
              <Star size={10} className="fill-current" />
              {fr ? "À LA UNE" : "FEATURED"}
            </span>
          </div>
        )}
        {!isFeatured && isTrusted && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 border border-violet-200 shadow-sm">
            <ShieldCheck size={12} className="text-violet-500" />
            {fr ? "VÉRIFIÉ" : "VERIFIED"}
          </span>
        )}
        {hasRecentPartnerUpdate(entry) && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 border border-indigo-200 shadow-sm">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </div>
            {fr ? "ACTIF" : "ACTIVE"}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-4">
        {/* En-tête */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-black tracking-widest text-slate-400 uppercase border border-slate-700/50">
              {ENTITY_LABELS[entry.kind]}
            </span>
            {entry.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="cmm-text-caption font-bold px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                {tag}
              </span>
            ))}
          </div>
          <h3 className={cn(
            "font-bold cmm-text-primary group-hover:text-violet-700 transition-colors leading-tight",
            isFeatured ? "cmm-text-h4" : "cmm-text-body text-lg"
          )}>
            {entry.name}
          </h3>
        </div>

        {/* Description courte et scannable */}
        <p className={cn(
          "cmm-text-caption cmm-text-secondary leading-relaxed",
          isFeatured ? "line-clamp-3" : "line-clamp-2"
        )}>
          {entry.description}
        </p>

        {/* Localisation simple */}
        <div className="flex items-center gap-2 cmm-text-caption cmm-text-muted pt-1">
          <div className="p-1 rounded-md bg-slate-50 border border-slate-100">
            <MapPin size={12} className="text-violet-400" />
          </div>
          <span className="font-medium">{entry.location}</span>
          {entry.distanceKm !== null && (
            <div className="ml-auto flex items-center gap-1 font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100/50">
              {entry.distanceKm.toFixed(1)} km
            </div>
          )}
        </div>

        {/* Grille d'infos compacte */}
        <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-800/60">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-slate-800 p-1.5 text-slate-400 border border-slate-700 group-hover:bg-emerald-900/40 group-hover:text-emerald-400 transition-colors">
              <MapPin size={14} />
            </div>
            <div className="space-y-0.5">
              <span className="block font-black cmm-text-secondary uppercase tracking-widest text-[9px] opacity-60">
                {fr ? "Zone de couverture" : "Coverage zone"}
              </span>
              <span className="cmm-text-caption font-bold cmm-text-primary leading-tight block">
                {formatCoverage(entry.coveredArrondissements, entry.location)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-slate-800 p-1.5 text-slate-400 border border-slate-700 group-hover:bg-emerald-900/40 group-hover:text-emerald-400 transition-colors">
              <Clock size={14} />
            </div>
            <div className="space-y-0.5">
              <span className="block font-black cmm-text-secondary uppercase tracking-widest text-[9px] opacity-60">
                {fr ? "Disponibilité" : "Availability"}
              </span>
              <span className="cmm-text-caption font-bold cmm-text-primary leading-tight block">
                {entry.availability}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-slate-800 p-1.5 text-slate-400 border border-slate-700 group-hover:bg-emerald-900/40 group-hover:text-emerald-400 transition-colors">
              <Info size={14} />
            </div>
            <div className="space-y-0.5">
              <span className="block font-black cmm-text-secondary uppercase tracking-widest text-[9px] opacity-60">
                {fr ? "Contribution" : "Contribution"}
              </span>
              <span className="cmm-text-caption font-bold cmm-text-primary leading-tight block">
                {entry.contributionTypes.map((item) => CONTRIBUTION_LABELS[item]).join(", ")}
              </span>
            </div>
          </div>
        </div>

        {/* Trust/Status Section */}
        <div className="pt-2">
          {isTrusted ? (
            <div className="relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-3 shadow-sm">
              <div className="absolute top-0 left-0 w-1 h-full bg-violet-400" />
              <div className="flex items-start justify-between">
                <p className="cmm-text-caption text-violet-900 italic leading-relaxed">
                  <span className="font-black not-italic text-violet-700 mr-1.5 uppercase text-[9px] tracking-wider">
                    💡 {fr ? "Pourquoi ce partenaire ?" : "Why this partner?"}
                  </span>
                  {getPartnerWhyThisStructureMatters(entry)}
                </p>
                <div className="group/tooltip relative ml-2">
                  <Info size={14} className="text-violet-400 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-slate-900 p-4 text-xs text-white shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 border border-white/10 backdrop-blur-md">
                    <p className="font-black text-violet-400 mb-2 uppercase tracking-widest text-[9px]">Méthodologie de Confiance</p>
                    <p className="font-bold mb-2">Score : {isTrusted ? "90-100%" : "60-80%"}</p>
                    <p className="opacity-90 leading-relaxed">
                      L'indice de confiance est calculé par pondération :
                      <br />• 40% Complétude (Photos, Contacts)
                      <br />• 30% Fraîcheur (MAJ &lt; 3 mois)
                      <br />• 30% Engagement (Activité réelle terrain)
                    </p>
                    <div className="absolute -bottom-1 right-2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-white/10" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "relative overflow-hidden rounded-xl border border-dashed p-3 shadow-sm",
              isIncomplete ? "border-rose-200 bg-rose-50/50 text-rose-900" : "border-amber-200 bg-amber-50/50 text-amber-900"
            )}>
              <div className="flex items-start justify-between">
                <p className="cmm-text-caption italic leading-relaxed">
                  <span className={cn(
                    "font-black not-italic mr-1.5 uppercase text-[9px] tracking-wider",
                    isIncomplete ? "text-rose-700" : "text-amber-700"
                  )}>
                    ⚠️ {fr ? "Status restreint" : "Restricted status"}
                  </span>
                  {isIncomplete
                    ? (fr ? "Données insuffisantes pour garantir la qualité habituelle." : "Insufficient data to guarantee usual quality.")
                    : (fr ? "Validation humaine en cours. Prudence recommandée." : "Human validation in progress. Caution recommended.")}
                </p>
                <div className="group/tooltip relative ml-2">
                  <Info size={14} className={cn("cursor-help", isIncomplete ? "text-rose-400" : "text-amber-400")} />
                  <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-slate-900 p-3 text-xs text-white shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20">
                    <p className="font-bold mb-1">Score de confiance : {isIncomplete ? "Faible" : "Moyen"}</p>
                    <p className="opacity-80">Calculé via algorithme de scoring tenant compte de : la fraîcheur des données (dernière MAJ), la complétude du profil, et la disponibilité de contacts directs vérifiés.</p>
                    <div className="absolute -bottom-1 right-2 w-2 h-2 bg-slate-900 rotate-45" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {showInternalContact && entry.internalAdminContact && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 cmm-text-caption text-amber-900 shadow-inner">
              <p className="font-black uppercase tracking-widest text-[9px] mb-2 text-amber-700 opacity-80">{fr ? "Accès Interne" : "Internal Access"}</p>
              <div className="grid grid-cols-1 gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-800">{fr ? "Référent :" : "Referent:"}</span>
                  <span className="font-medium">{entry.internalAdminContact.referentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-800">Email :</span>
                  <span className="font-medium underline decoration-amber-300">{entry.internalAdminContact.email}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-5 border-t border-slate-800/60">
        <CmmButton
          variant="default"
          size="sm"
          className="flex-1 rounded-xl font-bold border-slate-800 bg-slate-900 hover:border-emerald-500/50 hover:bg-slate-800 transition-all"
          onClick={() => onFocusMap(entry.id)}
        >
          <MapPin size={14} className="mr-2 text-emerald-500" />
          {fr ? "Voir Carte" : "Map"}
        </CmmButton>
        {entry.primaryChannel ? (
          <CmmButton
            variant="default"
            tone="primary"
            size="sm"
            className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white border-none shadow-lg shadow-violet-100 hover:shadow-violet-200 transition-all group/btn"
            asChild
          >
            <a href={entry.primaryChannel.url} target="_blank" rel="noopener noreferrer">
              <MessageSquare size={14} className="mr-2 group-hover/btn:scale-110 transition-transform" />
              {fr ? "Contacter" : "Contact"}
            </a>
          </CmmButton>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-3 py-2 cmm-text-caption font-bold text-slate-500">
            {fr ? "Canal à confirmer" : "Channel to confirm"}
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <span>MAJ: {entry.lastUpdatedAt}</span>
        <span className="flex items-center gap-1 italic opacity-70">
          <Clock size={10} />
          {formatFreshness(entry.lastUpdatedAt)}
        </span>
      </div>
    </CmmCard>
  );
}
