import type { RouteTraceSelectedStop } from "@/lib/route/route-trace";
import {
  formatDistance,
  formatDuration,
  formatNumber,
  stopLabel,
  type RouteExplanationData,
} from "./route-explanation.model";
import { PredictionEvidence } from "./route-explanation-prediction";

export function MetricValue({
  value,
  kind,
  measured = false,
}: {
  value: number | null;
  kind: "distance" | "duration";
  measured?: boolean;
}) {
  const formatted = kind === "distance" ? formatDistance(value) : formatDuration(value);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span>{formatted}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
          measured
            ? "bg-emerald-400/15 text-emerald-200"
            : value === null
              ? "bg-slate-400/15 text-slate-300"
              : "bg-amber-400/15 text-amber-200"
        }`}
      >
        {measured ? "mesure réseau" : value === null ? "inconnu" : "estimé"}
      </span>
    </span>
  );
}

export function SelectionDetail({
  selection,
  data,
  originLabel,
}: {
  selection: RouteTraceSelectedStop;
  data: RouteExplanationData;
  originLabel: string;
}) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h5 className="font-bold text-white">
          Étape {selection.step} · {stopLabel(selection.id, data, originLabel)}
        </h5>
        <span className="text-xs font-semibold text-slate-300">
          Score final {formatNumber(selection.combinedScore, 3)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{selection.reason}</p>
      {selection.parisPressure ? (
        <p className="mt-2 text-xs leading-relaxed text-sky-100/80">
          Zone IRIS {selection.parisPressure.zoneId} : pression humaine structurelle {formatNumber(selection.parisPressure.humanPressure ?? 0, 3)} ; {selection.parisPressure.matchMethod === "point-in-polygon" ? "point rattaché au polygone IRIS" : `approximation par centroïde à ${formatDistance(selection.parisPressure.distanceToCentroidKm)}`}. {selection.parisPressure.approximationWarning ? `${selection.parisPressure.approximationWarning} ` : ""}Ce signal est un prior de contexte, pas une mesure de fréquentation en temps réel.
        </p>
      ) : null}
      {selection.evidence?.family === "predicted" ? (
        <PredictionEvidence evidence={selection.evidence} />
      ) : (
        <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          Signalement observé validé : la preuve terrain reste prioritaire sur une prédiction de risque équivalente.
        </p>
      )}
      <dl className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Priorité normalisée</dt>
          <dd className="font-semibold text-white">
            {formatNumber(selection.normalizedScoreComponents.priority, 3)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Déplacement normalisé</dt>
          <dd className="font-semibold text-white">
            {formatNumber(selection.normalizedScoreComponents.travel, 3)}
          </dd>
        </div>
      </dl>
    </li>
  );
}
