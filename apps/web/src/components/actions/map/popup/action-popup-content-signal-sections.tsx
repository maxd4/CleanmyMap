import { MapPin } from "lucide-react";
import { formatObservedDate } from "./action-popup-content.helpers";
import { formatScorePercent } from "@/lib/formatters/score";
import { ScoreRing } from "./action-popup-content-score-ring";
import type { ActionPopupContentSignalHeaderProps } from "./action-popup-content-signal-header";

export function SignalHeaderLead({
  recordTypeLabel,
  locationLabel,
  color,
  score,
  scoreLoading,
  scoreReading,
  wasteScore,
  buttsScore,
  displayMode,
  currentPlaceState,
  hasQuantifiedPollutionScore,
}: ActionPopupContentSignalHeaderProps) {
  return (
    <>
      {displayMode && currentPlaceState && (
        <p className="cmm-text-caption font-semibold text-slate-600">
          {currentPlaceState.source === "projected"
            ? `Projeté aujourd’hui · dernière observation le ${formatObservedDate(currentPlaceState.date)}`
            : `Observé le ${formatObservedDate(currentPlaceState.date)}`}
        </p>
      )}
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
            {displayMode &&
            currentPlaceState?.scoreKind === "unavailable" &&
            !hasQuantifiedPollutionScore ? (
              <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-700">
                {currentPlaceState.stateLabel}
              </span>
            ) : hasQuantifiedPollutionScore ? (
              <span
                className={[
                  "rounded-full px-2.5 py-1 cmm-text-caption font-black uppercase tracking-[0.14em]",
                  scoreReading.tone === "sky"
                    ? "border border-sky-200 bg-sky-50 text-sky-800"
                    : scoreReading.tone === "emerald"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : scoreReading.tone === "amber"
                        ? "border border-amber-200 bg-amber-50 text-amber-800"
                        : "border border-rose-200 bg-rose-50 text-rose-800",
                ].join(" ")}
              >
                {displayMode && currentPlaceState
                  ? `Pollution observée ${formatScorePercent(Math.round(currentPlaceState.score ?? score))}`
                  : `Score global ${formatScorePercent(Math.round(score))}`}
              </span>
            ) : null}
            {hasQuantifiedPollutionScore ? (
              <>
                <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {scoreReading.label}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Déchets {formatScorePercent(Math.round(wasteScore))}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Mégots {formatScorePercent(Math.round(buttsScore))}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {hasQuantifiedPollutionScore ? (
          <ScoreRing
            color={color}
            score={currentPlaceState?.score ?? score}
            scoreLoading={scoreLoading}
          />
        ) : null}
      </div>
    </>
  );
}

export function SignalHeaderTerrain({
  scoreReading,
  scoreSourceLabel,
  hasQuantifiedPollutionScore,
}: ActionPopupContentSignalHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-500">
            Lecture terrain
          </p>
          {hasQuantifiedPollutionScore ? (
            <>
              <p className="text-sm font-semibold text-slate-900">
                {scoreReading.guidance}
              </p>
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.12em] text-slate-500">
                {scoreSourceLabel}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-900">
              Signalement qualitatif · niveau non quantifié
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SignalHeaderMeta({
  statusLabel,
  placeType,
  quality,
  geometryLabel,
  geometryTone,
}: ActionPopupContentSignalHeaderProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className={`h-1.5 w-1.5 rounded-full ${geometryTone.accent} animate-pulse`} />
        <span className="cmm-text-caption font-semibold text-slate-700">{statusLabel}</span>
      </div>
      {placeType ? (
        <span className="rounded-full border border-emerald-200/60 bg-emerald-50/90 px-2.5 py-1 cmm-text-caption font-semibold text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-300">
          {placeType}
        </span>
      ) : null}
      {quality ? (
        <span className="rounded-full border border-sky-200/60 bg-sky-50/90 px-2.5 py-1 cmm-text-caption font-semibold text-sky-800 shadow-sm dark:border-sky-800/50 dark:bg-sky-950/35 dark:text-sky-300">
          {quality}
        </span>
      ) : null}
      <span className={`rounded-full border px-2.5 py-1 cmm-text-caption font-semibold shadow-sm ${geometryTone.shell}`}>
        {geometryLabel}
      </span>
    </div>
  );
}

export function SignalHeaderGeometry({
  geometryModeLabel,
  geometryPointLabel,
  geometryConfidenceLabel,
  geometryMetricLabel,
  geometryTone,
}: ActionPopupContentSignalHeaderProps) {
  return (
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
        {geometryConfidenceLabel ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {geometryConfidenceLabel}
          </span>
        ) : null}
        {geometryMetricLabel ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            {geometryMetricLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
