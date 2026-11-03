"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { extendHarvestSliderMax, resolveHarvestSliderMax } from "../utils/harvest-utils";

type HarvestMeasurementSliderProps = {
  id: string;
  label: string;
  value: string;
  min?: number;
  initialMax: number;
  extension: number;
  absoluteMax: number;
  step: number;
  unit: string;
  accent: "emerald" | "blue";
  onChange?: (value: string) => void;
  formatValue: (value: number) => string;
  exactInputId?: string;
  exactInputLabel?: string;
  exactInputMode?: "decimal" | "numeric";
  readOnly?: boolean;
  readOnlyLabel?: string;
};

function parseValue(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatRangeValue(value: number, step: number): string {
  return step < 1 ? value.toFixed(1) : String(Math.round(value));
}

export function HarvestMeasurementSlider({
  id,
  label,
  value,
  min = 0,
  initialMax,
  extension,
  absoluteMax,
  step,
  unit,
  accent,
  onChange,
  formatValue,
  exactInputId,
  exactInputLabel,
  exactInputMode = "numeric",
  readOnly = false,
  readOnlyLabel,
}: HarvestMeasurementSliderProps) {
  const numericValue = parseValue(value);
  const persistedMax = resolveHarvestSliderMax(numericValue, initialMax, extension, absoluteMax);
  const [extendedMax, setExtendedMax] = useState(persistedMax);
  const max = Math.max(extendedMax, persistedMax);

  const sliderValue = numericValue ?? min;
  const displayValue = numericValue === null ? "Non renseigné" : `${formatValue(numericValue)} ${unit}`;
  const accentClass = accent === "emerald" ? "accent-emerald-600" : "accent-blue-600";
  const borderClass = accent === "emerald" ? "border-emerald-200/70 bg-emerald-50/50" : "border-blue-200/70 bg-blue-50/50";
  const labelClass = accent === "emerald" ? "text-emerald-950" : "text-blue-950";
  const hintClass = accent === "emerald" ? "text-emerald-900/65" : "text-blue-900/65";

  function handleSliderChange(nextValue: string) {
    if (readOnly || !onChange) return;
    const next = Number(nextValue);
    if (!Number.isFinite(next) || next < min || next > absoluteMax) return;
    onChange(formatRangeValue(next, step));
    setExtendedMax((current) => extendHarvestSliderMax(current, next, extension, absoluteMax));
  }

  return (
    <div className={cn("min-w-0 space-y-3 rounded-2xl border px-4 py-4", borderClass)} data-testid={`${id}-slider-panel`}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className={cn("text-sm font-bold", labelClass)}>{label}</label>
        <output htmlFor={id} className={cn("shrink-0 rounded-full bg-white px-3 py-1 text-sm font-black shadow-sm", labelClass)}>
          {displayValue}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        disabled={readOnly}
        onChange={(event) => handleSliderChange(event.target.value)}
        aria-valuetext={displayValue}
        aria-readonly={readOnly || undefined}
        aria-label={readOnly && readOnlyLabel ? readOnlyLabel : label}
        className={cn("h-3 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-70", accentClass)}
      />
      <div className={cn("flex items-center justify-between gap-3 text-xs font-semibold", hintClass)}>
        <span>{formatValue(min)} {unit}</span>
        <span>{formatValue(max)}{max >= absoluteMax ? "" : "+"} {unit}</span>
      </div>
      {exactInputId && exactInputLabel ? (
        <label className="block space-y-1.5">
          <span className={cn("text-xs font-semibold", hintClass)}>{exactInputLabel}</span>
          <input
            id={exactInputId}
            type="number"
            inputMode={exactInputMode}
            min={min}
            max={absoluteMax}
            step={step}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            aria-label={exactInputLabel}
            className="h-11 w-full rounded-xl border border-white/80 bg-white px-3 text-base font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
          />
        </label>
      ) : null}
      {readOnly && readOnlyLabel ? <p className={cn("text-xs", hintClass)}>{readOnlyLabel}</p> : null}
    </div>
  );
}
