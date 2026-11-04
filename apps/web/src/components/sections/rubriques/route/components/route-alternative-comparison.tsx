import { CmmButton } from "@/components/ui/cmm-button";
import type { RouteResponse } from "../route-types";

function scoreLabel(score: number | null | undefined): string {
  return score === null || score === undefined ? "non évaluable" : `${Number.isInteger(score) ? score : score.toFixed(1)} / 100`;
}

function coordinateLabel(data: RouteResponse): string {
  return `${data.origin.latitude.toFixed(5)}, ${data.origin.longitude.toFixed(5)}`;
}

function topologyLabel(data: RouteResponse): string {
  return (data.routeTopology ?? (data.isLoop ? "loop" : "open")) === "loop" ? "boucle" : "trajet ouvert";
}

function ComparisonMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><dt className="cmm-text-caption font-black uppercase tracking-[0.12em] text-slate-400">{label}</dt><dd className="mt-1 font-bold text-white">{value}</dd></div>;
}

export function RouteAlternativeComparison({
  current,
  alternative,
  isLoading,
  error,
  onAccept,
  onKeep,
}: {
  current: RouteResponse;
  alternative?: RouteResponse;
  isLoading: boolean;
  error?: Error;
  onAccept: () => void;
  onKeep: () => void;
}) {
  const search = alternative?.nearestRelevantSearch;
  const canAccept = search?.status === "found";
  const accessDistance = search?.accessDistanceKm;
  const accessDuration = search?.accessDurationMinutes;
  return (
    <section aria-labelledby="route-alternative-title" data-route-alternative-comparison className="rounded-2xl border border-amber-300/35 bg-amber-400/10 p-4 text-amber-50 shadow-[0_20px_50px_-30px_rgba(251,191,36,0.35)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p id="route-alternative-title" className="text-xs font-black uppercase tracking-[0.16em] text-amber-100/80">Alternative recommandée</p>
          <p className="mt-1 text-sm font-bold">L’itinéraire actuel reste conservé jusqu’à votre choix.</p>
        </div>
        <p className="max-w-sm text-xs font-semibold leading-relaxed text-amber-100/80">Le score est un potentiel théorique relatif, pas une mesure de pollution actuelle.</p>
      </div>

      {isLoading ? <p role="status" aria-live="polite" className="mt-4 text-sm font-bold">Recherche des boucles pertinentes…</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm font-bold">La recherche alternative n’a pas abouti. Votre itinéraire initial est conservé.</p> : null}
      {alternative && !canAccept ? <p role="status" className="mt-4 text-sm font-bold">Aucune alternative admissible n’a été trouvée dans l’espace exploré. Votre itinéraire initial est conservé.</p> : null}

      {alternative && canAccept ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-300/20 bg-slate-950/35 p-3" data-route-alternative-current>
            <h3 className="font-black">Mon itinéraire</h3>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <ComparisonMetric label="Départ" value={coordinateLabel(current)} />
              <ComparisonMetric label="Tracé" value={topologyLabel(current)} />
              <ComparisonMetric label="Distance" value={`${current.travelDistanceKm.toFixed(2)} km`} />
              <ComparisonMetric label="Déplacement" value={`${current.travelMinutes} min`} />
              <ComparisonMetric label="Score théorique" value={scoreLabel(current.pollutionRelevance?.score)} />
            </dl>
          </article>
          <article className="rounded-2xl border border-amber-200/35 bg-amber-950/20 p-3" data-route-alternative-proposal>
            <h3 className="font-black">Alternative proposée</h3>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <ComparisonMetric label="Nouveau départ" value={coordinateLabel(alternative)} />
              <ComparisonMetric label="Tracé" value={topologyLabel(alternative)} />
              <ComparisonMetric label="Distance" value={`${alternative.travelDistanceKm.toFixed(2)} km`} />
              <ComparisonMetric label="Déplacement" value={`${alternative.travelMinutes} min`} />
              <ComparisonMetric label="Score théorique" value={scoreLabel(alternative.pollutionRelevance?.score ?? search?.scoreAfter)} />
              <ComparisonMetric label="Distance supplémentaire" value={accessDistance === null || accessDistance === undefined ? "indisponible" : `${accessDistance.toFixed(2)} km · ${accessDuration ?? "—"} min`} />
            </dl>
          </article>
        </div>
      ) : null}

      {alternative && canAccept && search.rendezvous ? <p className="mt-3 text-xs font-semibold">Nouveau rendez-vous : {search.rendezvous.latitude.toFixed(5)}, {search.rendezvous.longitude.toFixed(5)} · {search.routingStatus === "fallback" ? "routage estimé" : "réseau piéton"}.</p> : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <CmmButton type="button" tone="secondary" size="sm" onClick={onKeep} ariaLabel="Conserver mon itinéraire">Conserver mon itinéraire</CmmButton>
        {canAccept ? <CmmButton type="button" tone="primary" size="sm" onClick={onAccept} ariaLabel="Utiliser cet itinéraire">Utiliser cet itinéraire</CmmButton> : null}
      </div>
    </section>
  );
}
