import { MapPin } from "lucide-react";
import {
  formatNumber,
  formatObservedDate,
  getGeometryTone,
  type ScoreReading,
} from "./action-popup-content.helpers";
import type { ActionPollutionProjectionPresentation } from "@/lib/actions/pollution/revisit-priority";
import { formatProjectionConfidenceLabel } from "@/lib/actions/pollution/projection-confidence";
import { formatScorePercent, SCORE_SCALE } from "@/lib/formatters/score";
import type {
  CurrentPlaceState,
  CurrentPlaceStateMode,
} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { ScopedActionPollutionScore } from "./pollution-score-scope";

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
  geometryKind: "polyline" | "polygon" | "point" | null;
  geometryPointLabel: string;
  geometryConfidenceLabel: string | null;
  geometryMetricLabel: string | null;
  geometryReality: string | null;
  observedAt: string;
  wasteKg: number;
  butts: number;
  actionProjection: ActionPollutionProjectionPresentation | null;
  displayMode?: CurrentPlaceStateMode;
  currentPlaceState?: CurrentPlaceState | null;
  scoreScope?: PollutionScoreScope;
  scoreUnavailable?: boolean;
  globalScore?: ScopedActionPollutionScore | null;
  departmentScore?: ScopedActionPollutionScore | null;
  departmentName?: string | null;
  hasQuantifiedPollutionScore?: boolean;
  compact?: boolean;
};

function ScoreRing({
  color,
  score,
  scoreLoading,
  label = "Score",
  showValue = true,
}: {
  color: string;
  score: number;
  scoreLoading: boolean;
  label?: string;
  showValue?: boolean;
}) {
  return (
    <div
      className="relative h-14 w-14 flex-shrink-0"
      role="img"
      aria-label={scoreLoading ? "Score en chargement" : `${label} ${Math.round(score)} %`}
    >
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
          strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min(SCORE_SCALE, score) / SCORE_SCALE)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      {showValue ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold leading-none" style={{ color }}>
            {scoreLoading ? "…" : Math.round(score)}
          </span>
          <span className="cmm-text-caption font-bold uppercase tracking-tighter opacity-50">
            {label}
          </span>
        </div>
      ) : null}
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
  geometryKind,
  geometryPointLabel,
  geometryConfidenceLabel,
  geometryMetricLabel,
  geometryReality,
  observedAt,
  wasteKg,
  butts,
  actionProjection,
  displayMode,
  currentPlaceState = null,
  scoreScope = "global",
  scoreUnavailable = false,
  globalScore = null,
  departmentScore = null,
  departmentName = null,
  hasQuantifiedPollutionScore = true,
  compact = false,
}: ActionPopupContentHeaderProps) {
  const geometryTone = getGeometryTone(geometryReality, isAction);

  if (isAction) {
    const scopedCurrentPlaceState = scoreScope === "global" ? currentPlaceState : null;
    const hasDisplayState = scoreScope === "global" && Boolean(displayMode || currentPlaceState);
    const isDisplayedProjection =
      scoreScope === "global" &&
      (hasDisplayState
        ? scopedCurrentPlaceState?.source === "projected" ||
          (!currentPlaceState && displayMode === "projected_today")
        : true);
    const displayedScore = scoreUnavailable
      ? 0
      : scopedCurrentPlaceState?.score ??
        (isDisplayedProjection
          ? actionProjection?.projectedPollutionScore ?? score
          : score);
    const displayedScoreLabel =
      scoreLoading
        ? "Chargement du score"
        : scoreUnavailable
        ? scoreScope === "department"
          ? "Score départemental indisponible"
          : "Score global indisponible"
        : scopedCurrentPlaceState?.scoreKind === "unavailable"
          ? "Niveau non quantifié"
        : formatScorePercent(Math.round(displayedScore));
    const displayedDate = scopedCurrentPlaceState?.date
      ? formatObservedDate(scopedCurrentPlaceState.date)
      : observedAt;
    if (compact) {
      const compactScoreLabel =
        scoreLoading ||
        scoreUnavailable ||
        scopedCurrentPlaceState?.scoreKind === "unavailable"
          ? scoreLoading
            ? "…"
            : "Indisponible"
          : formatScorePercent(Math.round(displayedScore));

      return (
        <CompactActionHeader
          recordTypeLabel={recordTypeLabel}
          locationLabel={locationLabel}
          actionTitle={actionTitle}
          color={color}
          score={displayedScore}
          scoreLoading={scoreLoading}
          displayedScoreLabel={compactScoreLabel}
          historicalScoreLabel={
            scoreLoading
              ? "…"
              : scoreUnavailable
                ? "Indisponible"
                : formatScorePercent(
                    Math.round(actionProjection?.historicalScore ?? score),
                  )
          }
          projectedScoreLabel={
            isDisplayedProjection
              ? compactScoreLabel
              : scoreUnavailable
                ? "Indisponible"
                : formatScorePercent(Math.round(displayedScore))
          }
          elapsedDays={actionProjection?.elapsedDays ?? 0}
          statusLabel={statusLabel}
          displayedDate={displayedDate}
          scoreScope={scoreScope}
          isDisplayedProjection={isDisplayedProjection}
          projectionConfidence={
            actionProjection?.projectionConfidence
              ? formatProjectionConfidenceLabel(
                  actionProjection.projectionConfidence.level,
                )
              : null
          }
          wasteScore={wasteScore}
          buttsScore={buttsScore}
          globalScore={globalScore}
          departmentScore={departmentScore}
          departmentName={departmentName}
          placeType={placeType}
          quality={quality}
          geometryLabel={geometryLabel}
          geometryTone={geometryTone.shell}
          hasQuantifiedPollutionScore={hasQuantifiedPollutionScore}
        />
      );
    }

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
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-[0.14em] text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
              {statusLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              {observedAt}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/85 p-3 dark:border-slate-800 dark:bg-slate-900/45">
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.12em] text-slate-500">
                {scoreScope === "department"
                  ? "Référence départementale"
                  : "Pollution constatée avant l'action"}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">
                {scoreLoading
                  ? "…"
                  : scoreUnavailable
                  ? "Indisponible"
                  : formatScorePercent(
                      Math.round(actionProjection?.historicalScore ?? score),
                    )}
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
                {scoreScope === "department"
                  ? "Score relatif"
                  : isDisplayedProjection
                    ? "Pollution projetée"
                    : "État affiché"}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">
                {displayedScoreLabel}
              </p>
            </div>
          </div>
          <ScoreRing
            color={color}
            score={displayedScore}
            scoreLoading={scoreLoading}
            label={scoreScope === "department" ? "Département" : isDisplayedProjection ? "Projection" : "Observé"}
          />
        </div>

        <p className="cmm-text-caption font-semibold text-amber-700 dark:text-amber-300">
          {scoreLoading
            ? "Référence du score en cours de chargement"
            : scoreScope === "department"
            ? scoreUnavailable
              ? "Référence départementale insuffisante pour comparer cette action"
              : "Score relatif départemental · sans projection temporelle"
            : scoreUnavailable
            ? "Référence globale V2 indisponible pour comparer cette action"
            : isDisplayedProjection
            ? "Projection modélisée · pas une mesure en temps réel"
            : scopedCurrentPlaceState?.scoreKind === "unavailable"
              ? "Observation terrain · niveau non quantifié"
              : `Observé le ${displayedDate}`}
        </p>
        {isDisplayedProjection && actionProjection?.projectionConfidence && (
          <p className="cmm-text-caption font-semibold text-slate-600 dark:text-slate-300">
            {formatProjectionConfidenceLabel(
              actionProjection.projectionConfidence.level,
            )}
          </p>
        )}

        <div
          className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/85 p-3 dark:border-slate-800 dark:bg-slate-900/45 sm:grid-cols-2"
          data-testid="popup-score-references"
        >
          <div className="space-y-2">
            <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Pollution constatée
            </p>
            <div className="space-y-1 cmm-text-small font-semibold text-slate-700 dark:text-slate-200">
              <p>Déchets {formatScorePercent(Math.round(globalScore?.wasteScore ?? wasteScore))}</p>
              <p>Mégots {formatScorePercent(Math.round(globalScore?.buttsScore ?? buttsScore))}</p>
              <p>Score global {formatScorePercent(Math.round(globalScore?.historicalScore ?? score))}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Comparaison départementale
            </p>
            {departmentScore?.score !== null && departmentScore?.score !== undefined ? (
              <div className="space-y-1 cmm-text-small font-semibold text-slate-700 dark:text-slate-200">
                <p>Déchets {formatScorePercent(Math.round(departmentScore.wasteScore ?? 0))}</p>
                <p>Mégots {formatScorePercent(Math.round(departmentScore.buttsScore ?? 0))}</p>
                <p>Score relatif {formatScorePercent(Math.round(departmentScore.score))}</p>
                <p>Référence {departmentName ?? "département"}</p>
              </div>
            ) : (
              <div className="space-y-1 cmm-text-small font-semibold text-slate-600 dark:text-slate-300">
                <p>
                  {departmentScore?.availability === "department_insufficient_data"
                    ? "Données départementales insuffisantes"
                    : "Comparaison départementale indisponible"}
                </p>
                <p>
                  {departmentScore?.availability === "department_insufficient_data"
                    ? "Au moins deux actions éligibles sont nécessaires."
                    : "Aucune référence départementale disponible."}
                </p>
              </div>
            )}
          </div>
        </div>

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
                {geometryKind === "polygon"
                  ? "Zone de l&apos;action"
                  : geometryKind === "polyline"
                    ? "Parcours de l&apos;action"
                    : "Localisation de l&apos;action"}
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
      {displayMode && currentPlaceState && (
        <p className="cmm-text-caption font-semibold text-slate-600">
          {currentPlaceState.source === "projected"
            ? `Projeté aujourd’hui · dernière observation le ${formatObservedDate(currentPlaceState.date)}`
            : `Observé le ${formatObservedDate(currentPlaceState.date)}`}
        </p>
      )}
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

type CompactActionHeaderProps = {
  recordTypeLabel: string;
  locationLabel: string;
  actionTitle: string;
  color: string;
  score: number;
  scoreLoading: boolean;
  displayedScoreLabel: string;
  historicalScoreLabel: string;
  projectedScoreLabel: string;
  elapsedDays: number;
  statusLabel: string;
  displayedDate: string;
  scoreScope?: PollutionScoreScope;
  isDisplayedProjection: boolean;
  projectionConfidence: string | null;
  wasteScore: number;
  buttsScore: number;
  globalScore?: ScopedActionPollutionScore | null;
  departmentScore?: ScopedActionPollutionScore | null;
  departmentName?: string | null;
  placeType: string | null;
  quality: string | null;
  geometryLabel: string;
  geometryTone: string;
  hasQuantifiedPollutionScore: boolean;
};

function CompactActionHeader({
  recordTypeLabel,
  locationLabel,
  actionTitle,
  color,
  score,
  scoreLoading,
  displayedScoreLabel,
  historicalScoreLabel,
  projectedScoreLabel,
  elapsedDays,
  statusLabel,
  displayedDate,
  scoreScope = "global",
  isDisplayedProjection,
  projectionConfidence,
  wasteScore,
  buttsScore,
  globalScore,
  departmentScore,
  departmentName,
  placeType,
  quality,
  geometryLabel,
  geometryTone,
  hasQuantifiedPollutionScore,
}: CompactActionHeaderProps) {
  const departmentValue = departmentScore?.score;
  const detailScoreUnavailable = historicalScoreLabel === "Indisponible";

  return (
    <div className="relative space-y-3 overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-400/18 via-sky-500/8 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <span className="inline-flex max-w-full items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
            {recordTypeLabel}
          </span>
          <h3 className="break-words text-base font-bold leading-snug text-slate-950 dark:text-slate-50">
            {actionTitle}
          </h3>
          {locationLabel !== actionTitle ? (
            <p className="break-words text-sm leading-snug text-slate-600 dark:text-slate-300">
              {locationLabel}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
              {statusLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              {displayedDate}
            </span>
          </div>
        </div>
        {hasQuantifiedPollutionScore ? (
          <ScoreRing
            color={color}
            score={score}
            scoreLoading={scoreLoading}
            label={scoreScope === "department" ? "Département" : "Score"}
            showValue={false}
          />
        ) : null}
      </div>

      <section
        aria-label="Score de pollution"
        className="rounded-xl border border-slate-200/80 bg-white/85 p-3 dark:border-slate-800 dark:bg-slate-900/45"
        data-testid="popup-score-summary"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">Score</p>
            <p className="mt-0.5 text-2xl font-bold leading-none text-slate-950 dark:text-slate-50">
              {displayedScoreLabel}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
              {scoreScope === "department"
                ? "Département"
                : isDisplayedProjection
                  ? "Projection estimée"
                  : "Observé"}
            </span>
            {isDisplayedProjection && projectionConfidence ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {projectionConfidence}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
          <CompactMetric label="Constaté" value={historicalScoreLabel} />
          <CompactMetric
            label={
              scoreScope === "department"
                ? "Relatif"
                : isDisplayedProjection
                  ? "Projeté"
                  : "Observé"
            }
            value={projectedScoreLabel}
          />
          <CompactMetric label="+ jours" value={`${elapsedDays} j`} />
        </div>
      </section>

      <div
        className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/85 p-3 dark:border-slate-800 dark:bg-slate-900/45 sm:grid-cols-2"
        data-testid="popup-score-references"
      >
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Détails constatés
          </p>
          <div className="space-y-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <p>
              Déchets {detailScoreUnavailable
                ? "Indisponible"
                : formatScorePercent(Math.round(globalScore?.wasteScore ?? wasteScore))}
            </p>
            <p>
              Mégots {detailScoreUnavailable
                ? "Indisponible"
                : formatScorePercent(Math.round(globalScore?.buttsScore ?? buttsScore))}
            </p>
            <p>
              Global {globalScore?.historicalScore !== null && globalScore?.historicalScore !== undefined
                ? formatScorePercent(Math.round(globalScore.historicalScore))
                : historicalScoreLabel}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Comparaison départementale
          </p>
          {departmentValue !== null && departmentValue !== undefined ? (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {departmentName ?? "Département"} · {formatScorePercent(Math.round(departmentValue))}
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Indisponible
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Repères de l’action">
        {placeType ? (
          <span className="rounded-full border border-emerald-200/60 bg-emerald-50/90 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-300">
            {placeType}
          </span>
        ) : null}
        {quality ? (
          <span className="rounded-full border border-sky-200/60 bg-sky-50/90 px-2 py-1 text-xs font-semibold text-sky-800 dark:border-sky-800/50 dark:bg-sky-950/35 dark:text-sky-300">
            {quality}
          </span>
        ) : null}
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${geometryTone}`}>
          {geometryLabel}
        </span>
      </div>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm font-bold text-slate-900 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}
