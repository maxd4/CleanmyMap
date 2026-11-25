"use client";

import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { ReactElement } from "react";
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
      variant="default"
      tone={isFeatured ? "violet" : "slate"}
      className="group flex min-w-0 flex-col gap-4"
    >
      <AnnuaireActorBadges entry={entry} fr={fr} isFeatured={Boolean(isFeatured)} isEditorial={isEditorial} isTrusted={isTrusted} hasRecentUpdate={hasRecentUpdate} structureBadge={structureBadge} />
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[var(--cmm-surface-border)] px-2.5 py-1 text-xs font-semibold cmm-text-secondary">{ENTITY_LABELS[entry.kind]}</span>
            {entry.tags?.slice(0, 3).map((tag) => <span key={tag} className="rounded-md border border-violet-500/20 bg-violet-500/5 px-2.5 py-1 text-xs font-medium cmm-text-primary">{tag.toUpperCase()}</span>)}
          </div>
          <h3 className="text-lg font-semibold leading-snug cmm-text-primary">{entry.name}</h3>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed cmm-text-primary">{entry.description}</p>
        {associationProfile && <AnnuaireActorAssociationSummary entry={entry} profile={associationProfile} />}
        <AnnuaireActorMetrics entry={entry} fr={fr} isEditorial={isEditorial} isPublishedPartner={isPublishedPartner} />
        <AnnuaireActorTrustInsight entry={entry} fr={fr} isEditorial={isEditorial} isIncomplete={isIncomplete} isTrusted={isTrusted} />
      </div>
      <AnnuaireActorActions entry={entry} fr={fr} hasPreciseCoordinates={hasPreciseCoordinates} publicDestination={publicDestination} isEditorial={isEditorial} onFocusMap={onFocusMap} />
      <AnnuaireActorFooter entry={entry} isPublishedPartner={isPublishedPartner} />
    </CmmCard>
  );
}
