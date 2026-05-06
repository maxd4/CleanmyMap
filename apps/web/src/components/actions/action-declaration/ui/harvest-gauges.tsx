"use client";

import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { clamp, deriveGaugeMax, formatKg } from "../utils/harvest-utils";

type GaugeTone = "emerald" | "orange";

type ProgressGaugeProps = {
  value: number;
  comparisonValue?: number | null;
  tone: GaugeTone;
  comparisonLabel: string;
};

export function ProgressGauge({
  value,
  comparisonValue,
  tone,
  comparisonLabel,
}: ProgressGaugeProps) {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
  const safeComparison =
    comparisonValue != null && Number.isFinite(comparisonValue) && comparisonValue >= 0
      ? comparisonValue
      : null;
  const maxValue = deriveGaugeMax([safeValue, safeComparison], 1);
  const fillWidth = `${clamp((safeValue / maxValue) * 100, 0, 100)}%`;
  const markerLeft =
    safeComparison == null ? null : `${clamp((safeComparison / maxValue) * 100, 0, 100)}%`;

  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white/75 p-4">
      <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        <span>0</span>
        <span className={cn(tone === "orange" ? "text-orange-600" : "text-emerald-600")}>
          {comparisonLabel}
        </span>
        <span>{formatKg(maxValue)} kg</span>
      </div>

      <div className="relative mt-3">
        <div
          className={cn(
            "relative h-3 overflow-hidden rounded-full",
            tone === "orange" ? "bg-orange-100" : "bg-emerald-100",
          )}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r",
              tone === "orange"
                ? "from-orange-500 to-amber-400"
                : "from-emerald-500 to-teal-400",
            )}
            style={{ width: fillWidth }}
          />
        </div>
        {markerLeft ? (
          <div
            className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 rounded-full bg-slate-900/70 shadow-[0_0_0_3px_rgba(255,255,255,0.85)]"
            style={{ left: markerLeft }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}

type TrashBinGaugeProps = {
  value: number;
  comparisonValue: number | null;
};

export function TrashBinGauge({
  value,
  comparisonValue,
}: TrashBinGaugeProps) {
  const safeValue = clamp(Math.max(0, value), 0, 100);
  const safeComparison =
    comparisonValue != null && Number.isFinite(comparisonValue)
      ? clamp(comparisonValue, 0, 100)
      : null;
  const fillHeight = `${safeValue}%`;
  const markerTop = safeComparison == null ? null : `${100 - safeComparison}%`;

  return (
    <div className="relative mx-auto h-56 w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-inner">
      <div className="absolute left-1/2 top-4 h-4 w-24 -translate-x-1/2 rounded-full border border-slate-300 bg-slate-100" />
      <div className="absolute inset-x-10 bottom-10 top-12 overflow-hidden rounded-[1.5rem] border-2 border-slate-300 bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-500 via-lime-400 to-amber-300"
          style={{ height: fillHeight }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[length:100%_18px]" />
        {markerTop ? (
          <div
            className="absolute left-0 right-0 h-0.5 bg-slate-900/70 shadow-[0_0_0_3px_rgba(255,255,255,0.9)]"
            style={{ top: markerTop }}
            aria-hidden="true"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            Poubelle
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-6 right-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        <span>0kg</span>
        <span>50kg</span>
        <span>100kg</span>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
        <Trash2 size={12} className="mr-1 inline-block align-text-bottom" />
        {formatKg(safeValue)} kg
      </div>
    </div>
  );
}
