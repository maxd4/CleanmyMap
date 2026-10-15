"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

type Participant = {
  id: string;
  display_name: string | null;
  external_reference: string | null;
  account_link_status: string;
  team_id: string | null;
};

type Team = { id: string; public_name: string; team_number: number };
type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
type JoinRequest = {
  id: string;
  teamId: string;
  requesterClerkId: string;
  status: RequestStatus;
  matchedParticipantId: string | null;
  verificationNote: string | null;
  resolutionNote: string | null;
  createdAt: string;
};

function statusLabel(status: RequestStatus): string {
  if (status === "approved") return "Acceptée — identité liée";
  if (status === "rejected") return "Refusée";
  if (status === "cancelled") return "Annulée";
  return "En attente";
}

export function SpogomiTeamJoinRequestsPanel({
  eventId,
  participants,
  teams,
}: {
  eventId: string;
  participants: Participant[];
  teams: Team[];
}) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, string>>({});
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const teamLabels = useMemo(() => new Map(teams.map((team) => [team.id, `${team.public_name} · équipe ${team.team_number}`])), [teams]);

  const loadRequests = useCallback(async () => {
    const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/team-join-requests`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Les demandes de rattachement sont indisponibles.");
    setRequests(body.requests ?? []);
  }, [eventId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests().catch((reason) => setError(reason instanceof Error ? reason.message : "Les demandes de rattachement sont indisponibles."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  async function decide(request: JoinRequest, status: "approved" | "rejected") {
    setBusy(request.id);
    setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/team-join-requests`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
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
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="spogomi-team-join-requests-title">
      <div>
        <h2 id="spogomi-team-join-requests-title" className="font-black text-slate-900">Demandes de rattachement d’équipe</h2>
        <p className="mt-1 text-sm text-slate-600">Cette file est réservée aux rôles actifs admin et max. Une demande oriente la recherche ; le nom, le prénom, l’adresse électronique ou un billet ne suffit jamais à valider une identité.</p>
      </div>
      {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
      {!requests.length ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">Aucune demande de rattachement reçue.</p> : <div className="space-y-3">{requests.map((request) => {
        const matchingParticipants = participants.filter((participant) => participant.team_id === request.teamId && participant.account_link_status !== "verified");
        return (
          <article key={request.id} className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-bold text-slate-900">{teamLabels.get(request.teamId) ?? "Équipe non disponible"}</p><p className="text-sm text-slate-700">Compte demandeur : <span className="font-mono text-xs">{request.requesterClerkId}</span></p></div>
              <p className="text-sm font-semibold text-slate-700">{statusLabel(request.status)}</p>
            </div>
            <p className="text-xs text-slate-600">Soumise le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(request.createdAt))}</p>
            {request.status === "pending" ? <>
              <label className="block text-sm font-bold text-slate-800">Participant historique correspondant<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={selectedParticipants[request.id] ?? ""} onChange={(event) => setSelectedParticipants((current) => ({ ...current, [request.id]: event.target.value }))}><option value="">Choisir une identité existante</option>{matchingParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.display_name ?? "Place à identifier"}{participant.external_reference ? ` · ${participant.external_reference}` : ""}</option>)}</select></label>
              <label className="block text-sm font-bold text-slate-800">Preuve de vérification indépendante<textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={3} minLength={10} maxLength={1200} value={verificationNotes[request.id] ?? ""} onChange={(event) => setVerificationNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Décrire la vérification effectuée avant la décision." /></label>
              <label className="block text-sm font-bold text-slate-800">Note de décision <span className="font-normal text-slate-500">(facultatif)</span><textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" rows={2} maxLength={1200} value={resolutionNotes[request.id] ?? ""} onChange={(event) => setResolutionNotes((current) => ({ ...current, [request.id]: event.target.value }))} /></label>
              <div className="flex flex-wrap gap-2"><CmmButton type="button" tone="primary" disabled={busy !== null || !selectedParticipants[request.id] || (verificationNotes[request.id] ?? "").trim().length < 10} loading={busy === request.id} onClick={() => void decide(request, "approved")}>Accepter et lier l’identité</CmmButton><CmmButton type="button" tone="critical" disabled={busy !== null} loading={busy === request.id} onClick={() => void decide(request, "rejected")}>Refuser</CmmButton></div>
            </> : request.resolutionNote ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><span className="font-bold">Note :</span> {request.resolutionNote}</p> : null}
          </article>
        );
      })}</div>}
    </section>
  );
}
