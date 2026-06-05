"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, ChevronRight, Scale, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  buildImpactMagnitudeSnapshot,
  type ImpactMagnitudeInputs,
} from "@/lib/learning/impact-magnitude";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";

type LearnVulgarisationMagnitudeComparatorProps = {
  className?: string;
};

type MagnitudeScenarioId = "petit" | "terrain" | "collectif";

type MagnitudeScenario = {
  label: { fr: string; en: string };
  description: { fr: string; en: string };
  inputs: ImpactMagnitudeInputs;
};

const SCENARIOS: Record<MagnitudeScenarioId, MagnitudeScenario> = {
  petit: {
    label: { fr: "Petit geste", en: "Small gesture" },
    description: {
      fr: "Un signal faible, utile pour expliquer la logique avant de parler de volume.",
      en: "A small signal, useful to explain the logic before talking about volume.",
    },
    inputs: {
      cigaretteButts: 5,
      wasteKg: 5,
      volunteerMinutes: 15,
    },
  },
  terrain: {
    label: { fr: "Sortie terrain", en: "Field outing" },
    description: {
      fr: "Le cas d'une action standard: assez grand pour commencer à comparer les effets.",
      en: "A standard action: large enough to start comparing effects.",
    },
    inputs: {
      cigaretteButts: 10,
      wasteKg: 20,
      volunteerMinutes: 30,
    },
  },
  collectif: {
    label: { fr: "Collectif", en: "Collective action" },
    description: {
      fr: "Quand plusieurs personnes et plusieurs heures s'additionnent sur une même zone.",
      en: "When several people and several hours add up on the same area.",
    },
    inputs: {
      cigaretteButts: 25,
      wasteKg: 100,
      volunteerMinutes: 60,
    },
  },
};

const SCENARIO_ORDER: MagnitudeScenarioId[] = ["petit", "terrain", "collectif"];

function formatMagnitude(locale: "fr" | "en", value: number): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(Number.isInteger(value) ? value : Number(value.toFixed(1)));
}

export function LearnVulgarisationMagnitudeComparator({
  className,
}: LearnVulgarisationMagnitudeComparatorProps) {
  const { locale } = useSitePreferences();
  const [scenarioId, setScenarioId] = useState<MagnitudeScenarioId>("terrain");
  const scenario = SCENARIOS[scenarioId];
  const snapshot = useMemo(
    () => buildImpactMagnitudeSnapshot(scenario.inputs, IMPACT_PROXY_CONFIG.factors),
    [scenario.inputs],
  );

  const rawCards = [
    {
      label: locale === "fr" ? "Mégots" : "Butts",
      value: formatMagnitude(locale, snapshot.cigaretteButts),
    },
    {
      label: locale === "fr" ? "Déchets" : "Waste",
      value: `${formatMagnitude(locale, snapshot.wasteKg)} kg`,
    },
    {
      label: locale === "fr" ? "Temps" : "Time",
      value: `${formatMagnitude(locale, snapshot.volunteerMinutes)} min`,
    },
  ];

  const translatedCards = [
    {
      label: locale === "fr" ? "Eau mobilisée" : "Water mobilized",
      value: `${formatMagnitude(locale, snapshot.waterLiters)} L`,
    },
    {
      label: locale === "fr" ? "CO2eq" : "CO2eq",
      value: `${formatMagnitude(locale, snapshot.co2Kg)} kg`,
    },
    {
      label: locale === "fr" ? "Surface lue" : "Area read",
      value: `${formatMagnitude(locale, snapshot.surfaceM2FromWaste)} m²`,
    },
    {
      label: locale === "fr" ? "Valeur utile" : "Useful value",
      value: `${formatMagnitude(locale, snapshot.euroSaved)} €`,
    },
  ];

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-white p-5 shadow-sm md:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-800">
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Comparateur d'échelle" : "Scale comparator"}
            </p>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr"
              ? "Passer du chiffre brut au sens utile"
              : "Move from raw number to useful meaning"}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Ce comparateur montre la bascule entre ce qu'on voit au départ et ce que CleanMyMap permet de lire ensuite."
              : "This comparator shows the shift between what you see at the start and what CleanMyMap lets you read afterwards."}
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Signal de lecture" : "Reading signal"}
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight text-amber-900">
            {locale === "fr" ? "Avant / Après" : "Before / After"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {locale === "fr"
              ? "Une lecture, deux niveaux."
              : "One reading, two levels."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {SCENARIO_ORDER.map((id) => {
          const isActive = id === scenarioId;
          const scenarioLabel = SCENARIOS[id].label[locale];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setScenarioId(id)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs font-black uppercase tracking-[0.16em] transition",
                isActive
                  ? "border-amber-300 bg-amber-100 text-amber-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {scenarioLabel}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <article className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {locale === "fr" ? "Avant" : "Before"}
            </p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
              <Scale className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 text-lg font-black tracking-tight text-slate-900">
            {scenario.label[locale]}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {scenario.description[locale]}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {rawCards.map((card) => (
              <div key={card.label} className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </article>

        <div className="flex items-center justify-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-800">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <article className="rounded-[1.6rem] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,250,238,0.96),rgba(255,255,255,0.98))] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Après" : "After"}
            </p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-800 shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 text-lg font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Lecture CleanMyMap" : "CleanMyMap reading"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Le même cas devient lisible à l'échelle utile: eau, CO2, surface et valeur de l'action."
              : "The same case becomes readable at a useful scale: water, CO2, surface and value of action."}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {translatedCards.map((card) => (
              <div key={card.label} className="rounded-[1.1rem] border border-amber-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {card.label}
                </p>
                <p className="mt-1 text-lg font-black tracking-tight text-amber-900">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {locale === "fr" ? "Note de lecture" : "Reading note"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {locale === "fr"
            ? "On ne remplace pas le chiffre brut, on l'accompagne d'une échelle qui permet de décider, d'expliquer et de prioriser."
            : "We do not replace the raw number; we pair it with a scale that helps decide, explain and prioritize."}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          <span>{IMPACT_PROXY_CONFIG.version}</span>
        </div>
      </div>
    </section>
  );
}
