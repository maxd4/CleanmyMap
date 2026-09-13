"use client";

import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";

type MapScoreScopeControlProps = {
  value: PollutionScoreScope;
  onChange: (scope: PollutionScoreScope) => void;
};

export function MapScoreScopeControl({
  value,
  onChange,
}: MapScoreScopeControlProps) {
  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center justify-end gap-1 rounded-full border border-slate-200/70 bg-white/90 p-1.5 shadow-lg backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/90"
      role="group"
      aria-label="Référence du score"
    >
      <span className="px-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
        Référence du score
      </span>
      {(["global", "department"] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={[
            "rounded-full px-2.5 py-1.5 text-[10px] font-bold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 sm:px-3",
            value === option
              ? "bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
          ].join(" ")}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option === "global" ? "Global" : "Département"}
        </button>
      ))}
    </div>
  );
}
