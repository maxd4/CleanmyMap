"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CmmButton } from "@/components/ui/cmm-button";

type RequestKind = "registration" | "presence_regularization";
type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
type Division = { id: string; type: "casual" | "world_cup" };
type Request = {
  id: string;
  requestKind: RequestKind;
  divisionId: string;
  status: RequestStatus;
  providedContext: string;
  decisionMessage: string | null;
  createdAt: string;
};

function requestLabel(kind: RequestKind): string {
  return kind === "registration" ? "inscription" : "régularisation de présence";
}

function statusLabel(request: Request): string {
  if (request.status === "approved") return request.requestKind === "registration" ? "Admission acceptée" : "Vérification acceptée";
  if (request.status === "rejected") return "Demande refusée";
  if (request.status === "cancelled") return "Demande annulée";
  return "Demande en attente de vérification";
}

export function SpogomiAdmissionRequestCard({
  eventId,
  lifecycle,
  divisions,
  signInHref,
}: {
  eventId: string;
  lifecycle: "upcoming" | "in_progress" | "finished";
  divisions: Division[];
  signInHref: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? "");
  const [kind, setKind] = useState<RequestKind>(lifecycle === "in_progress" ? "presence_regularization" : "registration");

  const endpoint = `/api/spogomi/events/${encodeURIComponent(eventId)}/admission-requests`;
  const loadRequests = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as { requests?: Request[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Le statut de vos demandes n’a pas pu être chargé.");
    setRequests(body.requests ?? []);
  }, [endpoint, isLoaded, isSignedIn]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRequests().catch((reason) => setError(reason instanceof Error ? reason.message : "Le statut de vos demandes n’a pas pu être chargé.")), 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  const current = useMemo(() => requests.find((request) => request.requestKind === kind && request.status === "pending") ?? requests.find((request) => request.requestKind === kind), [kind, requests]);
  const canRequest = lifecycle === "upcoming" || lifecycle === "in_progress";

  async function submit() {
    if (!divisionId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestKind: kind, divisionId, providedContext: context }),
      });
      const body = (await response.json().catch(() => ({}))) as { request?: Request; error?: string };
      if (!response.ok) throw new Error(body.error ?? "La demande n’a pas pu être envoyée.");
      if (body.request) setRequests((currentRequests) => [body.request!, ...currentRequests.filter((request) => request.id !== body.request!.id)]);
      setContext("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La demande n’a pas pu être envoyée.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(request: Request) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: request.id }) });
      const body = (await response.json().catch(() => ({}))) as { request?: Request; error?: string };
      if (!response.ok) throw new Error(body.error ?? "La demande n’a pas pu être annulée.");
      if (body.request) setRequests((currentRequests) => currentRequests.map((item) => item.id === request.id ? body.request! : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La demande n’a pas pu être annulée.");
    } finally {
      setBusy(false);
    }
  }

  if (!canRequest) return <p className="text-sm text-slate-700">Après l’événement, utilisez « Retrouver mon équipe » avec le code individuel remis par l’organisation.</p>;
  if (!isLoaded) return <CmmButton type="button" size="sm" tone="secondary" disabled>Chargement du parcours…</CmmButton>;
  if (!isSignedIn) return <CmmButton href={signInHref} size="sm" tone="secondary">Se connecter pour demander</CmmButton>;

  return (
    <section className="space-y-3" aria-labelledby="spogomi-admission-request-title">
      <div><h2 id="spogomi-admission-request-title" className="font-black text-slate-900">Votre parcours SPOGOMI</h2><p className="mt-1 text-sm text-slate-700">Une demande est examinée par un rôle actif admin ou max. Elle ne réserve pas de place et ne modifie ni équipe ni résultat sans décision auditée.</p></div>
      {current ? <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-3" aria-live="polite"><p className="font-bold text-slate-900">{statusLabel(current)}</p><p className="text-sm text-slate-700">{current.requestKind === "presence_regularization" ? "La demande de présence n’ajoute pas automatiquement une personne au roster." : "L’admission ne crée pas de billet partenaire et l’affectation à une équipe reste une étape distincte."}</p>{current.decisionMessage ? <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-800">{current.decisionMessage}</p> : null}{current.status === "pending" ? <CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => void cancel(current)}>Annuler la demande</CmmButton> : null}</div> : null}
      {!current || current.status === "cancelled" || current.status === "rejected" ? <div className="space-y-3 rounded-xl border border-emerald-100 bg-white/70 p-3"><label className="block text-sm font-bold text-slate-800">Opération<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={kind} onChange={(event) => setKind(event.target.value as RequestKind)}><option value="registration" disabled={lifecycle !== "upcoming"}>Demander à intégrer l’équipe</option><option value="presence_regularization" disabled={lifecycle !== "in_progress"}>Signaler une présence à régulariser</option></select></label><label className="block text-sm font-bold text-slate-800">Division<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={divisionId} onChange={(event) => setDivisionId(event.target.value)}>{divisions.map((division) => <option key={division.id} value={division.id}>{division.type === "world_cup" ? "World Cup" : "Casual"}</option>)}</select></label><label className="block text-sm font-bold text-slate-800">Contexte facultatif<textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={3} maxLength={1200} value={context} onChange={(event) => setContext(event.target.value)} placeholder={`Contexte utile pour votre ${requestLabel(kind)}. N’écrivez pas de secret ni de donnée d’une autre personne.`} /></label><CmmButton type="button" tone="primary" disabled={busy || !divisionId} loading={busy} onClick={() => void submit()}>{kind === "registration" ? "Demander à intégrer l’équipe" : "Envoyer la régularisation"}</CmmButton></div> : null}
      {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
    </section>
  );
}
