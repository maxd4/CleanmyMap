"use client";

import { CheckCircle2, Play, Square } from "lucide-react";
import { useState } from "react";
import type { SpogomiClosureSummary } from "@/lib/spogomi/closure";

type Props = {
  eventId: string;
  eventState: string;
  expectedRevision: number;
  canManage: boolean;
  summary: SpogomiClosureSummary;
  hasSnapshot: boolean;
  onCompleted: () => Promise<void>;
};

function transitionForState(state: string): "start" | "close" | null {
  if (state === "composition_locked") return "start";
  if (state === "in_progress") return "close";
  return null;
}

export function SpogomiEventLifecycleControls({ eventId, eventState, expectedRevision, canManage, summary, hasSnapshot, onCompleted }: Props) {
  const transition = transitionForState(eventState);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  if (!canManage || (!transition && !hasSnapshot)) return null;

  const execute = async () => {
    if (!transition) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/closure`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: transition, expectedRevision }),
      });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "La transition de l’événement a échoué.";
        throw new Error(message);
      }
      setCompleted(true);
      setConfirming(false);
      await onCompleted();
      if (typeof window !== "undefined") window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La transition de l’événement a échoué.");
    } finally {
      setPending(false);
    }
  };

  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" data-testid="spogomi-event-lifecycle-controls">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-black text-emerald-950">Cycle de l’épreuve</p>
        <p className="text-sm text-emerald-900">{eventState === "in_progress" ? "Le terrain est en cours. La clôture ouvre l’arbitrage sans certifier les résultats." : eventState === "composition_locked" ? "La composition est verrouillée et l’épreuve peut être démarrée explicitement." : "Le diagnostic de clôture est conservé séparément des résultats officiels."}</p>
      </div>
      {transition ? <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" onClick={() => { setError(null); setConfirming(true); }} disabled={pending || completed}>
        {transition === "start" ? <Play size={16} aria-hidden="true" /> : <Square size={16} aria-hidden="true" />}
        {transition === "start" ? "Démarrer l’épreuve" : "Clôturer l’événement"}
      </button> : null}
    </div>
    {confirming && transition ? <div className="mt-4 space-y-3 rounded-xl border border-emerald-300 bg-white p-4" role="dialog" aria-label={transition === "close" ? "Confirmation de clôture" : "Confirmation de démarrage"}>
      <p className="font-bold text-slate-950">{transition === "close" ? "Cette action fixe l’heure de fin serveur, passe l’événement en arbitrage et conserve un diagnostic privé. Elle ne certifie, ne consolide et ne publie aucun résultat." : "Cette action démarre explicitement l’épreuve. Les mutations de préparation ne doivent plus être utilisées comme si l’événement était en préparation."}</p>
      {transition === "close" && summary.blockers.length ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p className="font-bold">Aperçu des points à traiter après le terrain</p><ul className="mt-1 list-disc pl-5">{summary.blockers.slice(0, 5).map((blocker) => <li key={blocker}>{blocker}</li>)}</ul><p className="mt-1">Ces points restent dans le diagnostic et ne transforment pas la clôture terrain en certification.</p></div> : null}
      <div className="flex flex-wrap gap-2"><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" onClick={() => void execute()} disabled={pending}>{pending ? "Enregistrement…" : "Confirmer"}</button><button type="button" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" onClick={() => setConfirming(false)} disabled={pending}>Annuler</button></div>
    </div> : null}
    {completed ? <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-900" role="status"><CheckCircle2 size={16} aria-hidden="true" />Transition enregistrée ; les projections sont rechargées.</p> : null}
    {error ? <p className="mt-3 text-sm font-bold text-red-800" role="alert">{error}</p> : null}
  </div>;
}
