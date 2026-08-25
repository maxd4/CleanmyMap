import { MapPin } from "lucide-react";
import {
  formatNumber,
  getGeometryTone,
  type ScoreReading,
} from "./action-popup-content.helpers";
import type { ActionPollutionProjectionPresentation } from "@/lib/actions/revisit-priority";
import { formatProjectionConfidenceLabel } from "@/lib/actions/projection-confidence";

type ActionPopupContentHeaderProps = {
  recordTypeLabel: string;
  locationLabel: string;
  actionTitle: string;
  isAction: boolean;
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
  observedAt: string;
  wasteKg: number;
  butts: number;
  actionProjection: ActionPollutionProjectionPresentation | null;
};

function ScoreRing({
  color,
  score,
  scoreLoading,
  label = "Score",
}: {
  color: string;
  score: number;
  scoreLoading: boolean;
  label?: string;
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
          {label}
        </span>
      </div>
    </div>
  );
}

export function ActionPopupContentHeader({
  recordTypeLabel,
  locationLabel,
  actionTitle,
  isAction,
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
  observedAt,
  wasteKg,
  butts,
  actionProjection,
}: ActionPopupContentHeaderProps) {
  const geometryTone = getGeometryTone(geometryReality, isAction);

  if (isAction) {
    return (
      <div className="relative space-y-4 overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-400/20 via-sky-500/10 to-transparent" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-sky-200 bg-sky-50 p-1.5 shadow-sm dark:border-sky-800 dark:bg-sky-950/40">
              <MapPin size={13} className="text-sky-600 dark:text-sky-300" />
            </div>
            <p className="cmm-text-caption font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
              {recordTypeLabel}
            </p>
          </div>
          <h3 className="cmm-text-body font-bold leading-tight text-slate-950 dark:text-slate-50">
            {actionTitle}
          </h3>
          {locationLabel !== actionTitle && (
            <p className="cmm-text-small text-slate-600 dark:text-slate-300">
              Lieu · {locationLabel}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
              {statusLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              {observedAt}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/85 p-3 dark:border-slate-800 dark:bg-slate-900/45">
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.12em] text-slate-500">
                Pollution constatée avant l&apos;action
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">
                {Math.round(score)}/100
              </p>
            </div>
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.12em] text-slate-500">
                Temps depuis la dernière action
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">
                {actionProjection?.elapsedDays ?? 0} j
              </p>
            </div>
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.12em] text-slate-500">
                Pollution projetée
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">
                {Math.round(actionProjection?.projectedPollutionScore ?? score)}/100
              </p>
            </div>
          </div>
          <ScoreRing
            color={color}
            score={actionProjection?.projectedPollutionScore ?? score}
            scoreLoading={scoreLoading}
            label="Projection"
          />
        </div>

        <p className="cmm-text-caption font-semibold text-amber-700 dark:text-amber-300">
          {actionProjection?.isEstimate
            ? "Projection modélisée · pas une mesure en temps réel"
            : "Projection basée sur une mesure post-action"}
        </p>
        {actionProjection?.projectionConfidence && (
          <p className="cmm-text-caption font-semibold text-slate-600 dark:text-slate-300">
            {formatProjectionConfidenceLabel(
              actionProjection.projectionConfidence.level,
            )}
          </p>
        )}

        <div className="rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50 to-white p-3 shadow-sm dark:border-sky-900/60 dark:from-sky-950/30 dark:to-slate-900/40">
          <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
            Résultats collectés
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-sky-100 bg-white/80 px-3 py-2 dark:border-sky-900/60 dark:bg-slate-950/40">
              <p className="cmm-text-caption text-slate-500">Déchets</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {formatNumber(wasteKg, " kg")}
              </p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-white/80 px-3 py-2 dark:border-sky-900/60 dark:bg-slate-950/40">
              <p className="cmm-text-caption text-slate-500">Mégots</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {formatNumber(butts)} collectés
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100/80 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/45">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-500">
                Tracé de l&apos;action
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {geometryMetricLabel ?? geometryLabel}
              </p>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 cmm-text-caption font-semibold text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
              {geometryModeLabel}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {geometryPointLabel}
            </span>
            {geometryConfidenceLabel && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {geometryConfidenceLabel}
              </span>
            )}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 cmm-text-caption font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {geometryLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

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
