"use client";

import type { NavigationGridItem } from "@/components/ui/navigation-grid";
import type { PilotageCommunityOperations } from "@/lib/pilotage/community-operations";
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
  canExportCommunityFunnel: boolean;
};

function PilotageScopeNotice({ copy, isEmpty }: { copy: PilotageOverviewCopy; isEmpty: boolean }) {
  return <><div role="status" className="rounded-2xl border border-orange-200/30 bg-orange-100/10 p-4 text-sm leading-6 text-orange-100">{copy.scopeNotice}</div>{isEmpty ? <div role="status" className="rounded-2xl border border-amber-200/30 bg-amber-100/10 p-5 text-orange-100"><h2 className="text-lg font-black text-white">{copy.emptyScopeTitle}</h2><p className="mt-2 text-sm leading-6">{copy.emptyScopeDescription}</p></div> : null}</>;
}

export function PilotageOverviewContent({ locale, copy, overview, overviewLinks, accessAllowed, lastUpdatedAt, communityOperations, canExportCommunityFunnel }: PilotageOverviewContentProps) {
  const topZones = overview?.zones.slice(0, 3) ?? [];
  const topPriorities = overview?.priorities ?? [];
  if (!overview) return <PilotageOverviewSupportSections locale={locale} accessEyebrow={copy.accessEyebrow} overview={null} overviewLinks={overviewLinks} accessAllowed={accessAllowed} />;
  const notices = buildReportDataAvailabilityNotices(overview.dataAvailability);
  return <><>{notices.length > 0 ? <div role="status" aria-live="polite" className="rounded-2xl border border-amber-200/40 bg-amber-100/10 p-4 text-sm leading-6 text-orange-100">{notices.join(" ")}</div> : null}</><PilotageScopeNotice copy={copy} isEmpty={overview.contracts.length === 0} /><PilotageOverviewSurfaceTabs locale={locale} overview={overview} />{communityOperations ? <PilotageCommunityOperationsPanel operations={communityOperations} canExportFunnel={canExportCommunityFunnel} /> : null}<PilotageOverviewSummary locale={locale} copy={copy} overview={overview} lastUpdatedAt={lastUpdatedAt} /><PilotageOverviewMetrics locale={locale} copy={copy} overview={overview} /><PilotageOverviewPriorities locale={locale} copy={copy} topPriorities={topPriorities} topZones={topZones} /><PilotageOverviewSupportSections locale={locale} accessEyebrow={copy.accessEyebrow} overview={overview} overviewLinks={overviewLinks} accessAllowed={accessAllowed} /></>;
}
