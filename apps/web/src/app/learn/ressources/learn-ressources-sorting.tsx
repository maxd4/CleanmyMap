"use client";

import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

import { RESOURCE_SORTING_CUES, RESOURCE_SORTING_TONE_CLASSES } from "./learn-ressources-client.data";
import { LearnArtworkAccordion } from "./learn-ressources-artwork";

export function LearnSortingCuesSection({ locale }: { locale: LearnLocale }) {
  const isFrench = locale === "fr";

  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
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
            {RESOURCE_SORTING_CUES.map((cue) => {
              const Icon = cue.icon;
              return (
                <div key={cue.title.fr} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                        <Icon size={18} className={RESOURCE_SORTING_TONE_CLASSES[cue.tone]} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900">{isFrench ? cue.title.fr : cue.title.en}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {isFrench ? cue.text.fr : cue.text.en}
                        </p>
                      </div>
                    </div>
                    <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 sm:inline-flex">
                      {String(cue.title.fr.length).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      <div className="space-y-4">
        <LearnArtworkAccordion locale={locale} />
      </div>
    </section>
  );
}
