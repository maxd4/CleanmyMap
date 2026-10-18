"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CmmButton } from "@/components/ui/cmm-button";

type InviteProjection = {
  title: string;
  shortDescription: string | null;
  actionDate: string;
  meetingTime: string | null;
  pointDeRendezVous: string;
  zoneCiblePrevue: string | null;
  organizerLabel: string | null;
  actionPhase: string;
  registrationOpen: boolean;
};

export function PrivateActionInvitePage({ token }: { token: string }) {
  const router = useRouter();
  const [action, setAction] = useState<InviteProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const redirectUrl = `/actions/invite/${encodeURIComponent(token)}`;

  useEffect(() => {
    void fetch(`/api/actions/invite/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as { action?: InviteProjection; error?: string } | null;
        if (!response.ok || !body?.action) throw new Error(body?.error ?? "Lien d’invitation indisponible.");
        setAction(body.action);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Lien d’invitation indisponible."));
  }, [token]);

  async function requestRegistration() {
    setBusy(true);
    setMessage(null);
    setError(null);
    const response = await fetch(`/api/actions/invite/${encodeURIComponent(token)}`, { method: "POST" });
    const body = await response.json().catch(() => null) as { error?: string } | null;
    if (response.status === 401) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
      return;
    }
    if (!response.ok) setError(body?.error ?? "La demande n’a pas pu être envoyée.");
    else setMessage("Votre demande est enregistrée et reste en attente de décision de l’organisateur.");
    setBusy(false);
  }

  return (
    <main className="cmm-page-width px-4 py-10 md:px-6">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-200/70 bg-white/90 p-6 shadow-sm md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Invitation privée</p>
        {error ? <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div> : null}
        {!error && !action ? <p className="mt-5 text-sm text-slate-600">Chargement de l’invitation…</p> : null}
        {action ? <>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-emerald-950">{action.title}</h1>
          {action.shortDescription ? <p className="mt-3 cmm-text-body cmm-text-primary leading-6">{action.shortDescription}</p> : null}
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-3"><dt className="text-xs font-bold uppercase text-emerald-700">Date</dt><dd className="mt-1 font-semibold text-emerald-950">{action.actionDate}{action.meetingTime ? ` · ${action.meetingTime}` : ""}</dd></div>
            <div className="rounded-2xl bg-emerald-50 p-3"><dt className="text-xs font-bold uppercase text-emerald-700">Rendez-vous</dt><dd className="mt-1 font-semibold text-emerald-950">{action.pointDeRendezVous}</dd></div>
            {action.zoneCiblePrevue ? <div className="rounded-2xl bg-emerald-50 p-3"><dt className="text-xs font-bold uppercase text-emerald-700">Zone prévue</dt><dd className="mt-1 font-semibold text-emerald-950">{action.zoneCiblePrevue}</dd></div> : null}
            {action.organizerLabel ? <div className="rounded-2xl bg-emerald-50 p-3"><dt className="text-xs font-bold uppercase text-emerald-700">Organisateur</dt><dd className="mt-1 font-semibold text-emerald-950">{action.organizerLabel}</dd></div> : null}
          </dl>
          <p className="mt-6 text-xs leading-5 text-slate-600">Cette page ne publie pas les consignes internes de préparation. Une demande d’inscription ne confirme ni votre inscription ni votre présence sur le terrain.</p>
          {action.registrationOpen ? <CmmButton className="mt-5" type="button" tone="primary" variant="pill" size="md" onClick={() => void requestRegistration()} disabled={busy}>{busy ? "Envoi…" : "Demander à rejoindre"}</CmmButton> : <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Les demandes d’inscription sont fermées pour cette action.</p>}
          {message ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
          <p className="mt-6 text-xs text-slate-500"><Link href="/actions/map" className="underline">Retour aux surfaces publiques</Link></p>
        </> : null}
      </div>
    </main>
  );
}
