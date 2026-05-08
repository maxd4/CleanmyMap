"use client";

import { cn } from "@/lib/utils";

interface VolumeSliderWidgetProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  label: string;
  unit?: string;
  inputId: string;
}

export function VolumeSliderWidget({
  value,
  onChange,
  max = 100,
  label,
  unit = "kg",
  inputId,
}: VolumeSliderWidgetProps) {
  const labelId = `${inputId}-label`;
  const pct = Math.round((value / max) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span id={labelId} className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-sm font-bold text-emerald-600">{value} {unit}</span>
      </div>

      {/* Track */}
      <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <input
        id={inputId}
        type="range"
        min="0"
        max={max}
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-labelledby={labelId}
        className="sr-only"
      />

      <div className="flex justify-between text-[10px] text-slate-400">
        <span>0 {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
