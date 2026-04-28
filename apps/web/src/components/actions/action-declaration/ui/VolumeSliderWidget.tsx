"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Trash2, Scale } from "lucide-react";

interface VolumeSliderWidgetProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  label: string;
  unit?: string;
}

export function VolumeSliderWidget({
  value,
  onChange,
  max = 100,
  label,
  unit = "kg"
}: VolumeSliderWidgetProps) {
  const percentage = (value / max) * 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
            <Scale size={24} />
          </div>
          <div>
            <h4 className="text-lg font-black cmm-text-primary tracking-tight">{label}</h4>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estimation visuelle</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black text-emerald-600 tracking-tighter">
            {value}<span className="text-lg ml-1 opacity-50">{unit}</span>
          </div>
        </div>
      </div>

      <div className="relative h-24 mb-8 flex items-end justify-center gap-2 px-10">
        {/* Visual representation: Trash bags that "fill up" */}
        {[...Array(5)].map((_, i) => {
          const threshold = i * (max / 5);
          const isFilled = value > threshold;
          const fillPercent = Math.min(100, Math.max(0, ((value - threshold) / (max / 5)) * 100));

          return (
            <div key={i} className="relative flex-1 h-full max-w-[60px]">
              <div className="absolute inset-0 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ height: `${fillPercent}%` }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500 to-emerald-400 opacity-60"
                />
              </div>
              <div className={cn(
                "absolute -top-6 left-1/2 -translate-x-1/2 transition-colors duration-500",
                isFilled ? "text-emerald-500" : "text-slate-200"
              )}>
                <Trash2 size={16} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative pt-4">
        <input
          type="range"
          min="0"
          max={max}
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
          <span>Min (0)</span>
          <span>Max ({max})</span>
        </div>
      </div>
    </div>
  );
}
