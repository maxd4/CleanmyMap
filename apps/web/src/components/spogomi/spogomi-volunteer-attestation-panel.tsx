"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { SpogomiRecognitionKind } from "@/lib/spogomi/recognition";

type Participant = { id: string; display_name: string | null; attendance_status: string; account_link_status: string };
const kinds: Array<[SpogomiRecognitionKind, string]> = [
  ["collector", "Collecte terrain"], ["referee", "Arbitrage"], ["organizer", "Organisation"], ["finish_control", "Contrôle d’arrivée"],
  ["field_safety", "Sécurité terrain"], ["weighing_sorting", "Pesée et tri"], ["logistics_support", "Soutien logistique"],
];

export function SpogomiVolunteerAttestationPanel({ eventId, participants }: { eventId: string; participants: Participant[] }) {
  const [participantId, setParticipantId] = useState("");
  const [kind, setKind] = useState<SpogomiRecognitionKind>("collector");
  const [status, setStatus] = useState<"certified" | "revoked">("certified");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/recognition/attestations`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantId, kind, status, evidenceReference: evidenceReference.trim(), certificationVersion: "spogomi-volunteer-v1", reason: reason.trim() || null }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Attestation refusée.");
      setMessage("Mission enregistrée dans la preuve certifiée.");
      setEvidenceReference(""); setReason("");
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : "Attestation refusée."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-3" aria-labelledby="spogomi-volunteer-attestations-title">
    <div><h2 id="spogomi-volunteer-attestations-title" className="cmm-text-h3">Missions bénévoles certifiées</h2><p className="cmm-text-small">Une permission, un rôle ou une inscription ne constitue pas une preuve. Sélectionnez une présence et une mission réellement vérifiée.</p></div>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-bold text-slate-800">Participant<select value={participantId} onChange={(event) => setParticipantId(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3"><option value="">Choisir un participant</option>{participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.display_name ?? "Participant sans nom"} · {participant.attendance_status}</option>)}</select></label>
      <label className="text-sm font-bold text-slate-800">Mission<select value={kind} onChange={(event) => setKind(event.target.value as SpogomiRecognitionKind)} className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3">{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-bold text-slate-800">Décision<select value={status} onChange={(event) => setStatus(event.target.value as "certified" | "revoked")} className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3"><option value="certified">Certifier</option><option value="revoked">Révoquer / corriger</option></select></label>
      <label className="text-sm font-bold text-slate-800">Référence de preuve<input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} maxLength={500} placeholder="feuille de présence, décision, registre…" className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3" /></label>
    </div>
    {status === "revoked" ? <label className="block text-sm font-bold text-slate-800">Motif de révocation<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3" /></label> : null}
    <CmmButton type="button" tone="primary" disabled={busy || !participantId || evidenceReference.trim().length < 1 || (status === "revoked" && reason.trim().length < 1)} loading={busy} onClick={() => void submit()}>{busy ? "Enregistrement…" : "Enregistrer la décision"}</CmmButton>
    {message ? <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p> : null}{error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
  </section>;
}
