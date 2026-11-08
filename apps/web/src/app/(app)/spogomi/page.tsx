import type { Metadata } from "next";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { PageHeader } from "@/components/ui/page-header";
import { SpogomiInternationalSection, SpogomiPublicEvents, SpogomiUnderstanding } from "@/components/spogomi/spogomi-index-sections";
import { SpogomiOrientationTabs } from "@/components/spogomi/spogomi-orientation-tabs";
import { getTranslation } from "@/lib/i18n/server-translation";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getServerLocale } from "@/lib/server-preferences";
import { listPublishedSpogomiEvents } from "@/lib/spogomi/public-service";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("/spogomi", { title: "Événements SPOGOMI", description: "Découvrir les événements SPOGOMI publiés et leurs actions CleanMyMap associées.", robots: { index: true, follow: true } });

export default async function SpogomiIndexPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation("spogomi", locale);
  const { userId } = await getSafeAuthSession();
  let events: Awaited<ReturnType<typeof listPublishedSpogomiEvents>> = [];
  let loadError = false;
  try { events = await listPublishedSpogomiEvents(); } catch { loadError = true; }
  return <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10"><div className="cmm-page-width space-y-8"><PageHeader family={resolvePageFamily("/spogomi")} tone="emerald" title="SPOGOMI" subtitle="Trouvez votre rôle et rejoignez une compétition publiée." action={<CmmButtonGroup><CmmButton href="#spogomi-events" tone="primary">Voir les compétitions</CmmButton><CmmButton href="/sections/messagerie?tab=discussions&channel=community&topicId=spogomi" tone="secondary">Ouvrir le salon SPOGOMI</CmmButton></CmmButtonGroup>} /><SpogomiOrientationTabs isAuthenticated={Boolean(userId)} /><SpogomiPublicEvents events={events} loadError={loadError} /><SpogomiUnderstanding t={t} /><SpogomiInternationalSection locale={locale} t={t} /></div></div>;
}
