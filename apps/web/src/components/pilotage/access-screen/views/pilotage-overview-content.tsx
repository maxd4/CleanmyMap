"use client";

import type { NavigationGridItem } from "@/components/ui/navigation-grid";
import { CmmButton } from "@/components/ui/cmm-button";
import type {
  PilotageCommunityOperations,
  PilotageCommunityOperationsState,
} from "@/lib/pilotage/community-operations";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { buildReportDataAvailabilityNotices } from "@/lib/reports/data-availability";
import type { PilotageLocale } from "../access-screen-constants";
import { PilotageCommunityOperationsPanel } from "@/components/pilotage/community-operations-panel";
import { PilotageOverviewSupportSections } from "./pilotage-overview-support-sections";
import { PilotageOverviewSurfaceTabs } from "./pilotage-overview-surface-tabs";
import { PilotageOverviewMetrics, PilotageOverviewPriorities, PilotageOverviewSummary, type PilotageOverviewCopy } from "./pilotage-overview-sections";

type PilotageOverviewContentProps = {
  locale: PilotageLocale;
  copy: PilotageOverviewCopy;
  overview: PilotageOverview | null;
  overviewLinks: NavigationGridItem[];
  accessAllowed: boolean;
  lastUpdatedAt: string | null;
  communityOperations: PilotageCommunityOperations | null;
  communityOperationsState: PilotageCommunityOperationsState;
  communityOperationsRetryHref: string;
  canExportCommunityFunnel: boolean;
};

function PilotageScopeNotice({ copy, isEmpty }: { copy: PilotageOverviewCopy; isEmpty: boolean }) {
  return <><div role="status" className="rounded-2xl border border-orange-200/30 bg-orange-100/10 p-4 text-sm leading-6 text-orange-100">{copy.scopeNotice}</div>{isEmpty ? <div role="status" className="rounded-2xl border border-amber-200/30 bg-amber-100/10 p-5 text-orange-100"><h2 className="text-lg font-black text-white">{copy.emptyScopeTitle}</h2><p className="mt-2 text-sm leading-6">{copy.emptyScopeDescription}</p></div> : null}</>;
}

function PilotageOperationsDisclosure({
  state,
  retryHref,
}: {
  state: PilotageCommunityOperationsState;
  retryHref: string;
}) {
  if (state === "UNAVAILABLE") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-4 rounded-2xl border border-rose-200/30 bg-rose-100/10 p-4 text-sm leading-6 text-orange-100"
      >
        <div>
          <p className="font-black text-white">Opérations détaillées indisponibles</p>
          <p>Les KPI de l’overview restent disponibles. Le détail n’a pas pu être calculé.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CmmButton href={retryHref} tone="important" variant="pill">
            Réessayer le chargement
          </CmmButton>
          <CmmButton href="/pilotage" tone="secondary" variant="pill">
            Masquer les opérations détaillées
          </CmmButton>
        </div>
      </div>
    );
  }

  const isExpanded = state === "AVAILABLE";
  return (
    <CmmButton
      href={isExpanded ? "/pilotage" : "/pilotage?operations=1"}
      prefetch={false}
      tone="secondary"
      variant="pill"
    >
      {isExpanded ? "Masquer les opérations détaillées" : "Explorer les opérations détaillées"}
    </CmmButton>
  );
}

export function PilotageOverviewContent({ locale, copy, overview, overviewLinks, accessAllowed, lastUpdatedAt, communityOperations, communityOperationsState, communityOperationsRetryHref, canExportCommunityFunnel }: PilotageOverviewContentProps) {
  const topZones = overview?.zones.slice(0, 3) ?? [];
  const topPriorities = overview?.priorities ?? [];
  if (!overview) {
    return (
      <>
        {communityOperationsState !== "NOT_REQUESTED" ? (
          <PilotageOperationsDisclosure
            state={communityOperationsState}
            retryHref={communityOperationsRetryHref}
          />
        ) : null}
        <PilotageOverviewSupportSections
          locale={locale}
          accessEyebrow={copy.accessEyebrow}
          overview={null}
          overviewLinks={overviewLinks}
          accessAllowed={accessAllowed}
        />
      </>
    );
  }
  const notices = buildReportDataAvailabilityNotices(overview.dataAvailability);
  return <><>{notices.length > 0 ? <div role="status" aria-live="polite" className="rounded-2xl border border-amber-200/40 bg-amber-100/10 p-4 text-sm leading-6 text-orange-100">{notices.join(" ")}</div> : null}</><PilotageScopeNotice copy={copy} isEmpty={overview.contracts.length === 0} /><PilotageOverviewSurfaceTabs locale={locale} overview={overview} /><PilotageOperationsDisclosure state={communityOperationsState} retryHref={communityOperationsRetryHref} />{communityOperationsState === "AVAILABLE" && communityOperations ? <PilotageCommunityOperationsPanel operations={communityOperations} canExportFunnel={canExportCommunityFunnel} /> : null}<PilotageOverviewSummary locale={locale} copy={copy} overview={overview} lastUpdatedAt={lastUpdatedAt} /><PilotageOverviewMetrics locale={locale} copy={copy} overview={overview} /><PilotageOverviewPriorities locale={locale} copy={copy} topPriorities={topPriorities} topZones={topZones} /><PilotageOverviewSupportSections locale={locale} accessEyebrow={copy.accessEyebrow} overview={overview} overviewLinks={overviewLinks} accessAllowed={accessAllowed} /></>;
}
