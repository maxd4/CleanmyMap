import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SpogomiOrganizerDashboard } from "@/components/spogomi/spogomi-organizer-dashboard";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { resolvePageFamily } from "@/lib/ui/page-families";

export const metadata: Metadata = {
  title: "Nouvelle compétition SPOGOMI",
  description: "Créer une compétition SPOGOMI privée et reprendre sa préparation.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function NewSpogomiEventPage() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent("/spogomi/nouveau")}`);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width space-y-8">
        <PageHeader
          family={resolvePageFamily("/spogomi/nouveau")}
          tone="emerald"
          title="Nouvelle compétition SPOGOMI"
          subtitle="Créez une édition privée, puis ouvrez son espace de préparation lorsque vous êtes prêt."
        />
        <SpogomiOrganizerDashboard initialEvents={[]} view="create" />
      </div>
    </main>
  );
}
