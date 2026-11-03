"use client";

import { Droplet, Minus, Trash2, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  clamp,
  deriveGaugeMax,
  formatCount,
  formatKg,
  formatSignedPercent,
  type WasteComparisonTone,
} from "../utils/harvest-utils";

/** UI-only display spans; they never validate, convert, or interpret a measurement. */
export const HARVEST_WASTE_VISUAL_SCALE_KG = 10;
export const HARVEST_BUTTS_VISUAL_SCALE_COUNT = 5_000;

type QuantityGaugeVisualProps = {
  value: number | null;
  scale: number;
  icon: LucideIcon;
  colorClass: string;
  label: string;
  valueLabel: string;
  testId: string;
};

function QuantityGaugeVisual({
  value,
  scale,
  icon: GaugeIcon,
  colorClass,
  label,
  valueLabel,
  testId,
}: QuantityGaugeVisualProps) {
  const safeValue = value !== null && Number.isFinite(value) && value >= 0 ? value : 0;
  const normalized = clamp(safeValue / scale, 0, 1);

  return (
    <div
      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
      data-testid={testId}
      role="img"
      aria-label={`${label} : ${valueLabel}. Trois icônes indiquent uniquement la quantité déclarée, indépendamment des moyennes historiques.`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <span className="text-xs font-semibold text-slate-600">{valueLabel}</span>
      </div>
      <div className="mt-3 flex items-end justify-center gap-2">
        {[0, 1, 2].map((index) => {
          const fill = clamp(normalized * 3 - index, 0, 1) * 100;
          return (
            <div
              key={index}
              className="relative h-9 w-9"
              data-testid={`${testId}-icon`}
              data-fill-percent={Math.round(fill)}
            >
              <GaugeIcon size={36} strokeWidth={1.6} className="absolute inset-0 text-slate-200" aria-hidden="true" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(${100 - fill}% 0 0 0)` }}
                aria-hidden="true"
              >
                <GaugeIcon size={36} strokeWidth={1.6} className={cn(colorClass, "fill-current")} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">Repère visuel uniquement · l’échelle n’est pas un seuil scientifique</p>
    </div>
  );
}

export function TrashBinGauge({ value }: { value: number | null }) {
  return (
    <QuantityGaugeVisual
      value={value}
      scale={HARVEST_WASTE_VISUAL_SCALE_KG}
      icon={Trash2}
      colorClass="text-emerald-400"
      label="Quantité de déchets hors mégots"
      valueLabel={`${formatKg(value ?? 0)} kg`}
      testId="waste-measurement-visual"
    />
  );
}

export function DropletGauge({ value }: { value: number | null }) {
  return (
    <QuantityGaugeVisual
      value={value}
      scale={HARVEST_BUTTS_VISUAL_SCALE_COUNT}
      icon={Droplet}
      colorClass="text-amber-400"
      label="Quantité de mégots retenue"
      valueLabel={`${formatCount(value ?? 0)} mégots`}
      testId="butts-measurement-visual"
    />
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
      fill: "text-emerald-400",
      bar: "bg-emerald-400",
    };
  }
  if (deltaPercent < -5) {
    return {
      accent: "text-rose-600",
      fill: "text-rose-400",
      bar: "bg-rose-400",
    };
  }
  return {
    accent: "text-slate-600",
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
      ? "au-dessus de la moyenne historique"
      : deltaPercent < -5
        ? "en dessous de la moyenne historique"
        : "proche de la moyenne historique";

  return (
    <div
      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
      data-trend={deltaPercent > 5 ? "up" : deltaPercent < -5 ? "down" : "neutral"}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{contextLabel}</p>
        </div>
        <div className={cn("flex shrink-0 items-center gap-1 text-xs font-bold", colors.accent)}>
          <TrendIcon size={14} aria-hidden="true" />
          <span>{formatSignedPercent(deltaPercent)}</span>
          <span className="sr-only">{trendLabel}</span>
        </div>
      </div>

      <div className="mt-3">
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
      <p className="mt-2 text-xs text-slate-400">
        La couleur indique uniquement la quantité relative collectée ; elle n’évalue ni la qualité ni l’efficacité environnementale de l’action.
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
