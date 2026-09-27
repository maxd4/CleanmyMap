"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { fetchActionById, type ActionEditorRecord } from "@/lib/actions/http";
import { applyActionRouteVersion } from "@/lib/actions/route-version-http";
import { fetchRouteRecommendation } from "@/components/sections/rubriques/route/route-request";
import {
  buildRouteRefreshProposal,
  buildRouteRefreshSubmission,
  compareRouteRefresh,
  type RouteRefreshProposal,
} from "@/lib/route/route-refresh";

function formatMetric(value: number | null, suffix: string): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${suffix}`
    : "Non disponible";
}

function metricRows(proposal: RouteRefreshProposal, action: ActionEditorRecord) {
  const comparison = compareRouteRefresh(action, proposal);
  if (!comparison) return null;
  return {
    comparison,
    rows: [
      ["Distance", formatMetric(comparison.current.metrics.distanceKm, "km"), formatMetric(comparison.proposal.metrics.distanceKm, "km")],
      ["Temps de marche", formatMetric(comparison.current.metrics.walkingMinutes, "min"), formatMetric(comparison.proposal.metrics.walkingMinutes, "min")],
      ["Temps de collecte estimé", formatMetric(comparison.current.metrics.collectionMinutes, "min"), formatMetric(comparison.proposal.metrics.collectionMinutes, "min")],
      ["Durée opérationnelle totale", formatMetric(comparison.current.metrics.totalMinutes, "min"), formatMetric(comparison.proposal.metrics.totalMinutes, "min")],
    ] as const,
  };
}

export function ActionRouteRefreshPanel({
  action,
}: {
  action: ActionEditorRecord;
}) {
  const [activeAction, setActiveAction] = useState(action);
  const [proposal, setProposal] = useState<RouteRefreshProposal | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "applying" | "error" | "kept" | "applied">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const submission = buildRouteRefreshSubmission(activeAction);
    if (!submission) {
      setState("error");
      setMessage("Les paramètres canoniques de l'itinéraire ne sont pas disponibles.");
      return;
    }
    setState("loading");
    setMessage(null);
    try {
      const response = await fetchRouteRecommendation(submission);
      const nextProposal = buildRouteRefreshProposal(response);
      if (!nextProposal) {
        throw new Error("Le moteur n'a pas fourni de snapshot vérifiable pour cette proposition.");
      }
      setProposal(nextProposal);
      setState("idle");
    } catch (error: unknown) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Impossible de recalculer l'itinéraire.");
    }
  }

  async function applyProposal() {
    if (!proposal) return;
    setState("applying");
    setMessage(null);
    try {
      const result = await applyActionRouteVersion(activeAction.id, {
        operationalRoute: proposal.operationalRoute,
        plannerSnapshot: proposal.plannerSnapshot,
        plannerProof: proposal.plannerProof,
      });
      const refreshedAction = await fetchActionById(activeAction.id);
      setActiveAction(refreshedAction);
      setProposal(null);
      setState(result.status === "unchanged" ? "kept" : "applied");
      setMessage(
        result.status === "unchanged"
          ? "La proposition est identique à l'itinéraire actif. Aucune version supplémentaire n'a été créée."
          : "Le nouvel itinéraire est maintenant actif. L'ancienne version reste conservée dans l'historique.",
      );
    } catch (error: unknown) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Impossible d'appliquer l'itinéraire.");
    }
  }

  const details = proposal ? metricRows(proposal, activeAction) : null;
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-4" data-testid="action-route-refresh-panel">
        <div>
          <h3 className="text-lg font-black text-emerald-950">Itinéraire actif</h3>
          <p className="mt-1 text-sm leading-6 text-emerald-950">
            Recalculez une proposition avec les données route actuelles. Rien ne change avant votre décision.
          </p>
        </div>
        <CmmButton
          tone="secondary"
          variant="pill"
          size="md"
          onClick={() => void refresh()}
          disabled={state === "loading" || state === "applying"}
        >
          {state === "loading" ? "Actualisation…" : "Actualiser l'itinéraire"}
        </CmmButton>
        {message ? (
          <p className={state === "error" ? "text-sm font-semibold text-rose-700" : "text-sm text-emerald-800"} role={state === "error" ? "alert" : "status"}>
            {message}
          </p>
        ) : null}
        {proposal && details ? (
          <div className="space-y-4 rounded-2xl border border-emerald-200/70 bg-white/85 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-black text-emerald-950">Itinéraire actuel</h4>
                <dl className="mt-2 space-y-1 text-sm text-emerald-900/75">
                  {details.rows.map(([label, current]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold text-emerald-950">{current}</dd></div>)}
                </dl>
              </div>
              <div>
                <h4 className="font-black text-emerald-950">Nouvelle proposition</h4>
                <dl className="mt-2 space-y-1 text-sm text-emerald-900/75">
                  {details.rows.map(([label, , next]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold text-emerald-950">{next}</dd></div>)}
                </dl>
              </div>
            </div>
            {details.comparison.identical ? <p className="text-sm font-semibold text-emerald-800">Cette proposition est identique à la version active.</p> : null}
            <div className="grid gap-3 text-sm text-emerald-900/75 sm:grid-cols-3">
              <p><strong className="text-emerald-950">Stops conservés :</strong> {details.comparison.keptStopIds.length}</p>
              <p><strong className="text-emerald-950">Stops ajoutés :</strong> {details.comparison.addedStopIds.length}</p>
              <p><strong className="text-emerald-950">Stops retirés :</strong> {details.comparison.removedStopIds.length}</p>
            </div>
            {details.comparison.priorityChanges.length > 0 ? (
              <p className="text-sm text-emerald-900/75"><strong className="text-emerald-950">Évolution des priorités :</strong> {details.comparison.priorityChanges.length} stop(s) avec une justification différente.</p>
            ) : null}
            {proposal.calculation.explanation ? <p className="text-sm leading-6 text-emerald-950"><strong className="text-emerald-950">Explication du moteur :</strong> {proposal.calculation.explanation}</p> : null}
            <div className="flex flex-wrap gap-2">
              <CmmButton tone="tertiary" variant="pill" size="sm" onClick={() => { setProposal(null); setState("kept"); setMessage("L'itinéraire actuel est conservé."); }}>
                Conserver l&apos;itinéraire actuel
              </CmmButton>
              <CmmButton tone="primary" variant="pill" size="sm" onClick={() => void applyProposal()} disabled={state === "applying"}>
                {state === "applying" ? "Application…" : "Utiliser le nouvel itinéraire"}
              </CmmButton>
            </div>
          </div>
        ) : null}
      </div>
    </CmmCard>
  );
}
