"use client";

import { useEffect, useState } from "react";
import type { ActionAccessibilityObservedMeasure } from "@/lib/actions/preparation-contract";

type Measure = { key: string; definitionHash: string; label: string };
type ObservationState = {
  revision: string;
  measures: Measure[];
  observations: ActionAccessibilityObservedMeasure[];
};
type StateResponse = { status?: string } & Partial<ObservationState> & { error?: string };

export function ActionAccessibilityImplementationPanel({ actionId }: { actionId: string }) {
  const [state, setState] = useState<ObservationState | null>(null);
  const [evidenceKind, setEvidenceKind] = useState<ActionAccessibilityObservedMeasure["evidenceKind"]>("organizer_observation");
  const [observedAt, setObservedAt] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/actions/${encodeURIComponent(actionId)}/accessibility-observations`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as StateResponse;
        if (!response.ok || typeof body.revision !== "string" || !Array.isArray(body.measures) || !Array.isArray(body.observations)) {
          throw new Error("Les attestations sont indisponibles.");
        }
        if (active) setState({ revision: body.revision, measures: body.measures, observations: body.observations });
      })
      .catch(() => { if (active) setError("Les attestations sont indisponibles."); });
    return () => { active = false; };
  }, [actionId]);

  if (error) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>;
  if (!state) return <p role="status" className="text-sm text-violet-900">Chargement des attestations…</p>;

  async function toggle(item: Measure, checked: boolean) {
    const currentState = state;
    if (!currentState) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/accessibility-observations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: currentState.revision,
          measurementKey: item.key,
          definitionHash: item.definitionHash,
          observed: checked,
          ...(checked ? { evidenceKind, observedAt } : {}),
        }),
      });
      const body = await response.json() as StateResponse;
      if (!response.ok || typeof body.revision !== "string" || !Array.isArray(body.measures) || !Array.isArray(body.observations)) {
        throw new Error(response.status === 409
          ? "L’action ou la mesure a changé. Rechargez les attestations avant de réessayer."
          : "L’attestation n’a pas été enregistrée.");
      }
      setState({ revision: body.revision, measures: body.measures, observations: body.observations });
      setMessage("Attestation enregistrée.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’attestation n’a pas été enregistrée. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const declared = state.measures;
  const observed = state.observations;

  return <section aria-labelledby="accessibility-implementation-title" className="rounded-2xl border border-violet-200 bg-white p-4" data-testid="action-accessibility-implementation">
    <h3 id="accessibility-implementation-title" className="text-lg font-black text-violet-950">Mesures prévues et attestées</h3>
    <p className="mt-1 text-sm text-violet-900">Une déclaration de préparation ne devient pas une observation automatiquement. Les attestations ci-dessous ne prouvent ni présence, ni accessibilité certifiée, ni résultat pour une personne particulière.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Source de l’attestation<select value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as ActionAccessibilityObservedMeasure["evidenceKind"])} className="mt-1 min-h-11 w-full rounded-lg border border-violet-200 bg-white px-3"><option value="organizer_observation">Observation de l’organisateur</option><option value="participant_feedback">Retour d’un participant</option></select></label>
      <label className="text-sm font-semibold">Date observée<input type="date" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-violet-200 bg-white px-3" /></label>
    </div>
    {declared.length === 0 ? <p className="mt-3 text-sm text-slate-700">Aucune mesure déclarée dans la préparation.</p> : <ul className="mt-3 space-y-2">{declared.map((item) => {
      const attestation = observed.find((entry) => entry.key === item.key && entry.definitionHash === item.definitionHash);
      return <li key={item.key} className="flex min-h-11 items-start gap-3 rounded-xl border border-violet-100 p-3"><input id={`observed-${item.key}`} type="checkbox" checked={Boolean(attestation)} disabled={busy || !observedAt} onChange={(event) => { void toggle(item, event.target.checked); }} className="mt-1 size-4 accent-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" /><label htmlFor={`observed-${item.key}`} className="min-w-0 text-sm"><span className="block font-semibold">{item.label}</span><span className="block text-xs text-slate-700">{attestation ? `OBSERVED · ${attestation.evidenceKind === "organizer_observation" ? "observation organisateur" : "retour participant"} · ${attestation.observedAt}` : "DECLARED · annoncé dans la préparation"}</span></label></li>;
    })}</ul>}
    {message ? <p role="status" className="mt-3 text-sm text-emerald-800">{message}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p> : null}
  </section>;
}
