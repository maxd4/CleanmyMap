import type {
  ActionDataAnomaly,
  ActionDataQualitySummary,
} from "@/lib/actions/quality/data-quality-types";

export type ActionQualityField = {
  label: string;
  value: string;
  provenance?: string;
};

const CORRECTION_TARGETS: Partial<Record<ActionDataAnomaly["code"], string>> = {
  missing_location_label: "action-declaration-terrain",
  invalid_date: "action-declaration-identify",
  partial_coordinates: "action-declaration-terrain",
  missing_coordinates: "action-declaration-terrain",
  invalid_coordinates: "action-declaration-terrain",
  invalid_measure: "action-declaration-results",
  implausible_measure: "action-declaration-results",
  estimated_measure: "action-declaration-results",
  low_geometry_confidence: "action-declaration-terrain",
  geometry_without_coordinates: "action-declaration-terrain",
};

function correctionHref(
  anomaly: ActionDataAnomaly,
  actionId: string | null | undefined,
  localCorrectionTargets: boolean,
): string | null {
  const target = CORRECTION_TARGETS[anomaly.code];
  if (!target) return null;
  if (localCorrectionTargets) return `#${target}`;
  return actionId ? `/actions/new?actionId=${encodeURIComponent(actionId)}#${target}` : null;
}

function AnomalyList({
  title,
  anomalies,
  actionId,
  localCorrectionTargets,
}: {
  title: string;
  anomalies: ActionDataAnomaly[];
  actionId?: string | null;
  localCorrectionTargets: boolean;
}) {
  if (anomalies.length === 0) return null;
  return (
    <section aria-label={title}>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <ul className="mt-2 space-y-2">
        {anomalies.map((anomaly) => {
          const href = correctionHref(anomaly, actionId, localCorrectionTargets);
          return (
            <li key={anomaly.code} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
              <p>{anomaly.message}</p>
              {href ? <a className="mt-1 inline-flex min-h-11 items-center font-semibold text-emerald-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" href={href}>Ouvrir le champ concerné</a> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ActionDataQualityPanel({
  summary,
  fields,
  correctionActionId,
  localCorrectionTargets = false,
}: {
  summary: ActionDataQualitySummary;
  fields: ActionQualityField[];
  /** Supplied only when the current user can manage this action. */
  correctionActionId?: string | null;
  localCorrectionTargets?: boolean;
}) {
  const statusLabel = summary.status === "blocking"
    ? "À corriger avant validation"
    : summary.status === "warning"
      ? "Améliorations facultatives"
      : "Aucune anomalie détectée";

  return (
    <section aria-labelledby="action-data-quality-title" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 id="action-data-quality-title" className="text-base font-bold text-slate-900">Qualité des données</h3>
        <p className="mt-1 text-sm text-slate-700">{statusLabel} · règle {summary.version}</p>
      </div>
      {fields.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="rounded-lg bg-white px-3 py-2">
              <dt className="text-xs font-semibold text-slate-600">{field.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">{field.value}</dd>
              {field.provenance ? <dd className="text-xs text-slate-600">Provenance : {field.provenance}</dd> : null}
            </div>
          ))}
        </dl>
      ) : null}
      <p className="text-xs text-slate-700">
        Provenance des mesures : {summary.provenance.measures}. Provenance de la géométrie : {summary.provenance.geometry}.
      </p>
      <AnomalyList title="Bloquants" anomalies={summary.blockingAnomalies} actionId={correctionActionId} localCorrectionTargets={localCorrectionTargets} />
      <AnomalyList title="Améliorations facultatives" anomalies={summary.warnings.filter((item) => item.code !== "missing_coordinates" && item.code !== "geometry_without_coordinates")} actionId={correctionActionId} localCorrectionTargets={localCorrectionTargets} />
      <AnomalyList title="Limites de preuve géographique" anomalies={summary.warnings.filter((item) => item.code === "missing_coordinates" || item.code === "geometry_without_coordinates")} actionId={correctionActionId} localCorrectionTargets={localCorrectionTargets} />
      {summary.anomalies.length === 0 ? <p className="text-sm text-slate-700">Aucune anomalie relevée par le contrôle canonique.</p> : null}
      {!localCorrectionTargets && !correctionActionId && summary.anomalies.length > 0 ? <p className="text-xs text-slate-700">Aucun accès de modification n’est établi pour ce compte ; les champs restent consultables sans lien de correction.</p> : null}
    </section>
  );
}
