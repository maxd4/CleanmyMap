"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";
import type { LearnPageId } from "@/lib/learning/learn-progress";

type LearnJourneyPageId = Exclude<LearnPageId, "hub">;

const JOURNEY_ORDER: LearnJourneyPageId[] = [
  "comprendre",
  "sentrainer",
  "bonnes-pratiques",
];

const PAGE_INDEX: Record<LearnJourneyPageId, number> = {
  comprendre: 0,
  sentrainer: 1,
  "bonnes-pratiques": 2,
};

export function LearnBlockJourneySection({
  locale,
  currentPageId,
  compact = false,
}: {
  locale: LearnLocale;
  currentPageId: LearnJourneyPageId;
  compact?: boolean;
}) {
  const cards = LEARN_OVERVIEW_CARDS[locale];
  const currentIndex = PAGE_INDEX[currentPageId];
  const nextIndex = (currentIndex + 1) % JOURNEY_ORDER.length;
  const currentCard = cards[currentIndex];
  const nextCard = cards[nextIndex];

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] shadow-sm",
        compact ? "p-4 md:p-5" : "p-5 md:p-6",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Parcours du bloc" : "Block journey"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr"
              ? compact
                ? "Un repère de parcours, pas un centre"
                : "Les portes d'entrée restent visibles ici"
              : compact
                ? "A route marker, not the center"
                : "The entry points stay visible here"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? compact
                ? "On garde le lien vers les autres rubriques, sans faire remonter tout le parcours au premier plan."
                : "Le point de départ peut être retiré ensuite: les repères de navigation vivent désormais dans chaque rubrique du bloc."
              : compact
                ? "Keep the link to other rubrics without pulling the whole journey into the foreground."
                : "The starting point can be removed later: the navigation cues now live inside each rubric of the block."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-amber-200 bg-white p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Vous êtes sur" : "You are on"}
          </p>
          <p className="mt-1 truncate text-base font-black text-slate-900">{currentCard.title}</p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{currentCard.detail}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={currentCard.href}
            aria-label={`${currentCard.title} - ${locale === "fr" ? "Rester ici" : "Stay here"}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-900 transition hover:-translate-y-[1px] hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {locale === "fr" ? "Rester ici" : "Stay here"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={nextCard.href}
            aria-label={`${nextCard.title} - ${locale === "fr" ? "Continuer" : "Continue"}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {locale === "fr" ? "Continuer" : "Continue"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {!compact ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => {
            const isCurrent = index === currentIndex;

            return (
              <article
                key={card.href}
                className={cn(
                  "flex h-full flex-col justify-between rounded-[1.45rem] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                  isCurrent
                    ? "border-amber-300 bg-amber-50/80"
                    : "border-slate-200 bg-white",
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200 bg-white text-sm font-black text-amber-700">
                      0{index + 1}
                    </span>
                    {isCurrent ? (
                      <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                        {locale === "fr" ? "Vous êtes ici" : "You are here"}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-4 text-lg font-black tracking-tight text-slate-900">{card.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.detail}</p>
                </div>

                <Link
                  href={card.href}
                  aria-label={`${card.title} - ${locale === "fr" ? "Ouvrir" : "Open"}`}
                  className={cn(
                    "mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black uppercase tracking-[0.18em] transition",
                    isCurrent
                      ? "border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                      : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  )}
                >
                  {locale === "fr" ? "Ouvrir" : "Open"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
