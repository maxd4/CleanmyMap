import { ArrowRight, BookOpen, CalendarDays, MapPin } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmIcon } from "@/components/ui/cmm-icon";
import { SpogomiActionInfo } from "./spogomi-action-info";
import { SpogomiUnderstandingTabs } from "./spogomi-understanding-tabs";
import { SPOGOMI_CACHAN_DEMO_ROUTE } from "@/lib/spogomi/demo-scenario";
import { SPOGOMI_EXTERNAL_EVENTS, SPOGOMI_HISTORICAL_EXAMPLES, SPOGOMI_INTERNATIONAL_NEWS, SPOGOMI_INTERNATIONAL_SOURCES } from "@/lib/spogomi/international-content";
import { formatDateTimeInTimeZone } from "@/lib/time/civil-date";
import type { listPublishedSpogomiEvents } from "@/lib/spogomi/public-service";
import type { Locale } from "@/lib/ui/preferences";

type PublishedEvents = Awaited<ReturnType<typeof listPublishedSpogomiEvents>>;
type Translate = (key: string) => string;

function formatDate(value: string, timeZone: string) {
  return formatDateTimeInTimeZone(value, timeZone, { dateStyle: "long" });
}
function lifecycleLabel(value: PublishedEvents[number]["lifecycle"]): string {
  if (value === "upcoming") return "À venir";
  if (value === "in_progress") return "En cours";
  if (value === "cancelled") return "Annulée";
  if (value === "postponed") return "Reportée";
  return "Terminée";
}

function registrationLabel(value: PublishedEvents[number]["registrationStatus"]): string {
  if (value === "open") return "Inscriptions ouvertes";
  if (value === "capacity_reached") return "Capacité atteinte";
  if (value === "not_open") return "Inscriptions non ouvertes";
  return "Inscriptions closes";
}

function resultsLabel(value: PublishedEvents[number]["resultsStatus"]): string {
  if (value === "published") return "Résultats publiés";
  if (value === "certified") return "Résultats certifiés";
  if (value === "provisional") return "Résultats provisoires";
  return "Résultats indisponibles";
}

function modeLabel(value: PublishedEvents[number]["mode"]): string {
  return value === "mixed" ? "Casual & World Cup" : value === "world_cup" ? "World Cup" : "Casual";
}

function provenanceLabel(value: PublishedEvents[number]["provenance"]): string {
  return value === "published_event" ? "Édition publiée · données de l’organisateur" : "Démonstration synthétique";
}

function EventCard({ event }: { event: PublishedEvents[number] }) {
  const href = `/spogomi/${encodeURIComponent(event.slug)}`;
  const isFinished = event.calendarStatus === "finished";
  const actionLabel = isFinished && event.resultsStatus !== "unavailable"
    ? "Voir les résultats publics"
    : isFinished
      ? "Voir la fiche · résultats indisponibles"
      : "Ouvrir la fiche événementielle";

  return <CmmCard tone="emerald" variant="glass" className="flex h-full flex-col gap-4 overflow-visible" data-testid="spogomi-published-event-card"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-xl font-black text-emerald-950">{event.name}</h3><div className="mt-2 flex flex-wrap gap-2"><span className="cmm-text-small rounded-full bg-emerald-100 px-3 py-1 font-bold uppercase tracking-[0.12em] text-emerald-900">{lifecycleLabel(event.lifecycle)}</span><span className="cmm-text-small rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-bold text-slate-800">{modeLabel(event.mode)}</span></div></div><SpogomiActionInfo id={`spogomi-event-info-${event.id}`} label={event.name}><div className="space-y-3 text-sm leading-6"><div><p className="font-black text-slate-950">Ce que permet cette carte</p><p>Ouvrir la fiche publique de cette compétition pour consulter son parcours et ses informations publiées.</p></div><p><span className="font-black text-slate-950">Accès :</span> édition explicitement publiée par un organisateur habilité.</p><p><span className="font-black text-slate-950">Limite :</span> les brouillons, éditions privées et données nominatives du roster restent absents.</p></div></SpogomiActionInfo></div><dl className="grid gap-2 text-sm text-slate-800 sm:grid-cols-2"><div><dt className="font-black text-slate-950">Date</dt><dd className="flex items-center gap-2"><CalendarDays size={15} className="text-emerald-700" aria-hidden="true" />{formatDate(event.startsAt, event.officialTimezone)}</dd></div><div><dt className="font-black text-slate-950">Lieu</dt><dd className="flex items-center gap-2"><MapPin size={15} className="text-emerald-700" aria-hidden="true" />{event.locationLabel}</dd></div><div><dt className="font-black text-slate-950">Inscriptions</dt><dd>{registrationLabel(event.registrationStatus)}</dd></div><div><dt className="font-black text-slate-950">Résultats</dt><dd>{resultsLabel(event.resultsStatus)}</dd></div></dl><p className="cmm-text-small text-slate-600">{provenanceLabel(event.provenance)}</p><div className="mt-auto"><CmmButton href={href} tone="primary" size="sm" variant="pill">{actionLabel}<ArrowRight size={16} aria-hidden="true" /></CmmButton></div></CmmCard>;
}

function DemoCatalogCard() {
  return <CmmCard tone="amber" variant="glass" className="space-y-3 border-amber-300 bg-amber-50/80" data-testid="spogomi-cachan-demo-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="cmm-text-small font-black uppercase tracking-[0.15em] text-amber-900">Démonstration · lecture seule</p><h3 className="text-xl font-black text-amber-950">SPOGOMI Cachan, démonstration CleanMyMap</h3><p className="mt-1 text-sm text-amber-950">Deux divisions, onze équipes et 37 places issus de la fixture canonique.</p></div><span className="cmm-text-small rounded-full border border-amber-300 bg-white/70 px-3 py-1 font-bold text-amber-950">DEMONSTRATION / NON OFFICIEL</span></div><p className="text-sm leading-6 text-amber-950">Les mesures, compositions et scores attendus sont synthétiques. Rien n’est créé dans Supabase, les statistiques environnementales, les classements officiels ou la gamification.</p><CmmButton href={SPOGOMI_CACHAN_DEMO_ROUTE} tone="secondary" size="sm" variant="pill">Voir la démonstration Cachan<ArrowRight size={16} aria-hidden="true" /></CmmButton></CmmCard>;
}

function EventGroup({ title, events }: { title: string; events: PublishedEvents }) {
  if (!events.length) return null;
  return <div className="space-y-3"><h3 className="text-xl font-black text-slate-950">{title}</h3><div className="grid gap-4 lg:grid-cols-2">{events.map((event) => <EventCard key={event.id} event={event} />)}</div></div>;
}

export function SpogomiPublicEvents({ events, loadError }: { events: PublishedEvents; loadError: boolean }) {
  const activeEvents = events.filter((event) => event.calendarStatus !== "finished");
  const finishedEvents = events.filter((event) => event.calendarStatus === "finished");
  return <section id="spogomi-events" className="scroll-mt-6 space-y-5" aria-labelledby="spogomi-events-title"><div aria-hidden="true" className="sr-only"><span id="spogomi-registration" /><span id="spogomi-team" /><span id="spogomi-identity" /><span id="spogomi-assistance" /><span id="spogomi-results" /><span id="spogomi-contributions" /><span id="spogomi-attestations" /></div><div><h2 id="spogomi-events-title" className="text-2xl font-black text-slate-950">Compétitions publiques</h2><p className="cmm-text-body mt-1 text-slate-950">Les éditions publiées sont classées par calendrier ; les résultats et leur provenance restent affichés séparément.</p></div><DemoCatalogCard />{loadError ? <CmmFeedback tone="error" title="Compétitions indisponibles">Les compétitions publiées ne peuvent pas être chargées pour le moment. Réessayez plus tard.</CmmFeedback> : events.length === 0 ? <CmmCard tone="slate" variant="glass" className="border-dashed"><p className="font-bold text-slate-900">Aucune compétition SPOGOMI publiée pour le moment.</p><p className="mt-2 text-sm text-slate-950">Les brouillons, éditions privées et éditions annulées ne sont pas exposés dans ce catalogue.</p></CmmCard> : <div className="space-y-6"><EventGroup title="À venir et en cours" events={activeEvents} /><EventGroup title="Éditions terminées" events={finishedEvents} /></div>}</section>;
}

export function SpogomiUnderstanding({ locale, t }: { locale: Locale; t: Translate }) {
  const international = {
    locale,
    sources: SPOGOMI_INTERNATIONAL_SOURCES,
    news: SPOGOMI_INTERNATIONAL_NEWS,
    externalEvents: SPOGOMI_EXTERNAL_EVENTS,
    copy: {
      worldTitle: t("international.worldTitle"),
      worldDescription: t("international.worldDescription"),
      cleanMyMapRole: t("international.cleanMyMapRole"),
      officialSources: t("international.officialSources"),
      verifiedOn: t("international.verifiedOn"),
      newsTitle: t("international.newsTitle"),
      confirmed: t("international.confirmed"),
      planned: t("international.planned"),
      dateSet: t("international.dateSet"),
      internationalEvents: t("international.eventsTitle"),
      year: t("international.year"),
      country: t("international.country"),
      allYears: t("international.allYears"),
      allCountries: t("international.allCountries"),
      externalEvent: t("international.externalEvent"),
      source: t("international.source"),
      noExternalEvents: t("international.noExternalEvents"),
    },
  };

  return (
    <section className="space-y-4" aria-labelledby="spogomi-understanding-title">
      <UnderstandingIntro t={t} />
      <SpogomiUnderstandingTabs
        copy={{
          presentationTab: t("understanding.presentationTab"),
          formatsTab: t("understanding.formatsTab"),
          rulesTab: t("understanding.rulesTab"),
          worldTab: t("understanding.worldTab"),
          presentationTitle: t("understanding.presentationTitle"),
          presentationDescription: t("international.worldDescription"),
          casualTitle: t("international.casualTitle"),
          casualDescription: t("international.casualDescription"),
          worldCupTitle: t("international.worldCupTitle"),
          worldCupDescription: t("international.worldCupDescription"),
          rulesDescription: t("understanding.rulesDescription"),
          rulesCasual: t("understanding.rulesCasual"),
          rulesWorldCup: t("understanding.rulesWorldCup"),
          rulesSafety: t("understanding.rulesSafety"),
          rulesSanctions: t("understanding.rulesSanctions"),
          rulesHistoricalExamplesTitle: t("understanding.rulesHistoricalExamplesTitle"),
          rulesPrivacyNote: t("understanding.rulesPrivacyNote"),
          examples: SPOGOMI_HISTORICAL_EXAMPLES.map((example) => ({
            id: example.id,
            text: t(`understanding.${example.copyKey}`),
            sourceLabel: example.sourceLabel,
            sourceUrl: example.sourceUrl,
            additionalSources: example.additionalSources?.map((source) => ({ href: source.href, label: source.label[locale] })),
          })),
          international,
        }}
      />
    </section>
  );
}

function UnderstandingIntro({ t }: { t: Translate }) {
  return <div>
    <h2 id="spogomi-understanding-title" className="flex items-center gap-2 text-2xl font-black text-slate-950"><CmmIcon icon={BookOpen} className="text-emerald-700" />{t("understanding.title")}</h2>
    <p className="cmm-text-body mt-1 text-slate-950">{t("understanding.description")}</p>
  </div>;
}
