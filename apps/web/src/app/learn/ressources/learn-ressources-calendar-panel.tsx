"use client";

import dynamic from "next/dynamic";
import { CalendarDays } from "lucide-react";

import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

import { useDisclosureState } from "./learn-ressources-client.state";

const DeferredLearnRessourcesCalendar = dynamic(
  () => import("./learn-ressources-calendar").then((module) => module.LearnRessourcesCalendar),
  {
    ssr: false,
    loading: () => <div className="h-[420px] rounded-[1.6rem] border border-slate-200 bg-slate-50/80" aria-hidden="true" />,
  },
);

export function LearnRessourcesCalendarPanel({ locale }: { locale: LearnLocale }) {
  const { isOpen, handleToggle } = useDisclosureState(false);

  return (
    <details
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      open={isOpen}
      onToggle={handleToggle}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 rounded-[1.35rem] px-3 py-2 outline-none transition hover:bg-slate-50/70 focus-visible:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Calendrier léger" : "Light calendar"}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Ouvrir le calendrier si besoin" : "Open the calendar when needed"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Le calendrier se charge à la demande. Les trois blocs du haut suffisent pour l'entrée rapide."
              : "The calendar loads on demand. The three blocks above are enough for the quick entry."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
      </summary>

      <div className="mt-4">
        {isOpen ? (
          <DeferredLearnRessourcesCalendar locale={locale} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Charge" : "Load"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">{locale === "fr" ? "À la demande" : "On demand"}</p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Usage" : "Usage"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {locale === "fr" ? "Support secondaire" : "Secondary support"}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Accès" : "Access"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {locale === "fr" ? "Une ouverture manuelle" : "Manual opening"}
              </p>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
