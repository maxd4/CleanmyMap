import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Trophy } from "lucide-react";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { PageHeader } from "@/components/ui/page-header";
import { SpogomiInternationalContent } from "@/components/spogomi/spogomi-international-content";
import { SpogomiOrientationTabs } from "@/components/spogomi/spogomi-orientation-tabs";
import { getTranslation } from "@/lib/i18n/server-translation";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getServerLocale } from "@/lib/server-preferences";
import { SPOGOMI_EXTERNAL_EVENTS, SPOGOMI_INTERNATIONAL_NEWS, SPOGOMI_INTERNATIONAL_SOURCES } from "@/lib/spogomi/international-content";
import { listPublishedSpogomiEvents, type SpogomiPublicLifecycle } from "@/lib/spogomi/public-service";
import { resolvePageFamily } from "@/lib/ui/page-families";

export const metadata: Metadata = {
  title: "Événements SPOGOMI",
  description: "Découvrir les événements SPOGOMI publiés et leurs actions CleanMyMap associées.",
  alternates: { canonical: "/spogomi" },
  robots: { index: true, follow: true },
};

const lifecycleLabels: Record<SpogomiPublicLifecycle, string> = {
  upcoming: "À venir",
  in_progress: "En cours",
  finished: "Terminé",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));
}

export default async function SpogomiIndexPage() {
  const locale = await getServerLocale();
  const { t } = getTranslation("spogomi", locale);
  const { userId } = await getSafeAuthSession();
  let events = [] as Awaited<ReturnType<typeof listPublishedSpogomiEvents>>;
  try {
    events = await listPublishedSpogomiEvents();
  } catch {
    events = [];
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width space-y-8">
        <PageHeader
          family={resolvePageFamily("/spogomi")}
          tone="emerald"
          title="SPOGOMI"
          subtitle="Trouvez votre rôle et rejoignez une compétition publiée."
          action={
            <CmmButtonGroup>
              <CmmButton href="#spogomi-events" tone="primary">Voir les compétitions</CmmButton>
              <CmmButton href="/sections/messagerie?tab=discussions&channel=community&topicId=spogomi" tone="secondary">Ouvrir le salon SPOGOMI</CmmButton>
            </CmmButtonGroup>
          }
        />
        <SpogomiOrientationTabs canAccessOrganizerDashboard={Boolean(userId)} />
        <section id="spogomi-events" className="scroll-mt-6 space-y-4" aria-labelledby="spogomi-events-title">
          <div>
            <h2 id="spogomi-events-title" className="text-2xl font-black text-slate-950">Compétitions publiées</h2>
            <p className="cmm-text-body mt-1 text-slate-900">
              Seules les compétitions explicitement rendues publiques par un organisateur habilité apparaissent ici.
            </p>
          </div>
          {events.length === 0 ? (
            <CmmCard tone="slate" variant="glass" className="border-dashed p-6">
              <p className="font-bold text-slate-900">Aucune compétition SPOGOMI publiée pour le moment.</p>
              <p className="mt-2 text-sm text-slate-600">Les brouillons et compétitions privées ne sont pas exposés sur cette page.</p>
            </CmmCard>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {events.map((event) => (
                <CmmCard key={event.id} tone="emerald" variant="glass" className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-emerald-950">{event.name}</h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">{lifecycleLabels[event.lifecycle]}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">
                      {event.mode === "world_cup" ? "World Cup" : "Casual"}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p className="flex items-center gap-2"><CalendarDays size={15} className="text-emerald-700" />{formatDate(event.startsAt)}</p>
                    <p className="flex items-center gap-2"><MapPin size={15} className="text-emerald-700" />{event.locationLabel}</p>
                  </div>
                  <Link href={`/spogomi/${encodeURIComponent(event.slug)}`} className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                    Voir la compétition <ArrowRight size={16} />
                  </Link>
                </CmmCard>
              ))}
            </div>
          )}
        </section>
        <section className="grid gap-4 md:grid-cols-2" aria-label="Modes de compétition">
          <CmmCard tone="emerald" variant="glass" className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-emerald-950">
              <Trophy size={20} />
              Casual
            </h2>
            <p className="cmm-text-body text-slate-900">
              Des équipes dont la taille est configurée pour l’événement. Les règles publiées restent celles de l’organisateur.
            </p>
          </CmmCard>
          <CmmCard tone="amber" variant="glass" className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-amber-950">
              <Trophy size={20} />
              World Cup
            </h2>
            <p className="cmm-text-body text-slate-900">
              Des équipes de trois personnes, avec une composition vérifiable. Aucun résultat sportif n’est affiché avant sa publication effective.
            </p>
          </CmmCard>
        </section>
        <SpogomiInternationalContent
          locale={locale}
          sources={SPOGOMI_INTERNATIONAL_SOURCES}
          news={SPOGOMI_INTERNATIONAL_NEWS}
          externalEvents={SPOGOMI_EXTERNAL_EVENTS}
          copy={{
            worldTitle: t("international.worldTitle"),
            worldDescription: t("international.worldDescription"),
            casualTitle: t("international.casualTitle"),
            casualDescription: t("international.casualDescription"),
            worldCupTitle: t("international.worldCupTitle"),
            worldCupDescription: t("international.worldCupDescription"),
            cleanMyMapRole: t("international.cleanMyMapRole"),
            officialSources: t("international.officialSources"),
            verifiedOn: t("international.verifiedOn"),
            newsTitle: t("international.newsTitle"),
            confirmed: t("international.confirmed"),
            planned: t("international.planned"),
            internationalEvents: t("international.eventsTitle"),
            year: t("international.year"),
            country: t("international.country"),
            allYears: t("international.allYears"),
            allCountries: t("international.allCountries"),
            externalEvent: t("international.externalEvent"),
            source: t("international.source"),
            noExternalEvents: t("international.noExternalEvents"),
            communityLink: t("international.communityLink"),
          }}
        />
      </div>
    </main>
  );
}
