import { MapPin } from "lucide-react";
import { formatNumber } from "./action-popup-content.helpers";
import { formatProjectionConfidenceLabel } from "@/lib/actions/pollution/projection-confidence";
import { formatScorePercent } from "@/lib/formatters/score";
import { ScoreRing } from "./action-popup-content-score-ring";
import type { ActionPopupContentActionHeaderProps } from "./action-popup-content-action-header";

export function ActionPopupContentActionLead({
  recordTypeLabel,
  locationLabel,
  actionTitle,
  color,
  score,
  scoreLoading,
  statusLabel,
  observedAt,
  scoreScope,
  scoreUnavailable,
  actionProjection,
  displayedScore,
  displayedScoreLabel,
  isDisplayedProjection,
}: ActionPopupContentActionHeaderProps) {
  return (
    <>
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
    </>
  );
}

export function ActionPopupContentActionScoreDetails({
  score,
  scoreLoading,
  scoreScope,
  scoreUnavailable,
  isDisplayedProjection,
  actionProjection,
  scopedCurrentPlaceState,
  displayedDate,
  globalScore,
  wasteScore,
  buttsScore,
  departmentScore,
  departmentName,
}: ActionPopupContentActionHeaderProps) {
  return (
    <>
      <ActionPopupContentActionScoreNotice
        scoreLoading={scoreLoading}
        scoreScope={scoreScope}
        scoreUnavailable={scoreUnavailable}
        isDisplayedProjection={isDisplayedProjection}
        actionProjection={actionProjection}
        scopedCurrentPlaceState={scopedCurrentPlaceState}
        displayedDate={displayedDate}
      />
      <ActionPopupContentActionReferences
        globalScore={globalScore}
        score={score}
        wasteScore={wasteScore}
        buttsScore={buttsScore}
        departmentScore={departmentScore}
        departmentName={departmentName}
      />
    </>
  );
}

function ActionPopupContentActionScoreNotice({
  scoreLoading,
  scoreScope,
  scoreUnavailable,
  isDisplayedProjection,
  actionProjection,
  scopedCurrentPlaceState,
  displayedDate,
}: Pick<
  ActionPopupContentActionHeaderProps,
  | "scoreLoading"
  | "scoreScope"
  | "scoreUnavailable"
  | "isDisplayedProjection"
  | "actionProjection"
  | "scopedCurrentPlaceState"
  | "displayedDate"
>) {
  return (
    <>
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
      {isDisplayedProjection && actionProjection?.projectionConfidence ? (
        <p className="cmm-text-caption font-semibold text-slate-600 dark:text-slate-300">
          {formatProjectionConfidenceLabel(actionProjection.projectionConfidence.level)}
        </p>
      ) : null}
    </>
  );
}

function ActionPopupContentActionReferences({
  score,
  globalScore,
  wasteScore,
  buttsScore,
  departmentScore,
  departmentName,
}: Pick<
  ActionPopupContentActionHeaderProps,
  "score" | "globalScore" | "wasteScore" | "buttsScore" | "departmentScore" | "departmentName"
>) {
  return (
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
  );
}

export function ActionPopupContentActionResults({
  geometryKind,
  geometryLabel,
  geometryModeLabel,
  geometryPointLabel,
  geometryConfidenceLabel,
  geometryMetricLabel,
  wasteKg,
  butts,
}: ActionPopupContentActionHeaderProps) {
  return (
    <>
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
    </>
  );
}
