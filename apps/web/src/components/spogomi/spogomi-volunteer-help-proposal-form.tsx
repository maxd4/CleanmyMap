"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CmmButton } from "@/components/ui/cmm-button";

type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";
type Proposal = { id: string; status: ProposalStatus; decisionNote: string | null; createdAt: string };

const HELP_TYPES = ["Accueil et orientation", "Logistique et ravitaillement", "Pesée et tri", "Parcours et sécurité", "Communication", "Autre"];

function statusLabel(status: ProposalStatus): string {
  if (status === "accepted") return "Proposition retenue par l’organisation";
  if (status === "rejected") return "Proposition refusée";
  if (status === "withdrawn") return "Proposition retirée";
  return "Proposition en attente de traitement";
}
function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SpogomiVolunteerHelpProposalForm({ eventId, signInHref }: { eventId: string; signInHref: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const endpoint = `/api/spogomi/events/${encodeURIComponent(eventId)}/volunteer-help-proposals`;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [helpType, setHelpType] = useState(HELP_TYPES[0]);
  const [motivation, setMotivation] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [formStartedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = await response.json().catch(() => ({})) as { proposals?: Proposal[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Le statut de votre proposition n’a pas pu être chargé.");
    setProposals(body.proposals ?? []);
  }, [endpoint, isLoaded, isSignedIn]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Le statut de votre proposition n’a pas pu être chargé.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeProposal = useMemo(() => proposals.find((proposal) => proposal.status === "pending" || proposal.status === "accepted"), [proposals]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: newIdempotencyKey(),
          contactFirstName: firstName,
          contactLastName: lastName,
          contactEmail: email,
          contactPhone: phone,
          helpType,
          motivation,
          usefulSkills: skills,
          cleanwalkExperience: experience,
          submittedAt: formStartedAt,
          honeypot: "",
        }),
      });
      const body = await response.json().catch(() => ({})) as { proposal?: Proposal; error?: string };
      if (!response.ok) throw new Error(body.error ?? "La proposition n’a pas pu être envoyée.");
      if (body.proposal) setProposals((current) => [body.proposal!, ...current.filter((item) => item.id !== body.proposal!.id)]);
      setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setMotivation(""); setSkills(""); setExperience("");
      setMessage("Votre proposition a été transmise à l’organisation habilitée. Elle ne vaut pas inscription sportive.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La proposition n’a pas pu être envoyée.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(proposal: Proposal) {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposalId: proposal.id }) });
      const body = await response.json().catch(() => ({})) as { proposal?: Proposal; error?: string };
      if (!response.ok) throw new Error(body.error ?? "La proposition n’a pas pu être retirée.");
      if (body.proposal) setProposals((current) => current.map((item) => item.id === proposal.id ? body.proposal! : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La proposition n’a pas pu être retirée.");
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded) return <CmmButton type="button" size="sm" disabled>Chargement du parcours…</CmmButton>;
  if (!isSignedIn) return <CmmButton href={signInHref} size="sm" tone="secondary">Se connecter pour proposer son aide</CmmButton>;

  return (
    <section className="space-y-4" aria-labelledby="spogomi-volunteer-help-title">
      <div><h2 id="spogomi-volunteer-help-title" className="font-black text-slate-900">Proposer mon aide à l’organisation</h2><p className="mt-1 text-sm text-slate-700">Cette démarche est distincte de l’inscription sportive : elle ne crée ni participation, ni mission certifiée, ni habilitation.</p></div>
      {activeProposal ? <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3" aria-live="polite"><p className="font-bold text-slate-900">{statusLabel(activeProposal.status)}</p><p className="text-sm text-slate-700">L’organisation habilitée est la seule à voir vos coordonnées et votre message.</p>{activeProposal.status === "pending" ? <CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => { void withdraw(activeProposal); }}>Retirer ma proposition</CmmButton> : null}{activeProposal.decisionNote ? <p className="rounded-lg bg-white/80 p-2 text-sm text-slate-800">Message de l’organisation : {activeProposal.decisionNote}</p> : null}</div> : null}
      {!activeProposal ? <form className="space-y-3" onSubmit={submit} noValidate>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-800">Prénom<input required maxLength={80} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label className="block text-sm font-bold text-slate-800">Nom<input required maxLength={80} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label></div>
        <p className="text-sm font-bold text-slate-800">Contact <span className="font-normal">— au moins un des deux champs est requis</span></p><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-800">E-mail<input type="email" maxLength={254} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-sm font-bold text-slate-800">Téléphone<input type="tel" maxLength={40} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div>
        <label className="block text-sm font-bold text-slate-800">Type d’aide souhaitée<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={helpType} onChange={(event) => setHelpType(event.target.value)}>{HELP_TYPES.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="block text-sm font-bold text-slate-800">Motivations<textarea required minLength={10} maxLength={4000} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={motivation} onChange={(event) => setMotivation(event.target.value)} /></label>
        <label className="block text-sm font-bold text-slate-800">Compétences utiles mises à disposition<textarea required maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={skills} onChange={(event) => setSkills(event.target.value)} /></label>
        <label className="block text-sm font-bold text-slate-800">Expérience en cleanwalks <span className="font-normal">(facultatif)</span><textarea maxLength={3000} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" value={experience} onChange={(event) => setExperience(event.target.value)} /></label>
        <p className="text-xs leading-5 text-slate-600">Vos coordonnées, motivations et expérience sont transmises uniquement à l’organisation habilitée pour cette édition. Conservation maximale : 24 mois après la dernière décision, selon la politique affichée ; vous pouvez demander l’accès, la rectification ou l’effacement via <a className="font-bold underline" href="/contact">le contact</a>.</p>
        <CmmButton type="submit" tone="primary" loading={busy} disabled={busy}>Proposer mon aide</CmmButton>
      </form> : null}
      {message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
    </section>
  );
}
