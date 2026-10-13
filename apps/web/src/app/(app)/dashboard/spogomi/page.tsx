import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SpogomiOrganizerDashboard } from "@/components/spogomi/spogomi-organizer-dashboard";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { listSpogomiEventsForOrganizer } from "@/lib/spogomi/organizer-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Mes événements SPOGOMI",
  description: "Espace privé de préparation des compétitions SPOGOMI autorisées.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SpogomiOrganizerDashboardPage() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent("/dashboard/spogomi")}`);
  const events = await listSpogomiEventsForOrganizer(getSupabaseServerClient(true), access.userId);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width space-y-8">
        <PageHeader
          family={resolvePageFamily("/dashboard/spogomi")}
          tone="emerald"
          title="Mes événements SPOGOMI"
          subtitle="Un espace privé pour créer et préparer les compétitions que votre identité peut gérer."
        />
        <SpogomiOrganizerDashboard initialEvents={events} />
      </div>
    </main>
  );
}
