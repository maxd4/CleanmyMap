"use client";

import { useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { fetchActionById, type ActionEditorRecord } from "@/lib/actions/http";
import {
  applyActionRouteVersion,
  fetchActionRouteRefreshSignals,
} from "@/lib/actions/route-version-http";
import { fetchRouteRecommendation } from "@/components/sections/rubriques/route/route-request";
import {
  buildRouteRefreshProposal,
  buildRouteRefreshSubmission,
  compatibleRouteGroupCounts,
  compareRouteRefresh,
  type RouteRefreshProposal,
} from "@/lib/route/route-refresh";
import {
  addRouteRefreshGroupReason,
  type RouteRefreshSignals,
} from "@/lib/route/route-refresh-signals";

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

function formatRouteAge(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "date inconnue";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

function reasonLabel(reason: RouteRefreshSignals["reasons"][number], signals: RouteRefreshSignals): string {
  switch (reason) {
    case "participants_changed":
      return `${signals.participants.confirmed ?? "?"} participant(s) confirmé(s) au lieu de ${signals.participants.used}`;
    case "newer_route_data":
      return "des données route plus récentes sont disponibles";
    case "group_count_changed":
      return "le nombre de groupes a été modifié volontairement";
    case "weather_budget_mismatch":
      return "les conditions prévues rendent le budget opérationnel incohérent";
  }
}

function RouteRefreshSignalSummary({
  signals,
  displaySignals,
}: {
  signals: RouteRefreshSignals;
  displaySignals: RouteRefreshSignals;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-white/75 p-4 text-sm text-emerald-950">
      <dl className="grid gap-2 sm:grid-cols-2">
        <div><dt className="font-semibold">Mis à jour</dt><dd>{formatRouteAge(signals.activeAppliedAt)}</dd></div>
        <div><dt className="font-semibold">Participants utilisés</dt><dd>{signals.participants.used}</dd></div>
        <div><dt className="font-semibold">Participants confirmés</dt><dd>{signals.participants.confirmed ?? "Non disponible"}</dd></div>
        <div><dt className="font-semibold">Groupes</dt><dd>{signals.groupCount}</dd></div>
      </dl>
      {displaySignals.recommended ? (
        <div className="mt-4 border-t border-emerald-200/70 pt-3">
          <p className="font-black">Actualisation recommandée</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {displaySignals.reasons.map((reason) => <li key={reason}>{reasonLabel(reason, displaySignals)}</li>)}
          </ul>
        </div>
      ) : null}
      {signals.weather.message ? <p className="mt-3 text-sm font-semibold text-rose-700">{signals.weather.message}</p> : null}
      {signals.freshness.status === "newer" ? <p className="mt-2 text-sm font-semibold text-rose-700">Des données plus récentes sont disponibles.</p> : null}
    </div>
  );
}

function RouteRefreshGroupChoice({
  actionId,
  selectedGroupCount,
  setSelectedGroupCount,
  signals,
}: {
  actionId: string;
  selectedGroupCount: number;
  setSelectedGroupCount: (value: number) => void;
  signals: RouteRefreshSignals;
}) {
  const splitVolunteerCount = signals.participants.confirmed ?? signals.participants.used;
  const groupChoices = compatibleRouteGroupCounts(splitVolunteerCount);
  return (
    <fieldset className="rounded-2xl border border-emerald-200/70 bg-white/75 p-4 text-sm text-emerald-950">
      <legend className="px-1 font-black">Organisation du groupe pour le prochain calcul</legend>
      <div className="mt-2 flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`route-group-mode-${actionId}`}
            checked={selectedGroupCount === 1}
            onChange={() => setSelectedGroupCount(1)}
          />
          Garder le groupe entier
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`route-group-mode-${actionId}`}
            checked={selectedGroupCount > 1}
            disabled={groupChoices.length === 0}
            onChange={() => setSelectedGroupCount(groupChoices[0] ?? 1)}
          />
          Diviser le groupe
        </label>
      </div>
      {selectedGroupCount > 1 ? (
        <label className="mt-3 flex max-w-xs items-center gap-2">
          <span className="font-semibold">Nombre de groupes</span>
          <select
            className="rounded-lg border border-emerald-300 bg-white px-2 py-1"
            value={selectedGroupCount}
            onChange={(event) => setSelectedGroupCount(Number(event.target.value))}
          >
            {groupChoices.map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
      ) : null}
    </fieldset>
  );
}

export function ActionRouteRefreshPanel({
  action,
}: {
  action: ActionEditorRecord;
}) {
  const [activeAction, setActiveAction] = useState(action);
  const [signals, setSignals] = useState<RouteRefreshSignals | null>(null);
  const [signalsState, setSignalsState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedGroupCount, setSelectedGroupCount] = useState<number>(1);
  const [proposal, setProposal] = useState<RouteRefreshProposal | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "applying" | "error" | "kept" | "applied">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchActionRouteRefreshSignals(action.id)
      .then((nextSignals) => {
        if (cancelled) return;
        setSignals(nextSignals);
        setSelectedGroupCount(nextSignals.groupCount);
        setSignalsState("ready");
      })
      .catch(() => {
        if (!cancelled) setSignalsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [action.id]);

  async function refresh() {
    const activeParameters = activeAction.preparationData?.routeVersioning?.active.calculation.parameters;
    const confirmedParticipants = signals?.participants.confirmed ?? null;
    const submission = buildRouteRefreshSubmission(activeAction, {
      volunteers: confirmedParticipants ?? activeParameters?.volunteers,
      groupCount: selectedGroupCount,
    });
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
      setSignals(null);
      setSignalsState("loading");
      void fetchActionRouteRefreshSignals(activeAction.id)
        .then((nextSignals) => {
          setSignals(nextSignals);
          setSelectedGroupCount(nextSignals.groupCount);
          setSignalsState("ready");
        })
        .catch(() => setSignalsState("error"));
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
  const displaySignals = signals && selectedGroupCount !== signals.groupCount
    ? addRouteRefreshGroupReason(signals, selectedGroupCount)
    : signals;
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-4" data-testid="action-route-refresh-panel">
        <div>
          <h3 className="text-lg font-black text-emerald-950">Itinéraire actif</h3>
          <p className="mt-1 text-sm leading-6 text-emerald-950">
            Recalculez une proposition avec les données route actuelles. Rien ne change avant votre décision.
          </p>
        </div>
        {signalsState === "ready" && signals && displaySignals ? (
          <RouteRefreshSignalSummary signals={signals} displaySignals={displaySignals} />
        ) : null}
        {displaySignals?.recommended ? (
          <RouteRefreshGroupChoice
            actionId={action.id}
            selectedGroupCount={selectedGroupCount}
            setSelectedGroupCount={setSelectedGroupCount}
            signals={displaySignals}
          />
        ) : null}
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
