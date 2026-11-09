"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

type Status = "pending" | "accepted" | "rejected" | "withdrawn";
type Proposal = { id: string; requesterClerkId: string; contactFirstName: string; contactLastName: string; contactEmail: string | null; contactPhone: string | null; helpType: string; motivation: string; usefulSkills: string; cleanwalkExperience: string; status: Status; decisionNote: string | null; createdAt: string };

function statusLabel(status: Status): string {
  if (status === "accepted") return "Retenue";
  if (status === "rejected") return "Refusée";
  if (status === "withdrawn") return "Retirée";
  return "À traiter";
}
export function SpogomiVolunteerHelpProposalsPanel({ eventId }: { eventId: string }) {
  const endpoint = `/api/spogomi/events/${encodeURIComponent(eventId)}/volunteer-help-proposals/review`;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = await response.json().catch(() => ({})) as { proposals?: Proposal[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Les propositions n’ont pas pu être chargées.");
    setProposals(body.proposals ?? []);
  }, [endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Les propositions n’ont pas pu être chargées.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function decide(proposal: Proposal, status: "accepted" | "rejected") {
    setBusyId(proposal.id); setError(null);
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposalId: proposal.id, status, decisionNote: notes[proposal.id] ?? "" }) });
      const body = await response.json().catch(() => ({})) as { proposal?: Proposal; error?: string };
      if (!response.ok) throw new Error(body.error ?? "La décision n’a pas pu être enregistrée.");
      if (body.proposal) setProposals((current) => current.map((item) => item.id === proposal.id ? body.proposal! : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La décision n’a pas pu être enregistrée.");
    } finally { setBusyId(null); }
  }

  return <section className="space-y-4 text-slate-900" aria-labelledby="spogomi-help-proposals-panel-title"><div><h2 id="spogomi-help-proposals-panel-title" className="cmm-text-h3">Propositions d’aide à l’organisation</h2><p className="cmm-text-body mt-1">Vue privée de cette édition. Une décision ne crée ni participation sportive, ni mission certifiée, ni habilitation.</p></div>{error ? <p role="alert" className="text-sm font-semibold text-rose-800">{error}</p> : null}{!proposals.length && !error ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-800">Aucune proposition reçue.</p> : null}<div className="space-y-3">{proposals.map((proposal) => <article key={proposal.id} className="rounded-xl border border-slate-200 bg-white/80 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-slate-950">{proposal.contactFirstName} {proposal.contactLastName}</h3><p className="text-sm text-slate-800">{proposal.helpType} · {statusLabel(proposal.status)}</p></div><p className="text-xs text-slate-800">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(proposal.createdAt))}</p></div><dl className="mt-3 grid gap-2 text-sm text-slate-800 sm:grid-cols-2"><div><dt className="font-bold">E-mail</dt><dd>{proposal.contactEmail ?? "Non fourni"}</dd></div><div><dt className="font-bold">Téléphone</dt><dd>{proposal.contactPhone ?? "Non fourni"}</dd></div><div className="sm:col-span-2"><dt className="font-bold">Motivations</dt><dd className="whitespace-pre-wrap">{proposal.motivation}</dd></div><div className="sm:col-span-2"><dt className="font-bold">Compétences utiles</dt><dd className="whitespace-pre-wrap">{proposal.usefulSkills}</dd></div>{proposal.cleanwalkExperience ? <div className="sm:col-span-2"><dt className="font-bold">Expérience en cleanwalks</dt><dd className="whitespace-pre-wrap">{proposal.cleanwalkExperience}</dd></div> : null}</dl>{proposal.status === "pending" ? <div className="mt-3 space-y-2"><label className="block text-sm font-bold text-slate-800">Note de traitement <span className="font-normal">(facultative)</span><textarea maxLength={1200} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={notes[proposal.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [proposal.id]: event.target.value }))} /></label><div className="flex flex-wrap gap-2"><CmmButton type="button" tone="primary" size="sm" disabled={busyId !== null} loading={busyId === proposal.id} onClick={() => { void decide(proposal, "accepted"); }}>Retenir</CmmButton><CmmButton type="button" tone="secondary" size="sm" disabled={busyId !== null} onClick={() => { void decide(proposal, "rejected"); }}>Refuser</CmmButton></div></div> : proposal.decisionNote ? <p className="mt-3 rounded-lg bg-slate-50 p-2 text-sm text-slate-800">Note : {proposal.decisionNote}</p> : null}</article>)}</div></section>;
}
