import type { RouteTraceSelectedStop } from "@/lib/route/route-trace";
import {
  formatDistance,
  formatDuration,
  formatNumber,
  stopLabel,
  type RouteExplanationData,
} from "./route-explanation.model";
import { PredictionEvidence } from "./route-explanation-prediction";

function AdditionalityDetail({
  selection,
}: {
  selection: RouteTraceSelectedStop;
}) {
  const additionality = selection.additionality;
  const surfaceNames = additionality
    ? additionality.municipalCleaning.surfaceComplexity.available
      ? ["micro-espace complexe"]
      : []
    : [];
  const documentedCoverage = additionality?.municipalCleaning.documentedCoverage;
  const frequency = additionality?.municipalCleaning.documentedFrequency;
  const hasKnownCoverage = documentedCoverage?.available || frequency?.normalized !== null;
  const labels = [
    selection.volunteerAdditionality != null && selection.volunteerAdditionality >= 60
      ? "Forte valeur bénévole"
      : null,
    additionality?.municipalCleaning.mechanizedAccessibility.available &&
    (additionality.municipalCleaning.mechanizedAccessibility.normalized ?? 1) <= 0.3
      ? "Nettoyage mécanisé probablement difficile"
      : null,
    surfaceNames.length > 0 ? "Micro-espace susceptible d'accumuler des déchets" : null,
    documentedCoverage?.available && (documentedCoverage.normalized ?? 0) >= 0.75
      ? "Zone municipale fortement entretenue : priorité réduite"
      : null,
    !hasKnownCoverage ? "Couverture de nettoyage inconnue" : null,
  ].filter((label): label is string => label !== null);
  return (
    <section className="mt-3 rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 p-3 text-xs text-fuchsia-50" data-route-additionality-details>
      <p className="font-black text-white">Valeur complémentaire de l’action bénévole</p>
      <p className="mt-1 leading-relaxed text-fuchsia-100/85">
        Pollution probable : {formatNumber(selection.pollutionPriority ?? 0, 1)} sur 100 · additionnalité : {selection.volunteerAdditionality == null ? "indisponible" : `${formatNumber(selection.volunteerAdditionality, 1)} sur 100`} · contribution planner : {formatNumber(selection.finalPlannerContribution ?? selection.combinedScore, 1)} sur 100.
      </p>
      {labels.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {labels.map((label) => <li key={label} className="rounded-full bg-fuchsia-300/15 px-2 py-1 font-semibold">{label}</li>)}
        </ul>
      ) : null}
      {additionality ? (
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div><dt className="text-fuchsia-100/60">Confiance</dt><dd className="font-semibold">{formatNumber(additionality.confidence.overall * 100, 0)} %</dd></div>
          <div><dt className="text-fuchsia-100/60">Couverture documentée</dt><dd className="font-semibold">{documentedCoverage?.available ? `${formatNumber((documentedCoverage.normalized ?? 0) * 100, 0)} %` : frequency?.visitsPerWeek != null ? `${formatNumber(frequency.visitsPerWeek, 1)} passage(s)/semaine` : "inconnue"}</dd></div>
          <div><dt className="text-fuchsia-100/60">Propreté historique</dt><dd className="font-semibold">{formatNumber(additionality.historicalCleanliness.effective * 100, 0)} % de pression</dd></div>
          <div><dt className="text-fuchsia-100/60">Malus opérationnel</dt><dd className="font-semibold">{additionality.municipalCleaning.scheduledInterventionPenalty > 0 ? `-${formatNumber(additionality.municipalCleaning.scheduledInterventionPenalty * 100, 0)} %` : "aucun détecté"}</dd></div>
        </dl>
      ) : null}
      {additionality?.municipalCleaning.surfaceComplexity.available ? (
        <p className="mt-2 text-fuchsia-100/80">Complexité de surface estimée à {formatNumber((additionality.municipalCleaning.surfaceComplexity.normalized ?? 0) * 100, 0)} % ; les catégories de surface restent des indices, sans bonus automatique.</p>
      ) : null}
      {!additionality ? <p className="mt-2 text-fuchsia-100/75">La couche d’additionnalité n’a pas fourni une évaluation exploitable ; l’inconnu n’est pas interprété comme une absence de nettoyage.</p> : null}
    </section>
  );
}

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
      ) : selection.evidence?.family === "observed" ? (
        <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          Signalement observé validé : la preuve terrain reste prioritaire sur une prédiction de risque équivalente.
        </p>
      ) : (
        <p className="mt-3 rounded-xl border border-slate-300/20 bg-slate-500/10 p-3 text-xs text-slate-200">
          Preuve terrain indisponible : ce stop ne peut pas être présenté comme un signalement observé validé.
        </p>
      )}
      <AdditionalityDetail selection={selection} />
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
