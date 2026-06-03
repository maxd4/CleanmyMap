type GeometryTooltipContentProps = {
  title: string;
  geometryModeLabel: string;
  geometryPointsLabel: string;
  geometryMetricLabel: string | null;
  geometryConfidenceLabel: string | null;
  color: string;
};

export function GeometryTooltipContent({
  title,
  geometryModeLabel,
  geometryPointsLabel,
  geometryMetricLabel,
  geometryConfidenceLabel,
  color,
}: GeometryTooltipContentProps) {
  return (
    <div className="min-w-[150px] rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.5)] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/95">
      <div className="flex items-center justify-between gap-2">
        <span className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {geometryModeLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {geometryPointsLabel}
        </span>
      </div>

      <p className="mt-1 text-[11px] font-bold leading-tight text-slate-900 dark:text-slate-50">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {geometryMetricLabel && (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {geometryMetricLabel}
          </span>
        )}
        {geometryConfidenceLabel && (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {geometryConfidenceLabel}
          </span>
        )}
      </div>
    </div>
  );
}
