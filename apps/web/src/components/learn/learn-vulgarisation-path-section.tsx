"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  MapPinned,
  Route,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type LearnVulgarisationPathSectionProps = {
  locale: LearnLocale;
};

type LearnVulgarisationStep = {
  number: string;
  title: { fr: string; en: string };
  detail: { fr: string; en: string };
  href: string;
  linkLabel: { fr: string; en: string };
  icon: LucideIcon;
};

const STEPS: LearnVulgarisationStep[] = [
  {
    number: "01",
    title: { fr: "Contexte", en: "Context" },
    detail: {
      fr: "Commencer par ce que l'on mesure et pourquoi le sujet compte avant de lire un chiffre.",
      en: "Start with what is being measured and why the topic matters before reading a number.",
    },
    href: "/methodologie",
    linkLabel: { fr: "Voir la méthode", en: "See the method" },
    icon: BookOpenText,
  },
  {
    number: "02",
    title: { fr: "Ordres de grandeur", en: "Orders of magnitude" },
    detail: {
      fr: "Comparer un petit geste, un sac, une zone ou un mois complet sur la même échelle.",
      en: "Compare a small gesture, a bag, a zone or a full month on the same scale.",
    },
    href: "/reports",
    linkLabel: { fr: "Lire un rapport", en: "Read a report" },
    icon: BarChart3,
  },
  {
    number: "03",
    title: { fr: "Méthodologie", en: "Methodology" },
    detail: {
      fr: "Relier la donnée au calcul, au proxy et à la façon dont CleanMyMap transforme l'action.",
      en: "Link the data to the calculation, the proxy and the way CleanMyMap turns action into insight.",
    },
    href: "/actions/new",
    linkLabel: { fr: "Déclarer une action", en: "Declare an action" },
    icon: Route,
  },
  {
    number: "04",
    title: { fr: "Exemples CleanMyMap", en: "CleanMyMap examples" },
    detail: {
      fr: "Passer du concept au terrain: carte, rapport et décision utilitaire.",
      en: "Move from concept to field use: map, report and useful decision.",
    },
    href: "/actions/map",
    linkLabel: { fr: "Ouvrir la carte", en: "Open the map" },
    icon: MapPinned,
  },
];

const USEFUL_CUES = {
  fr: [
    "Lire un rapport sans surinterpréter",
    "Préparer une action avec le bon niveau de détail",
    "Expliquer simplement au collectif",
  ],
  en: [
    "Read a report without over-interpreting it",
    "Prepare an action with the right level of detail",
    "Explain things simply to the group",
  ],
} as const;

export function LearnVulgarisationPathSection({
  locale,
}: LearnVulgarisationPathSectionProps) {
  const currentStep = 1;
  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <section className="rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-800">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Lecture en 4 temps" : "Four-step reading"}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              {locale === "fr"
                ? "1 idée = 1 carte, puis on monte en échelle"
                : "1 idea = 1 card, then we scale up"}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {locale === "fr"
                ? "La vulgarisation doit d'abord faire comprendre, ensuite comparer, puis seulement ouvrir la porte à l'action."
                : "Explanation should first make things understandable, then comparable, and only then open the door to action."}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[1.4rem] border border-amber-200 bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {locale === "fr" ? "Progression de lecture" : "Reading progress"}
                </p>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {String(currentStep).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${progressPercent}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>

        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-800">
          <Route className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep - 1;

          return (
            <article
              key={step.number}
              className={cn(
                "flex h-full flex-col justify-between rounded-[1.45rem] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                isActive
                  ? "border-amber-300 bg-amber-50/80"
                  : "border-slate-200 bg-white",
              )}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200 bg-white text-sm font-black text-amber-700">
                    {step.number}
                  </span>
                  {isActive ? (
                    <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                      {locale === "fr" ? "Point de départ" : "Starting point"}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-lg font-black tracking-tight text-slate-900">
                      {step.title[locale]}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {step.detail[locale]}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={step.href}
                className={cn(
                  "mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black uppercase tracking-[0.18em] transition",
                  isActive
                    ? "border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                    : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100",
                )}
              >
                {step.linkLabel[locale]}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Dans CleanMyMap" : "In CleanMyMap"}
          </p>
          {USEFUL_CUES[locale].map((cue) => (
            <span
              key={cue}
              className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-900"
            >
              {cue}
            </span>
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          {locale === "fr"
            ? "Cette séquence sert à passer du contexte à l'usage sans perdre l'échelle ni la rigueur de lecture."
            : "This sequence moves from context to use without losing scale or reading rigor."}
        </p>
      </div>
    </section>
  );
}
