"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, type Locale } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarDays } from "lucide-react";
import { LEARN_RESOURCE_EVENTS } from "@/lib/learning/learn-rubric-data";

const locales = { fr, en: enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type LearnLocale = "fr" | "en";

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
    <div
      role="group"
      aria-label={`${title} · ${dayLabel} · ${timeLabel}`}
      className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {dayLabel}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
        </div>
        <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm">
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

export function LearnRessourcesCalendar({ locale }: { locale: LearnLocale }) {
  const isFrench = locale === "fr";

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {isFrench ? "Calendrier détaillé" : "Detailed calendar"}
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {isFrench ? "Le mois courant si besoin" : "The current month if needed"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
            {isFrench
              ? "Le module se charge seulement après ouverture. Il reste utile pour préparer, mais ne pèse plus sur l'entrée."
              : "The module loads only after opening. It stays useful for preparation without weighing down the entry."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
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

      <div className="mt-4 h-[360px] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-3 sm:h-[420px]">
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
          components={{
            event: ({ event }) => (
              <EventRow
                locale={locale}
                title={event.title}
                start={event.start}
                end={event.end}
              />
            ),
          }}
        />
      </div>
    </article>
  );
}
