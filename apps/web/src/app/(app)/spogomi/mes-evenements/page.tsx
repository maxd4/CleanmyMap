import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SpogomiOrganizerDashboard } from "@/components/spogomi/spogomi-organizer-dashboard";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { listSpogomiEventsForCurrentOrganizer } from "@/lib/spogomi/organizer-service";
import { resolvePageFamily } from "@/lib/ui/page-families";

export const metadata: Metadata = {
  title: "Mes événements SPOGOMI",
  description: "Espace privé des compétitions SPOGOMI que votre identité peut gérer.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SpogomiOrganizerEventsPage() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent("/spogomi/mes-evenements")}`);
  const events = await listSpogomiEventsForCurrentOrganizer(access.userId);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width space-y-8">
        <PageHeader
          family={resolvePageFamily("/spogomi/mes-evenements")}
          tone="emerald"
          title="Mes événements SPOGOMI"
          subtitle="Retrouvez les compétitions privées et publiées que votre identité peut gérer."
        />
        <SpogomiOrganizerDashboard initialEvents={events} view="events" />
      </div>
    </main>
  );
}
