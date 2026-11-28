"use client";

import { useEffect, useState } from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";

type Application = {
  entryId: string;
  organizationName: string;
  legalIdentity: string | null;
  organizationType: "entreprise" | "commerce";
  applicantEmail: string | null;
  applicantAccountAvailable: boolean;
};

export function OrganizationBootstrapReviewPanel({ locale = "fr" }: { locale?: "fr" | "en" }) {
  const isEn = locale === "en";
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [organizerRef, setOrganizerRef] = useState("");
  const [mandateVerified, setMandateVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const copy = isEn
    ? { title: "Accepted applications", loading: "Loading…", empty: "No accepted application awaits organization activation.", partial: "Only the first 100 applications are shown.", unavailable: "Applications are temporarily unavailable.", verify: "I reviewed the mandate and confirmed the applicant account.", organizer: "Organizer reference", activate: "Verify and activate", success: "Organization activated. Its applicant can now access the workspace.", refused: "Verification or activation was refused. Reload and review the sources.", identity: "Declared legal identity", applicant: "Applicant account", missing: "Account unavailable", none: "Not declared", type: "Type", choose: "Select an application", heading: "Mandate review" }
    : { title: "Demandes acceptées", loading: "Chargement…", empty: "Aucune demande acceptée n’attend l’activation d’une organisation.", partial: "Les 100 premières demandes sont affichées.", unavailable: "Demandes temporairement indisponibles.", verify: "J’ai vérifié le mandat et le compte déposant.", organizer: "Référence d’organisateur", activate: "Vérifier et activer", success: "Organisation activée. Le déposant peut accéder à l’espace.", refused: "Vérification ou activation refusée. Actualisez et contrôlez les sources.", identity: "Identité légale déclarée", applicant: "Compte déposant", missing: "Compte indisponible", none: "Non renseignée", type: "Type", choose: "Sélectionner une demande", heading: "Vérification du mandat" };

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/organizations/bootstrap", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(copy.unavailable);
        return response.json() as Promise<{ applications: Application[]; hasMore: boolean }>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setApplications(data.applications);
        if (data.hasMore) setMessage(copy.partial);
        setError("");
      })
      .catch(() => { if (!controller.signal.aborted) setError(copy.unavailable); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [copy.unavailable, copy.partial]);

  const selected = applications.find((application) => application.entryId === selectedId) ?? null;

  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !mandateVerified || !selected.applicantAccountAvailable || !organizerRef.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/organizations/bootstrap", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: selected.entryId, organizerRef: organizerRef.trim(), mandateVerified: true, requestId: crypto.randomUUID() }),
      });
      if (!response.ok) throw new Error(copy.refused);
      setApplications((current) => current.filter((application) => application.entryId !== selected.entryId));
      setSelectedId("");
      setOrganizerRef("");
      setMandateVerified(false);
      setMessage(copy.success);
    } catch {
      setError(copy.refused);
    } finally {
      setBusy(false);
    }
  }

  return <CmmCard className="space-y-4">
    <h2 className="text-lg font-bold">{copy.heading}</h2>
    {loading ? <p role="status">{copy.loading}</p> : null}
    {!loading && !applications.length && !error ? <p>{copy.empty}</p> : null}
    {applications.length ? <label className="block space-y-1">
      <span>{copy.title}</span>
      <select className="w-full" value={selectedId} disabled={busy} onChange={(event) => {
        const nextId = event.target.value;
        setSelectedId(nextId);
        setOrganizerRef(applications.find((application) => application.entryId === nextId)?.legalIdentity ?? "");
        setMandateVerified(false);
        setError("");
      }}>
        <option value="">{copy.choose}</option>
        {applications.map((application) => <option key={application.entryId} value={application.entryId}>
          {application.organizationName} · {application.organizationType}
        </option>)}
      </select>
    </label> : null}
    {selected ? <form className="space-y-3" onSubmit={(event) => void activate(event)}>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div><dt className="font-semibold">{copy.identity}</dt><dd>{selected.legalIdentity || copy.none}</dd></div>
        <div><dt className="font-semibold">{copy.applicant}</dt><dd>{selected.applicantEmail ?? (selected.applicantAccountAvailable ? copy.none : copy.missing)}</dd></div>
        <div><dt className="font-semibold">{copy.type}</dt><dd>{selected.organizationType}</dd></div>
      </dl>
      <label className="block space-y-1">
        <span>{copy.organizer}</span>
        <input className="w-full" value={organizerRef} maxLength={255} required disabled={busy || !selected.applicantAccountAvailable} onChange={(event) => setOrganizerRef(event.target.value)} />
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={mandateVerified} disabled={busy || !selected.applicantAccountAvailable} onChange={(event) => setMandateVerified(event.target.checked)} />
        <span>{copy.verify}</span>
      </label>
      <CmmButton type="submit" disabled={busy || !selected.applicantAccountAvailable || !mandateVerified || !organizerRef.trim()}>
        {busy ? copy.loading : copy.activate}
      </CmmButton>
    </form> : null}
    {error ? <p role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
  </CmmCard>;
}
