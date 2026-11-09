import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SpogomiPersonalEventsList } from "@/components/spogomi/spogomi-personal-events-list";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { listSpogomiEventChangesForCurrentUser, listSpogomiEventsForCurrentUser } from "@/lib/spogomi/personal-events-service";
import { buildSpogomiCatalogHref, parseSpogomiCatalogIntent } from "@/lib/spogomi/navigation-intent";
import { resolvePageFamily } from "@/lib/ui/page-families";

export const metadata: Metadata = {
  title: "Mes événements SPOGOMI",
  description: "Espace privé des compétitions SPOGOMI que votre identité peut gérer.",
  robots: { index: false, follow: false, noarchive: true },
};

type Props = { searchParams?: Promise<{ parcours?: string | string[]; section?: string | string[] }> };

export default async function SpogomiPersonalEventsPage({ searchParams }: Props = {}) {
  const intent = parseSpogomiCatalogIntent(await searchParams);
  const catalogPath = intent.journey ? buildSpogomiCatalogHref(intent.journey, intent.focus ?? undefined) : "/spogomi/mes-evenements";
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent(catalogPath)}`);
  const [events, changes] = await Promise.all([
    listSpogomiEventsForCurrentUser(access.userId),
    listSpogomiEventChangesForCurrentUser(access.userId),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width space-y-8">
        <PageHeader
          family={resolvePageFamily("/spogomi/mes-evenements")}
          tone="emerald"
          title={intent.journey === "volunteers" ? "Mes participations SPOGOMI" : intent.journey === "referees" ? "Mes habilitations SPOGOMI" : "Mes événements SPOGOMI"}
          subtitle={intent.journey === "referees" ? "Choisissez une édition habilitée pour ouvrir la section correspondant à votre capacité active." : "Retrouvez les compétitions auxquelles une relation vérifiée vous donne accès."}
        />
        <SpogomiPersonalEventsList events={events} changes={changes} journey={intent.journey} focus={intent.focus} />
      </div>
    </main>
  );
}
