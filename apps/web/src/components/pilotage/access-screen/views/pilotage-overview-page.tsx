import { Sparkles } from "lucide-react";
import { PAGE_COPY, buildAccessLinks } from "../access-screen-constants";
import type { PilotageLocale } from "../access-screen-constants";
import type { AppProfile } from "@/lib/profiles";
import { getProfileLabel, getProfileSubtitle, isAdminLikeProfile } from "@/lib/profiles";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { PageHero, PageHeroBadge } from "@/components/ui/page-hero";
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
  const accessAllowed = isAdminLikeProfile(profile) || profile === "coordinateur" || profile === "max";
  const pageFamily = getPageFamilyById("accueil-pilotage");

  return (
    <section className="w-full space-y-6 p-4 md:p-8">
      <div className="space-y-8">
        <PageHero
          family={pageFamily}
          title={copy.title}
          subtitle={copy.description}
          badges={
            <>
              <PageHeroBadge family={pageFamily}>
                <Sparkles size={14} aria-hidden="true" />
                {locale === "fr" ? "Accueil & Pilotage" : "Home & Operations"}
              </PageHeroBadge>
              <PageHeroBadge family={pageFamily} muted>
                {getProfileLabel(profile, locale)}
              </PageHeroBadge>
              <PageHeroBadge family={pageFamily} muted>
                {getProfileSubtitle(profile, locale)}
              </PageHeroBadge>
            </>
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
