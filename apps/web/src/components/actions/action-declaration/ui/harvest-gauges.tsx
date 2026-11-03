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
  tone: "emerald" | "blue";
  secondaryLabel?: string;
  secondaryValue?: string;
};

function QuantityGaugeVisual({
  value,
  scale,
  icon: GaugeIcon,
  colorClass,
  label,
  valueLabel,
  testId,
  tone,
  secondaryLabel,
  secondaryValue,
}: QuantityGaugeVisualProps) {
  const safeValue = value !== null && Number.isFinite(value) && value >= 0 ? value : 0;
  const normalized = clamp(safeValue / scale, 0, 1);
  const surfaceClass = tone === "emerald"
    ? "border-emerald-100 bg-emerald-50/65"
    : "border-blue-100 bg-blue-50/65";
  const valueClass = tone === "emerald" ? "text-emerald-800" : "text-blue-800";
  const dividerClass = tone === "emerald" ? "bg-emerald-300/60" : "bg-blue-300/60";
  const accessibleValueLabel = secondaryLabel && secondaryValue
    ? `${valueLabel}. ${secondaryLabel} : ${secondaryValue}`
    : valueLabel;

  return (
    <div
      className={cn("flex min-h-[136px] items-center rounded-2xl border px-3 py-4 sm:px-4 max-[420px]:flex-col", surfaceClass)}
      data-testid={testId}
      role="img"
      aria-label={`${label} : ${accessibleValueLabel}. Trois icônes indiquent uniquement la quantité déclarée, indépendamment des moyennes historiques.`}
    >
      <div className="flex min-w-0 flex-1 items-end justify-center gap-2 sm:gap-3">
        {[0, 1, 2].map((index) => {
          const fill = clamp(normalized * 3 - index, 0, 1) * 100;
          return (
            <div
              key={index}
              className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12"
              data-testid={`${testId}-icon`}
              data-fill-percent={Math.round(fill)}
            >
              <GaugeIcon size={40} strokeWidth={1.6} className="absolute inset-0 text-slate-300/80 sm:h-12 sm:w-12" aria-hidden="true" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(${100 - fill}% 0 0 0)` }}
                aria-hidden="true"
              >
                <GaugeIcon size={40} strokeWidth={1.6} className={cn(colorClass, "fill-current sm:h-12 sm:w-12")} />
              </div>
            </div>
          );
        })}
      </div>
      <div className={cn("mx-3 h-16 w-px shrink-0 max-[420px]:mx-auto max-[420px]:h-px max-[420px]:w-16", dividerClass)} aria-hidden="true" />
      <div className={cn("min-w-0 shrink-0", secondaryLabel ? "grid grid-cols-2 gap-4 max-[420px]:grid-cols-1" : "text-right")}>
        <div className={secondaryLabel ? "min-w-0" : undefined}>
          <p className="sr-only">{label}</p>
          <span className={cn("block whitespace-nowrap text-2xl font-black tracking-tight sm:text-3xl", valueClass)}>{valueLabel}</span>
        </div>
        {secondaryLabel ? (
          <div className="min-w-0 border-l border-slate-300/70 pl-4">
            <p className="text-xs font-semibold text-slate-700">{secondaryLabel}</p>
            <span className="mt-1 block whitespace-nowrap text-xl font-black tracking-tight text-blue-700 sm:text-2xl">{secondaryValue ?? "Non renseigné"}</span>
          </div>
        ) : null}
      </div>
      <p className="sr-only">Repère visuel uniquement · l’échelle n’est pas un seuil scientifique</p>
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
      valueLabel={value === null ? "Non renseigné" : `${formatKg(value)} kg`}
      testId="waste-measurement-visual"
      tone="emerald"
    />
  );
}

export function DropletGauge({
  value,
  secondaryLabel,
  secondaryValue,
}: {
  value: number | null;
  secondaryLabel?: string;
  secondaryValue?: string;
}) {
  return (
    <QuantityGaugeVisual
      value={value}
      scale={HARVEST_BUTTS_VISUAL_SCALE_COUNT}
      icon={Droplet}
      colorClass="text-blue-400"
      label="Quantité de mégots retenue"
      valueLabel={value === null ? "Non renseigné" : `${formatCount(value)} mégots`}
      testId="butts-measurement-visual"
      tone="blue"
      secondaryLabel={secondaryLabel}
      secondaryValue={secondaryValue}
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
