import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Globe2, MapPin, ShieldCheck } from "lucide-react";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmIcon } from "@/components/ui/cmm-icon";
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
  let eventsLoadError = false;
  try {
    events = await listPublishedSpogomiEvents();
  } catch {
    eventsLoadError = true;
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
          {eventsLoadError ? (
            <CmmFeedback tone="error" title="Compétitions indisponibles">
              Les compétitions publiées ne peuvent pas être chargées pour le moment. Réessayez plus tard.
            </CmmFeedback>
          ) : events.length === 0 ? (
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
        <section className="space-y-4" aria-labelledby="spogomi-understanding-title">
          <div>
            <h2 id="spogomi-understanding-title" className="flex items-center gap-2 text-2xl font-black text-slate-950">
              <CmmIcon icon={BookOpen} className="text-emerald-700" />
              {t("understanding.title")}
            </h2>
            <p className="cmm-text-body mt-1 text-slate-900">{t("understanding.description")}</p>
          </div>
          <CmmCard tone="emerald" variant="glass" className="space-y-3 p-4 sm:p-5">
            <CmmDisclosure
              summary={(
                <span className="flex items-center gap-3">
                  <CmmIcon icon={BookOpen} className="text-emerald-700" />
                  <span>{t("international.casualTitle")}</span>
                </span>
              )}
              tone="emerald"
              size="md"
            >
              <p className="cmm-text-body text-slate-900">{t("international.casualDescription")}</p>
            </CmmDisclosure>
            <CmmDisclosure
              summary={(
                <span className="flex items-center gap-3">
                  <CmmIcon icon={Globe2} className="text-amber-700" />
                  <span>{t("international.worldCupTitle")}</span>
                </span>
              )}
              tone="amber"
              size="md"
            >
              <p className="cmm-text-body text-slate-900">{t("international.worldCupDescription")}</p>
            </CmmDisclosure>
            <CmmDisclosure
              summary={(
                <span className="flex items-center gap-3">
                  <CmmIcon icon={ShieldCheck} className="text-slate-700" />
                  <span>{t("understanding.rulesTitle")}</span>
                </span>
              )}
              tone="slate"
              size="md"
            >
              <div className="space-y-3 text-slate-900">
                <p className="cmm-text-body">{t("understanding.rulesDescription")}</p>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
                  <li>{t("understanding.rulesCasual")}</li>
                  <li>{t("understanding.rulesWorldCup")}</li>
                  <li>{t("understanding.rulesSafety")}</li>
                </ul>
              </div>
            </CmmDisclosure>
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
            newsDetails: t("international.newsDetails"),
            filtersDetails: t("international.filtersDetails"),
            worldDetails: t("international.worldDetails"),
          }}
        />
      </div>
    </main>
  );
}
