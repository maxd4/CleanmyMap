import { ArrowRight, BookOpen, CalendarDays, Globe2, MapPin, ShieldCheck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmIcon } from "@/components/ui/cmm-icon";
import { SpogomiInternationalContent } from "./spogomi-international-content";
import { SPOGOMI_EXTERNAL_EVENTS, SPOGOMI_INTERNATIONAL_NEWS, SPOGOMI_INTERNATIONAL_SOURCES } from "@/lib/spogomi/international-content";
import { formatDateTimeInTimeZone } from "@/lib/time/civil-date";
import type { listPublishedSpogomiEvents } from "@/lib/spogomi/public-service";
import type { Locale } from "@/lib/ui/preferences";

type PublishedEvents = Awaited<ReturnType<typeof listPublishedSpogomiEvents>>;
type Translate = (key: string) => string;

function formatDate(value: string, timeZone: string) {
  return formatDateTimeInTimeZone(value, timeZone, { dateStyle: "long" });
}

function lifecycleLabel(value: PublishedEvents[number]["lifecycle"]): string {
  return value === "upcoming" ? "À venir" : value === "in_progress" ? "En cours" : "Terminé";
}

function modeLabel(value: PublishedEvents[number]["mode"]): string {
  return value === "mixed" ? "Casual & World Cup" : value === "world_cup" ? "World Cup" : "Casual";
}

export function SpogomiPublicEvents({ events, loadError }: { events: PublishedEvents; loadError: boolean }) {
  return <section id="spogomi-events" className="scroll-mt-6 space-y-4" aria-labelledby="spogomi-events-title"><div><h2 id="spogomi-events-title" className="text-2xl font-black text-slate-950">Compétitions publiées</h2><p className="cmm-text-body mt-1 text-slate-900">Seules les compétitions explicitement rendues publiques par un organisateur habilité apparaissent ici.</p></div>{loadError ? <CmmFeedback tone="error" title="Compétitions indisponibles">Les compétitions publiées ne peuvent pas être chargées pour le moment. Réessayez plus tard.</CmmFeedback> : events.length === 0 ? <CmmCard tone="slate" variant="glass" className="border-dashed"><p className="font-bold text-slate-900">Aucune compétition SPOGOMI publiée pour le moment.</p><p className="mt-2 text-sm text-slate-600">Les brouillons et compétitions privées ne sont pas exposés sur cette page.</p></CmmCard> : <div className="grid gap-4 lg:grid-cols-2">{events.map((event) => <CmmCard key={event.id} tone="emerald" variant="glass" className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-black text-emerald-950">{event.name}</h3><p className="cmm-text-small mt-1 font-bold uppercase tracking-[0.15em] text-emerald-800">{lifecycleLabel(event.lifecycle)}</p></div><span className="cmm-text-small rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-bold text-slate-800">{modeLabel(event.mode)}</span></div><div className="space-y-2 text-sm text-slate-700"><p className="flex items-center gap-2"><CalendarDays size={15} className="text-emerald-700" aria-hidden="true" />{formatDate(event.startsAt, event.officialTimezone)}</p><p className="flex items-center gap-2"><MapPin size={15} className="text-emerald-700" aria-hidden="true" />{event.locationLabel}</p></div><CmmButton href={`/spogomi/${encodeURIComponent(event.slug)}`} tone="primary" size="sm" variant="pill">Voir la compétition <ArrowRight size={16} /></CmmButton></CmmCard>)}</div>}</section>;
}

export function SpogomiUnderstanding({ t }: { t: Translate }) {
  return <section className="space-y-4" aria-labelledby="spogomi-understanding-title"><UnderstandingIntro t={t} /><CmmCard tone="emerald" variant="glass" className="space-y-3"><CasualDisclosure t={t} /><WorldCupDisclosure t={t} /><RulesDisclosure t={t} /></CmmCard></section>;
}

function UnderstandingIntro({ t }: { t: Translate }) {
  return <div>
    <h2 id="spogomi-understanding-title" className="flex items-center gap-2 text-2xl font-black text-slate-950"><CmmIcon icon={BookOpen} className="text-emerald-700" />{t("understanding.title")}</h2>
    <p className="cmm-text-body mt-1 text-slate-950">{t("understanding.description")}</p>
  </div>;
}

function CasualDisclosure({ t }: { t: Translate }) {
  return <CmmDisclosure summary={<span className="flex items-center gap-3"><CmmIcon icon={BookOpen} className="text-emerald-700" /><span>{t("international.casualTitle")}</span></span>} tone="emerald" size="md">
    <p className="cmm-text-body text-slate-950">{t("international.casualDescription")}</p>
  </CmmDisclosure>;
}

function WorldCupDisclosure({ t }: { t: Translate }) {
  return <CmmDisclosure summary={<span className="flex items-center gap-3"><CmmIcon icon={Globe2} className="text-amber-700" /><span>{t("international.worldCupTitle")}</span></span>} tone="amber" size="md">
    <p className="cmm-text-body text-slate-950">{t("international.worldCupDescription")}</p>
  </CmmDisclosure>;
}

function RulesDisclosure({ t }: { t: Translate }) {
  return <CmmDisclosure summary={<span className="flex items-center gap-3"><CmmIcon icon={ShieldCheck} className="text-slate-700" /><span>{t("understanding.rulesTitle")}</span></span>} tone="slate" size="md">
    <div className="space-y-3 text-slate-950">
      <p className="cmm-text-body">{t("understanding.rulesDescription")}</p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6"><li>{t("understanding.rulesCasual")}</li><li>{t("understanding.rulesWorldCup")}</li><li>{t("understanding.rulesSafety")}</li></ul>
    </div>
  </CmmDisclosure>;
}

export function SpogomiInternationalSection({ locale, t }: { locale: Locale; t: Translate }) {
  return <SpogomiInternationalContent locale={locale} sources={SPOGOMI_INTERNATIONAL_SOURCES} news={SPOGOMI_INTERNATIONAL_NEWS} externalEvents={SPOGOMI_EXTERNAL_EVENTS} copy={{ worldTitle: t("international.worldTitle"), worldDescription: t("international.worldDescription"), cleanMyMapRole: t("international.cleanMyMapRole"), officialSources: t("international.officialSources"), verifiedOn: t("international.verifiedOn"), newsTitle: t("international.newsTitle"), confirmed: t("international.confirmed"), planned: t("international.planned"), internationalEvents: t("international.eventsTitle"), year: t("international.year"), country: t("international.country"), allYears: t("international.allYears"), allCountries: t("international.allCountries"), externalEvent: t("international.externalEvent"), source: t("international.source"), noExternalEvents: t("international.noExternalEvents"), newsDetails: t("international.newsDetails"), filtersDetails: t("international.filtersDetails"), worldDetails: t("international.worldDetails") }} />;
}
