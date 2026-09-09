"use client";

import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { RouteTraceExclusionReason } from "@/lib/route/route-trace";
import { getRouteOriginLabel } from "../route-origin";
import { EventExplanation } from "./route-explanation-events";
import {
  exclusionLabels,
  formatDistance,
  formatDuration,
  formatNumber,
  stopLabel,
  type RouteExplanationProps,
} from "./route-explanation.model";
import { PredictionSummary } from "./route-explanation-prediction";
import { MetricValue, SelectionDetail } from "./route-explanation-stop";

export function RouteExplanation({ data, fr }: RouteExplanationProps) {
  const trace = data.trace;
  const originLabel = getRouteOriginLabel(data.origin.source, fr);
  const providerLabel = trace.routing.provider === "none"
    ? "aucun fournisseur externe"
    : trace.routing.provider;
  const profileLabel = trace.routing.profile ?? "non disponible";
  const exclusions = Object.entries(trace.candidates.excludedByReason) as Array<
    [RouteTraceExclusionReason, number]
  >;

  return (
    <CmmDisclosure
      summary={fr ? "Comprendre cet itinéraire" : "Understand this route"}
      tone="sky"
      size="lg"
      id="route-explanation"
      className="border border-sky-300/20 bg-slate-950/40"
    >
      <div className="space-y-4">
        <section aria-labelledby="route-explanation-summary">
          <h3 id="route-explanation-summary" className="text-base font-black text-white">
            {fr ? "Vue synthétique" : "Summary"}
          </h3>
          <dl className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Origine utilisée</dt>
              <dd className="font-semibold text-white">{originLabel}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Distance totale</dt>
              <dd className="font-semibold text-white">
                <MetricValue value={data.travelDistanceKm} kind="distance" measured={trace.routing.mode === "network"} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Durée de déplacement</dt>
              <dd className="font-semibold text-white">
                <MetricValue value={data.travelMinutes} kind="duration" measured={trace.routing.mode === "network"} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Stops retenus</dt>
              <dd className="font-semibold text-white">{trace.selectedStops.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Budget utilisé / restant</dt>
              <dd className="font-semibold text-white">
                {formatDuration(trace.budget.consumedMinutes)} / {formatDuration(trace.budget.remainingMinutes)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Retour à l’origine</dt>
              <dd className="font-semibold text-white">
                <MetricValue value={data.loop.returnDistanceKm} kind="distance" measured={trace.routing.mode === "network"} /> · {formatDuration(data.loop.returnMinutes)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Routage</dt>
              <dd className="font-semibold text-white">
                {trace.routing.mode === "network" ? "Réseau" : "Estimation / fallback"} · {providerLabel} · profil {profileLabel}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            {trace.duration.serviceMinutes === null && trace.duration.estimatedMinutes === null
              ? "Temps de collecte/service non fourni : aucune durée n’est inventée."
              : trace.duration.estimatedMinutes !== null
                ? `Déplacement estimé : ${formatDuration(trace.duration.estimatedMinutes)}.`
                : `Déplacement réseau : ${formatDuration(trace.duration.networkMinutes)}.`}
          </p>
          <p className="mt-2 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-50">
            Boucle de {formatNumber(data.travelDistanceKm)} km · départ et arrivée au même endroit. Le retour réserve {formatDuration(data.loop.returnMinutes)} du budget ; il reste {formatDuration(data.loop.budgetRemainingMinutes)} après la boucle.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-200">
            <strong className="text-white">Mode : </strong>
            {trace.planningMode.type === "event-centered"
              ? "Itinéraire construit autour de cet événement"
              : trace.selectedStops.some((selection) => selection.eventContributions.length > 0)
                ? "Événement ayant influencé un itinéraire libre"
                : "Itinéraire libre"}
          </div>
          <EventExplanation trace={trace} data={data} originLabel={originLabel} fr={fr} />
          {trace.prediction ? (
            <PredictionSummary prediction={trace.prediction} />
          ) : null}
          <section
            className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-50"
            aria-labelledby="route-preference-trace"
          >
            <h3 id="route-preference-trace" className="font-black text-white">
              {fr ? "Traçabilité de la préférence" : "Preference trace"}
            </h3>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-amber-100/65">pickupPreference</dt>
                <dd className="font-bold text-white">{trace.parameters.pickupPreference}</dd>
              </div>
              <div>
                <dt className="text-amber-100/65">effectiveRiskFocus</dt>
                <dd className="font-bold text-white">{trace.parameters.effectiveRiskFocus}</dd>
              </div>
              <div>
                <dt className="text-amber-100/65">prediction.riskFocus</dt>
                <dd className="font-bold text-white">
                  {trace.prediction?.riskFocus ?? "non disponible"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-amber-100/90">
              {fr
                ? trace.parameters.pickupPreference === "waste"
                  ? "Le calcul privilégie le risque déchets des zones prédites."
                  : trace.parameters.pickupPreference === "cigarette_butts"
                  ? "Le calcul privilégie le risque mégots des zones prédites."
                    : trace.parameters.effectiveRiskFocus === "waste"
                      ? "Aucun type n’est explicitement favorisé ; le focus déchets effectivement utilisé est conservé pour les zones prédites."
                      : trace.parameters.effectiveRiskFocus === "cigaretteButts"
                        ? "Aucun type n’est explicitement favorisé ; le focus mégots effectivement utilisé est conservé pour les zones prédites."
                        : "Aucun type n’est explicitement favorisé dans les zones prédites."
                : trace.parameters.pickupPreference === "waste"
                  ? "The calculation prioritizes waste risk in predicted zones."
                  : trace.parameters.pickupPreference === "cigarette_butts"
                    ? "The calculation prioritizes cigarette-butt risk in predicted zones."
                    : trace.parameters.effectiveRiskFocus === "waste"
                      ? "No type is explicitly favored; the effective waste focus is retained for predicted zones."
                      : trace.parameters.effectiveRiskFocus === "cigaretteButts"
                        ? "No type is explicitly favored; the effective cigarette-butt focus is retained for predicted zones."
                        : "No type is explicitly favored in predicted zones."}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
              {fr
                ? "La sécurité, la distance et l’utilité restent prises en compte. Les signalements observés ne sont pas repondérés : leur scoring observé reste inchangé."
                : "Safety, distance, and usefulness remain part of the calculation. Observed reports are not reweighted: their observed scoring remains unchanged."}
            </p>
          </section>
          {trace.multiRoute ? (
            <section className="mt-4 rounded-2xl border border-indigo-300/20 bg-indigo-500/10 p-4" aria-label={fr ? "Explicabilité multi-groupes" : "Multi-group explainability"}>
              <h3 className="font-black text-white">
                {fr ? `${trace.multiRoute.groupCount} boucles coordonnées` : `${trace.multiRoute.groupCount} coordinated loops`}
              </h3>
              <p className="mt-2 text-sm text-slate-200">
                {fr
                  ? "Chaque groupe reçoit une boucle différente afin de couvrir davantage de rues."
                  : "Each group receives a different loop to cover more streets."}
              </p>
              <dl className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                <div><dt className="text-slate-500">Distance cumulée</dt><dd className="font-semibold text-white">{formatDistance(data.multiRoute.totalDistanceKm)}</dd></div>
                <div><dt className="text-slate-500">Couverture</dt><dd className="font-semibold text-white">{formatNumber(data.multiRoute.coverageGain)}</dd></div>
                <div><dt className="text-slate-500">Cibles partagées</dt><dd className="font-semibold text-white">{formatNumber(data.multiRoute.sharedTargetRatio * 100)} %</dd></div>
                <div><dt className="text-slate-500">Distance réseau partagée</dt><dd className="font-semibold text-white">{data.multiRoute.sharedDistanceRatio === null ? "Non mesurée" : `${formatNumber(data.multiRoute.sharedDistanceRatio * 100)} %`}</dd></div>
                <div><dt className="text-slate-500">Équilibre distance / durée</dt><dd className="font-semibold text-white">{formatDistance(data.multiRoute.balanceDistance)} / {formatDuration(data.multiRoute.balanceDuration)}</dd></div>
                <div><dt className="text-slate-500">Équilibre des stops</dt><dd className="font-semibold text-white">écart {formatNumber(data.multiRoute.balanceTargetCount)}</dd></div>
              </dl>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                {trace.multiRoute.groups.map((group) => (
                  <li key={group.groupIndex} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <strong className="text-white">Groupe {group.groupIndex}</strong> · {group.volunteerCount} bénévoles · {formatDistance(group.distanceKm)} · {formatDuration(group.durationMinutes)} · {group.targetCount} stops.
                    {group.reservedCandidateIds.length > 0 ? ` ${group.reservedCandidateIds.length} cible(s) réservée(s) aux autres groupes.` : ""}
                  </li>
                ))}
              </ul>
              <ul className="mt-3 space-y-1 text-xs text-slate-400">
                {trace.multiRoute.constraints.map((constraint) => <li key={constraint}>· {constraint}</li>)}
              </ul>
            </section>
          ) : null}
        </section>

        <CmmDisclosure summary={fr ? "Pourquoi ces points ?" : "Why these points?"} tone="emerald" size="md">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-300">
              Le moteur a utilisé {formatNumber(trace.parameters.priorityVsTravel)} % de poids pour la priorité et le complément pour le déplacement, dans la limite de {formatDuration(trace.parameters.travelBudgetMinutes)} et de {trace.parameters.maxStops} stops maximum.
            </p>
            <div>
              <h4 className="text-sm font-bold text-white">Critères retenus</h4>
              <p className="mt-1 text-xs text-slate-400">
                La priorité pollution reste la base ; une additionnalité bénévole disponible et suffisamment confiante peut modifier la contribution finale avec un poids borné, puis le coût de déplacement est arbitré dans le budget. Départage déterministe par score combiné, priorité, déplacement incrémental et identifiant.
              </p>
            </div>
            {trace.selectedStops.length > 0 ? (
              <ol className="space-y-3" aria-label={fr ? "Justifications des stops sélectionnés" : "Selected stop justifications"}>
                {trace.selectedStops.map((selection) => (
                  <SelectionDetail key={`${selection.step}-${selection.id}`} selection={selection} data={data} originLabel={originLabel} />
                ))}
              </ol>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-400">
                Aucun stop n’a été sélectionné par le moteur.
              </p>
            )}
            <div>
              <h4 className="text-sm font-bold text-white">Exclusions et limitations agrégées</h4>
              <p className="mt-1 text-xs text-slate-400">
                {trace.candidates.loaded} candidats chargés, {trace.candidates.admissible} admissibles, {trace.candidates.excluded} exclus.
              </p>
              {exclusions.length > 0 ? (
                <ul className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  {exclusions.map(([reason, count]) => (
                    <li key={reason} className="rounded-xl bg-white/[0.04] px-3 py-2">
                      {exclusionLabels[reason]} : <span className="font-bold text-white">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Aucune exclusion agrégée fournie.</p>
              )}
            </div>
          </div>
        </CmmDisclosure>

        <CmmDisclosure summary={fr ? "Détail du calcul" : "Calculation detail"} tone="indigo" size="md">
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Version du moteur : <span className="font-semibold text-slate-200">{trace.engineVersion}</span>. Les valeurs ci-dessous proviennent des étapes enregistrées par le planner.
            </p>
            <ol className="space-y-3" aria-label={fr ? "Étapes du planner" : "Planner steps"}>
              {trace.selectedStops.map((selection) => (
                <li key={`${selection.step}-${selection.id}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="text-white">Étape {selection.step} · {stopLabel(selection.id, data, originLabel)}</strong>
                    <span>{formatDuration(selection.budgetBeforeMinutes)} → {formatDuration(selection.budgetAfterMinutes)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Déplacement ajouté : {formatDistance(selection.incrementalDistanceKm)} · {formatDuration(selection.incrementalTravelMinutes)} · retour réservé {formatDistance(selection.returnDistanceKm)} · {formatDuration(selection.returnTravelMinutes)} · boucle candidate {formatDuration(selection.loopTravelMinutes)}.
                  </p>
                </li>
              ))}
            </ol>
            {trace.approximations.length > 0 || trace.fallbacks.length > 0 || trace.warnings.length > 0 ? (
              <div className="space-y-2 text-xs text-slate-300">
                {trace.approximations.map((item) => <p key={`approximation-${item}`}><strong className="text-amber-200">Approximation :</strong> {item}</p>)}
                {trace.fallbacks.map((item) => <p key={`fallback-${item}`}><strong className="text-amber-200">Fallback :</strong> {item}</p>)}
                {trace.warnings.map((item) => <p key={`warning-${item}`}><strong className="text-slate-200">Avertissement :</strong> {item}</p>)}
              </div>
            ) : null}
          </div>
        </CmmDisclosure>

        <CmmDisclosure summary={fr ? "Détail du trajet" : "Route detail"} tone="slate" size="md">
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Trajet fourni par <span className="font-semibold text-slate-200">{providerLabel}</span> avec profil <span className="font-semibold text-slate-200">{profileLabel}</span>.
            </p>
            {trace.routing.mode === "fallback" ? (
              <p className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                Le fallback fournit une géométrie et des estimations de déplacement ; aucune liste fictive de rues n’est affichée.
              </p>
            ) : trace.segments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-400">
                Aucun segment de trajet n’est disponible.
              </p>
            ) : (
              <ol className="space-y-3" aria-label={fr ? "Segments du trajet" : "Route segments"}>
                {trace.segments.map((segment, index) => (
                  <li key={`${segment.from}-${segment.to}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="font-bold text-white">
                        {stopLabel(segment.from, data, originLabel)} → {stopLabel(segment.to, data, originLabel)}
                      </h4>
                      <span className="text-xs font-semibold text-emerald-200">{segment.measured ? "Mesure réseau" : "Donnée incomplète"}</span>
                    </div>
                    <dl className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                      <div><dt className="text-slate-500">Distance</dt><dd><MetricValue value={segment.distanceKm} kind="distance" measured={segment.measured} /></dd></div>
                      <div><dt className="text-slate-500">Durée</dt><dd><MetricValue value={segment.durationMinutes} kind="duration" measured={segment.measured} /></dd></div>
                    </dl>
                    {segment.streetSteps.length > 0 ? (
                      <ol className="mt-3 space-y-2 border-l border-sky-300/20 pl-4" aria-label={`Étapes réseau du segment ${index + 1}`}>
                        {segment.streetSteps.map((step, stepIndex) => (
                          <li key={`${stepIndex}-${step.name ?? "unnamed"}`} className="text-xs text-slate-300">
                            <span className="font-semibold text-white">{step.name ?? "Voie non nommée"}</span>
                            <span className="text-slate-500"> · {formatDistance(step.distanceKm)} · {formatDuration(step.durationMinutes)}</span>
                            {step.maneuver ? <span className="text-slate-400"> · {step.maneuver}</span> : null}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400">
                        Le fournisseur a fourni le chemin et ses métriques, mais pas de détail de voie pour ce segment ; son raisonnement interne exact n’est pas connu de CleanMyMap.
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </CmmDisclosure>
      </div>
    </CmmDisclosure>
  );
}
