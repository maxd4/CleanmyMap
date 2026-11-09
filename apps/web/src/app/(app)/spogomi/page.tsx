import type { Metadata } from "next";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { SpogomiPublicEvents, SpogomiUnderstanding } from "@/components/spogomi/spogomi-index-sections";
import { SpogomiOrientationTabs } from "@/components/spogomi/spogomi-orientation-tabs";
import { getTranslation } from "@/lib/i18n/server-translation";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserActiveRole } from "@/lib/authz";
import { getServerLocale } from "@/lib/server-preferences";
import { listPublishedSpogomiEvents } from "@/lib/spogomi/public-service";
import { loadSpogomiOrientationProgressForCurrentUser } from "@/lib/spogomi/orientation-progress-service";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("/spogomi", { title: "Événements SPOGOMI", description: "Découvrir les événements SPOGOMI publiés et leurs actions CleanMyMap associées.", robots: { index: true, follow: true } });

export default async function SpogomiIndexPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation("spogomi", locale);
  const { userId } = await getSafeAuthSession();
  let events: Awaited<ReturnType<typeof listPublishedSpogomiEvents>> = [];
  let orientationProgress: Awaited<ReturnType<typeof loadSpogomiOrientationProgressForCurrentUser>> = [];
  let loadError = false;
  let canCreate = false;
  try { events = await listPublishedSpogomiEvents(); } catch { loadError = true; }
  if (userId) {
    canCreate = ["admin", "max"].includes(await getCurrentUserActiveRole().catch(() => "anonymous"));
    try { orientationProgress = await loadSpogomiOrientationProgressForCurrentUser(userId); } catch { orientationProgress = []; }
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50">
      <CmmPageLayout>
        <PageHeader
          family={resolvePageFamily("/spogomi")}
          tone="emerald"
          title="SPOGOMI"
          subtitle="Trouvez votre rôle et rejoignez une compétition publiée."
        />
        <SpogomiOrientationTabs isAuthenticated={Boolean(userId)} canCreate={canCreate} progress={orientationProgress} />
        <SpogomiUnderstanding locale={locale} t={t} />
        <SpogomiPublicEvents events={events} loadError={loadError} />
      </CmmPageLayout>
    </div>
  );
}
