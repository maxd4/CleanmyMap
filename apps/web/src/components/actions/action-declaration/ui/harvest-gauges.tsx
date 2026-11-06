"use client";

import { useState } from "react";
import Link from "next/link";
import { Droplet, Info, Minus, Trash2, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  clamp,
  deriveGaugeMax,
  formatCount,
  formatKg,
  formatSignedPercent,
  type HarvestReferenceStatus,
  type WasteComparisonTone,
} from "../utils/harvest-utils";

type QuantityGaugeVisualProps = {
  currentPerVolunteer?: number | null;
  benchmarkPerVolunteer?: number | null;
  benchmarkLabel?: string;
  icon: LucideIcon;
  colorClass: string;
  label: string;
  valueLabel: string;
  testId: string;
  tone: "emerald" | "blue";
  measurementAvailable: boolean;
  benchmarkSourceCount: number;
  referenceStatus: HarvestReferenceStatus;
  referenceUnitLabel: string;
};

function QuantityGaugeVisual({
  currentPerVolunteer = null,
  benchmarkPerVolunteer = null,
  benchmarkLabel,
  icon: GaugeIcon,
  colorClass,
  label,
  valueLabel,
  testId,
  tone,
  measurementAvailable,
  benchmarkSourceCount,
  referenceStatus,
  referenceUnitLabel,
}: QuantityGaugeVisualProps) {
  const [benchmarkHelpOpen, setBenchmarkHelpOpen] = useState(false);
  const hasReference = referenceStatus === "available" &&
    benchmarkPerVolunteer !== null &&
    Number.isFinite(benchmarkPerVolunteer) &&
    benchmarkPerVolunteer >= 0;
  const hasCurrent = currentPerVolunteer !== null &&
    Number.isFinite(currentPerVolunteer) &&
    currentPerVolunteer >= 0;
  const hasPositiveReference = hasReference && benchmarkPerVolunteer! > 0;
  const hasBenchmark = hasPositiveReference && hasCurrent;
  const normalized = hasBenchmark
    ? clamp(currentPerVolunteer! / (2 * benchmarkPerVolunteer!), 0, 1)
    : 0;
  const surfaceClass = tone === "emerald"
    ? "border-emerald-100 bg-emerald-50/65"
    : "border-blue-100 bg-blue-50/65";
  const dividerClass = tone === "emerald" ? "bg-emerald-300/60" : "bg-blue-300/60";
  const statusLabel = referenceStatus === "loading"
    ? "Chargement de la moyenne…"
    : referenceStatus === "insufficient"
      ? "Référence insuffisante."
      : referenceStatus === "unavailable"
        ? "Moyenne indisponible."
    : !hasCurrent
      ? measurementAvailable
        ? "Participants insuffisamment renseignés."
        : "Mesure à saisir pour comparer."
      : hasReference && !hasPositiveReference
        ? "Ratio indisponible lorsque la moyenne vaut zéro."
        : "";
  const helpId = `${testId}-benchmark-help`;
  const currentReferenceLabel = currentPerVolunteer === null
    ? "mesure absente"
    : tone === "emerald"
      ? `${formatKg(currentPerVolunteer)} kg`
      : `${formatCount(currentPerVolunteer)} mégots`;
  const sourceLabel = benchmarkSourceCount > 0
    ? `${benchmarkSourceCount} action(s) source`
    : "effectif source non renseigné";

  return (
    <figure
      className={cn("flex min-h-[244px] min-w-0 flex-col items-center justify-center rounded-2xl border px-3 py-4 sm:px-5", surfaceClass)}
      data-testid={testId}
      aria-label={`${label} : ${valueLabel}. ${hasBenchmark && benchmarkLabel ? `Moyenne par bénévole : ${benchmarkLabel}.` : statusLabel}`}
    >
      <div
        className="relative h-[min(13rem,100%)] w-[min(13rem,100%)] max-w-full shrink-0"
        data-testid={`${testId}-icon`}
        data-fill-percent={Math.round(normalized * 100)}
      >
        <GaugeIcon size={208} strokeWidth={1.35} className="absolute inset-0 h-full w-full text-slate-300/80" aria-hidden="true" />
        <div
          className="absolute inset-0 overflow-hidden transition-[clip-path] duration-500 ease-out motion-reduce:transition-none"
          style={{ clipPath: `inset(${100 - normalized * 100}% 0 0 0)` }}
          aria-hidden="true"
        >
          <GaugeIcon size={208} strokeWidth={1.35} className={cn(colorClass, "h-full w-full fill-current")} />
        </div>
        {hasReference ? (
          <div className="absolute inset-x-1 top-1/2 -translate-y-1/2">
            <div className={cn("h-1 rounded-full bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.22)]", dividerClass)} aria-hidden="true" />
            <button
              type="button"
              aria-expanded={benchmarkHelpOpen}
              aria-controls={helpId}
              aria-label="Expliquer le repère de moyenne par participant"
              onClick={() => setBenchmarkHelpOpen((open) => !open)}
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-800 shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Moyenne / bénévole
            </button>
            <span className={cn("absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black text-white", tone === "emerald" ? "bg-emerald-800" : "bg-blue-700")}>
              {benchmarkLabel}
            </span>
          </div>
        ) : null}
      </div>
      {hasReference ? (
        <div className="mt-3 max-w-full text-center">
          {benchmarkHelpOpen ? (
            <div id={helpId} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs leading-4 text-slate-600 shadow-sm" role="note">
              <p className="font-bold text-slate-800">{benchmarkLabel} / {referenceUnitLabel}</p>
              <p>{sourceLabel}.</p>
              <p className="mt-1">{hasBenchmark
                ? `Ratio : ${currentReferenceLabel} / (2 × ${benchmarkLabel}) = ${Math.round(normalized * 100)} %.`
                : hasReference && !hasPositiveReference
                  ? "Ratio non calculé : la moyenne de référence vaut zéro."
                  : "Ratio calculé dès qu’une mesure et un dénominateur valides sont disponibles."}</p>
              <Link href="/methodologie" aria-label="Ouvrir la méthodologie des références" className="mt-1 inline-flex items-center gap-1 font-bold text-blue-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Info size={13} aria-hidden="true" />Méthodologie</Link>
            </div>
          ) : (
            <p className="text-xs font-semibold text-slate-500">Repère : moyenne par bénévole</p>
          )}
        </div>
      ) : (
        <p data-testid={`${testId}-reference-status`} className="mt-3 text-center text-xs font-semibold text-slate-600" role={referenceStatus === "loading" ? "status" : undefined}>
          {statusLabel}
        </p>
      )}
      <figcaption className="sr-only">Repère visuel uniquement · le remplissage correspond à la valeur par bénévole rapportée à deux fois la moyenne et ne constitue ni une validation ni un plafond.</figcaption>
    </figure>
  );
}

export function TrashBinGauge({
  value,
  currentPerVolunteer,
  benchmarkPerVolunteer,
  benchmarkSourceCount = 0,
  referenceStatus,
}: {
  value: number | null;
  currentPerVolunteer?: number | null;
  benchmarkPerVolunteer?: number | null;
  benchmarkSourceCount?: number;
  referenceStatus?: HarvestReferenceStatus;
}) {
  const resolvedReferenceStatus = referenceStatus ?? (
    benchmarkPerVolunteer !== null && benchmarkPerVolunteer !== undefined ? "available" : "unavailable"
  );
  return (
    <QuantityGaugeVisual
      currentPerVolunteer={currentPerVolunteer}
      benchmarkPerVolunteer={benchmarkPerVolunteer}
      benchmarkLabel={benchmarkPerVolunteer === null || benchmarkPerVolunteer === undefined ? undefined : `${formatKg(benchmarkPerVolunteer)} kg`}
      icon={Trash2}
      colorClass="text-emerald-400"
      label="Quantité de déchets hors mégots"
      valueLabel={value === null ? "Non renseigné" : `${formatKg(value)} kg`}
      testId="waste-measurement-visual"
      tone="emerald"
      measurementAvailable={value !== null}
      benchmarkSourceCount={benchmarkSourceCount}
      referenceStatus={resolvedReferenceStatus}
      referenceUnitLabel="participant"
    />
  );
}

export function DropletGauge({
  value,
  currentPerVolunteer,
  benchmarkPerVolunteer,
  benchmarkLabel,
  benchmarkSourceCount = 0,
  referenceStatus,
}: {
  value: number | null;
  currentPerVolunteer?: number | null;
  benchmarkPerVolunteer?: number | null;
  benchmarkLabel?: string;
  benchmarkSourceCount?: number;
  referenceStatus?: HarvestReferenceStatus;
}) {
  const resolvedReferenceStatus = referenceStatus ?? (
    benchmarkPerVolunteer !== null && benchmarkPerVolunteer !== undefined ? "available" : "unavailable"
  );
  return (
    <QuantityGaugeVisual
      currentPerVolunteer={currentPerVolunteer}
      benchmarkPerVolunteer={benchmarkPerVolunteer}
      benchmarkLabel={benchmarkLabel ?? (benchmarkPerVolunteer === null || benchmarkPerVolunteer === undefined ? undefined : `${formatCount(benchmarkPerVolunteer)} mégots`)}
      icon={Droplet}
      colorClass="text-blue-400"
      label="Quantité de mégots retenue"
      valueLabel={value === null ? "Non renseigné" : `${formatCount(value)} mégots`}
      testId="butts-measurement-visual"
      tone="blue"
      measurementAvailable={value !== null}
      benchmarkSourceCount={benchmarkSourceCount}
      referenceStatus={resolvedReferenceStatus}
      referenceUnitLabel="participant"
    />
  );
}

export function HarvestComparisonTrend({
  currentPerVolunteer,
  benchmarkPerVolunteer,
  deltaPercent,
  benchmarkSourceCount,
  testId,
  unitLabel,
}: {
  currentPerVolunteer: number | null;
  benchmarkPerVolunteer: number | null;
  deltaPercent: number | null;
  benchmarkSourceCount: number;
  testId: string;
  unitLabel: string;
}) {
  if (
    benchmarkSourceCount < 2 ||
    currentPerVolunteer === null ||
    benchmarkPerVolunteer === null ||
    deltaPercent === null ||
    !Number.isFinite(currentPerVolunteer) ||
    !Number.isFinite(benchmarkPerVolunteer) ||
    !Number.isFinite(deltaPercent) ||
    currentPerVolunteer < 0 ||
    benchmarkPerVolunteer <= 0
  ) {
    return null;
  }

  const isAboveThreshold = deltaPercent > 5;
  const isBelowThreshold = deltaPercent < -5;
  const TrendIcon = isAboveThreshold ? TrendingUp : isBelowThreshold ? TrendingDown : Minus;
  const toneClass = isAboveThreshold
    ? "text-emerald-700"
    : isBelowThreshold
      ? "text-rose-700"
      : "text-slate-600";
  const direction = isAboveThreshold ? "montante" : isBelowThreshold ? "descendante" : "neutre";

  return (
    <p
      className={cn("flex items-center justify-center gap-1.5 text-xs font-bold", toneClass)}
      data-testid={testId}
      data-trend={isAboveThreshold ? "up" : isBelowThreshold ? "down" : "neutral"}
      aria-label={`Tendance ${direction} : ${formatSignedPercent(deltaPercent)} par rapport à la moyenne ${unitLabel}`}
    >
      <TrendIcon size={15} aria-hidden="true" />
      <span>{formatSignedPercent(deltaPercent)}</span>
      <span className="sr-only">par rapport à la moyenne {unitLabel}</span>
    </p>
  );
}

type ComparisonVisualProps = {
  currentPerVolunteer: number | null;
  benchmarkPerVolunteer: number | null;
  deltaPercent: number | null;
  comparisonTone: WasteComparisonTone;
  title: string;
  contextLabel: string;
  currentLabel: string;
  benchmarkLabel: string;
  benchmarkSourceCount: number;
  testId: string;
};

function getWasteComparisonColors(deltaPercent: number) {
  if (deltaPercent > 5) {
    return {
      accent: "text-emerald-600",
      soft: "bg-emerald-100 text-emerald-700",
      fill: "text-emerald-400",
      bar: "bg-emerald-400",
    };
  }
  if (deltaPercent < -5) {
    return {
      accent: "text-rose-600",
      soft: "bg-rose-100 text-rose-700",
      fill: "text-rose-400",
      bar: "bg-rose-400",
    };
  }
  return {
    accent: "text-slate-600",
    soft: "bg-slate-100 text-slate-600",
    fill: "text-slate-400",
    bar: "bg-slate-400",
  };
}

function ComparisonVisual({
  currentPerVolunteer,
  benchmarkPerVolunteer,
  deltaPercent,
  title,
  contextLabel,
  currentLabel,
  benchmarkLabel,
  testId,
  benchmarkSourceCount,
}: ComparisonVisualProps) {
  if (benchmarkSourceCount < 2) return null;
  if (
    currentPerVolunteer === null ||
    benchmarkPerVolunteer === null ||
    !Number.isFinite(currentPerVolunteer) ||
    !Number.isFinite(benchmarkPerVolunteer) ||
    currentPerVolunteer < 0 ||
    benchmarkPerVolunteer < 0
  ) {
    return null;
  }

  if (benchmarkPerVolunteer <= 0) return null;

  if (
    deltaPercent === null ||
    !Number.isFinite(deltaPercent)
  ) {
    return null;
  }

  const colors = getWasteComparisonColors(deltaPercent);
  const maxValue = deriveGaugeMax([currentPerVolunteer, benchmarkPerVolunteer], 1);
  const currentBarWidth = `${clamp((currentPerVolunteer / maxValue) * 100, 0, 100)}%`;
  const benchmarkMarkerLeft = `${clamp((benchmarkPerVolunteer / maxValue) * 100, 0, 100)}%`;
  const TrendIcon =
    deltaPercent > 5 ? TrendingUp : deltaPercent < -5 ? TrendingDown : Minus;
  const trendLabel =
    deltaPercent > 5
      ? "Au-dessus de la moyenne"
      : deltaPercent < -5
        ? "En dessous de la moyenne"
        : "Proche de la moyenne";

  return (
    <div
      className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3"
      data-trend={deltaPercent > 5 ? "up" : deltaPercent < -5 ? "down" : "neutral"}
      data-testid={testId}
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", colors.soft)}>
          <TrendIcon size={19} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-bold", colors.accent)}>{trendLabel}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{contextLabel}</p>
        </div>
        <div className={cn("text-right text-lg font-black", colors.accent)}>
          <span>{formatSignedPercent(deltaPercent)}</span>
          <span className="sr-only">{title}</span>
        </div>
      </div>

      <div className="mt-2">
        <div className="relative h-2 rounded-full bg-slate-200" aria-hidden="true">
          <div className={cn("absolute inset-y-0 left-0 rounded-full", colors.bar)} style={{ width: currentBarWidth }} />
          <div
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-slate-900/70"
            style={{ left: benchmarkMarkerLeft }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
          <span>{currentLabel}</span>
          <span>{benchmarkLabel}</span>
        </div>
      </div>
      <p className="mt-2 text-xs leading-4 text-slate-500">
        Couleur : quantité relative collectée uniquement, pas qualité ni efficacité environnementale.
      </p>
    </div>
  );
}

export function WasteComparisonVisual({
  currentPerVolunteer,
  benchmarkPerVolunteer,
  deltaPercent,
  comparisonTone,
  benchmarkSourceCount,
}: Omit<ComparisonVisualProps, "title" | "contextLabel" | "currentLabel" | "benchmarkLabel" | "testId">) {
  return (
    <ComparisonVisual
      currentPerVolunteer={currentPerVolunteer}
      benchmarkPerVolunteer={benchmarkPerVolunteer}
      deltaPercent={deltaPercent}
      comparisonTone={comparisonTone}
      title="Comparaison visuelle"
      contextLabel={`Moyenne par unité opérationnelle estimée · ${benchmarkSourceCount} action(s)`}
      currentLabel={`${formatKg(currentPerVolunteer ?? 0)} kg / unité opérationnelle`}
      benchmarkLabel={`moyenne : ${formatKg(benchmarkPerVolunteer ?? 0)} kg / unité`}
      benchmarkSourceCount={benchmarkSourceCount}
      testId="waste-comparison-visual"
    />
  );
}

export function ButtsComparisonVisual({
  currentPerVolunteer,
  benchmarkPerVolunteer,
  deltaPercent,
  comparisonTone,
  benchmarkSourceCount,
}: Omit<ComparisonVisualProps, "title" | "contextLabel" | "currentLabel" | "benchmarkLabel" | "testId">) {
  return (
    <ComparisonVisual
      currentPerVolunteer={currentPerVolunteer}
      benchmarkPerVolunteer={benchmarkPerVolunteer}
      deltaPercent={deltaPercent}
      comparisonTone={comparisonTone}
      title="Comparaison visuelle des mégots"
      contextLabel={`Moyenne par unité opérationnelle estimée · ${benchmarkSourceCount} action(s)`}
      currentLabel={`${formatCount(currentPerVolunteer ?? 0)} mégots / unité opérationnelle`}
      benchmarkLabel={`moyenne : ${formatCount(benchmarkPerVolunteer ?? 0)} mégots / unité`}
      benchmarkSourceCount={benchmarkSourceCount}
      testId="butts-comparison-visual"
    />
  );
}
