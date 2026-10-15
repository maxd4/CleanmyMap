"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

type Request = {
  id: string;
  requestKind: "registration" | "presence_regularization";
  requesterClerkId: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  providedContext: string;
  verificationNote: string | null;
  resolutionNote: string | null;
  decisionMessage: string | null;
  createdAt: string;
};

function kindLabel(kind: Request["requestKind"]): string {
  return kind === "registration" ? "Nouvelle inscription" : "Régularisation de présence";
}

export function SpogomiAdmissionRequestsPanel({ eventId }: { eventId: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [decisionMessages, setDecisionMessages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/spogomi/events/${encodeURIComponent(eventId)}/admission-requests/review`;

  const loadRequests = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Les demandes d’admission sont indisponibles.");
    setRequests(body.requests ?? []);
  }, [endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRequests().catch((reason) => setError(reason instanceof Error ? reason.message : "Les demandes d’admission sont indisponibles.")), 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  async function decide(request: Request, status: "approved" | "rejected") {
    setBusy(request.id);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          status,
          verificationNote: verificationNotes[request.id] || undefined,
          resolutionNote: resolutionNotes[request.id] || undefined,
          decisionMessage: decisionMessages[request.id] || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "La décision n’a pas pu être enregistrée.");
      await loadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La décision n’a pas pu être enregistrée.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="space-y-4" aria-labelledby="spogomi-admission-requests-title">
    <div><h2 id="spogomi-admission-requests-title" className="font-black text-slate-900">Inscriptions et régularisations publiques</h2><p className="mt-1 text-sm text-slate-600">File réservée au rôle actif admin ou max. Une inscription acceptée crée uniquement l’identité sportive liée au demandeur, sans billet ni affectation automatique ; une régularisation ne modifie ni roster, ni équipe, ni résultat.</p></div>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
    {!requests.length ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">Aucune demande reçue.</p> : <div className="space-y-3">{requests.map((request) => <article key={request.id} className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-slate-900">{kindLabel(request.requestKind)}</p><p className="text-xs text-slate-600">Compte demandeur : <span className="font-mono">{request.requesterClerkId}</span></p></div><p className="text-sm font-semibold text-slate-700">{request.status}</p></div><p className="text-xs text-slate-600">Soumise le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(request.createdAt))}</p>{request.providedContext ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><span className="font-bold">Contexte fourni :</span> {request.providedContext}</p> : null}{request.status === "pending" ? <><label className="block text-sm font-bold text-slate-800">Preuve indépendante<textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={3} minLength={10} maxLength={1200} value={verificationNotes[request.id] ?? ""} onChange={(event) => setVerificationNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Décrire la vérification effectuée hors bande." /></label><label className="block text-sm font-bold text-slate-800">Motif compréhensible pour le demandeur <span className="font-normal text-slate-500">(facultatif)</span><textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={2} maxLength={1200} value={decisionMessages[request.id] ?? ""} onChange={(event) => setDecisionMessages((current) => ({ ...current, [request.id]: event.target.value }))} /></label><label className="block text-sm font-bold text-slate-800">Note interne de décision <span className="font-normal text-slate-500">(facultatif)</span><textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={2} maxLength={1200} value={resolutionNotes[request.id] ?? ""} onChange={(event) => setResolutionNotes((current) => ({ ...current, [request.id]: event.target.value }))} /></label><div className="flex flex-wrap gap-2"><CmmButton type="button" tone="primary" disabled={busy !== null || (verificationNotes[request.id] ?? "").trim().length < 10} loading={busy === request.id} onClick={() => void decide(request, "approved")}>Accepter</CmmButton><CmmButton type="button" tone="critical" disabled={busy !== null} loading={busy === request.id} onClick={() => void decide(request, "rejected")}>Refuser</CmmButton></div></> : request.decisionMessage ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800">Message demandeur : {request.decisionMessage}</p> : null}</article>)}</div>}
  </section>;
}
