import { PAGE_COPY, buildAccessLinks } from "../access-screen-constants";
import type { PilotageLocale } from "../access-screen-constants";
import type { AppProfile } from "@/lib/profiles";
import { getProfileLabel } from "@/lib/profiles";
import { getEffectiveAccessForSessionRole } from "@/lib/domain-language";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type {
  PilotageCommunityOperations,
  PilotageCommunityOperationsState,
} from "@/lib/pilotage/community-operations";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import type { PilotagePageTab } from "@/lib/pilotage/page-tabs";
import { PilotageOverviewContent } from "./pilotage-overview-content";
import { formatDateTime } from "../access-screen-utils";
import { getPageFamilyById } from "@/lib/ui/page-families";

export function PilotageOverviewPage({
  locale,
  profile,
  overview,
  activeTab,
  communityOperations,
  communityOperationsState,
  communityOperationsRetryHref,
}: {
  locale: PilotageLocale;
  profile: AppProfile;
  overview: PilotageOverview | null;
  activeTab: PilotagePageTab;
  communityOperations: PilotageCommunityOperations | null;
  communityOperationsState: PilotageCommunityOperationsState;
  communityOperationsRetryHref: string;
}) {
  const copy = PAGE_COPY[locale];
  const overviewLinks = buildAccessLinks(profile, locale);
  const accessAllowed = getEffectiveAccessForSessionRole(profile).canAccessPilotage;
  const pageFamily = getPageFamilyById("accueil-pilotage");

  return (
    <CmmPageLayout className="cmm-pilotage-overview">
      <div className="space-y-8">
        <PageHeader
          family={pageFamily}
          title={copy.title}
          subtitle={copy.description}
          action={
            <span className="text-sm font-semibold">
              {getProfileLabel(profile, locale)}
            </span>
          }
        />
      </div>

      <PilotageOverviewContent
        locale={locale}
        copy={copy}
        overview={overview}
        activeTab={activeTab}
        communityOperations={communityOperations}
        communityOperationsState={communityOperationsState}
        communityOperationsRetryHref={communityOperationsRetryHref}
        overviewLinks={overviewLinks}
        accessAllowed={accessAllowed}
        canExportCommunityFunnel={profile === "max"}
        lastUpdatedAt={overview ? formatDateTime(overview.generatedAt, locale) : null}
      />
    </CmmPageLayout>
  );
}
