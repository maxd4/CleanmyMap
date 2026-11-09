import type { Metadata } from "next";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { SpogomiInternational, SpogomiPublicEvents, SpogomiUnderstanding } from "@/components/spogomi/spogomi-index-sections";
import { getTranslation } from "@/lib/i18n/server-translation";
import { getServerLocale } from "@/lib/server-preferences";
import { listPublishedSpogomiEvents } from "@/lib/spogomi/public-service";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("/spogomi", { title: "Événements SPOGOMI", description: "Découvrir les événements SPOGOMI publiés et leurs actions CleanMyMap associées.", robots: { index: true, follow: true } });

export default async function SpogomiIndexPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation("spogomi", locale);
  let events: Awaited<ReturnType<typeof listPublishedSpogomiEvents>> = [];
  let loadError = false;
  try { events = await listPublishedSpogomiEvents(); } catch { loadError = true; }
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50">
      <CmmPageLayout>
        <PageHeader
          family={resolvePageFamily("/spogomi")}
          tone="emerald"
          title="SPOGOMI"
          subtitle="Comprenez le déroulement, comparez les formats et découvrez les éditions publiées."
        />
        <SpogomiUnderstanding locale={locale} t={t} />
        <SpogomiPublicEvents events={events} loadError={loadError} />
        <SpogomiInternational locale={locale} t={t} />
      </CmmPageLayout>
    </div>
  );
}
