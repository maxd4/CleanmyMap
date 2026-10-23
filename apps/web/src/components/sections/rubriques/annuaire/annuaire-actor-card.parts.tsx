import type { AssociationProfile } from "@/lib/partners/annuaire-types";
import type { ReactElement } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import {
  CONTRIBUTION_LABELS,
  formatAnnuaireCoverage,
  formatFreshness,
  getAssociationImpactSummary,
  getPartnerWhyThisStructureMatters,
  hasTraceableImpactHistory,
  hasTraceablePastActions,
} from "./annuaire-helpers";
import { Info, MapPin, MessageSquare, ShieldCheck, Clock, Star, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type StructureBadge = { label: string; tone: "success" | "info" | "warning" } | null;

export function AnnuaireActorBadges(props: {
  entry: EnrichedAnnuaireEntry;
  fr: boolean;
  isFeatured: boolean;
  isEditorial: boolean;
  isTrusted: boolean;
  hasRecentUpdate: boolean;
  structureBadge: StructureBadge;
}): ReactElement {
  const { fr, isFeatured, isEditorial, isTrusted, hasRecentUpdate, structureBadge } = props;
  return (
    <div className="absolute top-6 right-6 z-10 flex flex-wrap justify-end gap-2">
      {structureBadge && (
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black tracking-widest shadow-2xl",
          structureBadge.tone === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : structureBadge.tone === "info" ? "border-sky-500/20 bg-sky-500/10 text-sky-400" : "border-amber-500/20 bg-amber-500/10 text-amber-300",
        )}><ShieldCheck size={10} />{structureBadge.label}</span>
      )}
      {isEditorial && <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black tracking-widest text-violet-300 shadow-2xl"><Info size={10} />{fr ? "RESSOURCE ÉDITORIALE" : "EDITORIAL RESOURCE"}</span>}
      {isFeatured && <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/20 px-3 py-1 text-xs font-black tracking-widest text-violet-300 shadow-2xl"><Star size={10} className="fill-current text-amber-400 animate-pulse" />{fr ? "À LA UNE" : "FEATURED"}</span>}
      {isTrusted && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black tracking-widest text-emerald-400 shadow-2xl"><ShieldCheck size={10} />{fr ? "FICHE CONFIRMÉE" : "CONFIRMED PROFILE"}</span>}
      {hasRecentUpdate && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-black tracking-widest text-sky-400 shadow-2xl"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" /></span>{fr ? "MISE À JOUR RÉCENTE" : "RECENT UPDATE"}</span>
      )}
    </div>
  );
}

export function AnnuaireActorAssociationSummary({ entry, profile }: { entry: EnrichedAnnuaireEntry; profile: AssociationProfile }): ReactElement {
  const hasImpactEvidence = hasTraceableImpactHistory(entry);
  const hasPastActionEvidence = hasTraceablePastActions(entry);
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4"><div className="space-y-1"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Mission associative</p><p className="text-sm font-semibold leading-relaxed text-white">{profile.mission}</p></div><div className="rounded-2xl border border-violet-500/15 bg-violet-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-violet-300">{profile.structureStatus === "active_validated" ? "Active / validée" : profile.structureStatus === "validated" ? "Validée" : profile.structureStatus === "active" ? "Active" : "À confirmer"}</div></div>
      <div className="flex flex-wrap gap-2">{profile.recurringNeeds.slice(0, 4).map((need) => <span key={need} className="rounded-full border border-white/8 bg-slate-950/40 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-300">{need}</span>)}</div>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/5 bg-slate-950/35 p-3"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Impact mesuré</p><p className="mt-1 text-xs font-bold text-white">{hasImpactEvidence ? getAssociationImpactSummary(entry) : "Non renseigné"}</p></div><div className="rounded-2xl border border-white/5 bg-slate-950/35 p-3"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Activité terrain</p><p className="mt-1 text-xs font-bold text-white">{hasPastActionEvidence ? `${profile.pastActions.length} action${profile.pastActions.length === 1 ? "" : "s"} documentée${profile.pastActions.length === 1 ? "" : "s"}` : "Non renseignée"}</p></div></div>
      {hasImpactEvidence && <p className="text-xs font-medium text-slate-400">Source de l’impact : {profile.impactHistory?.provenance?.source}</p>}
    </div>
  );
}

export function AnnuaireActorMetrics(props: { entry: EnrichedAnnuaireEntry; fr: boolean; isEditorial: boolean; isPublishedPartner: boolean }): ReactElement {
  const { entry, fr, isEditorial, isPublishedPartner } = props;
  const availability = "availability" in entry ? entry.availability : "";
  const label = isEditorial ? (fr ? "Zones associées" : "Associated areas") : (fr ? "Périmètre déclaré" : "Declared scope");
  return <div className="grid grid-cols-1 gap-4 border-t border-white/5 pt-4"><div className="flex items-center justify-between text-xs"><div className="flex items-center gap-3"><MapPin size={12} className="text-slate-600" /><span className="font-black uppercase tracking-widest text-slate-500">{label}</span></div><span className="font-bold uppercase text-white">{formatAnnuaireCoverage(entry)}</span></div>{isPublishedPartner && <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-3"><Clock size={12} className="text-slate-600" /><span className="font-black uppercase tracking-widest text-slate-500">{fr ? "Disponibilité déclarée" : "Declared availability"}</span></div><span className="font-bold uppercase text-white">{availability}</span></div>}<div className="flex items-center justify-between text-xs"><div className="flex items-center gap-3"><Zap size={12} className="text-slate-600" /><span className="font-black uppercase tracking-widest text-slate-500">{isEditorial ? (fr ? "Contributions repérées" : "Observed contributions") : (fr ? "Contributions déclarées" : "Declared contributions")}</span></div><span className="line-clamp-1 max-w-[120px] text-right font-bold uppercase text-white">{entry.contributionTypes.map((item) => CONTRIBUTION_LABELS[item]).join(", ")}</span></div></div>;
}

export function AnnuaireActorTrustInsight({ entry, fr, isEditorial, isIncomplete, isTrusted }: { entry: EnrichedAnnuaireEntry; fr: boolean; isEditorial: boolean; isIncomplete: boolean; isTrusted: boolean }): ReactElement {
  return <div className="pt-2">{isTrusted ? <div className="relative overflow-hidden rounded-[1.5rem] border border-violet-500/20 bg-violet-500/5 p-5 shadow-inner"><div className="flex items-start gap-4"><div className="rounded-xl bg-violet-500/10 p-2 text-violet-400"><Sparkles size={14} /></div><p className="text-xs font-bold italic leading-relaxed text-slate-300">{getPartnerWhyThisStructureMatters(entry)}</p></div></div> : <div className={cn("relative overflow-hidden rounded-[1.5rem] border border-dashed p-4", isIncomplete ? "border-rose-500/30 bg-rose-500/5 text-rose-300" : "border-amber-500/30 bg-amber-500/5 text-amber-300")}><div className="flex items-center gap-3"><Info size={14} className="opacity-60" /><p className="text-xs font-black uppercase tracking-widest">{isEditorial ? (fr ? "Ressource éditoriale" : "Editorial resource") : isIncomplete ? (fr ? "Données partielles" : "Partial Data") : fr ? "Vérification en cours" : "Validation Pending"}</p></div></div>}</div>;
}

export function AnnuaireActorActions(props: { entry: EnrichedAnnuaireEntry; fr: boolean; hasPreciseCoordinates: boolean; publicDestination: { url: string; label: string } | null; isEditorial: boolean; onFocusMap: (entryId: string) => void }): ReactElement {
  const { entry, fr, hasPreciseCoordinates, publicDestination, isEditorial, onFocusMap } = props;
  return <div className="mt-8 flex items-center gap-4 border-t border-white/5 pt-6"><CmmButton tone="secondary" variant="default" disabled={!hasPreciseCoordinates} className="h-12 flex-1 rounded-xl border-white/10 bg-white/5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl hover:bg-white/10" ariaLabel={hasPreciseCoordinates ? (fr ? `Localiser ${entry.name}` : `Locate ${entry.name}`) : (fr ? `Position indisponible pour ${entry.name}` : `Location unavailable for ${entry.name}`)} onClick={() => onFocusMap(entry.id)}><MapPin size={14} className="mr-2 text-violet-400" />{hasPreciseCoordinates ? (fr ? "Localiser" : "Locate") : (fr ? "Position indisponible" : "Location unavailable")}</CmmButton>{publicDestination ? <CmmButton tone="primary" variant="default" className="group/btn h-12 flex-1 rounded-xl border-none bg-violet-600 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(139,92,246,0.2)] hover:bg-violet-500" asChild><a href={publicDestination.url} target="_blank" rel="noopener noreferrer" aria-label={`${publicDestination.label} — ${entry.name}`}><MessageSquare size={14} className="mr-2 transition-transform group-hover/btn:scale-110" />{isEditorial ? (fr ? "Consulter" : "View resource") : fr ? "Contacter" : "Contact"}</a></CmmButton> : <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 text-xs font-black uppercase tracking-widest text-slate-600">{fr ? "Indisponible" : "N/A"}</div>}</div>;
}

export function AnnuaireActorFooter({ entry, isPublishedPartner }: { entry: EnrichedAnnuaireEntry; isPublishedPartner: boolean }): ReactElement {
  const lastUpdatedAt = "lastUpdatedAt" in entry ? entry.lastUpdatedAt : null;
  return <div className="mt-6 flex items-center justify-between opacity-40"><span className="text-xs font-black uppercase tracking-widest text-slate-500">ID: {entry.id.split("-")[0]}</span>{isPublishedPartner && lastUpdatedAt && <div className="flex items-center gap-2"><Clock size={10} className="text-slate-500" /><span className="text-xs font-black uppercase tracking-widest text-slate-500">{formatFreshness(lastUpdatedAt)}</span></div>}</div>;
}
