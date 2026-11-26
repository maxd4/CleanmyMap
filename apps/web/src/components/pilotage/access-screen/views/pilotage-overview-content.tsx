"use client";

import { pilotagePageTabHref, type PilotagePageTab } from "@/lib/pilotage/page-tabs";
import { PilotageLegacyAnchor } from "./pilotage-legacy-anchor";
import { CmmCard } from "@/components/ui/cmm-card";
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
  activeTab?: PilotagePageTab;
};

function PilotageScopeNotice({ copy, isEmpty }: { copy: PilotageOverviewCopy; isEmpty: boolean }) {
  return <><div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{copy.scopeNotice}</div>{isEmpty ? <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h2 className="text-lg font-black text-amber-950">{copy.emptyScopeTitle}</h2><p className="mt-2 text-sm leading-6">{copy.emptyScopeDescription}</p></div> : null}</>;
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
        className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950"
      >
        <div>
          <p className="font-black text-rose-950">Opérations détaillées indisponibles</p>
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

  if (state === "PARTIAL") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
      >
        <div>
          <p className="font-black text-amber-950">Opérations détaillées partiellement couvertes</p>
          <p>Le périmètre autorisé dépasse la limite de lecture. Les indicateurs détaillés ne sont pas des totaux exhaustifs.</p>
        </div>
        <CmmButton href="/pilotage" tone="secondary" variant="pill">
          Masquer les opérations détaillées
        </CmmButton>
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

export function PilotageOverviewContent(props: PilotageOverviewContentProps) {
  const { locale, copy, overview, overviewLinks, accessAllowed, lastUpdatedAt, communityOperations, communityOperationsState, communityOperationsRetryHref, canExportCommunityFunnel } = props;
  const activeTab = props.activeTab ?? (communityOperationsState === "NOT_REQUESTED" ? "summary" : "operations");
  const notices = overview ? buildReportDataAvailabilityNotices(overview.dataAvailability) : [];
  const fr = locale === "fr";
  return (
    <div className="space-y-5">
      <PilotageOverviewSurfaceTabs locale={locale} activeTab={activeTab} />
      <PilotageLegacyAnchor activeTab={activeTab} />
      <PilotageScopeNotice copy={copy} isEmpty={overview?.contracts.length === 0} />
      {notices.length > 0 && <p role="status" aria-live="polite" className="text-sm cmm-text-warning">{notices.join(" ")}</p>}
      {activeTab === "operations" ? (
        <section className="space-y-4" aria-label={fr ? "Opérations communautaires" : "Community operations"}>
          <PilotageOperationsDisclosure state={communityOperationsState} retryHref={communityOperationsRetryHref} />
          {(communityOperationsState === "AVAILABLE" || communityOperationsState === "PARTIAL") && communityOperations && <PilotageCommunityOperationsPanel operations={communityOperations} canExportFunnel={canExportCommunityFunnel} />}
        </section>
      ) : activeTab === "tools" ? (
        <PilotageOverviewSupportSections locale={locale} accessEyebrow={copy.accessEyebrow} overview={overview} overviewLinks={overviewLinks} accessAllowed={accessAllowed} />
      ) : !overview ? (
        <CmmCard className="space-y-3">
          <h2 className="text-lg font-bold cmm-text-primary">{fr ? "Données de pilotage indisponibles" : "Operations data unavailable"}</h2>
          <p role="status" className="text-sm cmm-text-secondary">{fr ? "Aucun indicateur global ne remplace les données indisponibles." : "No global metrics replace unavailable data."}</p>
          <CmmButton href={pilotagePageTabHref("tools")} tone="secondary">{fr ? "Outils et rapports" : "Tools and reports"}</CmmButton>
        </CmmCard>
      ) : activeTab === "summary" ? (
        <>
          <PilotageOverviewSummary locale={locale} copy={copy} overview={overview} lastUpdatedAt={lastUpdatedAt} />
          <PilotageOperationsDisclosure state="NOT_REQUESTED" retryHref={communityOperationsRetryHref} />
        </>
      ) : activeTab === "priorities" ? (
        <PilotageOverviewPriorities locale={locale} copy={copy} topPriorities={overview.priorities} topZones={overview.zones.slice(0, 3)} />
      ) : <PilotageOverviewMetrics locale={locale} copy={copy} overview={overview} />}
    </div>
  );
}
