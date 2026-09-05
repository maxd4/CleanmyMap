import { PAGE_COPY, buildAccessLinks } from "../access-screen-constants";
import type { PilotageLocale } from "../access-screen-constants";
import type { AppProfile } from "@/lib/profiles";
import { getProfileLabel } from "@/lib/profiles";
import { getEffectiveAccessForSessionRole } from "@/lib/domain-language";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { PageHeader } from "@/components/ui/page-header";
import { PilotageOverviewContent } from "./pilotage-overview-content";
import { formatDateTime } from "../access-screen-utils";
import { getPageFamilyById } from "@/lib/ui/page-families";

export function PilotageOverviewPage({
  locale,
  profile,
  overview,
}: {
  locale: PilotageLocale;
  profile: AppProfile;
  overview: PilotageOverview | null;
}) {
  const copy = PAGE_COPY[locale];
  const overviewLinks = buildAccessLinks(profile, locale);
  const accessAllowed = getEffectiveAccessForSessionRole(profile).canAccessPilotage;
  const pageFamily = getPageFamilyById("accueil-pilotage");

  return (
    <section className="w-full space-y-6 p-4 md:p-8">
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
        overviewLinks={overviewLinks}
        accessAllowed={accessAllowed}
        lastUpdatedAt={overview ? formatDateTime(overview.generatedAt, locale) : null}
      />
    </section>
  );
}
