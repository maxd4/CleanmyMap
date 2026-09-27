import { formatScorePercent } from "@/lib/formatters/score";
import type { CompactActionHeaderProps } from "./action-popup-content-compact-header";
import { ScoreRing } from "./action-popup-content-score-ring";

export function CompactActionHeaderLead({
  recordTypeLabel,
  locationLabel,
  actionTitle,
  color,
  score,
  scoreLoading,
  statusLabel,
  displayedDate,
  scoreScope = "global",
  hasQuantifiedPollutionScore,
}: CompactActionHeaderProps) {
  return (
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
  );
}

export function CompactActionHeaderScore({
  displayedScoreLabel,
  historicalScoreLabel,
  projectedScoreLabel,
  elapsedDays,
  scoreScope = "global",
  isDisplayedProjection,
  projectionConfidence,
}: CompactActionHeaderProps) {
  return (
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
  );
}

export function CompactActionHeaderDetails({
  historicalScoreLabel,
  wasteScore,
  buttsScore,
  globalScore,
  departmentScore,
  departmentName,
  placeType,
  quality,
  geometryLabel,
  geometryTone,
}: CompactActionHeaderProps) {
  const departmentValue = departmentScore?.score;
  const detailScoreUnavailable = historicalScoreLabel === "Indisponible";
  return (
    <>
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
    </>
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
