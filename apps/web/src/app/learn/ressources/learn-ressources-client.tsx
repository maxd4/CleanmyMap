"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Leaf,
  Recycle,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, type Locale } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import { LEARN_RESOURCE_EVENTS } from "@/lib/learning/learn-rubric-data";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

const locales = { fr, en: enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type LearnLocale = "fr" | "en";

type ResourceTone = "amber" | "cyan" | "emerald";

type ResourceSpotlight = {
  key: string;
  icon: LucideIcon;
  tone: ResourceTone;
  title: { fr: string; en: string };
  lead: { fr: string; en: string };
  items: { fr: string; en: string }[];
  action?: {
    href: string;
    label: { fr: string; en: string };
  };
};

const RESOURCE_SPOTLIGHTS: ResourceSpotlight[] = [
  {
    key: "kit",
    icon: Sparkles,
    tone: "amber",
    title: { fr: "Kit terrain", en: "Field kit" },
    lead: {
      fr: "Une pochette courte pour partir vite.",
      en: "A short kit to leave quickly.",
    },
    items: [
      { fr: "Protocole sécurité", en: "Safety protocol" },
      { fr: "Guide référent local", en: "Local coordinator guide" },
      { fr: "Checklist de sortie", en: "Departure checklist" },
    ],
  },
  {
    key: "sorting",
    icon: Recycle,
    tone: "emerald",
    title: { fr: "Repères de tri", en: "Sorting cues" },
    lead: {
      fr: "Les cas courants, sans jargon.",
      en: "Common cases, no jargon.",
    },
    items: [
      { fr: "Mégots: à part et au sec", en: "Butts: separate and dry" },
      { fr: "Verre / métal: séparer les flux", en: "Glass / metal: separate flows" },
      { fr: "Mixte: isoler et noter", en: "Mixed: isolate and note" },
    ],
    action: {
      href: "/sections/recycling",
      label: { fr: "Ouvrir l'assistant tri", en: "Open sorting assistant" },
    },
  },
  {
    key: "events",
    icon: CalendarDays,
    tone: "cyan",
    title: { fr: "Événements utiles", en: "Useful events" },
    lead: {
      fr: "Les rendez-vous visibles tout de suite.",
      en: "The meetups visible right away.",
    },
    items: LEARN_RESOURCE_EVENTS.map((event) => ({
      fr: `${formatEventLabel("fr", event)} · ${event.title}`,
      en: `${formatEventLabel("en", event)} · ${event.title}`,
    })),
    action: {
      href: "#calendrier",
      label: { fr: "Voir le calendrier", en: "View calendar" },
    },
  },
];

const RESOURCE_TONE_CLASSES: Record<
  ResourceTone,
  {
    shell: string;
    badge: string;
    accent: string;
    dot: string;
    border: string;
    glow: string;
    chip: string;
  }
> = {
  amber: {
    shell: "bg-[linear-gradient(180deg,rgba(255,248,231,0.98),rgba(255,255,255,0.96))]",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "text-amber-700",
    dot: "bg-amber-600",
    border: "border-amber-200",
    glow: "from-amber-200/18 via-orange-100/10 to-transparent",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
  cyan: {
    shell: "bg-[linear-gradient(180deg,rgba(255,250,238,0.98),rgba(255,255,255,0.96))]",
    badge: "border-orange-200 bg-orange-50 text-orange-900",
    accent: "text-orange-700",
    dot: "bg-orange-600",
    border: "border-orange-200",
    glow: "from-orange-200/16 via-amber-100/10 to-transparent",
    chip: "border-orange-200 bg-orange-50 text-orange-800",
  },
  emerald: {
    shell: "bg-[linear-gradient(180deg,rgba(255,248,232,0.98),rgba(255,255,255,0.96))]",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "text-amber-700",
    dot: "bg-amber-600",
    border: "border-amber-200",
    glow: "from-amber-200/16 via-orange-100/10 to-transparent",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
};

function formatEventLabel(locale: LearnLocale, event: { start: Date }) {
  const resolvedLocale: Locale = locale === "fr" ? fr : enUS;
  return `${format(event.start, "d MMM", { locale: resolvedLocale })} · ${format(
    event.start,
    "HH:mm",
    { locale: resolvedLocale },
  )}`;
}

function ResourceSpotlightCard({
  locale,
  spotlight,
  index,
}: {
  locale: LearnLocale;
  spotlight: ResourceSpotlight;
  index: number;
}) {
  const Icon = spotlight.icon;
  const tone = RESOURCE_TONE_CLASSES[spotlight.tone];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[1.85rem] border bg-white p-4 shadow-sm transition duration-150 ease-out hover:-translate-y-1 hover:shadow-md",
        tone.border,
      )}
    >
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br", tone.glow)} aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border", tone.badge)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-xl font-black tracking-tight text-slate-900">
          {spotlight.title[locale]}
        </h3>
        <p className="text-sm leading-relaxed text-slate-600">
          {spotlight.lead[locale]}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {spotlight.items.map((item) => (
          <div
            key={`${spotlight.key}-${item[locale]}`}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.14em]",
              tone.chip,
            )}
          >
            <span className="min-w-0 text-left">{item[locale]}</span>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
          </div>
        ))}
      </div>

      {spotlight.action ? (
        <Link
          href={spotlight.action.href}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-50"
        >
          {spotlight.action.label[locale]}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}

function EventRow({
  locale,
  title,
  start,
  end,
}: {
  locale: LearnLocale;
  title: string;
  start: Date;
  end: Date;
}) {
  const resolvedLocale: Locale = locale === "fr" ? fr : enUS;
  const dayLabel = format(start, "EEE d MMM", { locale: resolvedLocale });
  const timeLabel = `${format(start, "HH:mm", { locale: resolvedLocale })} - ${format(
    end,
    "HH:mm",
    { locale: resolvedLocale },
  )}`;

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {dayLabel}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
        </div>
        <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

export function LearnRessourcesOverview({ locale }: { locale: LearnLocale }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-4 md:grid-cols-3">
        {RESOURCE_SPOTLIGHTS.map((spotlight, index) => (
          <ResourceSpotlightCard key={spotlight.key} locale={locale} spotlight={spotlight} index={index + 1} />
        ))}
      </div>

      <aside className="rounded-[1.85rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {locale === "fr" ? "Aperçu immédiat" : "Immediate overview"}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {locale === "fr" ? "Deux rendez-vous visibles" : "Two visible meetups"}
            </h3>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {LEARN_RESOURCE_EVENTS.map((event) => (
            <EventRow
              key={event.title}
              locale={locale}
              title={event.title}
              start={event.start}
              end={event.end}
            />
          ))}
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {locale === "fr" ? "Orientation" : "Orientation"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Le calendrier reste un support. Les trois blocs du haut servent d'entrée rapide."
              : "The calendar stays supportive. The three blocks above are the quick entry points."}
          </p>
          <Link
            href="#calendrier"
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-50"
          >
            {locale === "fr" ? "Voir le calendrier" : "View the calendar"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </section>
  );
}

export function LearnRessourcesClient() {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";

  useEffect(() => {
    recordLearnPageVisit("ressources");
  }, []);

  const sortingCues = [
    {
      icon: Recycle,
      tone: "emerald",
      title: { fr: "Mégots", en: "Butts" },
      text: {
        fr: "À part, dans un contenant fermé et au sec.",
        en: "Keep separate, sealed, and dry.",
      },
    },
    {
      icon: BookOpen,
      tone: "cyan",
      title: { fr: "Verre / métal", en: "Glass / metal" },
      text: {
        fr: "Sacs distincts pour éviter la contamination croisée.",
        en: "Use separate bags to avoid cross-contamination.",
      },
    },
    {
      icon: Leaf,
      tone: "emerald",
      title: { fr: "Plastique", en: "Plastic" },
      text: {
        fr: "Regrouper les matières séparables, sans mélanger le mixte.",
        en: "Group separable materials and keep mixed waste apart.",
      },
    },
    {
      icon: TriangleAlert,
      tone: "amber",
      title: { fr: "Mixte", en: "Mixed" },
      text: {
        fr: "Isoler le non triable et noter la raison terrain.",
        en: "Isolate non-sortable waste and note why on site.",
      },
    },
  ] as const;

  const cueToneClasses = {
    amber: "text-amber-700",
    cyan: "text-orange-700",
    emerald: "text-amber-700",
  } as const;

  return (
    <LearnRubricShell
      title={{ fr: "Ressources", en: "Resources" }}
      subtitle={{
        fr: "Kit terrain, repères de tri et événements utiles",
        en: "Field kit, sorting cues and useful events",
      }}
      description={{
        fr: "Trois portes d'entrée visibles d'abord, puis un calendrier plus léger pour garder la page orientée action.",
        en: "Three visible entry points first, then a lighter calendar to keep the page action-oriented.",
      }}
      backHref="/learn/hub"
      backLabel={{ fr: "Retour au hub", en: "Back to hub" }}
      accent="yellow"
      highlights={[
        { fr: "Kit terrain", en: "Field kit" },
        { fr: "Repères de tri", en: "Sorting cues" },
        { fr: "Événements", en: "Events" },
      ]}
      cta={{
        href: "/learn/comprendre",
        label: { fr: "Voir le contexte", en: "See the context" },
      }}
    >
      <div className="space-y-6">
        <LearnRessourcesOverview locale={locale} />

        <section id="calendrier" className="grid gap-4 lg:grid-cols-[0.98fr_1.02fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {isFrench ? "Calendrier léger" : "Light calendar"}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {isFrench ? "Un support, pas le centre de gravité" : "Supportive, not the center of gravity"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {isFrench
                    ? "Le mois courant reste lisible, mais les trois blocs du haut donnent l'entrée principale."
                    : "The current month stays readable, but the three blocks above remain the main entry."}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {isFrench ? "Événements" : "Events"}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {LEARN_RESOURCE_EVENTS.length}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {isFrench ? "Repères" : "Cues"}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-amber-800">4</p>
              </div>
              <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {isFrench ? "Support" : "Support"}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-amber-800">1</p>
              </div>
            </div>

            <div className="mt-4 h-[420px] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-3">
              <Calendar
                localizer={localizer}
                events={LEARN_RESOURCE_EVENTS}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                culture={locale}
                defaultView="month"
                views={["month"]}
                toolbar={false}
              />
            </div>
          </article>

          <article className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {isFrench ? "Repères de tri" : "Sorting cues"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {isFrench ? "Les gestes qui reviennent le plus" : "The gestures that come back most often"}
              </h2>
            </div>

            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-600">
                {isFrench
                  ? "Les repères sont réduits à l'essentiel pour tenir en lecture rapide."
                  : "The cues are reduced to the essentials so they stay quick to read."}
              </p>

              <div className="grid gap-3">
                {sortingCues.map((cue) => {
                  const Icon = cue.icon;
                  return (
                    <div
                      key={cue.title.fr}
                      className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                            <Icon size={18} className={cueToneClasses[cue.tone]} aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {isFrench ? cue.title.fr : cue.title.en}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                              {isFrench ? cue.text.fr : cue.text.en}
                            </p>
                          </div>
                        </div>
                        <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:inline-flex">
                          {String(cue.title.fr.length).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {isFrench ? "Actions rapides" : "Quick actions"}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/sections/recycling"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-slate-800"
                >
                  {isFrench ? "Ouvrir l'assistant tri" : "Open the sorting assistant"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/sections/compost"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-200 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:from-amber-600 hover:to-orange-600"
                >
                  {isFrench ? "Ouvrir le guide compost" : "Open the compost guide"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {isFrench
                  ? "Les deux destinations restent identiques. La page ne fait que mieux les présenter."
                  : "Both destinations stay identical. The page only presents them more clearly."}
              </p>
            </div>
          </article>
        </section>
      </div>
    </LearnRubricShell>
  );
}
