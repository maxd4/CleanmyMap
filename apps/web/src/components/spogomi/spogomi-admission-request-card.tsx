"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CmmButton } from "@/components/ui/cmm-button";
import { SpogomiRegistrationQuiz } from "./spogomi-registration-quiz";

type RequestKind = "registration" | "presence_regularization";
type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
type Division = { id: string; type: "casual" | "world_cup"; directRegistrationAvailable?: boolean };
type Request = {
  id: string;
  requestKind: RequestKind;
  divisionId: string;
  status: RequestStatus;
  providedContext: string;
  decisionMessage: string | null;
  createdAt: string;
};
type RequestLoadState = "loading" | "loaded" | "error";

const ACTIVE_REQUEST_STATUSES = new Set<RequestStatus>(["pending", "approved"]);

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
  initialDivisionId,
  registrationReadinessReady = false,
  signInHref,
}: {
  eventId: string;
  lifecycle: "upcoming" | "in_progress" | "finished" | "cancelled" | "postponed";
  divisions: Division[];
  initialDivisionId?: string;
  registrationReadinessReady?: boolean;
  signInHref: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [requestLoadState, setRequestLoadState] = useState<RequestLoadState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [divisionId, setDivisionId] = useState(initialDivisionId && divisions.some((division) => division.id === initialDivisionId) ? initialDivisionId : divisions[0]?.id ?? "");
  const [kind, setKind] = useState<RequestKind>(lifecycle === "in_progress" ? "presence_regularization" : "registration");
  const [quizProofs, setQuizProofs] = useState<Record<string, string>>({});

  const endpoint = `/api/spogomi/events/${encodeURIComponent(eventId)}/admission-requests`;
  const loadRequests = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setRequestLoadState("loading");
    setError(null);
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as { requests?: Request[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Le statut de vos demandes n’a pas pu être chargé.");
    setRequests(body.requests ?? []);
    setRequestLoadState("loaded");
  }, [endpoint, isLoaded, isSignedIn]);

  useEffect(() => {
    void Promise.resolve().then(() => loadRequests()).catch((reason) => {
      setRequestLoadState("error");
      setError(reason instanceof Error ? reason.message : "Le statut de vos demandes n’a pas pu être chargé.");
    });
  }, [loadRequests]);

  const selectedDivision = useMemo(() => divisions.find((division) => division.id === divisionId) ?? null, [divisionId, divisions]);
  const current = useMemo(() => requests.find((request) => request.requestKind === kind && request.divisionId === divisionId && request.status === "pending") ?? requests.find((request) => request.requestKind === kind && request.divisionId === divisionId), [divisionId, kind, requests]);
  const activeRegistrationRequest = useMemo(() => lifecycle === "upcoming" && kind === "registration" ? requests.find((request) => request.requestKind === "registration" && ACTIVE_REQUEST_STATUSES.has(request.status)) : undefined, [kind, lifecycle, requests]);
  const registrationBlocked = lifecycle === "upcoming" && Boolean(activeRegistrationRequest);
  const activeRequestInOtherDivision = activeRegistrationRequest && activeRegistrationRequest.divisionId !== divisionId ? activeRegistrationRequest : null;
  const canRequest = lifecycle === "upcoming" || lifecycle === "in_progress";
  const canSubmitRegistration = lifecycle === "upcoming" && registrationReadinessReady && selectedDivision?.directRegistrationAvailable === true && !registrationBlocked;
  const canSubmitKind = kind === "registration" ? canSubmitRegistration : lifecycle === "in_progress";

  function selectDivision(nextDivisionId: string) {
    setDivisionId(nextDivisionId);
    const params = new URLSearchParams(window.location.search);
    const nextDivision = divisions.find((division) => division.id === nextDivisionId);
    if (nextDivision) params.set("division", nextDivision.type);
    const query = params.toString();
    router.replace(`${window.location.pathname}${query ? `?${query}` : ""}#spogomi-sports-registration`);
  }

  async function submit() {
    if (!divisionId || !canSubmitKind) return;
    if (kind === "registration" && !quizProofs[divisionId]) {
      setError("Validez le quiz obligatoire de cette division avant d’envoyer la demande d’inscription.");
      return;
    }
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
  if (requestLoadState === "loading") return <p className="text-sm text-slate-700">Chargement de vos demandes d’inscription…</p>;
  if (requestLoadState === "error") return <section className="space-y-3" aria-labelledby="spogomi-admission-request-title"><h2 id="spogomi-admission-request-title" className="font-black text-slate-900">Votre parcours SPOGOMI</h2><p role="alert" className="text-sm font-semibold text-rose-700">{error ?? "Le statut de vos demandes n’est pas disponible."}</p><CmmButton type="button" size="sm" tone="secondary" onClick={() => { void loadRequests().catch((reason) => { setRequestLoadState("error"); setError(reason instanceof Error ? reason.message : "Le statut de vos demandes n’a pas pu être chargé."); }); }}>Réessayer</CmmButton></section>;
  if (activeRegistrationRequest && current && current.id !== activeRegistrationRequest.id) return <section className="space-y-3" aria-labelledby="spogomi-admission-request-title"><div><h2 id="spogomi-admission-request-title" className="font-black text-slate-900">Votre parcours SPOGOMI</h2><p className="mt-1 text-sm text-slate-700">Une demande d’inscription {activeRegistrationRequest.status === "approved" ? "acceptée" : "en attente"} existe dans l’autre division et bloque toute nouvelle inscription pour cette édition.</p></div><p className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-700">Dans la division sélectionnée : <span className="font-bold">{statusLabel(current)}</span>. Cette demande terminale ne lève pas le blocage interdivision.</p><label className="block text-sm font-bold text-slate-800">Division<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={divisionId} onChange={(event) => selectDivision(event.target.value)}>{divisions.map((division) => <option key={division.id} value={division.id}>{division.type === "world_cup" ? "World Cup" : "Casual"}</option>)}</select></label></section>;
  if (activeRegistrationRequest) return <section className="space-y-3" aria-labelledby="spogomi-admission-request-title"><div><h2 id="spogomi-admission-request-title" className="font-black text-slate-900">Votre parcours SPOGOMI</h2><p className="mt-1 text-sm text-slate-700">Une demande d’inscription active bloque une nouvelle demande pour cette édition.</p></div>{current ? <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-3" aria-live="polite"><p className="font-bold text-slate-900">{statusLabel(current)}</p><p className="text-sm text-slate-700">L’admission ne crée pas de billet partenaire et l’affectation à une équipe reste une étape distincte.</p>{current.decisionMessage ? <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-800">{current.decisionMessage}</p> : null}{current.status === "pending" ? <CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => { void cancel(current); }}>Annuler la demande</CmmButton> : null}</div> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">Une demande d’inscription {activeRegistrationRequest.status === "approved" ? "acceptée" : "en attente"} existe déjà dans l’autre division. Elle ne donne aucun droit dans la division sélectionnée.</p>}<label className="block text-sm font-bold text-slate-800">Opération<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={kind} onChange={(event) => setKind(event.target.value as RequestKind)}><option value="registration" disabled>Demander à intégrer l’équipe</option><option value="presence_regularization" disabled>Signaler une présence à régulariser</option></select></label><label className="block text-sm font-bold text-slate-800">Division<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={divisionId} onChange={(event) => selectDivision(event.target.value)}>{divisions.map((division) => <option key={division.id} value={division.id}>{division.type === "world_cup" ? "World Cup" : "Casual"}</option>)}</select></label>{error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}</section>;
  if (lifecycle === "upcoming" && !registrationReadinessReady) return <section className="space-y-3" aria-labelledby="spogomi-admission-request-title"><div><h2 id="spogomi-admission-request-title" className="font-black text-slate-900">Votre parcours SPOGOMI</h2><p className="mt-1 text-sm font-semibold text-slate-700">La readiness des inscriptions n’est pas disponible ou n’est pas complète. Aucune nouvelle inscription n’est proposée.</p></div><label className="block text-sm font-bold text-slate-800">Division<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={divisionId} onChange={(event) => selectDivision(event.target.value)}>{divisions.map((division) => <option key={division.id} value={division.id}>{division.type === "world_cup" ? "World Cup" : "Casual"}</option>)}</select></label>{error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}</section>;

  return (
    <section className="space-y-3" aria-labelledby="spogomi-admission-request-title">
      <div><h2 id="spogomi-admission-request-title" className="font-black text-slate-900">Votre parcours SPOGOMI</h2><p className="mt-1 text-sm text-slate-700">Une demande est examinée par un rôle actif admin ou max. Elle ne réserve pas de place et ne modifie ni équipe ni résultat sans décision auditée.</p></div>
      {current ? <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-3" aria-live="polite"><p className="font-bold text-slate-900">{statusLabel(current)}</p><p className="text-sm text-slate-700">{current.requestKind === "presence_regularization" ? "La demande de présence n’ajoute pas automatiquement une personne au roster." : "L’admission ne crée pas de billet partenaire et l’affectation à une équipe reste une étape distincte."}</p>{current.decisionMessage ? <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-800">{current.decisionMessage}</p> : null}{current.status === "pending" ? <CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ cancel(current); }}>Annuler la demande</CmmButton> : null}</div> : null}
      {activeRequestInOtherDivision ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">Une demande d’inscription {activeRequestInOtherDivision.status === "approved" ? "acceptée" : "en attente"} existe déjà dans l’autre division. Elle bloque une nouvelle inscription pour cette édition, sans vous donner de droit dans la division sélectionnée.</p> : null}
      {!current || current.status === "cancelled" || current.status === "rejected" ? <div className="space-y-3 rounded-xl border border-emerald-100 bg-white/70 p-3"><label className="block text-sm font-bold text-slate-800">Opération<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={kind} onChange={(event) => setKind(event.target.value as RequestKind)}><option value="registration" disabled={!canSubmitRegistration}>Demander à intégrer l’équipe</option><option value="presence_regularization" disabled={lifecycle !== "in_progress"}>Signaler une présence à régulariser</option></select></label><label className="block text-sm font-bold text-slate-800">Division<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={divisionId} onChange={(event) => selectDivision(event.target.value)}>{divisions.map((division) => <option key={division.id} value={division.id}>{division.type === "world_cup" ? "World Cup" : "Casual"}</option>)}</select></label>{kind === "registration" && !canSubmitRegistration ? <p className="text-sm font-semibold text-slate-700">L’inscription directe n’est pas disponible pour cette division. Suivez le parcours officiel indiqué par l’organisation.</p> : null}{kind === "registration" && canSubmitRegistration ? <SpogomiRegistrationQuiz eventId={eventId} divisionId={divisionId} divisionLabel={selectedDivision?.type === "world_cup" ? "World Cup" : "Casual"} onPassed={(quizVersion) => setQuizProofs((currentProofs) => ({ ...currentProofs, [divisionId]: quizVersion }))} /> : null}{!activeRegistrationRequest ? <><label className="block text-sm font-bold text-slate-800">Contexte facultatif<textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={3} maxLength={1200} value={context} onChange={(event) => setContext(event.target.value)} placeholder={`Contexte utile pour votre ${requestLabel(kind)}. N’écrivez pas de secret ni de donnée d’une autre personne.`} /></label><CmmButton type="button" tone="primary" disabled={busy || !divisionId || !canSubmitKind || (kind === "registration" && !quizProofs[divisionId])} loading={busy} onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ submit(); }}>{kind === "registration" ? "Demander à intégrer l’équipe" : "Envoyer la régularisation"}</CmmButton></> : null}</div> : null}
      {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
    </section>
  );
}
