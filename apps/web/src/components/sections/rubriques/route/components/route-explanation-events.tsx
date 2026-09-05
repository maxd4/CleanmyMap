import type { RouteRecommendationTrace } from "@/lib/route/route-trace";
import {
  formatDistance,
  formatDuration,
  formatNumber,
  routeEventStatusLabel,
  stopLabel,
  type RouteExplanationData,
} from "./route-explanation.model";

type EventCandidateImpact = {
  candidateId: string;
  distanceKm: number | null;
  scoreContribution: number;
};

export function EventExplanation({
  trace,
  data,
  originLabel,
  fr,
}: {
  trace: RouteRecommendationTrace;
  data: RouteExplanationData;
  originLabel: string;
  fr: boolean;
}) {
  if (trace.eventCentered) {
    const candidateImpacts = trace.eventCentered.candidateImpacts as EventCandidateImpact[];
    return (
      <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-50">
        <h4 className="font-bold text-white">Événement choisi comme ancre</h4>
        <p className="mt-2">
          {trace.eventCentered.event.title} · {trace.eventCentered.event.locationLabel} · {trace.eventCentered.event.eventDate} · {routeEventStatusLabel(trace.eventCentered.temporalStatus, fr)}.
        </p>
        <p className="mt-1 text-xs text-amber-100/80">
          Distance origine → événement : {formatDistance(trace.eventCentered.distanceFromOriginKm)}. Rayon d’ancrage : {formatDistance(trace.eventCentered.radiusKm)} ; poids d’ancrage : {formatNumber(trace.eventCentered.anchorWeight * 100, 0)} %.
        </p>
        <p className="mt-1 text-xs text-amber-100/80">
          {trace.eventCentered.temporalStatus === "future"
            ? "Rôle : anticipation autour d’un événement futur ; aucune pollution n’est présentée comme observée."
            : trace.eventCentered.temporalStatus === "today"
              ? "Rôle : ancrage le jour de l’événement ; ce n’est pas un signalement de déchet."
              : `Rôle : ancrage post-événement${trace.eventCentered.ageDays === null ? "" : `, âge ${formatNumber(trace.eventCentered.ageDays, 1)} jour(s)`}.`}
        </p>
        <p className="mt-1 text-xs text-amber-100/80">
          {trace.eventCentered.favoredCandidateIds.length} candidat(s) dans le rayon favorisé ; {trace.eventCentered.outsideAnchorRadiusCandidateIds.length} hors rayon d’ancrage. Le budget reste une contrainte dure : {formatDuration(trace.budget.consumedMinutes)} utilisé(s), {formatDuration(trace.budget.remainingMinutes)} restant(s).
        </p>
        {candidateImpacts.filter((impact) =>
          trace.eventCentered?.selectedCandidateIds.includes(impact.candidateId),
        ).length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
            {candidateImpacts
              .filter((impact) => trace.eventCentered?.selectedCandidateIds.includes(impact.candidateId))
              .map((impact) => (
                <li key={impact.candidateId}>
                  {stopLabel(impact.candidateId, data, originLabel)} : distance événement {formatDistance(impact.distanceKm)}, contribution d’ancrage {formatNumber(impact.scoreContribution, 2)} points.
                </li>
              ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return trace.selectedStops.some((selection) => selection.eventContributions.length > 0) ? (
    <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-sm text-amber-50">
      Un ou plusieurs événements récents ont influencé la priorité d’un itinéraire libre. Leur pression reste un signal prédictif, distinct d’une observation terrain.
    </p>
  ) : null;
}
