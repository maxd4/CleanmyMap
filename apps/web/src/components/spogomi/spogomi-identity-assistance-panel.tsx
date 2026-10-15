"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

type Participant = { id: string; display_name: string | null; external_reference: string | null; account_link_status: string; team_id: string | null };
type AssistanceRequest = {
  id: string;
  providedContext: string;
  status: "pending" | "treated" | "rejected" | "cancelled";
  matchedParticipantId: string | null;
  verificationNote: string | null;
  resolutionNote: string | null;
  handledAt: string | null;
  createdAt: string;
};

function statusLabel(status: AssistanceRequest["status"]): string {
  if (status === "treated") return "Traitée — code à remettre manuellement";
  if (status === "rejected") return "Refusée";
  if (status === "cancelled") return "Annulée";
  return "En attente";
}

export function SpogomiIdentityAssistancePanel({ eventId, participants }: { eventId: string; participants: Participant[] }) {
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, string>>({});
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [issuedCodes, setIssuedCodes] = useState<Record<string, string>>({});
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const participantLabel = useMemo(() => new Map(participants.map((participant) => [participant.id, participant.display_name ?? "Place à identifier"])), [participants]);

  const loadRequests = useCallback(async () => {
    const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-assistance/requests`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Les demandes d’assistance sont indisponibles.");
    setRequests(body.requests ?? []);
  }, [eventId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests().catch((reason) => setError(reason instanceof Error ? reason.message : "Les demandes d’assistance sont indisponibles."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  async function decide(request: AssistanceRequest, status: "treated" | "rejected") {
    setBusy(request.id);
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-assistance/requests/${encodeURIComponent(request.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          matchedParticipantId: selectedParticipants[request.id] || undefined,
          verificationNote: verificationNotes[request.id] || undefined,
          resolutionNote: resolutionNotes[request.id] || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "La décision n’a pas pu être enregistrée.");
      await loadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La décision n’a pas pu être enregistrée.");
    } finally { setBusy(null); }
  }

  async function issueCode(request: AssistanceRequest) {
    if (!request.matchedParticipantId) return;
    setBusy(request.id);
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(request.matchedParticipantId)}/identity-code`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Le code n’a pas pu être émis.");
      setIssuedCodes((current) => ({ ...current, [request.id]: body.code }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le code n’a pas pu être émis.");
    } finally { setBusy(null); }
  }

  async function createInvitation() {
    setBusy("invitation");
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-assistance/invitation`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "L’invitation n’a pas pu être créée.");
      setInvitationUrl(body.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L’invitation n’a pas pu être créée.");
    } finally { setBusy(null); }
  }

  return <section className="space-y-4" aria-labelledby="spogomi-identity-assistance-title">
    <div><h2 id="spogomi-identity-assistance-title" className="font-black text-slate-900">Demandes de rattachement sans code</h2><p className="mt-1 text-sm text-slate-600">Une demande oriente votre recherche uniquement. Aucun nom, billet ou adresse ne valide une identité ; sélectionnez une ligne du roster après une vérification indépendante, puis remettez le code directement.</p></div>
    <div className="flex flex-wrap items-center gap-2"><CmmButton type="button" tone="secondary" disabled={busy !== null} loading={busy === "invitation"} onClick={() => void createInvitation()}>Créer une invitation privée</CmmButton>{invitationUrl ? <p className="min-w-0 flex-1 rounded-lg bg-emerald-50 p-2 font-mono text-xs text-emerald-950 break-all">{invitationUrl}<br /><span className="font-sans">À remettre directement · expiration limitée · ne pas publier.</span></p> : null}</div>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
    {!requests.length ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">Aucune demande reçue.</p> : <div className="space-y-3">{requests.map((request) => <article key={request.id} className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-slate-900">Demande reçue le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(request.createdAt))}</p><p className="text-sm font-semibold text-slate-700">{statusLabel(request.status)}</p></div>{request.matchedParticipantId ? <p className="text-sm text-slate-700">Roster rapproché : {participantLabel.get(request.matchedParticipantId) ?? "entrée sélectionnée"}</p> : null}</div>{request.providedContext ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><span className="font-bold">Élément fourni :</span> {request.providedContext}</p> : <p className="text-sm text-slate-600">Aucun élément supplémentaire fourni.</p>}{request.status === "pending" ? <div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-bold text-slate-800">Entrée roster après vérification<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={selectedParticipants[request.id] ?? ""} onChange={(event) => setSelectedParticipants((current) => ({ ...current, [request.id]: event.target.value }))}><option value="">Choisir une entrée</option>{participants.filter((participant) => participant.account_link_status !== "verified").map((participant) => <option key={participant.id} value={participant.id}>{participant.display_name ?? "Place à identifier"}{participant.external_reference ? ` · ${participant.external_reference}` : ""}</option>)}</select></label><label className="text-sm font-bold text-slate-800">Vérification indépendante<textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={3} minLength={10} maxLength={1200} value={verificationNotes[request.id] ?? ""} onChange={(event) => setVerificationNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Décrire la vérification hors bande effectuée." /></label><label className="text-sm font-bold text-slate-800 md:col-span-2">Note de décision <span className="font-normal text-slate-500">(facultatif)</span><textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={2} maxLength={1200} value={resolutionNotes[request.id] ?? ""} onChange={(event) => setResolutionNotes((current) => ({ ...current, [request.id]: event.target.value }))} /></label></div> : null}{request.status === "pending" ? <div className="flex flex-wrap gap-2"><CmmButton type="button" tone="primary" disabled={busy !== null || !selectedParticipants[request.id] || (verificationNotes[request.id] ?? "").trim().length < 10} loading={busy === request.id} onClick={() => void decide(request, "treated")}>Marquer vérifiée</CmmButton><CmmButton type="button" tone="critical" disabled={busy !== null} loading={busy === request.id} onClick={() => void decide(request, "rejected")}>Refuser</CmmButton></div> : null}{request.status === "treated" && request.matchedParticipantId ? <div className="space-y-2"><CmmButton type="button" tone="primary" disabled={busy !== null} loading={busy === request.id} onClick={() => void issueCode(request)}>Émettre le code à remettre</CmmButton>{issuedCodes[request.id] ? <p className="rounded-lg bg-emerald-50 p-2 font-mono text-xs text-emerald-950">{issuedCodes[request.id]}<br /><span className="font-sans">Affiché une seule fois · remise directe uniquement.</span></p> : null}</div> : null}</article>)}</div>}
  </section>;
}
