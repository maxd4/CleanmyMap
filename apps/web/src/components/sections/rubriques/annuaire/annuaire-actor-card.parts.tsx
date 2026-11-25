import type { AssociationProfile } from "@/lib/partners/annuaire-types";
import type { ReactElement } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import {
  CONTRIBUTION_LABELS,
  formatAnnuaireCoverage,
  formatFreshness,
  getPartnerWhyThisStructureMatters,
} from "./annuaire-helpers";
import { Info, MapPin, MessageSquare, ShieldCheck, Clock, Star, Zap, Sparkles, FileText } from "lucide-react";
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
    <div className="flex flex-wrap gap-2">
      {structureBadge && (
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black tracking-widest",
          structureBadge.tone === "success" ? "border-emerald-500/20 bg-emerald-500/10 cmm-text-success" : structureBadge.tone === "info" ? "border-sky-500/20 bg-sky-500/10 cmm-text-info" : "border-amber-500/20 bg-amber-500/10 cmm-text-warning",
        )}><ShieldCheck size={10} />{structureBadge.label}</span>
      )}
      {isEditorial && <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black tracking-widest cmm-text-primary"><Info size={10} />{fr ? "RESSOURCE ÉDITORIALE" : "EDITORIAL RESOURCE"}</span>}
      {isFeatured && <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/20 px-3 py-1 text-xs font-black tracking-widest cmm-text-primary"><Star size={10} className="fill-current text-amber-400" />{fr ? "À LA UNE" : "FEATURED"}</span>}
      {isTrusted && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black tracking-widest cmm-text-success"><ShieldCheck size={10} />{fr ? "FICHE CONFIRMÉE" : "CONFIRMED PROFILE"}</span>}
      {hasRecentUpdate && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-black tracking-widest cmm-text-info"><span className="relative flex h-1.5 w-1.5"><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" /></span>{fr ? "MISE À JOUR RÉCENTE" : "RECENT UPDATE"}</span>
      )}
    </div>
  );
}

/** Résumé associatif compact sur la carte ; le détail (besoins, impact, actions) vit dans la fiche repliable. */
export function AnnuaireActorAssociationSummary({ profile }: { entry: EnrichedAnnuaireEntry; profile: AssociationProfile }): ReactElement {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-3">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold cmm-text-secondary">Mission associative</p>
        <p className="line-clamp-2 text-sm font-semibold leading-snug cmm-text-primary">{profile.mission}</p>
      </div>
      <span className="shrink-0 rounded-xl border border-violet-500/15 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold cmm-text-primary">
        {profile.structureStatus === "active_validated" ? "Active / validée" : profile.structureStatus === "validated" ? "Validée" : profile.structureStatus === "active" ? "Active" : "À confirmer"}
      </span>
    </div>
  );
}

export function AnnuaireActorMetrics(props: { entry: EnrichedAnnuaireEntry; fr: boolean; isEditorial: boolean; isPublishedPartner: boolean }): ReactElement {
  const { entry, fr, isEditorial, isPublishedPartner } = props;
  const availability = "availability" in entry ? entry.availability : "";
  const label = isEditorial ? (fr ? "Zones associées" : "Associated areas") : (fr ? "Périmètre déclaré" : "Declared scope");
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-[var(--cmm-surface-border)] pt-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2"><MapPin size={12} className="cmm-text-secondary" /><span className="font-semibold cmm-text-secondary">{label}</span></div>
        <span className="text-right font-bold uppercase cmm-text-primary">{formatAnnuaireCoverage(entry)}</span>
      </div>
      {isPublishedPartner && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2"><Clock size={12} className="cmm-text-secondary" /><span className="font-semibold cmm-text-secondary">{fr ? "Disponibilité déclarée" : "Declared availability"}</span></div>
          <span className="text-right font-bold uppercase cmm-text-primary">{availability}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2"><Zap size={12} className="cmm-text-secondary" /><span className="font-semibold cmm-text-secondary">{isEditorial ? (fr ? "Contributions repérées" : "Observed contributions") : (fr ? "Contributions déclarées" : "Declared contributions")}</span></div>
        <span className="line-clamp-1 max-w-[140px] text-right font-bold uppercase cmm-text-primary">{entry.contributionTypes.map((item) => CONTRIBUTION_LABELS[item]).join(", ")}</span>
      </div>
    </div>
  );
}

export function AnnuaireActorTrustInsight({ entry, fr, isEditorial, isIncomplete, isTrusted }: { entry: EnrichedAnnuaireEntry; fr: boolean; isEditorial: boolean; isIncomplete: boolean; isTrusted: boolean }): ReactElement {
  if (isTrusted) {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-500/10 p-1.5 cmm-text-primary"><Sparkles size={14} /></div>
          <p className="line-clamp-2 text-xs font-semibold leading-snug cmm-text-primary">{getPartnerWhyThisStructureMatters(entry)}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("rounded-2xl border border-dashed p-3", isEditorial ? "border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] cmm-text-primary" : isIncomplete ? "border-rose-500/30 bg-rose-500/5 cmm-text-danger" : "border-amber-500/30 bg-amber-500/5 cmm-text-warning")}>
      <div className="flex items-center gap-2">
        <Info size={14} />
        <p className="text-xs font-semibold">{isEditorial ? (fr ? "Ressource éditoriale" : "Editorial resource") : isIncomplete ? (fr ? "Données partielles" : "Partial Data") : fr ? "Vérification en cours" : "Validation Pending"}</p>
      </div>
    </div>
  );
}

export function AnnuaireActorActions(props: {
  entry: EnrichedAnnuaireEntry;
  fr: boolean;
  hasPreciseCoordinates: boolean;
  publicDestination: { url: string; label: string } | null;
  isEditorial: boolean;
  onFocusMap: (entryId: string) => void;
  onOpenProfile?: (entryId: string) => void;
}): ReactElement {
  const { entry, fr, hasPreciseCoordinates, publicDestination, isEditorial, onFocusMap, onOpenProfile } = props;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--cmm-surface-border)] pt-3">
      {onOpenProfile ? (
        <CmmButton
          type="button"
          tone="secondary"
          variant="default"
          className="min-w-0 flex-1"
          ariaLabel={fr ? `Consulter la fiche de ${entry.name}` : `View profile for ${entry.name}`}
          onClick={() => onOpenProfile(entry.id)}
        >
          <FileText size={14} className="mr-2" />
          {fr ? "Consulter la fiche" : "View profile"}
        </CmmButton>
      ) : null}
      <CmmButton
        type="button"
        tone="secondary"
        variant="default"
        disabled={!hasPreciseCoordinates}
        className="min-w-0 flex-1"
        ariaLabel={hasPreciseCoordinates ? (fr ? `Localiser ${entry.name}` : `Locate ${entry.name}`) : (fr ? `Position indisponible pour ${entry.name}` : `Location unavailable for ${entry.name}`)}
        onClick={() => onFocusMap(entry.id)}
      >
        <MapPin size={14} className="mr-2 text-violet-400" />
        {hasPreciseCoordinates ? (fr ? "Localiser" : "Locate") : (fr ? "Position indisponible" : "Location unavailable")}
      </CmmButton>
      {publicDestination ? (
        <CmmButton tone="primary" variant="default" className="group/btn min-w-0 flex-1" asChild>
          <a href={publicDestination.url} target="_blank" rel="noopener noreferrer" aria-label={`${publicDestination.label} — ${entry.name}`}>
            <MessageSquare size={14} className="mr-2" />
            {isEditorial ? (fr ? "Consulter" : "View resource") : fr ? "Contacter" : "Contact"}
          </a>
        </CmmButton>
      ) : (
        <div className="flex h-10 flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--cmm-surface-border)] px-3 text-xs font-medium cmm-text-secondary">
          {fr ? "Indisponible" : "N/A"}
        </div>
      )}
    </div>
  );
}

export function AnnuaireActorFooter({ entry, isPublishedPartner }: { entry: EnrichedAnnuaireEntry; isPublishedPartner: boolean }): ReactElement {
  const lastUpdatedAt = "lastUpdatedAt" in entry ? entry.lastUpdatedAt : null;
  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest cmm-text-secondary">ID: {entry.id.split("-")[0]}</span>
      {isPublishedPartner && lastUpdatedAt && (
        <div className="flex items-center gap-2"><Clock size={10} className="cmm-text-secondary" /><span className="text-xs font-semibold uppercase tracking-widest cmm-text-secondary">{formatFreshness(lastUpdatedAt)}</span></div>
      )}
    </div>
  );
}
