import type { RouteRecommendationTrace } from "@/lib/route/route-trace";
import {
  formatDistance,
  formatDuration,
  formatNumber,
  riskLabel,
  type PredictedRouteEvidence,
} from "./route-explanation.model";

export function PredictionEvidence({
  evidence,
}: {
  evidence: PredictedRouteEvidence;
}) {
  const wasteFactors = evidence.contributions.waste.filter(
    (item) => item.available && item.points > 0,
  );
  const buttFactors = evidence.contributions.cigaretteButts.filter(
    (item) => item.available && item.points > 0,
  );
  const factors = [...wasteFactors, ...buttFactors]
    .sort((left, right) => right.points - left.points || left.key.localeCompare(right.key))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.key === item.key) === index)
    .slice(0, 6);
  const cleanlinessCorrections = [
    ["Déchets", evidence.cleanlinessCorrection.waste],
    ["Mégots", evidence.cleanlinessCorrection.cigaretteButts],
  ] as const;
  return (
    <section data-route-prediction-details className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm text-amber-50">
      <h6 className="font-black text-white">Zone prédite · pas un signalement observé</h6>
      <p className="mt-2 text-xs text-amber-100/85">
        Source {evidence.source} · modèle {evidence.modelVersion} · snapshot {evidence.snapshot.snapshotId} ({evidence.snapshot.generatedAt}).
      </p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div><dt className="text-amber-100/65">Risque déchets</dt><dd className="font-bold">{riskLabel(evidence.wasteRisk)} · confiance {evidence.confidence.waste.level} ({formatNumber(evidence.confidence.waste.score * 100, 0)} %)</dd></div>
        <div><dt className="text-amber-100/65">Risque mégots</dt><dd className="font-bold">{riskLabel(evidence.cigaretteButtRisk)} · confiance {evidence.confidence.cigaretteButts.level} ({formatNumber(evidence.confidence.cigaretteButts.score * 100, 0)} %)</dd></div>
        <div><dt className="text-amber-100/65">Distance au corridor</dt><dd className="font-bold">{formatDistance(evidence.distanceToCorridorKm)}</dd></div>
        <div><dt className="text-amber-100/65">Détour évalué</dt><dd className="font-bold">{formatDistance(evidence.detourDistanceKm)} · {formatDuration(evidence.detourMinutes)}</dd></div>
      </dl>
      {evidence.admission ? (
        <p className="mt-3 text-xs text-amber-100/85">
          Décision d’admission : {evidence.admission.reason === "corridor" ? "proximité raisonnable du corridor" : `opportunité forte (seuil ${riskLabel(evidence.admission.riskThreshold)}, détour maximal ${formatDuration(evidence.admission.detourLimitMinutes)})`}.
        </p>
      ) : null}
      {factors.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-bold text-white">Facteurs disponibles ayant contribué</p>
          <ul className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
            {factors.map((factor) => <li key={factor.key}>{factor.label} : +{formatNumber(factor.points, 2)} points</li>)}
          </ul>
        </div>
      ) : null}
      {cleanlinessCorrections.some(([, correction]) => correction.available && correction.points < 0) ? (
        <p className="mt-3 text-xs text-emerald-100">
          Correction de propreté appliquée : {cleanlinessCorrections.filter(([, correction]) => correction.available && correction.points < 0).map(([label, correction]) => `${label} ${formatNumber(correction.points, 2)} points`).join(" ; ")}. Une zone très fréquentée peut donc rester moins prioritaire lorsqu’elle est historiquement propre.
        </p>
      ) : null}
      {cleanlinessCorrections.some(([, correction]) => !correction.available) ? (
        <p className="mt-3 text-xs text-amber-100/80">
          Correction de propreté non appliquée pour les signaux indisponibles : la résolution ou le prior ne permet pas une correction fiable.
        </p>
      ) : null}
      {evidence.provenanceGaps.length > 0 ? (
        <p className="mt-3 text-xs text-amber-100/80">
          Provenance contextuelle manquante ou indisponible pour : {evidence.provenanceGaps.map((gap) => gap.factor).join(", ")}. La confiance reflète cette limite.
        </p>
      ) : null}
      <p className="mt-3 text-xs text-amber-100/75">Ces scores sont des niveaux internes de risque/pression bornés, pas des probabilités calibrées ni une mesure réelle de pollution.</p>
    </section>
  );
}

export function PredictionSummary({
  prediction,
}: {
  prediction: NonNullable<RouteRecommendationTrace["prediction"]>;
}) {
  return (
    <div data-route-prediction-summary className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-50">
      <h4 className="font-bold text-white">Couche prédictive</h4>
      <p className="mt-1 text-xs">
        {prediction.status === "unavailable" ? "Indisponible : l’itinéraire observé reste utilisable." : `${prediction.zonesConsidered} zone(s) évaluée(s), ${prediction.candidatesConsidered} zone(s) admissible(s), ${prediction.selectedCandidateIds.length} retenue(s)`} · source {prediction.source} · modèle {prediction.modelVersion ?? "non disponible"}.
      </p>
      {prediction.warnings.map((warning) => <p key={warning} className="mt-1 text-xs text-amber-100/80">État dégradé : {warning}</p>)}
    </div>
  );
}
