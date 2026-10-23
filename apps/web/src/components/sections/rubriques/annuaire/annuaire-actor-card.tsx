"use client";

import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import {
  ENTITY_LABELS,
  getAnnuairePublicDestination,
  getAssociationProfile,
  getAssociationStructureBadge,
  getEntryTrustState,
  hasPreciseAnnuaireCoordinates,
  hasRecentPartnerUpdate,
  isPublishedPartnerAnnuaireEntry,
} from "./annuaire-helpers";
import {
  AnnuaireActorActions,
  AnnuaireActorAssociationSummary,
  AnnuaireActorBadges,
  AnnuaireActorFooter,
  AnnuaireActorMetrics,
  AnnuaireActorTrustInsight,
} from "./annuaire-actor-card.parts";

type AnnuaireActorCardProps = {
  entry: EnrichedAnnuaireEntry;
  onFocusMap: (entryId: string) => void;
};

export function AnnuaireActorCard({ entry, onFocusMap }: AnnuaireActorCardProps): ReactElement {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const trustState = getEntryTrustState(entry);
  const isTrusted = trustState === "trusted";
  const isIncomplete = trustState === "incomplete";
  const isEditorial = trustState === "editorial";
  const isPublishedPartner = isPublishedPartnerAnnuaireEntry(entry);
  const associationProfile = getAssociationProfile(entry);
  const structureBadge = getAssociationStructureBadge(entry);
  const publicDestination = getAnnuairePublicDestination(entry);
  const hasPreciseCoordinates = hasPreciseAnnuaireCoordinates(entry);
  const hasRecentUpdate = "lastUpdatedAt" in entry && hasRecentPartnerUpdate(entry);
  const isFeatured = entry.isFeatured;

  return (
    <CmmCard
      variant="elevated"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[2.5rem] border p-8 transition-[background-color,border-color,box-shadow] duration-500 backdrop-blur-3xl",
        isFeatured
          ? "border-violet-500/40 bg-violet-900/40 shadow-[0_0_50px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/50"
          : "border-white/10 bg-slate-900/40 shadow-2xl hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      <AnnuaireActorBadges entry={entry} fr={fr} isFeatured={Boolean(isFeatured)} isEditorial={isEditorial} isTrusted={isTrusted} hasRecentUpdate={hasRecentUpdate} structureBadge={structureBadge} />
      <div className="flex-1 space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-xs font-black uppercase tracking-widest text-slate-500">{ENTITY_LABELS[entry.kind]}</span>
            {entry.tags?.slice(0, 3).map((tag) => <span key={tag} className="rounded-lg border border-violet-500/10 bg-violet-500/5 px-2.5 py-1 text-xs font-black tracking-widest text-violet-400">{tag.toUpperCase()}</span>)}
          </div>
          <h3 className={cn("font-black leading-tight tracking-tight transition-colors", isFeatured ? "text-2xl text-white group-hover:text-violet-300" : "text-xl text-white group-hover:text-violet-300")}>{entry.name}</h3>
        </div>
        <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-300 opacity-80">{entry.description}</p>
        {associationProfile && <AnnuaireActorAssociationSummary entry={entry} profile={associationProfile} />}
        <AnnuaireActorMetrics entry={entry} fr={fr} isEditorial={isEditorial} isPublishedPartner={isPublishedPartner} />
        <AnnuaireActorTrustInsight entry={entry} fr={fr} isEditorial={isEditorial} isIncomplete={isIncomplete} isTrusted={isTrusted} />
      </div>
      <AnnuaireActorActions entry={entry} fr={fr} hasPreciseCoordinates={hasPreciseCoordinates} publicDestination={publicDestination} isEditorial={isEditorial} onFocusMap={onFocusMap} />
      <AnnuaireActorFooter entry={entry} isPublishedPartner={isPublishedPartner} />
    </CmmCard>
  );
}
