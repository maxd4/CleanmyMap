"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { format, type Locale } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import { LEARN_RESOURCE_EVENTS } from "@/lib/learning/learn-rubric-data";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

import {
  RESOURCE_SPOTLIGHTS,
  RESOURCE_TONE_CLASSES,
  type ResourceSpotlight,
} from "./learn-ressources-client.data";
import { cn } from "@/lib/utils";

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
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-xl font-black tracking-tight text-slate-900">{spotlight.title[locale]}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{spotlight.lead[locale]}</p>
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
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{dayLabel}</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
        </div>
        <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm">
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
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
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
            <EventRow key={event.title} locale={locale} title={event.title} start={event.start} end={event.end} />
          ))}
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
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
