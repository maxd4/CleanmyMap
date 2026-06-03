import { MapPin } from "lucide-react";
import { getGeometryTone, type ScoreReading } from "./action-popup-content.helpers";

type ActionPopupContentHeaderProps = {
  recordTypeLabel: string;
  locationLabel: string;
  color: string;
  score: number;
  scoreLoading: boolean;
  scoreReading: ScoreReading;
  scoreSourceLabel: string;
  wasteScore: number;
  buttsScore: number;
  statusLabel: string;
  placeType: string | null;
  quality: string | null;
  geometryLabel: string;
  geometryModeLabel: string;
  geometryPointLabel: string;
  geometryConfidenceLabel: string | null;
  geometryMetricLabel: string | null;
  geometryReality: string | null;
};

function ScoreRing({
  color,
  score,
  scoreLoading,
}: {
  color: string;
  score: number;
  scoreLoading: boolean;
}) {
  return (
    <div className="relative flex-shrink-0 h-14 w-14">
      <svg className="h-full w-full -rotate-90 transform drop-shadow-sm">
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="4"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="transparent"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={2 * Math.PI * 24}
          strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min(100, score) / 100)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold leading-none" style={{ color }}>
          {scoreLoading ? "…" : Math.round(score)}
        </span>
        <span className="text-[6px] font-bold uppercase tracking-tighter opacity-50">
          Score
        </span>
      </div>
    </div>
  );
}

export function ActionPopupContentHeader({
  recordTypeLabel,
  locationLabel,
  color,
  score,
  scoreLoading,
  scoreReading,
  scoreSourceLabel,
  wasteScore,
  buttsScore,
  statusLabel,
  placeType,
  quality,
  geometryLabel,
  geometryModeLabel,
  geometryPointLabel,
  geometryConfidenceLabel,
  geometryMetricLabel,
  geometryReality,
}: ActionPopupContentHeaderProps) {
  const geometryTone = getGeometryTone(geometryReality);

  return (
    <div className="relative space-y-4 overflow-hidden p-5">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${geometryTone.glow}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-slate-200 bg-white/90 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <MapPin size={13} className="cmm-text-secondary" />
            </div>
            <p className="cmm-text-caption font-bold uppercase tracking-[0.16em] text-slate-600">
              {recordTypeLabel}
            </p>
          </div>
          <h3 className="cmm-text-body font-bold leading-tight text-slate-950">
            {locationLabel}
          </h3>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span
              className={[
                "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                scoreReading.tone === "sky"
                  ? "border border-sky-200 bg-sky-50 text-sky-800"
                  : scoreReading.tone === "emerald"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : scoreReading.tone === "amber"
                      ? "border border-amber-200 bg-amber-50 text-amber-800"
                      : "border border-rose-200 bg-rose-50 text-rose-800",
              ].join(" ")}
            >
              Score global {Math.round(score)}/100
            </span>
            <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {scoreReading.label}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Déchets {Math.round(wasteScore)}/100
            </span>
            <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Mégots {Math.round(buttsScore)}/100
            </span>
          </div>
        </div>
        <ScoreRing color={color} score={score} scoreLoading={scoreLoading} />
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Lecture terrain
            </p>
            <p className="text-sm font-semibold text-slate-900">{scoreReading.guidance}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {scoreSourceLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <div className={`h-1.5 w-1.5 rounded-full ${geometryTone.accent} animate-pulse`} />
          <span className="cmm-text-caption font-semibold text-slate-700">{statusLabel}</span>
        </div>
        {placeType && (
          <span className="rounded-full border border-emerald-200/60 bg-emerald-50/90 px-2.5 py-1 cmm-text-caption font-semibold text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-300">
            {placeType}
          </span>
        )}
        {quality && (
          <span className="rounded-full border border-sky-200/60 bg-sky-50/90 px-2.5 py-1 cmm-text-caption font-semibold text-sky-800 shadow-sm dark:border-sky-800/50 dark:bg-sky-950/35 dark:text-sky-300">
            {quality}
          </span>
        )}
        <span className={`rounded-full border px-2.5 py-1 cmm-text-caption font-semibold shadow-sm ${geometryTone.shell}`}>
          {geometryLabel}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm dark:border-slate-800 dark:from-slate-900/70 dark:to-slate-900/40">
        <div className="flex items-center justify-between gap-3 pb-2">
          <span className="cmm-text-caption font-semibold uppercase tracking-wider cmm-text-muted">
            Géométrie
          </span>
          <span className={`rounded-full border px-2 py-0.5 cmm-text-caption font-semibold shadow-sm ${geometryTone.shell}`}>
            {geometryModeLabel}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <span className={`h-1.5 w-1.5 rounded-full ${geometryTone.accent}`} />
            {geometryPointLabel}
          </span>
          {geometryConfidenceLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {geometryConfidenceLabel}
            </span>
          )}
          {geometryMetricLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              {geometryMetricLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
