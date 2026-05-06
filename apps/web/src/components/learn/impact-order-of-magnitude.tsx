"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Droplets, Leaf, TimerReset } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useTranslation } from "@/lib/i18n/use-translation";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  buildImpactMagnitudeSnapshot,
  DEFAULT_IMPACT_MAGNITUDE_INPUTS,
  type ImpactMagnitudeInputs,
} from "@/lib/learning/impact-magnitude";

type Preset = {
  label: { fr: string; en: string };
  value: number;
};

const BUTT_PRESETS: Preset[] = [
  { label: { fr: "5 mégots", en: "5 butts" }, value: 5 },
  { label: { fr: "10 mégots", en: "10 butts" }, value: 10 },
  { label: { fr: "25 mégots", en: "25 butts" }, value: 25 },
];

const WASTE_PRESETS: Preset[] = [
  { label: { fr: "5 kg", en: "5 kg" }, value: 5 },
  { label: { fr: "20 kg", en: "20 kg" }, value: 20 },
  { label: { fr: "100 kg", en: "100 kg" }, value: 100 },
];

const TIME_PRESETS: Preset[] = [
  { label: { fr: "15 min", en: "15 min" }, value: 15 },
  { label: { fr: "30 min", en: "30 min" }, value: 30 },
  { label: { fr: "60 min", en: "60 min" }, value: 60 },
];

export function ImpactOrderOfMagnitudeSection() {
  const { locale } = useSitePreferences();
  const { t } = useTranslation("learnHub");
  const isFrench = locale === "fr";
  const [inputs, setInputs] = useState<ImpactMagnitudeInputs>(DEFAULT_IMPACT_MAGNITUDE_INPUTS);
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(isFrench ? "fr-FR" : "en-US", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }),
    [isFrench],
  );

  const snapshot = useMemo(
    () => buildImpactMagnitudeSnapshot(inputs, IMPACT_PROXY_CONFIG.factors),
    [inputs],
  );

  function updateInput(key: keyof ImpactMagnitudeInputs, value: number) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function formatValue(value: number) {
    return formatter.format(Number.isInteger(value) ? value : Number(value.toFixed(1)));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.18em] text-slate-500">
            {t("magnitude.eyebrow")}
          </p>
          <h3 className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
            {t("magnitude.title")}
          </h3>
          <p className="max-w-2xl cmm-text-small cmm-text-secondary">
            {t("magnitude.desc")}
          </p>
        </div>

        <Link
          href="/methodologie"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
        >
          {t("magnitude.cta")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Droplets className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {t("magnitude.water.title")}
              </p>
              <h4 className="text-lg font-bold cmm-text-primary">{t("magnitude.water.subtitle")}</h4>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="space-y-2">
              <span className="block text-sm font-semibold cmm-text-primary">
                {t("magnitude.water.inputLabel")}
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={inputs.cigaretteButts}
                onChange={(event) =>
                  updateInput("cigaretteButts", Number(event.currentTarget.value))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold cmm-text-primary outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {t("magnitude.water.resultLabel")}
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-blue-700">
                {formatValue(snapshot.waterLiters)} L
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {BUTT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => updateInput("cigaretteButts", preset.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  inputs.cigaretteButts === preset.value
                    ? "border-blue-300 bg-blue-100 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {preset.label[isFrench ? "fr" : "en"]}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm cmm-text-secondary">
            {t("magnitude.water.helper", {
              count: formatValue(snapshot.cigaretteButts),
              factor: IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
              value: formatValue(snapshot.waterLiters),
            })}
          </p>
        </article>

        <div className="grid gap-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <Leaf className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {t("magnitude.waste.title")}
                </p>
                <h4 className="text-lg font-bold cmm-text-primary">{t("magnitude.waste.subtitle")}</h4>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="space-y-2">
                <span className="block text-sm font-semibold cmm-text-primary">
                  {t("magnitude.waste.inputLabel")}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={inputs.wasteKg}
                  onChange={(event) =>
                    updateInput("wasteKg", Number(event.currentTarget.value))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold cmm-text-primary outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {t("magnitude.waste.resultLabel")}
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-emerald-700">
                  {formatValue(snapshot.co2Kg)} kg CO2eq
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <InfoChip
                label={t("magnitude.waste.surfaceLabel")}
                value={`${formatValue(snapshot.surfaceM2FromWaste)} m²`}
              />
              <InfoChip
                label={t("magnitude.waste.savingsLabel")}
                value={`${formatValue(snapshot.euroSaved)} €`}
              />
              <InfoChip
                label={t("magnitude.waste.formulaLabel")}
                value={t("magnitude.waste.formula", {
                  waste: formatValue(snapshot.wasteKg),
                  factor: IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg,
                })}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {WASTE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => updateInput("wasteKg", preset.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    inputs.wasteKg === preset.value
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {preset.label[isFrench ? "fr" : "en"]}
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <TimerReset className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {t("magnitude.time.title")}
                </p>
                <h4 className="text-lg font-bold cmm-text-primary">{t("magnitude.time.subtitle")}</h4>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="space-y-2">
                <span className="block text-sm font-semibold cmm-text-primary">
                  {t("magnitude.time.inputLabel")}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={inputs.volunteerMinutes}
                  onChange={(event) =>
                    updateInput("volunteerMinutes", Number(event.currentTarget.value))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold cmm-text-primary outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {t("magnitude.time.resultLabel")}
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-amber-700">
                  {formatValue(snapshot.surfaceM2FromVolunteerTime)} m²
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => updateInput("volunteerMinutes", preset.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    inputs.volunteerMinutes === preset.value
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {preset.label[isFrench ? "fr" : "en"]}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm cmm-text-secondary">
              {t("magnitude.time.helper", {
                minutes: formatValue(snapshot.volunteerMinutes),
                factor: IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute,
                value: formatValue(snapshot.surfaceM2FromVolunteerTime),
              })}
            </p>
          </article>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm cmm-text-secondary">
          {t("magnitude.note")}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          <Calculator className="h-4 w-4" aria-hidden="true" />
          <span>{IMPACT_PROXY_CONFIG.version}</span>
        </div>
      </div>
    </section>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold cmm-text-primary">{value}</p>
    </div>
  );
}
