"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Award, Download } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { SpogomiRecognitionKind } from "@/lib/spogomi/recognition";

type ContributionStatus = "identity_unlinked" | "presence_not_confirmed" | "validation_pending" | "certificate_available" | "certificate_revoked";
type ContributionResponse = {
  status: ContributionStatus;
  event?: { eventName: string; eventDate: string; locationLabel: string; missions: Array<{ id: string; kind: SpogomiRecognitionKind; certificationVersion: string }> };
  certificate?: { certificate_reference: string; status: "active" | "revoked" | "replaced" } | null;
  error?: string;
};

const labels: Record<ContributionStatus, string> = {
  identity_unlinked: "Identité non reliée",
  presence_not_confirmed: "Présence non confirmée",
  validation_pending: "Validation en attente",
  certificate_available: "Attestation disponible",
  certificate_revoked: "Attestation révoquée",
};

const missionLabels: Record<SpogomiRecognitionKind, string> = {
  collector: "Collecte terrain", referee: "Arbitrage", organizer: "Organisation", finish_control: "Contrôle d’arrivée",
  field_safety: "Sécurité terrain", weighing_sorting: "Pesée et tri", logistics_support: "Soutien logistique",
};

export function SpogomiVolunteerContributionsCard({ eventId, signInHref }: { eventId: string; signInHref: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [payload, setPayload] = useState<ContributionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/contributions`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as ContributionResponse;
      if (!response.ok) throw new Error(body.error ?? "Les contributions ne sont pas disponibles.");
      setPayload(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Les contributions ne sont pas disponibles.");
    }
  }, [eventId, isLoaded, isSignedIn]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function generateCertificate() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/spogomi/certificates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId }) });
      const body = (await response.json().catch(() => ({}))) as { certificate?: { certificateReference: string }; error?: string };
      if (!response.ok || !body.certificate?.certificateReference) throw new Error(body.error ?? "L’attestation n’a pas pu être générée.");
      const anchor = document.createElement("a");
      anchor.href = `/api/spogomi/certificates/${encodeURIComponent(body.certificate.certificateReference)}`;
      anchor.download = "";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L’attestation n’a pas pu être générée.");
    } finally { setBusy(false); }
  }

  return <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5" aria-labelledby="spogomi-contributions-title">
    <div className="flex items-start gap-3"><Award className="mt-1 text-emerald-700" size={20} aria-hidden="true" /><div><h2 id="spogomi-contributions-title" className="text-xl font-black text-emerald-950">Mes contributions</h2><p className="cmm-text-body mt-1 text-slate-900">Retrouvez uniquement les missions enregistrées et certifiées pour votre compte.</p></div></div>
    {!isLoaded ? <p className="text-sm text-slate-600">Vérification de la session…</p> : !isSignedIn ? <><p className="text-sm text-slate-700">Connectez-vous pour consulter vos missions certifiées.</p><CmmButton href={signInHref} tone="primary">Se connecter</CmmButton></> : !payload ? <p className="text-sm text-slate-600">Chargement de vos contributions…</p> : <>
      <p className="inline-flex rounded-full border border-emerald-200 bg-white/75 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-800">{labels[payload.status]}</p>
      {payload.event?.missions?.length ? <ul className="space-y-2">{payload.event.missions.map((mission) => <li key={mission.id} className="rounded-xl border border-emerald-100 bg-white/75 px-3 py-2 text-sm font-bold text-slate-900">{missionLabels[mission.kind]}<span className="ml-2 text-xs font-normal text-slate-500">certification {mission.certificationVersion}</span></li>)}</ul> : null}
      {payload.status === "certificate_available" ? <CmmButton type="button" tone="primary" disabled={busy} loading={busy} onClick={() => void generateCertificate()}><Download size={16} />{busy ? "Génération…" : "Télécharger mon attestation"}</CmmButton> : null}
      {payload.status === "certificate_revoked" ? <p className="text-sm font-semibold text-rose-700">Une correction ou révocation a invalidé la version précédente. Une nouvelle version ne sera proposée qu’après une nouvelle certification.</p> : null}
      {payload.status === "validation_pending" ? <p className="text-sm text-slate-700">La déclaration ou la présence seule ne suffit pas : l’organisateur doit encore certifier la mission.</p> : null}
      <Link href="/profil/benevole#profile" className="inline-flex min-h-11 items-center text-sm font-black text-emerald-800 underline underline-offset-2">Voir mon bilan personnel</Link>
    </>}
    {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
  </CmmCard>;
}
